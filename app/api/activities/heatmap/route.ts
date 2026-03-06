import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

import { apiError } from '@/lib/api-response';
import { getValidStravaSession } from '@/lib/strava-oauth';
import { StravaActivity, getServerStravaEnv } from '@/lib/strava';
import { buildAggregatedHeatmapPoints } from '@/lib/utils/heatmap';

const STRAVA_ACTIVITIES_PER_PAGE = 200;
const MAX_STRAVA_PAGE = 30;
const MAX_STRAVA_PAGE_FOR_ALL = 12;
const DEFAULT_ALL_LOOKBACK_MONTHS = 18;
const SUPPORTED_TYPES = new Set(['Ride', 'Run', 'Walk', 'Hike']);
const SUPPORTED_RIDE_SUB_TYPES = new Set([
  'Ride',
  'GravelRide',
  'MountainBikeRide',
  'VirtualRide',
  'EBikeRide',
  'EMountainBikeRide',
]);
const DEFAULT_CACHE_TTL_SECONDS = 60 * 15;
const DEFAULT_MAX_POINTS_PER_ACTIVITY = 220;
const DEFAULT_MAX_OUTPUT_CELLS = 0;
const DEFAULT_MIN_INTENSITY = 0;

type HeatmapData = {
  points: ReturnType<typeof buildAggregatedHeatmapPoints>['points'];
  stats: {
    fetchedActivityCount: number;
    matchedActivityCount: number;
    usedPolylineActivityCount: number;
    rawPointCount: number;
    aggregatedPointCount: number;
    totalDistanceKm: number;
    totalMovingTimeHours: number;
    totalElevationGainM: number;
    typeBreakdown: Array<{ type: string; count: number }>;
    timingsMs: {
      stravaFetch: number;
      filter: number;
      polylineAggregate: number;
    };
  };
};

type RouteTimingsMs = {
  session: number;
  stravaFetch: number;
  filter: number;
  polylineAggregate: number;
  responseSerialize: number;
  total: number;
};

const now = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
};

type MemoryCacheItem = {
  expiresAt: number;
  value: HeatmapData;
};

const EDGE_MEMORY_CACHE_KEY = '__heatmap_route_cache__';

const getEdgeMemoryCache = (): Map<string, MemoryCacheItem> => {
  const globalCache = globalThis as typeof globalThis & {
    [EDGE_MEMORY_CACHE_KEY]?: Map<string, MemoryCacheItem>;
  };

  if (!globalCache[EDGE_MEMORY_CACHE_KEY]) {
    globalCache[EDGE_MEMORY_CACHE_KEY] = new Map<string, MemoryCacheItem>();
  }

  return globalCache[EDGE_MEMORY_CACHE_KEY];
};

const getCacheTtlSeconds = (): number => {
  const parsed = Number.parseInt(process.env.STRAVA_HEATMAP_CACHE_TTL_SECONDS ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 60) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }

  return Math.min(parsed, 60 * 30);
};

const makeHeatmapCacheKey = (
  athleteId: number,
  year: number | null,
  month: number | null,
  sportType: string,
  rideSubType: string,
  maxCells: number,
  minIntensity: number,
): string => [athleteId, year ?? 'all', month ?? 'all', sportType, rideSubType, maxCells, minIntensity].join(':');

const toQueryNumber = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const toPositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const toIntegerInRange = (
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
};

const toRatioInRange = (value: string | null, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, parsed));
};

const toUtcEpochWindow = (
  year: number | null,
  month: number | null,
): { after: number | null; before: number | null; isExplicitFilter: boolean } => {
  if (!year) {
    return { after: null, before: null, isExplicitFilter: false };
  }

  if (!month) {
    return {
      after: Math.floor(Date.UTC(year, 0, 1, 0, 0, 0, 0) / 1000),
      before: Math.floor(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0) / 1000),
      isExplicitFilter: true,
    };
  }

  return {
    after: Math.floor(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) / 1000),
    before: Math.floor(Date.UTC(year, month, 1, 0, 0, 0, 0) / 1000),
    isExplicitFilter: true,
  };
};

const getDefaultAllAfterEpoch = (lookbackMonths: number): number => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - lookbackMonths, 1, 0, 0, 0, 0) / 1000);
};

const isMatchedFilter = (
  activity: StravaActivity,
  sportType: string,
  rideSubType: string,
): boolean => {
  if (sportType !== 'all' && activity.type !== sportType) {
    return false;
  }

  if (sportType === 'Ride' && rideSubType !== 'all' && activity.type !== rideSubType) {
    return false;
  }

  return true;
};

type FetchActivitiesOptions = {
  after: number | null;
  before: number | null;
  isExplicitFilter: boolean;
};

const fetchActivitiesByFilterWindow = async (
  accessToken: string,
  options: FetchActivitiesOptions,
): Promise<StravaActivity[]> => {
  const { apiBaseUrl } = getServerStravaEnv();
  const maxPageForAll = toPositiveInteger(process.env.STRAVA_HEATMAP_MAX_PAGE_FOR_ALL, MAX_STRAVA_PAGE_FOR_ALL);
  const allLookbackMonths = toPositiveInteger(process.env.STRAVA_HEATMAP_ALL_LOOKBACK_MONTHS, DEFAULT_ALL_LOOKBACK_MONTHS);

  const after = options.isExplicitFilter ? options.after : options.after ?? getDefaultAllAfterEpoch(allLookbackMonths);
  const before = options.before;
  const pageLimit = options.isExplicitFilter ? MAX_STRAVA_PAGE : Math.min(MAX_STRAVA_PAGE, maxPageForAll);
  const activities: StravaActivity[] = [];

  for (let page = 1; page <= pageLimit; page += 1) {
    const url = new URL(`${apiBaseUrl}/athlete/activities`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(STRAVA_ACTIVITIES_PER_PAGE));
    if (after) {
      url.searchParams.set('after', String(after));
    }
    if (before) {
      url.searchParams.set('before', String(before));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as Record<string, unknown>).message)
          : 'Failed to fetch activities.';

      throw new Error(message);
    }

    if (!Array.isArray(payload)) {
      throw new Error('Strava activities response is invalid.');
    }

    const pageItems = payload as StravaActivity[];
    activities.push(...pageItems);

    if (pageItems.length < STRAVA_ACTIVITIES_PER_PAGE) {
      break;
    }
  }

  return activities;
};

const getActivityHeatmapCacheKey = (activity: StravaActivity, summaryPolyline: string): string => {
  if (Number.isFinite(activity.id)) {
    return `id:${activity.id}`;
  }

  let hash = 0;
  for (let index = 0; index < summaryPolyline.length; index += 1) {
    hash = (hash * 31 + summaryPolyline.charCodeAt(index)) | 0;
  }

  return `poly:${Math.abs(hash)}`;
};

const resolveDynamicMaxPointsPerActivity = (
  activity: StravaActivity,
  totalMatchedCount: number,
  hasExplicitDateFilter: boolean,
): number => {
  const envBase = toPositiveInteger(process.env.STRAVA_HEATMAP_BASE_MAX_POINTS_PER_ACTIVITY, DEFAULT_MAX_POINTS_PER_ACTIVITY);
  const activityDistanceKm = activity.distance > 0 ? activity.distance / 1000 : 0;
  const distanceScale = activityDistanceKm >= 80 ? 1.2 : activityDistanceKm <= 8 ? 0.8 : 1;
  const rangeScale = hasExplicitDateFilter ? 1.15 : 0.9;
  const loadScale = totalMatchedCount > 1200 ? 0.55 : totalMatchedCount > 700 ? 0.72 : totalMatchedCount > 300 ? 0.85 : 1;

  return Math.round(envBase * distanceScale * rangeScale * loadScale);
};

type ComputeHeatmapOptions = {
  maxOutputCells: number;
  minIntensity: number;
};

const computeHeatmapData = async (
  accessToken: string,
  year: number | null,
  month: number | null,
  sportType: string,
  rideSubType: string,
  options: ComputeHeatmapOptions,
): Promise<HeatmapData> => {
  const fetchStart = now();
  const timeWindow = toUtcEpochWindow(year, month);
  const fetchedActivities = await fetchActivitiesByFilterWindow(accessToken, timeWindow);
  const stravaFetch = now() - fetchStart;

  const filterStart = now();
  const matched = fetchedActivities.filter((activity) => isMatchedFilter(activity, sportType, rideSubType));
  const polylineActivities = matched.filter((activity) => Boolean(activity.map?.summary_polyline));

  const activityInputs = polylineActivities
    .map((activity) => {
      const summaryPolyline = activity.map?.summary_polyline;
      if (!summaryPolyline || summaryPolyline.length === 0) {
        return null;
      }

      return {
        cacheKey: getActivityHeatmapCacheKey(activity, summaryPolyline),
        summaryPolyline,
        activity,
      };
    })
    .filter(
      (
        value,
      ): value is {
        cacheKey: string;
        summaryPolyline: string;
        activity: StravaActivity;
      } => Boolean(value),
    );
  const filter = now() - filterStart;

  const polylineAggregateStart = now();
  const activityByCacheKey = new Map(activityInputs.map((item) => [item.cacheKey, item.activity]));

  const { points, rawPointCount } = buildAggregatedHeatmapPoints(
    activityInputs.map(({ cacheKey, summaryPolyline }) => ({ cacheKey, summaryPolyline })),
    {
      maxPointsResolver: (activityInput) => {
        const target = activityByCacheKey.get(activityInput.cacheKey);
        if (!target) {
          return DEFAULT_MAX_POINTS_PER_ACTIVITY;
        }

        return resolveDynamicMaxPointsPerActivity(target, matched.length, timeWindow.isExplicitFilter);
      },
      maxOutputCells: options.maxOutputCells,
      minIntensity: options.minIntensity,
      onBeforeFinalize: (metrics) => {
        if (process.env.STRAVA_HEATMAP_LOG_METRICS !== 'true') {
          return;
        }

        console.info('[activities-heatmap] finalize-hook', {
          elapsedMs: metrics.elapsedMs,
          memoryUsageMb: metrics.memoryUsageMb,
          rawPointCount: metrics.rawPointCount,
          cellCount: metrics.cellCount,
          activityCount: metrics.activityCount,
          maxOutputCells: options.maxOutputCells,
          minIntensity: options.minIntensity,
        });
      },
    },
  );

  const totalDistanceKm = Number((matched.reduce((sum, activity) => sum + activity.distance, 0) / 1000).toFixed(2));
  const totalMovingTimeHours = Number((matched.reduce((sum, activity) => sum + activity.moving_time, 0) / 3600).toFixed(1));
  const totalElevationGainM = Math.round(matched.reduce((sum, activity) => sum + activity.total_elevation_gain, 0));

  const typeBreakdown = Array.from(
    matched.reduce((acc, activity) => {
      acc.set(activity.type, (acc.get(activity.type) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const polylineAggregate = now() - polylineAggregateStart;

  return {
    points,
    stats: {
      fetchedActivityCount: fetchedActivities.length,
      matchedActivityCount: matched.length,
      usedPolylineActivityCount: polylineActivities.length,
      rawPointCount,
      aggregatedPointCount: points.length,
      totalDistanceKm,
      totalMovingTimeHours,
      totalElevationGainM,
      typeBreakdown,
      timingsMs: {
        stravaFetch: Number(stravaFetch.toFixed(2)),
        filter: Number(filter.toFixed(2)),
        polylineAggregate: Number(polylineAggregate.toFixed(2)),
      },
    },
  };
};

const getCachedHeatmapData = async (
  accessToken: string,
  cacheKey: string,
  ttlSeconds: number,
  params: {
    year: number | null;
    month: number | null;
    sportType: string;
    rideSubType: string;
    maxOutputCells: number;
    minIntensity: number;
  },
): Promise<{ data: HeatmapData; cacheHit: boolean }> => {
  if (process.env.NEXT_RUNTIME === 'edge') {
    const edgeCache = getEdgeMemoryCache();
    const cached = edgeCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return { data: cached.value, cacheHit: true };
    }

    const data = await computeHeatmapData(
      accessToken,
      params.year,
      params.month,
      params.sportType,
      params.rideSubType,
      {
        maxOutputCells: params.maxOutputCells,
        minIntensity: params.minIntensity,
      },
    );
    edgeCache.set(cacheKey, {
      value: data,
      expiresAt: now + ttlSeconds * 1000,
    });

    return { data, cacheHit: false };
  }

  let computed = false;
  const cachedResolver = unstable_cache(
    async () => {
      computed = true;
      return computeHeatmapData(
        accessToken,
        params.year,
        params.month,
        params.sportType,
        params.rideSubType,
        {
          maxOutputCells: params.maxOutputCells,
          minIntensity: params.minIntensity,
        },
      );
    },
    ['strava-heatmap', cacheKey],
    {
      revalidate: ttlSeconds,
    },
  );

  const data = await cachedResolver();
  return {
    data,
    cacheHit: !computed,
  };
};

export async function GET(request: NextRequest) {
  const requestStartedAt = now();
  const routeTimings: RouteTimingsMs = {
    session: 0,
    stravaFetch: 0,
    filter: 0,
    polylineAggregate: 0,
    responseSerialize: 0,
    total: 0,
  };
  let lastSuccessfulStep: 'session' | 'compute' | 'responseSerialize' | null = null;
  let fetchedActivityCount: number | null = null;

  try {
    const sessionStart = now();
    const sessionResult = await getValidStravaSession();
    routeTimings.session = Number((now() - sessionStart).toFixed(2));

    if (!sessionResult.ok) {
      return apiError(sessionResult.status, sessionResult.code, sessionResult.message);
    }
    lastSuccessfulStep = 'session';

    const year = toQueryNumber(request.nextUrl.searchParams.get('year'));
    const month = toQueryNumber(request.nextUrl.searchParams.get('month'));
    const sportType = request.nextUrl.searchParams.get('sportType') ?? 'all';
    const rideSubType = request.nextUrl.searchParams.get('rideSubType') ?? 'all';
    const maxOutputCells = toIntegerInRange(
      request.nextUrl.searchParams.get('maxCells'),
      DEFAULT_MAX_OUTPUT_CELLS,
      0,
      10000,
    );
    const minIntensity = toRatioInRange(
      request.nextUrl.searchParams.get('minIntensity'),
      DEFAULT_MIN_INTENSITY,
    );

    if (month && (month < 1 || month > 12)) {
      return apiError(400, 'INVALID_MONTH', 'month는 1~12 범위여야 합니다.');
    }

    if (month && !year) {
      return apiError(400, 'INVALID_DATE_FILTER', 'month 필터를 사용하려면 year를 함께 지정해야 합니다.');
    }

    if (sportType !== 'all' && !SUPPORTED_TYPES.has(sportType)) {
      return apiError(400, 'INVALID_SPORT_TYPE', '지원하지 않는 종목입니다.');
    }

    if (rideSubType !== 'all' && !SUPPORTED_RIDE_SUB_TYPES.has(rideSubType)) {
      return apiError(400, 'INVALID_RIDE_SUB_TYPE', '지원하지 않는 Ride 세부 종목입니다.');
    }

    if (sportType !== 'Ride' && rideSubType !== 'all') {
      return apiError(400, 'INVALID_RIDE_SUB_TYPE_FILTER', 'Ride 세부 종목 필터는 Ride 선택 시에만 사용 가능합니다.');
    }

    const ttlSeconds = getCacheTtlSeconds();
    const cacheKey = makeHeatmapCacheKey(
      sessionResult.session.athleteId,
      year,
      month,
      sportType,
      rideSubType,
      maxOutputCells,
      minIntensity,
    );

    const { data, cacheHit } = await getCachedHeatmapData(
      sessionResult.session.accessToken,
      cacheKey,
      ttlSeconds,
      {
        year,
        month,
        sportType,
        rideSubType,
        maxOutputCells,
        minIntensity,
      },
    );
    routeTimings.stravaFetch = data.stats.timingsMs.stravaFetch;
    routeTimings.filter = data.stats.timingsMs.filter;
    routeTimings.polylineAggregate = data.stats.timingsMs.polylineAggregate;
    fetchedActivityCount = data.stats.fetchedActivityCount;
    lastSuccessfulStep = 'compute';

    const responseSerializeStart = now();
    routeTimings.total = Number((now() - requestStartedAt).toFixed(2));
    routeTimings.responseSerialize = Number((now() - responseSerializeStart).toFixed(2));

    if (process.env.NODE_ENV === 'development') {
      console.info('[activities-heatmap] timings', {
        params: {
          year,
          month,
          sportType,
          rideSubType,
          maxOutputCells,
          minIntensity,
        },
        fetchedActivityCount,
        cacheHit,
        timingsMs: routeTimings,
      });
    }
    lastSuccessfulStep = 'responseSerialize';

    return NextResponse.json(
      {
        success: true,
        data: {
          points: data.points,
          stats: data.stats,
          meta: {
            phase: 'aggregateRoutes',
            cacheHit,
            cacheTtlSeconds: ttlSeconds,
            timings: routeTimings,
            timingsMs: routeTimings,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error occurred.';
    routeTimings.total = Number((now() - requestStartedAt).toFixed(2));
    console.error('[activities-heatmap] Unexpected server error', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message,
        },
        data: {
          meta: {
            phase: 'aggregateRoutes',
            timings: routeTimings,
            timingsMs: routeTimings,
            lastSuccessfulStep,
            fetchedActivityCount,
          },
        },
      },
      { status: 500 },
    );
  }
}

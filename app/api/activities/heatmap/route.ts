import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await getValidStravaSession();

    if (!sessionResult.ok) {
      return apiError(sessionResult.status, sessionResult.code, sessionResult.message);
    }

    const year = toQueryNumber(request.nextUrl.searchParams.get('year'));
    const month = toQueryNumber(request.nextUrl.searchParams.get('month'));
    const sportType = request.nextUrl.searchParams.get('sportType') ?? 'all';
    const rideSubType = request.nextUrl.searchParams.get('rideSubType') ?? 'all';

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

    const timeWindow = toUtcEpochWindow(year, month);
    const fetchedActivities = await fetchActivitiesByFilterWindow(sessionResult.session.accessToken, timeWindow);
    const matched = fetchedActivities.filter((activity) => isMatchedFilter(activity, sportType, rideSubType));
    const polylineActivities = matched.filter((activity) => Boolean(activity.map?.summary_polyline));
    const polylines = polylineActivities
      .map((activity) => activity.map?.summary_polyline)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    const { points, rawPointCount } = buildAggregatedHeatmapPoints(polylines);

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

    return NextResponse.json(
      {
        success: true,
        data: {
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
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error occurred.';
    console.error('[activities-heatmap] Unexpected server error', error);
    return apiError(500, 'INTERNAL_SERVER_ERROR', message);
  }
}

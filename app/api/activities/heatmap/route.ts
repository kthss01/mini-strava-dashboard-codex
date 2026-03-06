import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { getValidStravaSession } from '@/lib/strava-oauth';
import { StravaActivity, getServerStravaEnv } from '@/lib/strava';
import { buildAggregatedHeatmapPoints } from '@/lib/utils/heatmap';

const STRAVA_ACTIVITIES_PER_PAGE = 200;
const MAX_STRAVA_PAGE = 30;
const SUPPORTED_TYPES = new Set(['Ride', 'Run', 'Walk', 'Hike']);

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

const isMatchedFilter = (
  activity: StravaActivity,
  year: number | null,
  month: number | null,
  sportType: string,
): boolean => {
  if (sportType !== 'all' && activity.type !== sportType) {
    return false;
  }

  if (!year && !month) {
    return true;
  }

  const date = new Date(activity.start_date);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (year && date.getUTCFullYear() !== year) {
    return false;
  }

  if (month && date.getUTCMonth() + 1 !== month) {
    return false;
  }

  return true;
};

const fetchAllActivities = async (accessToken: string): Promise<StravaActivity[]> => {
  const { apiBaseUrl } = getServerStravaEnv();
  const activities: StravaActivity[] = [];

  for (let page = 1; page <= MAX_STRAVA_PAGE; page += 1) {
    const url = new URL(`${apiBaseUrl}/athlete/activities`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(STRAVA_ACTIVITIES_PER_PAGE));

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

    if (month && (month < 1 || month > 12)) {
      return apiError(400, 'INVALID_MONTH', 'month는 1~12 범위여야 합니다.');
    }

    if (sportType !== 'all' && !SUPPORTED_TYPES.has(sportType)) {
      return apiError(400, 'INVALID_SPORT_TYPE', '지원하지 않는 종목입니다.');
    }

    const allActivities = await fetchAllActivities(sessionResult.session.accessToken);
    const matched = allActivities.filter((activity) => isMatchedFilter(activity, year, month, sportType));
    const polylineActivities = matched.filter((activity) => Boolean(activity.map?.summary_polyline));
    const polylines = polylineActivities
      .map((activity) => activity.map?.summary_polyline)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    const { points, rawPointCount } = buildAggregatedHeatmapPoints(polylines);

    return NextResponse.json(
      {
        success: true,
        data: {
          points,
          stats: {
            fetchedActivityCount: allActivities.length,
            matchedActivityCount: matched.length,
            usedPolylineActivityCount: polylineActivities.length,
            rawPointCount,
            aggregatedPointCount: points.length,
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

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { apiError } from '@/lib/api-response';
import { toRecentActivityResponse } from '@/lib/strava-activities';
import { getServerStravaEnv, StravaActivity } from '@/lib/strava';
import { getValidStravaSession } from '@/lib/strava-oauth';

const RECENT_ACTIVITY_COUNT = 20;

interface StravaApiErrorBody {
  message?: string;
}

const fetchRecentActivities = async (accessToken: string): Promise<
  | { ok: true; activities: StravaActivity[] }
  | { ok: false; status: number; message: string }
> => {
  const { apiBaseUrl } = getServerStravaEnv();

  const params = new URLSearchParams({
    page: '1',
    per_page: String(RECENT_ACTIVITY_COUNT),
  });

  const response = await fetch(`${apiBaseUrl}/athlete/activities?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const rawData: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      rawData && typeof rawData === 'object' && 'message' in rawData
        ? String((rawData as StravaApiErrorBody).message ?? 'Failed to fetch activities.')
        : 'Failed to fetch activities.';

    return {
      ok: false,
      status: response.status,
      message,
    };
  }

  if (!Array.isArray(rawData)) {
    return {
      ok: false,
      status: 502,
      message: 'Strava activities response is invalid.',
    };
  }

  return {
    ok: true,
    activities: rawData as StravaActivity[],
  };
};

export async function GET() {
  try {
    const sessionResult = await getValidStravaSession();

    if (!sessionResult.ok) {
      return apiError(sessionResult.status, sessionResult.code, sessionResult.message);
    }

    const activitiesResult = await fetchRecentActivities(sessionResult.session.accessToken);

    if (!activitiesResult.ok) {
      const errorCode =
        activitiesResult.status === 401 ? 'STRAVA_TOKEN_EXPIRED' : 'STRAVA_API_ERROR';
      return apiError(activitiesResult.status, errorCode, activitiesResult.message);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          activities: toRecentActivityResponse(activitiesResult.activities),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[strava-activities] Unexpected server error', error);
    return apiError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error occurred.');
  }
}

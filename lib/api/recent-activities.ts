import { RecentActivity } from '@/lib/types/activity';

interface RecentActivityMapApiItem {
  summary_polyline: string | null;
}

interface ActivityApiItem {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  average_speed?: number | null;
  total_elevation_gain?: number | null;
  start_latlng: number[];
  map: RecentActivityMapApiItem;
}

interface RecentActivitiesApiSuccess {
  success: true;
  data: {
    activities: ActivityApiItem[];
  };
}

interface RecentActivitiesApiError {
  success: false;
  error?: {
    message?: string;
  };
}

const isNumberPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const isActivityApiItem = (value: unknown): value is ActivityApiItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ActivityApiItem>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.distance === 'number' &&
    typeof candidate.moving_time === 'number' &&
    typeof candidate.elapsed_time === 'number' &&
    typeof candidate.start_date === 'string' &&
    Array.isArray(candidate.start_latlng) &&
    Boolean(candidate.map) &&
    typeof candidate.map === 'object' &&
    'summary_polyline' in candidate.map
  );
};

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeActivities = (activities: ActivityApiItem[]): RecentActivity[] =>
  activities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    type: activity.type,
    distance: activity.distance,
    movingTime: activity.moving_time,
    elapsedTime: activity.elapsed_time,
    startDate: activity.start_date,
    averageSpeed: toNullableNumber(activity.average_speed),
    totalElevationGain: toNullableNumber(activity.total_elevation_gain),
    startLatlng: isNumberPair(activity.start_latlng)
      ? { lat: activity.start_latlng[0], lng: activity.start_latlng[1] }
      : null,
    summaryPolyline: typeof activity.map.summary_polyline === 'string' ? activity.map.summary_polyline : null,
  }));

export const fetchRecentActivities = async (): Promise<RecentActivity[]> => {
  const response = await fetch('/api/activities/recent', {
    method: 'GET',
    cache: 'no-store',
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = payload as RecentActivitiesApiError | null;
    throw new Error(apiError?.error?.message ?? '활동 데이터를 불러오지 못했습니다.');
  }

  const result = payload as RecentActivitiesApiSuccess;
  const apiActivities = result?.data?.activities;

  if (!Array.isArray(apiActivities) || !apiActivities.every(isActivityApiItem)) {
    throw new Error('활동 응답 형식이 올바르지 않습니다.');
  }

  return normalizeActivities(apiActivities);
};

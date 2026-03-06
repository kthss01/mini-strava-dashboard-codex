import { StravaActivity } from '@/lib/strava';

export interface RecentActivityResponseItem {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  start_latlng: number[];
  map: {
    summary_polyline: string | null;
  };
}

const toStartLatlng = (startLatlng: unknown): number[] => {
  if (!Array.isArray(startLatlng)) {
    return [];
  }

  const onlyNumbers = startLatlng.filter((value): value is number => typeof value === 'number');
  return onlyNumbers.slice(0, 2);
};

export const toRecentActivityResponseItem = (
  activity: StravaActivity,
): RecentActivityResponseItem => ({
  id: activity.id,
  name: activity.name,
  type: activity.type,
  distance: activity.distance,
  moving_time: activity.moving_time,
  elapsed_time: activity.elapsed_time,
  start_date: activity.start_date,
  start_latlng: toStartLatlng((activity as StravaActivity & { start_latlng?: unknown }).start_latlng),
  map: {
    summary_polyline: activity.map?.summary_polyline ?? null,
  },
});

export const toRecentActivityResponse = (
  activities: StravaActivity[],
): RecentActivityResponseItem[] => activities.map(toRecentActivityResponseItem);

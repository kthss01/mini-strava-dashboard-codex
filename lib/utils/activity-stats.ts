import { RecentActivity } from '@/lib/types/activity';

export interface ActivityStats {
  totalActivities: number;
  totalDistanceMeters: number;
  totalMovingTimeSeconds: number;
  recent30DaysActivities: number;
}

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

export const getActivityStats = (activities: RecentActivity[]): ActivityStats => {
  const safeActivities = Array.isArray(activities) ? activities : [];
  const now = Date.now();
  const from30DaysAgo = now - THIRTY_DAYS_IN_MS;

  return safeActivities.reduce<ActivityStats>(
    (acc, activity) => {
      const distance = Number.isFinite(activity.distance) ? activity.distance : 0;
      const movingTime = Number.isFinite(activity.movingTime) ? activity.movingTime : 0;
      const startedAt = new Date(activity.startDate).getTime();
      const isInRecent30Days = Number.isFinite(startedAt) && startedAt >= from30DaysAgo && startedAt <= now;

      acc.totalActivities += 1;
      acc.totalDistanceMeters += Math.max(distance, 0);
      acc.totalMovingTimeSeconds += Math.max(movingTime, 0);

      if (isInRecent30Days) {
        acc.recent30DaysActivities += 1;
      }

      return acc;
    },
    {
      totalActivities: 0,
      totalDistanceMeters: 0,
      totalMovingTimeSeconds: 0,
      recent30DaysActivities: 0,
    },
  );
};


import { RecentActivity } from '@/lib/types/activity';
import { ActivityFilters, ActivityPeriodFilter } from '@/lib/types/activity-filter';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const PERIOD_DAY_MAP: Record<Exclude<ActivityPeriodFilter, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const isWithinPeriod = (activityDate: string, period: ActivityPeriodFilter): boolean => {
  if (period === 'all') {
    return true;
  }

  const parsedDate = new Date(activityDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const now = Date.now();
  const elapsedDays = (now - parsedDate.getTime()) / DAY_IN_MS;
  return elapsedDays <= PERIOD_DAY_MAP[period];
};

export const getActivityTypeOptions = (activities: RecentActivity[]): string[] => {
  const set = new Set(activities.map((activity) => activity.type));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

export const filterActivities = (
  activities: RecentActivity[],
  filters: ActivityFilters,
): RecentActivity[] =>
  activities.filter((activity) => {
    const matchesType = filters.type === 'all' || activity.type === filters.type;
    const matchesPeriod = isWithinPeriod(activity.startDate, filters.period);

    return matchesType && matchesPeriod;
  });

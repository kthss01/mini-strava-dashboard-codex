export type ActivityPeriodFilter = '7d' | '30d' | '90d' | 'all';

export interface ActivityFilters {
  type: string;
  period: ActivityPeriodFilter;
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  type: 'all',
  period: '30d',
};

export const ACTIVITY_PERIOD_OPTIONS: Array<{ label: string; value: ActivityPeriodFilter }> = [
  { label: '최근 7일', value: '7d' },
  { label: '최근 30일', value: '30d' },
  { label: '최근 90일', value: '90d' },
  { label: '전체', value: 'all' },
];

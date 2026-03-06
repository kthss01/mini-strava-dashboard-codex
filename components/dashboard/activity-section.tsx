import { ActivityList } from '@/components/dashboard/activity-list';
import {
  ACTIVITY_PERIOD_OPTIONS,
  ActivityFilters,
} from '@/lib/types/activity-filter';
import { RecentActivity } from '@/lib/types/activity';

interface ActivitySectionProps {
  activities: RecentActivity[];
  selectedActivityId: number | null;
  isLoading: boolean;
  errorMessage: string | null;
  filters: ActivityFilters;
  activityTypes: string[];
  onSelectActivity: (activity: RecentActivity) => void;
  onFiltersChange: (next: ActivityFilters) => void;
}

export function ActivitySection({
  activities,
  selectedActivityId,
  isLoading,
  errorMessage,
  filters,
  activityTypes,
  onSelectActivity,
  onFiltersChange,
}: ActivitySectionProps) {
  return (
    <ActivityList
      activities={activities}
      isLoading={isLoading}
      errorMessage={errorMessage}
      selectedActivityId={selectedActivityId}
      onSelectActivity={onSelectActivity}
      filters={filters}
      activityTypes={activityTypes}
      onFiltersChange={onFiltersChange}
      periodOptions={ACTIVITY_PERIOD_OPTIONS}
    />
  );
}

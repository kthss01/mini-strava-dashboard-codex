import { SectionShell } from '@/components/common/section-shell';
import { RecentActivity } from '@/lib/types/activity';
import { ActivityFilters, ActivityPeriodFilter } from '@/lib/types/activity-filter';
import { formatDateKR, formatDistanceFromMeters, formatDurationFromSeconds } from '@/lib/utils/format';

interface ActivityListProps {
  activities: RecentActivity[];
  isLoading: boolean;
  errorMessage: string | null;
  selectedActivityId: number | null;
  onSelectActivity: (activity: RecentActivity) => void;
  filters: ActivityFilters;
  activityTypes: string[];
  periodOptions: Array<{ label: string; value: ActivityPeriodFilter }>;
  onFiltersChange: (next: ActivityFilters) => void;
}

export function ActivityList({
  activities,
  isLoading,
  errorMessage,
  selectedActivityId,
  onSelectActivity,
  filters,
  activityTypes,
  periodOptions,
  onFiltersChange,
}: ActivityListProps) {
  return (
    <SectionShell
      title="최근 활동"
      description="필터 기준에 맞는 활동 목록입니다."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="activity-type-filter">
            활동 종류 필터
          </label>
          <select
            id="activity-type-filter"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            value={filters.type}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                type: event.target.value,
              })
            }
          >
            <option value="all">모든 종류</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="activity-period-filter">
            기간 필터
          </label>
          <select
            id="activity-period-filter"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            value={filters.period}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                period: event.target.value as ActivityPeriodFilter,
              })
            }
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-base font-semibold text-slate-800">활동을 불러오는 중입니다...</p>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-base font-semibold text-rose-700">활동을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-base font-semibold text-slate-800">필터 조건에 맞는 활동이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">다른 종류 또는 기간을 선택해보세요.</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && activities.length > 0 ? (
        <ul className="space-y-3">
          {activities.map((activity) => {
            const isSelected = selectedActivityId === activity.id;

            return (
              <li key={activity.id}>
                <button
                  type="button"
                  className={`w-full rounded-xl border bg-slate-50 p-4 text-left transition hover:border-slate-300 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-slate-100'
                  }`}
                  onClick={() => onSelectActivity(activity)}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="font-semibold text-slate-900">{activity.name}</p>
                    <div className="text-right text-sm text-slate-500">
                      <p>{activity.type}</p>
                      <p>{formatDateKR(activity.startDate)}</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-slate-500">거리</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatDistanceFromMeters(activity.distance)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">이동 시간</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatDurationFromSeconds(activity.movingTime)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">날짜</dt>
                      <dd className="font-semibold text-slate-900">{formatDateKR(activity.startDate)}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionShell>
  );
}

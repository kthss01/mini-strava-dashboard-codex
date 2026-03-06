import { SectionShell } from '@/components/common/section-shell';
import { RecentActivity } from '@/lib/types/activity';
import { formatDateKR, formatDistance, formatDuration } from '@/lib/utils/format';

interface ActivityListProps {
  activities: RecentActivity[];
  isLoading: boolean;
  errorMessage: string | null;
  selectedActivityId: number | null;
  onSelectActivity: (activity: RecentActivity) => void;
}

export function ActivityList({
  activities,
  isLoading,
  errorMessage,
  selectedActivityId,
  onSelectActivity,
}: ActivityListProps) {
  return (
    <SectionShell
      title="최근 활동"
      description="최근 30일 활동을 기반으로 표시됩니다."
      action={
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          필터 (다음 단계)
        </button>
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
          <p className="text-base font-semibold text-slate-800">표시할 활동이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">최근 활동이 생기면 이곳에 표시됩니다.</p>
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
                        {formatDistance(activity.distance / 1000)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">이동 시간</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatDuration(Math.round(activity.movingTime / 60))}
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

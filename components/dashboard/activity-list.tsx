import { SectionShell } from '@/components/common/section-shell';
import { StravaActivity } from '@/lib/types/strava';
import { formatDateKR, formatDistance, formatDuration } from '@/lib/utils/format';

interface ActivityListProps {
  activities: StravaActivity[];
}

export function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <SectionShell
        title="최근 활동"
        description="최근 30일 활동을 기반으로 표시됩니다."
      >
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-base font-semibold text-slate-800">표시할 활동이 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">Strava 계정을 연결하면 활동이 표시됩니다.</p>
        </div>
      </SectionShell>
    );
  }

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
      <ul className="space-y-3">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{activity.name}</p>
                <p className="text-sm text-slate-500">{activity.locationLabel}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{activity.type}</p>
                <p>{formatDateKR(activity.startDateLocal)}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">거리</dt>
                <dd className="font-semibold text-slate-900">{formatDistance(activity.distanceKm)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">시간</dt>
                <dd className="font-semibold text-slate-900">{formatDuration(activity.movingTimeMin)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">고도</dt>
                <dd className="font-semibold text-slate-900">{activity.elevationGainM}m</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

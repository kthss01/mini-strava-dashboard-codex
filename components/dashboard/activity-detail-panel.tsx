import { RecentActivity } from '@/lib/types/activity';
import {
  formatAverageSpeedFromMetersPerSecond,
  formatDateKR,
  formatDistanceFromMeters,
  formatDurationFromSeconds,
  formatElevationFromMeters,
} from '@/lib/utils/format';

interface ActivityDetailPanelProps {
  activity: RecentActivity;
}

const Item = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
  </div>
);

export function ActivityDetailPanel({ activity }: ActivityDetailPanelProps) {
  return (
    <section className="border-b border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">선택 활동 상세</h3>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Item label="활동명" value={activity.name || '-'} />
        <Item label="운동 종류" value={activity.type || '-'} />
        <Item label="날짜" value={formatDateKR(activity.startDate)} />
        <Item label="거리" value={formatDistanceFromMeters(activity.distance)} />
        <Item label="이동 시간" value={formatDurationFromSeconds(activity.movingTime)} />
        <Item label="Elapsed time" value={formatDurationFromSeconds(activity.elapsedTime)} />
        <Item
          label="평균 속도"
          value={formatAverageSpeedFromMetersPerSecond(activity.averageSpeed)}
        />
        <Item label="고도 상승" value={formatElevationFromMeters(activity.totalElevationGain)} />
      </dl>
    </section>
  );
}

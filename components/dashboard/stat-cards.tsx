import { RecentActivity } from '@/lib/types/activity';
import { getActivityStats } from '@/lib/utils/activity-stats';
import { formatDistanceFromMeters, formatDurationFromSeconds, formatNumber } from '@/lib/utils/format';

interface StatCardsProps {
  activities: RecentActivity[];
}

export function StatCards({ activities }: StatCardsProps) {
  const stats = getActivityStats(activities);

  const cards = [
    {
      label: '총 활동 수',
      value: `${formatNumber(stats.totalActivities)}회`,
      helper: '전체 기간 기준',
      accent: '🏁',
    },
    {
      label: '총 거리',
      value: formatDistanceFromMeters(stats.totalDistanceMeters),
      helper: '미터 합산 후 km 변환',
      accent: '📏',
    },
    {
      label: '총 이동 시간',
      value: formatDurationFromSeconds(stats.totalMovingTimeSeconds),
      helper: 'moving_time 기준',
      accent: '⏱️',
    },
    {
      label: '최근 30일 활동 수',
      value: `${formatNumber(stats.recent30DaysActivities)}회`,
      helper: '오늘 기준 최근 30일',
      accent: '🗓️',
    },
  ];

  return (
    <section aria-label="활동 통계 카드" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
        >
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{card.value}</p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">{card.helper}</p>
            <p className="text-xl" aria-hidden="true">
              {card.accent}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

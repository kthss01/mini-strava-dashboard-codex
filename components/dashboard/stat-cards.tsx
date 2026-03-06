import { ActivitySummary } from '@/lib/types/strava';
import { formatDistance, formatDuration } from '@/lib/utils/format';

interface StatCardsProps {
  summary: ActivitySummary;
}

export function StatCards({ summary }: StatCardsProps) {
  const cards = [
    { label: '총 활동 수', value: `${summary.totalActivities}회`, accent: '🏁' },
    { label: '총 거리', value: formatDistance(summary.totalDistanceKm), accent: '📏' },
    { label: '총 이동 시간', value: formatDuration(summary.totalMovingTimeMin), accent: '⏱️' },
    {
      label: '총 누적 고도',
      value: `${summary.totalElevationGainM.toLocaleString()}m`,
      accent: '⛰️',
    },
  ];

  return (
    <section aria-label="활동 통계 카드" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
        >
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
          <p className="mt-2 text-xl">{card.accent}</p>
        </article>
      ))}
    </section>
  );
}

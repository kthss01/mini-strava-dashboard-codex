'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

import { Header } from '@/components/dashboard/header';
import { PageTabs } from '@/components/common/page-tabs';
import { SectionShell } from '@/components/common/section-shell';
import { fetchHeatmapActivities } from '@/lib/api/heatmap-activities';
import { HeatmapFilters, HeatmapPoint, HeatmapStats, HeatmapSportType } from '@/lib/types/heatmap';

const HeatmapMap = dynamic(
  () => import('@/components/heatmap/heatmap-map').then((module) => module.HeatmapMap),
  {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-600">지도를 준비 중...</div>,
  },
);

const SPORT_OPTIONS: Array<{ label: string; value: HeatmapSportType }> = [
  { label: '전체', value: 'all' },
  { label: 'Ride', value: 'Ride' },
  { label: 'Run', value: 'Run' },
  { label: 'Walk', value: 'Walk' },
  { label: 'Hike', value: 'Hike' },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 8 }, (_, idx) => currentYear - idx);
const monthOptions = Array.from({ length: 12 }, (_, idx) => idx + 1);

const DEFAULT_FILTERS: HeatmapFilters = {
  year: 'all',
  month: 'all',
  sportType: 'all',
};

export function HeatmapClient() {
  const [filters, setFilters] = useState<HeatmapFilters>(DEFAULT_FILTERS);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const hasPoints = points.length > 0;

  const summary = useMemo(() => {
    if (!stats) return null;

    return [
      { label: '조회된 활동', value: `${stats.matchedActivityCount}개` },
      { label: '경로 포함 활동', value: `${stats.usedPolylineActivityCount}개` },
      { label: '집계된 히트 포인트', value: `${stats.aggregatedPointCount.toLocaleString()}개` },
    ];
  }, [stats]);

  const onClickFetch = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setHasRequested(true);

    try {
      const response = await fetchHeatmapActivities(filters);
      setPoints(response.points);
      setStats(response.stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : '히트맵 조회 중 오류가 발생했습니다.';
      setPoints([]);
      setStats(null);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
      <Header />
      <PageTabs current="heatmap" />

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionShell title="히트맵 필터" description="조건을 설정한 뒤 버튼을 눌러 조회하세요.">
            <div className="space-y-4">
              <div>
                <label htmlFor="heatmap-year" className="mb-1 block text-xs font-semibold text-slate-600">연도</label>
                <select
                  id="heatmap-year"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  value={filters.year}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      year: event.target.value === 'all' ? 'all' : Number(event.target.value),
                      month: event.target.value === 'all' ? 'all' : prev.month,
                    }))
                  }
                >
                  <option value="all">전체 기간</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="heatmap-month" className="mb-1 block text-xs font-semibold text-slate-600">월</label>
                <select
                  id="heatmap-month"
                  disabled={filters.year === 'all'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
                  value={filters.month}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      month: event.target.value === 'all' ? 'all' : Number(event.target.value),
                    }))
                  }
                >
                  <option value="all">전체 월</option>
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>{month}월</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="heatmap-sport" className="mb-1 block text-xs font-semibold text-slate-600">종목</label>
                <select
                  id="heatmap-sport"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  value={filters.sportType}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      sportType: event.target.value as HeatmapSportType,
                    }))
                  }
                >
                  {SPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={onClickFetch}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                히트맵 불러오기
              </button>
            </div>
          </SectionShell>

          {summary ? (
            <SectionShell title="간단 통계">
              <dl className="space-y-3 text-sm">
                {summary.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="font-semibold text-slate-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </SectionShell>
          ) : null}
        </div>

        <div className="lg:col-span-8">
          <SectionShell title="활동 히트맵" description="진한 색상일수록 자주 지나간 구간입니다.">
            <div className="h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {isLoading ? <div className="flex h-full items-center justify-center text-sm text-slate-700">히트맵 데이터를 불러오는 중...</div> : null}
              {!isLoading && errorMessage ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-rose-600">{errorMessage}</div> : null}
              {!isLoading && !errorMessage && !hasRequested ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">필터를 설정하고 &quot;히트맵 불러오기&quot;를 눌러주세요.</div> : null}
              {!isLoading && !errorMessage && hasRequested && !hasPoints ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">조건에 맞는 경로 데이터가 없습니다.</div> : null}
              {!isLoading && !errorMessage && hasPoints ? <HeatmapMap points={points} /> : null}
            </div>
          </SectionShell>
        </div>
      </section>
    </main>
  );
}

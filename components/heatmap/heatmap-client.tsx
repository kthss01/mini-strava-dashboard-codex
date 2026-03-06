'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';

import { PageTabs } from '@/components/common/page-tabs';
import { SectionShell } from '@/components/common/section-shell';
import { Header } from '@/components/dashboard/header';
import { fetchHeatmapActivities } from '@/lib/api/heatmap-activities';
import {
  HeatmapApiTimings,
  HeatmapFilters,
  HeatmapLoadingPhase,
  HeatmapPoint,
  HeatmapSportType,
  HeatmapStats,
} from '@/lib/types/heatmap';

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

const RIDE_SUB_TYPE_OPTIONS = [
  { label: '전체 Ride', value: 'all' },
  { label: 'Ride', value: 'Ride' },
  { label: 'GravelRide', value: 'GravelRide' },
  { label: 'MountainBikeRide', value: 'MountainBikeRide' },
  { label: 'VirtualRide', value: 'VirtualRide' },
  { label: 'EBikeRide', value: 'EBikeRide' },
  { label: 'EMountainBikeRide', value: 'EMountainBikeRide' },
] as const;

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 8 }, (_, idx) => currentYear - idx);
const monthOptions = Array.from({ length: 12 }, (_, idx) => idx + 1);

const DEFAULT_FILTERS: HeatmapFilters = {
  year: 'all',
  month: 'all',
  sportType: 'all',
  rideSubType: 'all',
};

const PHASE_ORDER: HeatmapLoadingPhase[] = ['auth', 'fetchActivities', 'aggregateRoutes', 'render'];

const PHASE_LABELS: Record<HeatmapLoadingPhase, string> = {
  auth: '인증 확인',
  fetchActivities: '활동 조회',
  aggregateRoutes: '경로 집계',
  render: '렌더링',
};

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

export function HeatmapClient() {
  const [filters, setFilters] = useState<HeatmapFilters>(DEFAULT_FILTERS);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<HeatmapLoadingPhase>('auth');
  const [phaseTimings, setPhaseTimings] = useState<HeatmapApiTimings | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [showExactRoute, setShowExactRoute] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasPoints = points.length > 0;
  const loadingPhaseIndex = PHASE_ORDER.indexOf(loadingPhase);

  const summary = useMemo(() => {
    if (!stats) return null;

    const breakdownSummary =
      stats.typeBreakdown.length > 0
        ? stats.typeBreakdown.slice(0, 3).map((item) => `${item.type} ${item.count}회`).join(' · ')
        : '-';

    return [
      { label: '조회된 활동', value: `${stats.matchedActivityCount}개` },
      { label: '경로 포함 활동', value: `${stats.usedPolylineActivityCount}개` },
      { label: '집계된 히트 포인트', value: `${stats.aggregatedPointCount.toLocaleString()}개` },
      { label: '총 이동 거리', value: `${stats.totalDistanceKm.toLocaleString()} km` },
      { label: '총 이동 시간', value: `${stats.totalMovingTimeHours.toLocaleString()} 시간` },
      { label: '총 상승 고도', value: `${stats.totalElevationGainM.toLocaleString()} m` },
      { label: '활동 유형 분포', value: breakdownSummary },
    ];
  }, [stats]);

  const onClickFetch = async () => {
    abortControllerRef.current?.abort();

    const nextController = new AbortController();
    abortControllerRef.current = nextController;

    setIsLoading(true);
    setLoadingPhase('auth');
    setPhaseTimings(null);
    setErrorMessage(null);
    setHasRequested(true);

    try {
      const response = await fetchHeatmapActivities(filters, {
        signal: nextController.signal,
        onProgressPhase: (update) => {
          setLoadingPhase(update.phase);
          if (update.timings) {
            setPhaseTimings(update.timings);
          }
        },
      });

      if (abortControllerRef.current !== nextController) {
        return;
      }

      setPoints(response.points);
      setStats(response.stats);
      const responseTimings = response.meta?.timings ?? response.meta?.timingsMs;
      if (responseTimings) {
        setPhaseTimings(responseTimings);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      if (abortControllerRef.current !== nextController) {
        return;
      }

      const message = error instanceof Error ? error.message : '히트맵 조회 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      if (abortControllerRef.current === nextController) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const renderLoadingState = () => (
    <div className="absolute inset-x-0 top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
      <p className="text-sm font-semibold text-slate-700">히트맵 갱신 중: {PHASE_LABELS[loadingPhase]}</p>
      <ol className="mt-2 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
        {PHASE_ORDER.map((phase, index) => {
          const isDone = index < loadingPhaseIndex;
          const isCurrent = phase === loadingPhase;
          return (
            <li key={phase} className={isDone || isCurrent ? 'text-blue-700' : undefined}>
              {isDone ? '✓' : isCurrent ? '•' : '○'} {PHASE_LABELS[phase]}
            </li>
          );
        })}
      </ol>
      {phaseTimings?.total ? <p className="mt-1 text-[11px] text-slate-500">최근 서버 응답 시간: {phaseTimings.total.toFixed(2)}ms</p> : null}
    </div>
  );

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
                      rideSubType: event.target.value === 'Ride' ? prev.rideSubType : 'all',
                    }))
                  }
                >
                  {SPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="heatmap-ride-sub-type" className="mb-1 block text-xs font-semibold text-slate-600">Ride 세부 종류</label>
                <select
                  id="heatmap-ride-sub-type"
                  disabled={filters.sportType !== 'Ride'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
                  value={filters.rideSubType}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      rideSubType: event.target.value as HeatmapFilters['rideSubType'],
                    }))
                  }
                >
                  {RIDE_SUB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={onClickFetch}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                히트맵 불러오기
              </button>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showExactRoute}
                  onChange={(event) => setShowExactRoute(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>이동 경로를 정확한 점 위치로 보기</span>
              </label>
            </div>
          </SectionShell>

          {summary ? (
            <SectionShell title="간단 통계">
              <dl className="space-y-3 text-sm">
                {summary.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="text-right font-semibold text-slate-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </SectionShell>
          ) : null}
        </div>

        <div className="lg:col-span-8">
          <SectionShell
            title="활동 히트맵"
            description={showExactRoute ? '체크 해제 시 활동량 기준 히트맵으로 돌아갑니다.' : '진한 색상일수록 자주 지나간 구간입니다.'}
          >
            <div className="relative h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {isLoading ? renderLoadingState() : null}
              {errorMessage ? <div className="absolute inset-x-0 bottom-0 z-20 bg-rose-50 px-4 py-2 text-center text-sm text-rose-600">{errorMessage}</div> : null}
              {!hasRequested ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">필터를 설정하고 &quot;히트맵 불러오기&quot;를 눌러주세요.</div> : null}
              {hasRequested && !hasPoints ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">조건에 맞는 경로 데이터가 없습니다.</div> : null}
              {hasPoints ? <HeatmapMap points={points} showExactRoute={showExactRoute} /> : null}
            </div>
          </SectionShell>
        </div>
      </section>
    </main>
  );
}

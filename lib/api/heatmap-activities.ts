import {
  HeatmapApiError,
  HeatmapApiSuccess,
  HeatmapApiTimings,
  HeatmapFilters,
  HeatmapLoadingPhase,
  HeatmapPoint,
  HeatmapRoute,
  HeatmapStats,
} from '@/lib/types/heatmap';

const buildQuery = (filters: HeatmapFilters): string => {
  const search = new URLSearchParams();

  if (filters.year !== 'all') {
    search.set('year', String(filters.year));
  }

  if (filters.month !== 'all') {
    search.set('month', String(filters.month));
  }

  search.set('sportType', filters.sportType);

  if (filters.sportType === 'Ride' && filters.rideSubType !== 'all') {
    search.set('rideSubType', filters.rideSubType);
  }

  return search.toString();
};

export interface HeatmapProgressUpdate {
  phase: HeatmapLoadingPhase;
  timings?: HeatmapApiTimings;
}

export interface HeatmapFetchOptions {
  signal?: AbortSignal;
  onProgressPhase?: (update: HeatmapProgressUpdate) => void;
}

export const fetchHeatmapActivities = async (
  filters: HeatmapFilters,
  options?: HeatmapFetchOptions,
): Promise<{ points: HeatmapPoint[]; routes: HeatmapRoute[]; stats: HeatmapStats; meta?: HeatmapApiSuccess['data']['meta'] }> => {
  options?.onProgressPhase?.({ phase: 'auth' });

  const response = await fetch(`/api/activities/heatmap?${buildQuery(filters)}`, {
    method: 'GET',
    cache: 'no-store',
    signal: options?.signal,
  });

  options?.onProgressPhase?.({ phase: 'fetchActivities' });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload as HeatmapApiError | null;
    throw new Error(error?.error?.message ?? '히트맵 데이터를 불러오지 못했습니다.');
  }

  const result = payload as HeatmapApiSuccess;
  if (!result?.data || !Array.isArray(result.data.points) || !result.data.stats) {
    throw new Error('히트맵 응답 형식이 올바르지 않습니다.');
  }

  const responseMeta = result.data.meta;
  const timings = responseMeta?.timings ?? responseMeta?.timingsMs;

  options?.onProgressPhase?.({
    phase: responseMeta?.phase ?? 'aggregateRoutes',
    timings,
  });
  options?.onProgressPhase?.({
    phase: 'render',
    timings,
  });

  return {
    points: result.data.points,
    routes: Array.isArray(result.data.routes) ? result.data.routes : [],
    stats: result.data.stats,
    meta: responseMeta,
  };
};

import { HeatmapApiError, HeatmapApiSuccess, HeatmapFilters, HeatmapPoint, HeatmapStats } from '@/lib/types/heatmap';

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

export interface HeatmapFetchOptions {
  onProgress?: (percent: number) => void;
}

export const fetchHeatmapActivities = async (
  filters: HeatmapFilters,
  options?: HeatmapFetchOptions,
): Promise<{ points: HeatmapPoint[]; stats: HeatmapStats }> => {
  options?.onProgress?.(20);

  const response = await fetch(`/api/activities/heatmap?${buildQuery(filters)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  options?.onProgress?.(70);

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload as HeatmapApiError | null;
    throw new Error(error?.error?.message ?? '히트맵 데이터를 불러오지 못했습니다.');
  }

  const result = payload as HeatmapApiSuccess;
  if (!result?.data || !Array.isArray(result.data.points) || !result.data.stats) {
    throw new Error('히트맵 응답 형식이 올바르지 않습니다.');
  }

  options?.onProgress?.(100);

  return {
    points: result.data.points,
    stats: result.data.stats,
  };
};

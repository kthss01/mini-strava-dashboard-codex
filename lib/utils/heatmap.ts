import { HeatmapPoint } from '@/lib/types/heatmap';

const GRID_SIZE = 0.0015;
const DEFAULT_MAX_POINTS_PER_ACTIVITY = 220;
const MIN_MAX_POINTS_PER_ACTIVITY = 40;

type ActivityHeatmapInput = {
  cacheKey: string;
  summaryPolyline: string;
};

type SamplePoint = { lat: number; lng: number };

type ActivityDecodeCacheItem = {
  sampledPoints: SamplePoint[];
  rawPointCount: number;
};

type HeatmapProcessingMetrics = {
  elapsedMs: number;
  memoryUsageMb: number | null;
  cellCount: number;
  rawPointCount: number;
  activityCount: number;
};

type BuildHeatmapOptions = {
  maxPointsPerActivity?: number;
  maxPointsResolver?: (activity: ActivityHeatmapInput) => number;
  maxOutputCells?: number;
  minIntensity?: number;
  onBeforeFinalize?: (metrics: HeatmapProcessingMetrics) => void;
};

const activityDecodeCache = new Map<string, ActivityDecodeCacheItem>();

const getCellKey = (lat: number, lng: number): string => {
  const latKey = Math.round(lat / GRID_SIZE);
  const lngKey = Math.round(lng / GRID_SIZE);
  return `${latKey}:${lngKey}`;
};

const getRuntimeMemoryMb = (): number | null => {
  if (typeof process === 'undefined' || typeof process.memoryUsage !== 'function') {
    return null;
  }

  return Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2));
};

const clampMaxPoints = (value?: number): number => {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_MAX_POINTS_PER_ACTIVITY;
  }

  return Math.max(MIN_MAX_POINTS_PER_ACTIVITY, Math.round(value));
};

const countPolylinePoints = (summaryPolyline: string): number => {
  let index = 0;
  let count = 0;

  while (index < summaryPolyline.length) {
    let byteValue = 0;

    do {
      byteValue = summaryPolyline.charCodeAt(index++) - 63 - 1;
    } while (byteValue >= 0x1f);

    do {
      byteValue = summaryPolyline.charCodeAt(index++) - 63 - 1;
    } while (byteValue >= 0x1f);

    count += 1;
  }

  return count;
};

const streamSampledPoints = (
  summaryPolyline: string,
  maxPointsPerActivity: number,
  onPoint: (point: SamplePoint) => void,
): { sampledPoints: SamplePoint[]; rawPointCount: number } => {
  const rawPointCount = countPolylinePoints(summaryPolyline);
  const step = rawPointCount > maxPointsPerActivity ? Math.ceil(rawPointCount / maxPointsPerActivity) : 1;

  const sampledPoints: SamplePoint[] = [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  let pointIndex = 0;

  while (index < summaryPolyline.length) {
    let result = 1;
    let shift = 0;
    let byteValue: number;

    do {
      byteValue = summaryPolyline.charCodeAt(index++) - 63 - 1;
      result += byteValue << shift;
      shift += 5;
    } while (byteValue >= 0x1f);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;

    do {
      byteValue = summaryPolyline.charCodeAt(index++) - 63 - 1;
      result += byteValue << shift;
      shift += 5;
    } while (byteValue >= 0x1f);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    if (pointIndex % step === 0) {
      const point = {
        lat: lat * 1e-5,
        lng: lng * 1e-5,
      };
      sampledPoints.push(point);
      onPoint(point);
    }

    pointIndex += 1;
  }

  return {
    sampledPoints,
    rawPointCount: sampledPoints.length,
  };
};

const addPointToGrid = (
  grid: Map<string, { lat: number; lng: number; count: number }>,
  point: SamplePoint,
) => {
  const key = getCellKey(point.lat, point.lng);
  const existing = grid.get(key);

  if (existing) {
    existing.count += 1;
    return;
  }

  grid.set(key, {
    lat: point.lat,
    lng: point.lng,
    count: 1,
  });
};

export const buildAggregatedHeatmapPoints = (
  activities: ActivityHeatmapInput[],
  options: BuildHeatmapOptions = {},
): {
  points: HeatmapPoint[];
  rawPointCount: number;
} => {
  const startedAt = Date.now();
  const grid = new Map<string, { lat: number; lng: number; count: number }>();
  let rawPointCount = 0;

  for (const activity of activities) {
    const maxPointsPerActivity = clampMaxPoints(options.maxPointsResolver?.(activity) ?? options.maxPointsPerActivity);
    const cached = activityDecodeCache.get(activity.cacheKey);

    if (cached) {
      rawPointCount += cached.rawPointCount;

      for (const point of cached.sampledPoints) {
        addPointToGrid(grid, point);
      }

      continue;
    }

    const streamed = streamSampledPoints(activity.summaryPolyline, maxPointsPerActivity, (point) => {
      addPointToGrid(grid, point);
    });

    rawPointCount += streamed.rawPointCount;
    activityDecodeCache.set(activity.cacheKey, streamed);
  }

  options.onBeforeFinalize?.({
    elapsedMs: Date.now() - startedAt,
    memoryUsageMb: getRuntimeMemoryMb(),
    cellCount: grid.size,
    rawPointCount,
    activityCount: activities.length,
  });

  const maxCount = Math.max(...Array.from(grid.values(), (cell) => cell.count), 1);
  const minIntensity = Math.min(Math.max(options.minIntensity ?? 0, 0), 1);

  const filteredCells = Array.from(grid.values())
    .filter((cell) => cell.count / maxCount >= minIntensity)
    .sort((a, b) => b.count - a.count);

  const limitedCells =
    typeof options.maxOutputCells === 'number' && options.maxOutputCells > 0
      ? filteredCells.slice(0, options.maxOutputCells)
      : filteredCells;

  const points = limitedCells.map((cell) => ({
    lat: cell.lat,
    lng: cell.lng,
    intensity: Math.min(1, cell.count / maxCount),
  }));

  return {
    points,
    rawPointCount,
  };
};

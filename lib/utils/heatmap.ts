import { decodePolyline } from '@/lib/utils/polyline';

import { HeatmapPoint } from '@/lib/types/heatmap';

const GRID_SIZE = 0.0015;
const MAX_POINTS_PER_ACTIVITY = 220;

const getCellKey = (lat: number, lng: number): string => {
  const latKey = Math.round(lat / GRID_SIZE);
  const lngKey = Math.round(lng / GRID_SIZE);
  return `${latKey}:${lngKey}`;
};

const decodePolylineToSampledPoints = (summaryPolyline: string): Array<{ lat: number; lng: number }> => {
  const decoded = decodePolyline(summaryPolyline);

  if (decoded.length <= MAX_POINTS_PER_ACTIVITY) {
    return decoded;
  }

  const step = Math.ceil(decoded.length / MAX_POINTS_PER_ACTIVITY);
  return decoded.filter((_, index) => index % step === 0);
};

export const buildAggregatedHeatmapPoints = (
  polylines: string[],
): {
  points: HeatmapPoint[];
  rawPointCount: number;
} => {
  const grid = new Map<string, { lat: number; lng: number; count: number }>();
  let rawPointCount = 0;

  for (const polyline of polylines) {
    const points = decodePolylineToSampledPoints(polyline);
    rawPointCount += points.length;

    for (const point of points) {
      const key = getCellKey(point.lat, point.lng);
      const existing = grid.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        grid.set(key, {
          lat: point.lat,
          lng: point.lng,
          count: 1,
        });
      }
    }
  }

  const maxCount = Math.max(...Array.from(grid.values(), (cell) => cell.count), 1);
  const points = Array.from(grid.values()).map((cell) => ({
    lat: cell.lat,
    lng: cell.lng,
    intensity: Math.min(1, cell.count / maxCount),
  }));

  return {
    points,
    rawPointCount,
  };
};

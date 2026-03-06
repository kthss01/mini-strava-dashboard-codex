'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';

import L, { LatLngExpression } from 'leaflet';
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet.heat';

import { HeatmapPoint, HeatmapRoute } from '@/lib/types/heatmap';

const DEFAULT_CENTER: LatLngExpression = [37.5665, 126.978];
const DEFAULT_ZOOM = 11;
const SINGLE_POINT_ZOOM = 12;
const MAX_FIT_ZOOM = 13;

const pickApproximateRange = (values: number[]): [number, number] => {
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.05);

  const min = sorted[Math.min(trimCount, sorted.length - 1)];
  const max = sorted[Math.max(sorted.length - trimCount - 1, 0)];

  return [min, max];
};

const getApproximateBounds = (points: HeatmapPoint[]): L.LatLngBounds | null => {
  if (points.length < 2) {
    return null;
  }

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const [minLat, maxLat] = pickApproximateRange(latitudes);
  const [minLng, maxLng] = pickApproximateRange(longitudes);

  return L.latLngBounds(
    [minLat, minLng],
    [maxLat, maxLng],
  );
};

function fitMapToPoints(map: L.Map, points: HeatmapPoint[]) {
  if (points.length > 1) {
    const approximateBounds = getApproximateBounds(points);

    if (approximateBounds && approximateBounds.isValid()) {
      map.fitBounds(approximateBounds.pad(0.18), {
        maxZoom: MAX_FIT_ZOOM,
      });
      return;
    }
  }

  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], SINGLE_POINT_ZOOM);
    return;
  }

  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}

function HeatLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const latLngTriples = points.map((point) => [point.lat, point.lng, point.intensity] as [number, number, number]);

    const heatLayer = L.heatLayer(latLngTriples, {
      radius: 16,
      blur: 20,
      maxZoom: 16,
      minOpacity: 0.2,
      gradient: {
        0.15: '#38bdf8',
        0.35: '#2563eb',
        0.6: '#7c3aed',
        0.8: '#ef4444',
        1.0: '#f97316',
      },
    });

    heatLayer.addTo(map);

    fitMapToPoints(map, points);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

function ExactRouteLayer({ routes }: { routes: HeatmapRoute[] }) {
  const map = useMap();
  const routePositions = routes
    .map((route) => route.points.map((point) => [point.lat, point.lng] as [number, number]))
    .filter((positions) => positions.length > 1);

  useEffect(() => {
    const allPoints = routes.flatMap((route) =>
      route.points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        intensity: 1,
      })),
    );

    fitMapToPoints(map, allPoints);
  }, [map, routes]);

  if (routePositions.length === 0) {
    return null;
  }

  return (
    <>
      {routePositions.map((positions, index) => (
        <Polyline
          key={`route-${index}`}
          positions={positions}
          pathOptions={{
            color: '#2563eb',
            weight: 3,
            opacity: 0.8,
          }}
        />
      ))}
    </>
  );
}

export function HeatmapMap({ points, routes, showExactRoute }: { points: HeatmapPoint[]; routes: HeatmapRoute[]; showExactRoute: boolean }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showExactRoute ? <ExactRouteLayer routes={routes} /> : <HeatLayer points={points} />}
    </MapContainer>
  );
}

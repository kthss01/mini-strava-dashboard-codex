'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';

import L, { LatLngExpression } from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet.heat';

import { HeatmapPoint } from '@/lib/types/heatmap';

const DEFAULT_CENTER: LatLngExpression = [37.5665, 126.978];
const DEFAULT_ZOOM = 11;

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

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.1));
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

export function HeatmapMap({ points }: { points: HeatmapPoint[] }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer points={points} />
    </MapContainer>
  );
}

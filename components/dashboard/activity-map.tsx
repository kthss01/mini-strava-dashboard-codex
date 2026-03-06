'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo } from 'react';

import L, { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';

import { ActivityCoordinates, RecentActivity } from '@/lib/types/activity';
import { decodePolyline } from '@/lib/utils/polyline';

interface ActivityMapProps {
  selectedActivity: RecentActivity;
}

const FALLBACK_CENTER: LatLngExpression = [37.5665, 126.978];
const FALLBACK_ZOOM = 12;

const START_MARKER_ICON = L.divIcon({
  className: 'strava-start-marker',
  html: '<span class="block h-4 w-4 rounded-full border-2 border-white bg-orange-500 shadow-md" />',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitMapView({ center, path }: { center: ActivityCoordinates; path: ActivityCoordinates[] }) {
  const map = useMap();

  useEffect(() => {
    if (path.length > 1) {
      const bounds: LatLngBoundsExpression = path.map((point) => [point.lat, point.lng]);
      map.fitBounds(bounds, { padding: [24, 24] });
      return;
    }

    map.setView([center.lat, center.lng], FALLBACK_ZOOM, {
      animate: true,
    });
  }, [center.lat, center.lng, map, path]);

  return null;
}

export function ActivityMap({ selectedActivity }: ActivityMapProps) {
  const center = selectedActivity.startLatlng ?? {
    lat: (FALLBACK_CENTER as [number, number])[0],
    lng: (FALLBACK_CENTER as [number, number])[1],
  };

  const decodedPath = useMemo(
    () =>
      selectedActivity.summaryPolyline
        ? decodePolyline(selectedActivity.summaryPolyline)
        : [],
    [selectedActivity.summaryPolyline],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={FALLBACK_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[center.lat, center.lng]} icon={START_MARKER_ICON} />

      {decodedPath.length > 1 ? (
        <Polyline
          positions={decodedPath.map((point) => [point.lat, point.lng])}
          pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9 }}
        />
      ) : null}

      <FitMapView center={center} path={decodedPath} />
    </MapContainer>
  );
}

export const formatNumber = (value: number) => Math.max(0, value).toLocaleString('ko-KR');

export const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)}km`;

export const formatDistanceFromMeters = (distanceMeters: number) =>
  formatDistance(Math.max(distanceMeters, 0) / 1000);

export const formatDuration = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  if (hour === 0) return `${minute}분`;
  if (minute === 0) return `${hour}시간`;
  return `${hour}시간 ${minute}분`;
};

export const formatDurationFromSeconds = (seconds: number) => {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
};

export const formatDateKR = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
};

export const formatAverageSpeedFromMetersPerSecond = (metersPerSecond: number | null) => {
  if (metersPerSecond === null) {
    return '-';
  }

  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
};

export const formatElevationFromMeters = (meters: number | null) => {
  if (meters === null) {
    return '-';
  }

  return `${Math.round(meters).toLocaleString('ko-KR')} m`;
};

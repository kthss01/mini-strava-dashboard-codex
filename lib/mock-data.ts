import { Activity, ActivitySummary } from '@/lib/types/strava';

export const mockActivities: Activity[] = [
  {
    id: 1001,
    name: '아침 한강 러닝',
    type: 'Run',
    distanceKm: 8.4,
    movingTimeMin: 49,
    elapsedTimeMin: 53,
    elevationGainM: 42,
    paceOrSpeedLabel: '5:50/km',
    startDate: '2026-03-02T22:10:00Z',
    startDateLocal: '2026-03-03T07:10:00+09:00',
    timezone: '(GMT+09:00) Asia/Seoul',
    locationLabel: '서울, 대한민국',
    mapPolyline: null,
  },
  {
    id: 1002,
    name: '퇴근길 자전거 라이딩',
    type: 'Ride',
    distanceKm: 21.8,
    movingTimeMin: 63,
    elapsedTimeMin: 68,
    elevationGainM: 111,
    paceOrSpeedLabel: '20.8 km/h',
    startDate: '2026-03-02T10:20:00Z',
    startDateLocal: '2026-03-02T19:20:00+09:00',
    timezone: '(GMT+09:00) Asia/Seoul',
    locationLabel: '서울, 대한민국',
    mapPolyline: null,
  },
  {
    id: 1003,
    name: '주말 북한산 하이킹',
    type: 'Hike',
    distanceKm: 12.1,
    movingTimeMin: 180,
    elapsedTimeMin: 205,
    elevationGainM: 686,
    paceOrSpeedLabel: '14:53/km',
    startDate: '2026-03-01T00:00:00Z',
    startDateLocal: '2026-03-01T09:00:00+09:00',
    timezone: '(GMT+09:00) Asia/Seoul',
    locationLabel: '북한산 국립공원',
    mapPolyline: null,
  },
];

export const mockSummary: ActivitySummary = {
  totalActivities: mockActivities.length,
  totalDistanceKm: mockActivities.reduce((sum, item) => sum + item.distanceKm, 0),
  totalMovingTimeMin: mockActivities.reduce(
    (sum, item) => sum + item.movingTimeMin,
    0,
  ),
  totalElevationGainM: mockActivities.reduce(
    (sum, item) => sum + item.elevationGainM,
    0,
  ),
};

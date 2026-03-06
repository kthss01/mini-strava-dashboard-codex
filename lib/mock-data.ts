import { ActivitySummary, StravaActivity } from '@/lib/types/strava';

export const mockActivities: StravaActivity[] = [
  {
    id: 1001,
    name: '아침 한강 러닝',
    type: 'Run',
    distanceKm: 8.4,
    movingTimeMin: 49,
    elevationGainM: 42,
    startDateLocal: '2026-03-03T07:10:00+09:00',
    locationLabel: '서울, 대한민국',
  },
  {
    id: 1002,
    name: '퇴근길 자전거 라이딩',
    type: 'Ride',
    distanceKm: 21.8,
    movingTimeMin: 63,
    elevationGainM: 111,
    startDateLocal: '2026-03-02T19:20:00+09:00',
    locationLabel: '서울, 대한민국',
  },
  {
    id: 1003,
    name: '주말 북한산 하이킹',
    type: 'Hike',
    distanceKm: 12.1,
    movingTimeMin: 180,
    elevationGainM: 686,
    startDateLocal: '2026-03-01T09:00:00+09:00',
    locationLabel: '북한산 국립공원',
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

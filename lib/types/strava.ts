export type ActivityType =
  | 'Run'
  | 'Ride'
  | 'Walk'
  | 'Hike'
  | 'Swim'
  | 'Workout';

export interface StravaActivity {
  id: number;
  name: string;
  type: ActivityType;
  distanceKm: number;
  movingTimeMin: number;
  elevationGainM: number;
  startDateLocal: string;
  locationLabel: string;
}

export interface ActivitySummary {
  totalActivities: number;
  totalDistanceKm: number;
  totalMovingTimeMin: number;
  totalElevationGainM: number;
}

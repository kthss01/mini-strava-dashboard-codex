export type HeatmapSportType = 'all' | 'Ride' | 'Run' | 'Walk' | 'Hike';
export type HeatmapRideSubType =
  | 'all'
  | 'Ride'
  | 'GravelRide'
  | 'MountainBikeRide'
  | 'VirtualRide'
  | 'EBikeRide'
  | 'EMountainBikeRide';

export interface HeatmapFilters {
  year: 'all' | number;
  month: 'all' | number;
  sportType: HeatmapSportType;
  rideSubType: HeatmapRideSubType;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface HeatmapStats {
  fetchedActivityCount: number;
  matchedActivityCount: number;
  usedPolylineActivityCount: number;
  rawPointCount: number;
  aggregatedPointCount: number;
  totalDistanceKm: number;
  totalMovingTimeHours: number;
  totalElevationGainM: number;
  typeBreakdown: Array<{
    type: string;
    count: number;
  }>;
}

export interface HeatmapApiSuccess {
  success: true;
  data: {
    points: HeatmapPoint[];
    stats: HeatmapStats;
    meta?: {
      phase?: HeatmapLoadingPhase;
      timings?: HeatmapApiTimings;
      timingsMs?: HeatmapApiTimings;
      [key: string]: unknown;
    };
  };
}

export type HeatmapLoadingPhase = 'auth' | 'fetchActivities' | 'aggregateRoutes' | 'render';

export interface HeatmapApiTimings {
  session?: number;
  stravaFetch?: number;
  filter?: number;
  polylineAggregate?: number;
  responseSerialize?: number;
  total?: number;
  [key: string]: number | undefined;
}

export interface HeatmapApiError {
  success: false;
  error?: {
    message?: string;
  };
}

export interface ActivityCoordinates {
  lat: number;
  lng: number;
}

export interface RecentActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  startDate: string;
  averageSpeed: number | null;
  totalElevationGain: number | null;
  startLatlng: ActivityCoordinates | null;
  summaryPolyline: string | null;
}

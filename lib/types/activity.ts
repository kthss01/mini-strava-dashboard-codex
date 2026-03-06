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
  startDate: string;
  startLatlng: ActivityCoordinates | null;
  summaryPolyline: string | null;
}

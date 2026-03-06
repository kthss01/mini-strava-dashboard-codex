const DEFAULT_STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';
const DEFAULT_STRAVA_SCOPES = 'read,activity:read_all';

export type StravaActivityType =
  | 'Run'
  | 'Ride'
  | 'Walk'
  | 'Hike'
  | 'Swim'
  | 'Workout'
  | 'VirtualRide'
  | 'TrailRun'
  | string;

export interface StravaMapSummary {
  id: string;
  polyline: string | null;
  summary_polyline: string | null;
}

export interface StravaAthlete {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  city: string | null;
  state: string | null;
  country: string | null;
  profile: string | null;
  profile_medium: string | null;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: StravaActivityType;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  start_latlng?: [number, number] | [];
  timezone: string;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
  map?: StravaMapSummary;
  athlete?: Pick<StravaAthlete, 'id'>;
}

export interface Activity {
  id: number;
  name: string;
  type: StravaActivityType;
  distanceKm: number;
  movingTimeMin: number;
  elapsedTimeMin: number;
  elevationGainM: number;
  paceOrSpeedLabel: string;
  startDate: string;
  startDateLocal: string;
  timezone: string;
  locationLabel: string;
  mapPolyline: string | null;
}

export interface Athlete {
  id: number;
  username: string | null;
  fullName: string;
  locationLabel: string;
  profileImageUrl: string | null;
}

export interface ActivitySummary {
  totalActivities: number;
  totalDistanceKm: number;
  totalMovingTimeMin: number;
  totalElevationGainM: number;
}

export interface PublicStravaEnv {
  clientId: string;
  redirectUri: string;
  scopes: string;
}

export interface ServerStravaEnv extends PublicStravaEnv {
  clientSecret: string;
  apiBaseUrl: string;
}

const toKm = (meters: number) => Number((meters / 1000).toFixed(2));
const toMin = (seconds: number) => Math.round(seconds / 60);

const formatPaceOrSpeed = (activity: StravaActivity): string => {
  if (activity.type === 'Run' || activity.type === 'Walk' || activity.type === 'Hike') {
    const paceSecPerKm = activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : 0;
    if (!paceSecPerKm) return '-';
    const min = Math.floor(paceSecPerKm / 60);
    const sec = Math.round(paceSecPerKm % 60)
      .toString()
      .padStart(2, '0');
    return `${min}:${sec}/km`;
  }

  const kmh = activity.average_speed * 3.6;
  return `${kmh.toFixed(1)} km/h`;
};

const formatLocationLabel = (...parts: Array<string | null | undefined>): string => {
  const values = parts.filter((value): value is string => Boolean(value?.trim()));
  return values.length ? values.join(', ') : 'Unknown location';
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[strava] Missing required environment variable: ${name}`);
  }
  return value;
};

export const STRAVA_ENV_KEYS = {
  clientId: 'NEXT_PUBLIC_STRAVA_CLIENT_ID',
  clientSecret: 'STRAVA_CLIENT_SECRET',
  redirectUri: 'STRAVA_REDIRECT_URI',
  scopes: 'STRAVA_SCOPES',
  apiBaseUrl: 'STRAVA_API_BASE_URL',
} as const;

export const getPublicStravaEnv = (): PublicStravaEnv => ({
  clientId: requireEnv(STRAVA_ENV_KEYS.clientId),
  redirectUri: requireEnv(STRAVA_ENV_KEYS.redirectUri),
  scopes: process.env[STRAVA_ENV_KEYS.scopes] ?? DEFAULT_STRAVA_SCOPES,
});

export const getServerStravaEnv = (): ServerStravaEnv => {
  const publicEnv = getPublicStravaEnv();

  return {
    ...publicEnv,
    clientSecret: requireEnv(STRAVA_ENV_KEYS.clientSecret),
    apiBaseUrl: process.env[STRAVA_ENV_KEYS.apiBaseUrl] ?? DEFAULT_STRAVA_API_BASE_URL,
  };
};

export const toActivity = (activity: StravaActivity): Activity => ({
  id: activity.id,
  name: activity.name,
  type: activity.type,
  distanceKm: toKm(activity.distance),
  movingTimeMin: toMin(activity.moving_time),
  elapsedTimeMin: toMin(activity.elapsed_time),
  elevationGainM: Math.round(activity.total_elevation_gain),
  paceOrSpeedLabel: formatPaceOrSpeed(activity),
  startDate: activity.start_date,
  startDateLocal: activity.start_date_local,
  timezone: activity.timezone,
  locationLabel: formatLocationLabel(
    activity.location_city,
    activity.location_state,
    activity.location_country,
  ),
  mapPolyline: activity.map?.summary_polyline ?? null,
});

export const toAthlete = (athlete: StravaAthlete): Athlete => ({
  id: athlete.id,
  username: athlete.username,
  fullName: `${athlete.firstname} ${athlete.lastname}`.trim(),
  locationLabel: formatLocationLabel(athlete.city, athlete.state, athlete.country),
  profileImageUrl: athlete.profile ?? athlete.profile_medium,
});

export const toActivitySummary = (activities: Activity[]): ActivitySummary =>
  activities.reduce<ActivitySummary>(
    (acc, activity) => {
      acc.totalActivities += 1;
      acc.totalDistanceKm += activity.distanceKm;
      acc.totalMovingTimeMin += activity.movingTimeMin;
      acc.totalElevationGainM += activity.elevationGainM;
      return acc;
    },
    {
      totalActivities: 0,
      totalDistanceKm: 0,
      totalMovingTimeMin: 0,
      totalElevationGainM: 0,
    },
  );

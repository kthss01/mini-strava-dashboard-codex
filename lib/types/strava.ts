import type {
  Activity,
  ActivitySummary,
  Athlete,
  PublicStravaEnv,
  ServerStravaEnv,
  StravaActivityType,
  StravaAthlete,
} from '@/lib/strava';

export type ActivityType = StravaActivityType;

/**
 * @deprecated Use `Activity` from `@/lib/strava` for transformed client-facing data.
 */
export type StravaActivity = Activity;

export type {
  Activity,
  ActivitySummary,
  Athlete,
  PublicStravaEnv,
  ServerStravaEnv,
  StravaAthlete,
};

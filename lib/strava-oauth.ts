import { cookies } from 'next/headers';

import { getServerStravaEnv } from '@/lib/strava';

const STRAVA_OAUTH_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_OAUTH_STATE_COOKIE = 'strava_oauth_state';
export const STRAVA_SESSION_COOKIE = 'strava_session';

interface StravaTokenExchangeSuccessRaw {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete: {
    id: number;
    username?: string | null;
  };
}

export interface StravaSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  expiresIn: number;
  athleteId: number;
  athleteUsername: string | null;
}

const isStravaTokenExchangeSuccessRaw = (
  value: unknown,
): value is StravaTokenExchangeSuccessRaw => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  const athlete = candidate.athlete;

  if (!athlete || typeof athlete !== 'object') return false;

  return (
    typeof candidate.token_type === 'string' &&
    typeof candidate.access_token === 'string' &&
    typeof candidate.refresh_token === 'string' &&
    typeof candidate.expires_at === 'number' &&
    typeof candidate.expires_in === 'number' &&
    typeof (athlete as Record<string, unknown>).id === 'number'
  );
};

const encodeSessionCookie = (session: StravaSession): string =>
  Buffer.from(JSON.stringify(session)).toString('base64url');

export const decodeSessionCookie = (cookieValue: string): StravaSession | null => {
  try {
    const parsed = JSON.parse(Buffer.from(cookieValue, 'base64url').toString('utf8')) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;

    if (
      typeof candidate.accessToken !== 'string' ||
      typeof candidate.refreshToken !== 'string' ||
      typeof candidate.tokenType !== 'string' ||
      typeof candidate.expiresAt !== 'number' ||
      typeof candidate.expiresIn !== 'number' ||
      typeof candidate.athleteId !== 'number'
    ) {
      return null;
    }

    return {
      accessToken: candidate.accessToken,
      refreshToken: candidate.refreshToken,
      tokenType: candidate.tokenType,
      expiresAt: candidate.expiresAt,
      expiresIn: candidate.expiresIn,
      athleteId: candidate.athleteId,
      athleteUsername:
        typeof candidate.athleteUsername === 'string' ? candidate.athleteUsername : null,
    };
  } catch {
    return null;
  }
};

export const getStravaSession = (): StravaSession | null => {
  const sessionCookie = cookies().get(STRAVA_SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return null;
  }

  return decodeSessionCookie(sessionCookie);
};

export const saveStravaSession = (session: StravaSession) => {
  cookies().set({
    name: STRAVA_SESSION_COOKIE,
    value: encodeSessionCookie(session),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
};

export const clearOauthStateCookie = () => {
  cookies().set({
    name: STRAVA_OAUTH_STATE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
};

export const getOauthStateCookie = (): string | null =>
  cookies().get(STRAVA_OAUTH_STATE_COOKIE)?.value ?? null;

const toSessionFromRaw = (rawData: StravaTokenExchangeSuccessRaw): StravaSession => ({
  accessToken: rawData.access_token,
  refreshToken: rawData.refresh_token,
  tokenType: rawData.token_type,
  expiresAt: rawData.expires_at,
  expiresIn: rawData.expires_in,
  athleteId: rawData.athlete.id,
  athleteUsername: rawData.athlete.username ?? null,
});

export const exchangeAuthorizationCode = async (
  code: string,
): Promise<{ ok: true; session: StravaSession } | { ok: false; status: number; message: string }> => {
  const { clientId, clientSecret } = getServerStravaEnv();
  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });

  const response = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
    cache: 'no-store',
  });

  const rawData: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        rawData && typeof rawData === 'object' && 'message' in rawData
          ? String((rawData as Record<string, unknown>).message)
          : 'Failed to exchange authorization code for access token.',
    };
  }

  if (!isStravaTokenExchangeSuccessRaw(rawData)) {
    return {
      ok: false,
      status: 502,
      message: 'Strava token response is invalid.',
    };
  }

  return {
    ok: true,
    session: toSessionFromRaw(rawData),
  };
};

export const refreshStravaSession = async (
  session: StravaSession,
): Promise<{ ok: true; session: StravaSession } | { ok: false; status: number; message: string }> => {
  const { clientId, clientSecret } = getServerStravaEnv();
  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  const response = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
    cache: 'no-store',
  });

  const rawData: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        rawData && typeof rawData === 'object' && 'message' in rawData
          ? String((rawData as Record<string, unknown>).message)
          : 'Failed to refresh access token.',
    };
  }

  if (!isStravaTokenExchangeSuccessRaw(rawData)) {
    return {
      ok: false,
      status: 502,
      message: 'Strava refresh token response is invalid.',
    };
  }

  return {
    ok: true,
    session: toSessionFromRaw(rawData),
  };
};

export const getValidStravaSession = async (): Promise<
  | { ok: true; session: StravaSession }
  | { ok: false; status: number; code: 'STRAVA_TOKEN_MISSING' | 'STRAVA_TOKEN_EXPIRED'; message: string }
> => {
  const session = getStravaSession();

  if (!session) {
    return {
      ok: false,
      status: 401,
      code: 'STRAVA_TOKEN_MISSING',
      message: 'Strava access token is missing. Please connect your account first.',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const REFRESH_BUFFER_SEC = 60;
  const isExpiredOrNearExpiry = session.expiresAt <= now + REFRESH_BUFFER_SEC;

  if (!isExpiredOrNearExpiry) {
    return { ok: true, session };
  }

  const refreshed = await refreshStravaSession(session);

  if (!refreshed.ok) {
    return {
      ok: false,
      status: 401,
      code: 'STRAVA_TOKEN_EXPIRED',
      message: `Strava token is expired and refresh failed: ${refreshed.message}`,
    };
  }

  saveStravaSession(refreshed.session);

  return {
    ok: true,
    session: refreshed.session,
  };
};

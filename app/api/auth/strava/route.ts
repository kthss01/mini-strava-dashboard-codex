import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getPublicStravaEnv } from '@/lib/strava';

const STRAVA_OAUTH_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_OAUTH_STATE_COOKIE = 'strava_oauth_state';

const createAuthorizeUrl = () => {
  const { clientId, redirectUri, scopes } = getPublicStravaEnv();

  const state = randomUUID();
  const searchParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    approval_prompt: 'auto',
    state,
  });

  const authorizeUrl = `${STRAVA_OAUTH_AUTHORIZE_URL}?${searchParams.toString()}`;

  return { authorizeUrl, state };
};

export async function GET() {
  try {
    const { authorizeUrl, state } = createAuthorizeUrl();

    cookies().set({
      name: STRAVA_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error('[strava-oauth] Failed to start OAuth flow.', error);

    return NextResponse.json(
      {
        message:
          'Strava OAuth 인증을 시작하지 못했습니다. 환경변수(NEXT_PUBLIC_STRAVA_CLIENT_ID, STRAVA_REDIRECT_URI)를 확인해주세요.',
      },
      { status: 500 },
    );
  }
}

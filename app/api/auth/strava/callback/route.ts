import { NextRequest, NextResponse } from 'next/server';

import {
  clearOauthStateCookie,
  exchangeAuthorizationCode,
  getOauthStateCookie,
  saveStravaSession,
} from '@/lib/strava-oauth';

const buildErrorResponse = (message: string, status: number) =>
  NextResponse.json({ message }, { status });

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return buildErrorResponse(`Strava OAuth failed: ${oauthError}`, 400);
  }

  if (!code || !state) {
    return buildErrorResponse('Missing OAuth callback parameters: code/state', 400);
  }

  const stateFromCookie = getOauthStateCookie();
  clearOauthStateCookie();

  if (!stateFromCookie || stateFromCookie !== state) {
    return buildErrorResponse('Invalid OAuth state. Please retry login.', 400);
  }

  try {
    const exchangeResult = await exchangeAuthorizationCode(code);

    if (!exchangeResult.ok) {
      console.error('[strava-oauth] token exchange failed', {
        status: exchangeResult.status,
        message: exchangeResult.message,
      });

      return buildErrorResponse(exchangeResult.message, exchangeResult.status);
    }

    saveStravaSession(exchangeResult.session);

    const destination = new URL('/', request.url);
    destination.searchParams.set('strava', 'connected');

    return NextResponse.redirect(destination);
  } catch (error) {
    console.error('[strava-oauth] Unexpected callback error', error);

    return buildErrorResponse('Unexpected server error during OAuth callback.', 500);
  }
}

interface StravaConnectButtonProps {
  isLoggedIn?: boolean;
}

export function StravaConnectButton({ isLoggedIn = false }: StravaConnectButtonProps) {
  return (
    <a
      href="/api/auth/strava"
      className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
    >
      {isLoggedIn ? 'Reconnect with Strava' : 'Connect with Strava'}
    </a>
  );
}

import { StravaConnectButton } from '@/components/auth/strava-connect-button';

interface HeaderProps {
  isLoggedIn?: boolean;
}

export function Header({ isLoggedIn = false }: HeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand-orange">
            Mini Strava Dashboard · App Router Starter
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            내 Strava 활동 대시보드
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            OAuth 연결 이후 최근 활동, 통계, 지도 뷰를 한 화면에서 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:w-auto">
          <p className="text-xs font-medium text-slate-500">Strava 연결 상태</p>
          <StravaConnectButton isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </header>
  );
}

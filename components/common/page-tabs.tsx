import Link from 'next/link';

interface PageTabsProps {
  current: 'dashboard' | 'heatmap';
}

export function PageTabs({ current }: PageTabsProps) {
  return (
    <nav className="flex items-center gap-2">
      <Link
        href="/"
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          current === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
        }`}
      >
        대시보드
      </Link>
      <Link
        href="/heatmap"
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          current === 'heatmap' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
        }`}
      >
        히트맵
      </Link>
    </nav>
  );
}

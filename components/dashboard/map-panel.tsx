'use client';

import dynamic from 'next/dynamic';

import { SectionShell } from '@/components/common/section-shell';
import { ActivityDetailPanel } from '@/components/dashboard/activity-detail-panel';
import { RecentActivity } from '@/lib/types/activity';

interface MapPanelProps {
  selectedActivity: RecentActivity | null;
}

const ActivityMap = dynamic(
  () => import('@/components/dashboard/activity-map').then((module) => module.ActivityMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-600">
        지도를 불러오는 중...
      </div>
    ),
  },
);

export function MapPanel({ selectedActivity }: MapPanelProps) {
  return (
    <SectionShell title="활동 지도" description="선택한 활동의 위치와 경로를 확인할 수 있습니다.">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {selectedActivity ? (
          <>
            <ActivityDetailPanel activity={selectedActivity} />
            <div className="h-[420px] w-full sm:h-[460px] lg:h-[540px]">
              <ActivityMap selectedActivity={selectedActivity} />
            </div>
          </>
        ) : (
          <div className="flex h-[420px] flex-col items-center justify-center gap-2 bg-slate-50 p-6 text-center sm:h-[460px] lg:h-[540px]">
            <p className="text-sm font-semibold text-slate-700">선택된 활동이 없습니다.</p>
            <p className="text-xs text-slate-500">좌측 활동 목록에서 항목을 선택하면 지도가 표시됩니다.</p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

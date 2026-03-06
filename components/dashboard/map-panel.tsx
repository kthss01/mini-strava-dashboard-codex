import { SectionShell } from '@/components/common/section-shell';
import { RecentActivity } from '@/lib/types/activity';
import { formatDateKR, formatDistance, formatDuration } from '@/lib/utils/format';

interface MapPanelProps {
  selectedActivity: RecentActivity | null;
}

export function MapPanel({ selectedActivity }: MapPanelProps) {
  return (
    <SectionShell
      title="활동 지도"
      description="다음 단계에서 Strava polyline을 디코딩해 경로를 렌더링합니다."
    >
      <div className="flex h-[380px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 p-6">
        {selectedActivity ? (
          <div className="w-full rounded-lg border border-slate-200 bg-white/80 p-4 backdrop-blur-sm">
            <p className="text-sm text-slate-500">선택된 활동</p>
            <p className="mt-1 font-semibold text-slate-900">{selectedActivity.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">종류</dt>
                <dd className="font-medium text-slate-800">{selectedActivity.type}</dd>
              </div>
              <div>
                <dt className="text-slate-500">날짜</dt>
                <dd className="font-medium text-slate-800">{formatDateKR(selectedActivity.startDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">거리</dt>
                <dd className="font-medium text-slate-800">
                  {formatDistance(selectedActivity.distance / 1000)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">이동 시간</dt>
                <dd className="font-medium text-slate-800">
                  {formatDuration(Math.round(selectedActivity.movingTime / 60))}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">활동을 선택하면 정보가 표시됩니다.</p>
            <p className="mt-1 text-xs text-slate-500">Mapbox 또는 Leaflet 연동 예정</p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

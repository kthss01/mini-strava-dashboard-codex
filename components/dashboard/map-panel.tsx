import { SectionShell } from '@/components/common/section-shell';

export function MapPanel() {
  return (
    <SectionShell
      title="활동 지도"
      description="다음 단계에서 Strava polyline을 디코딩해 경로를 렌더링합니다."
    >
      <div className="flex h-[380px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Map Placeholder</p>
          <p className="mt-1 text-xs text-slate-500">Mapbox 또는 Leaflet 연동 예정</p>
        </div>
      </div>
    </SectionShell>
  );
}

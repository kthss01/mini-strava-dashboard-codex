import { ActivityList } from '@/components/dashboard/activity-list';
import { Header } from '@/components/dashboard/header';
import { MapPanel } from '@/components/dashboard/map-panel';
import { StatCards } from '@/components/dashboard/stat-cards';
import { mockActivities, mockSummary } from '@/lib/mock-data';

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
      <Header />
      <StatCards summary={mockSummary} />

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ActivityList activities={mockActivities} />
        </div>
        <div className="lg:col-span-5">
          <MapPanel />
        </div>
      </section>
    </main>
  );
}

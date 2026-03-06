'use client';

import { useState } from 'react';

import { ActivitySection } from '@/components/dashboard/activity-section';
import { Header } from '@/components/dashboard/header';
import { MapPanel } from '@/components/dashboard/map-panel';
import { StatCards } from '@/components/dashboard/stat-cards';
import { RecentActivity } from '@/lib/types/activity';

export function DashboardClient() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
      <Header />
      <StatCards activities={activities} />

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ActivitySection
            onActivitiesChange={setActivities}
            onSelectedActivityChange={setSelectedActivity}
          />
        </div>
        <div className="lg:col-span-5">
          <MapPanel selectedActivity={selectedActivity} />
        </div>
      </section>
    </main>
  );
}

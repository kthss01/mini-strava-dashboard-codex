'use client';

import { useEffect, useMemo, useState } from 'react';

import { ActivitySection } from '@/components/dashboard/activity-section';
import { Header } from '@/components/dashboard/header';
import { PageTabs } from '@/components/common/page-tabs';
import { MapPanel } from '@/components/dashboard/map-panel';
import { StatCards } from '@/components/dashboard/stat-cards';
import { fetchRecentActivities } from '@/lib/api/recent-activities';
import { RecentActivity } from '@/lib/types/activity';
import { ActivityFilters, DEFAULT_ACTIVITY_FILTERS } from '@/lib/types/activity-filter';
import { filterActivities, getActivityTypeOptions } from '@/lib/utils/activity-filters';

export function DashboardClient() {
  const [rawActivities, setRawActivities] = useState<RecentActivity[]>([]);
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadActivities = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const activities = await fetchRecentActivities();

        if (!isMounted) {
          return;
        }

        setRawActivities(activities);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

        setRawActivities([]);
        setSelectedActivityId(null);
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  const activityTypes = useMemo(() => getActivityTypeOptions(rawActivities), [rawActivities]);
  const filteredActivities = useMemo(() => filterActivities(rawActivities, filters), [rawActivities, filters]);

  useEffect(() => {
    if (filteredActivities.length === 0) {
      setSelectedActivityId(null);
      return;
    }

    const hasSelected = filteredActivities.some((activity) => activity.id === selectedActivityId);

    if (!hasSelected) {
      setSelectedActivityId(filteredActivities[0].id);
    }
  }, [filteredActivities, selectedActivityId]);

  const selectedActivity = useMemo(
    () => filteredActivities.find((activity) => activity.id === selectedActivityId) ?? null,
    [filteredActivities, selectedActivityId],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
      <Header />
      <PageTabs current="dashboard" />
      <StatCards activities={filteredActivities} />

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ActivitySection
            activities={filteredActivities}
            selectedActivityId={selectedActivityId}
            isLoading={isLoading}
            errorMessage={errorMessage}
            filters={filters}
            activityTypes={activityTypes}
            onFiltersChange={setFilters}
            onSelectActivity={(activity) => {
              setSelectedActivityId(activity.id);
            }}
          />
        </div>
        <div className="lg:col-span-5">
          <MapPanel selectedActivity={selectedActivity} />
        </div>
      </section>
    </main>
  );
}

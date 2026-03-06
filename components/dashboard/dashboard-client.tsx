'use client';

import { useEffect, useMemo, useState } from 'react';

import { ActivitySection } from '@/components/dashboard/activity-section';
import { Header } from '@/components/dashboard/header';
import { MapPanel } from '@/components/dashboard/map-panel';
import { StatCards } from '@/components/dashboard/stat-cards';
import { RecentActivity } from '@/lib/types/activity';
import { ActivityFilters, DEFAULT_ACTIVITY_FILTERS } from '@/lib/types/activity-filter';
import { filterActivities, getActivityTypeOptions } from '@/lib/utils/activity-filters';

interface ActivityApiItem {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  start_latlng: number[];
  map: {
    summary_polyline: string | null;
  };
}

interface RecentActivitiesApiSuccess {
  success: true;
  data: {
    activities: ActivityApiItem[];
  };
}

interface RecentActivitiesApiError {
  success: false;
  error?: {
    message?: string;
  };
}

const isNumberPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const isActivityApiItem = (value: unknown): value is ActivityApiItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ActivityApiItem>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.distance === 'number' &&
    typeof candidate.moving_time === 'number' &&
    typeof candidate.start_date === 'string' &&
    Array.isArray(candidate.start_latlng) &&
    Boolean(candidate.map) &&
    typeof candidate.map === 'object' &&
    'summary_polyline' in candidate.map
  );
};

const normalizeActivities = (activities: ActivityApiItem[]): RecentActivity[] =>
  activities.map((activity) => ({
    id: activity.id,
    name: activity.name,
    type: activity.type,
    distance: activity.distance,
    movingTime: activity.moving_time,
    startDate: activity.start_date,
    startLatlng: isNumberPair(activity.start_latlng)
      ? { lat: activity.start_latlng[0], lng: activity.start_latlng[1] }
      : null,
    summaryPolyline: typeof activity.map.summary_polyline === 'string' ? activity.map.summary_polyline : null,
  }));

export function DashboardClient() {
  const [rawActivities, setRawActivities] = useState<RecentActivity[]>([]);
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_ACTIVITY_FILTERS);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch('/api/activities/recent', {
          method: 'GET',
          cache: 'no-store',
        });

        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const apiError = payload as RecentActivitiesApiError | null;
          throw new Error(apiError?.error?.message ?? '활동 데이터를 불러오지 못했습니다.');
        }

        const result = payload as RecentActivitiesApiSuccess;
        const apiActivities = result?.data?.activities;

        if (!Array.isArray(apiActivities) || !apiActivities.every(isActivityApiItem)) {
          throw new Error('활동 응답 형식이 올바르지 않습니다.');
        }

        if (!isMounted) {
          return;
        }

        setRawActivities(normalizeActivities(apiActivities));
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

    fetchActivities();

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

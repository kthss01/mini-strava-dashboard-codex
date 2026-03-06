'use client';

import { useEffect, useMemo, useState } from 'react';

import { ActivityList } from '@/components/dashboard/activity-list';
import { toActivitySummary } from '@/lib/strava';
import { ActivitySummary } from '@/lib/types/strava';
import { RecentActivity } from '@/lib/types/activity';

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

interface ActivitySectionProps {
  onSummaryChange: (summary: ActivitySummary) => void;
  onSelectedActivityChange: (activity: RecentActivity | null) => void;
}

const EMPTY_SUMMARY: ActivitySummary = {
  totalActivities: 0,
  totalDistanceKm: 0,
  totalMovingTimeMin: 0,
  totalElevationGainM: 0,
};

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

export function ActivitySection({ onSummaryChange, onSelectedActivityChange }: ActivitySectionProps) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
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

        const normalized = normalizeActivities(apiActivities);
        setActivities(normalized);

        if (normalized.length === 0) {
          setSelectedActivityId(null);
          return;
        }

        const first = normalized[0];
        setSelectedActivityId(first.id);
        onSelectedActivityChange(first);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        setActivities([]);
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
  }, [onSelectedActivityChange]);

  const summary = useMemo(() => {
    if (activities.length === 0) {
      return EMPTY_SUMMARY;
    }

    return toActivitySummary(
      activities.map((activity) => ({
        id: activity.id,
        name: activity.name,
        type: activity.type,
        distanceKm: activity.distance / 1000,
        movingTimeMin: Math.round(activity.movingTime / 60),
        elapsedTimeMin: 0,
        elevationGainM: 0,
        paceOrSpeedLabel: '-',
        startDate: activity.startDate,
        startDateLocal: activity.startDate,
        timezone: '',
        locationLabel: '',
        mapPolyline: activity.summaryPolyline,
      })),
    );
  }, [activities]);

  useEffect(() => {
    onSummaryChange(isLoading ? EMPTY_SUMMARY : summary);
  }, [isLoading, onSummaryChange, summary]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? null,
    [activities, selectedActivityId],
  );

  useEffect(() => {
    onSelectedActivityChange(selectedActivity);
  }, [onSelectedActivityChange, selectedActivity]);

  return (
    <ActivityList
      activities={activities}
      isLoading={isLoading}
      errorMessage={errorMessage}
      selectedActivityId={selectedActivityId}
      onSelectActivity={(activity) => {
        setSelectedActivityId(activity.id);
      }}
    />
  );
}

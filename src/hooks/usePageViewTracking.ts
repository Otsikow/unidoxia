import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logAnalyticsEvent } from '@/lib/analytics';

/**
 * Logs a `page_view` analytics event for the authenticated user every time
 * the route changes. Powers the Usage Monitoring dashboard.
 */
export function usePageViewTracking(userId?: string | null) {
  const location = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const key = `${userId}:${location.pathname}${location.search}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;

    void logAnalyticsEvent('page_view', {
      userId,
      properties: {
        path: location.pathname,
        search: location.search || undefined,
      },
    });
  }, [location.pathname, location.search, userId]);
}

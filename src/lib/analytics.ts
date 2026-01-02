import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEventName = 'visa_calculator_card_click' | (string & {});

interface AnalyticsEventOptions {
  source?: string;
  properties?: Record<string, unknown>;
  userId?: string | null;
}

export async function logAnalyticsEvent(
  eventName: AnalyticsEventName,
  options: AnalyticsEventOptions = {}
): Promise<void> {
  const { source = 'web', properties = {}, userId: providedUserId } = options;

  try {
    let userId = providedUserId ?? null;
    let tenantId: string | null = null;

    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    // Get user's tenant_id
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();
      tenantId = profileData?.tenant_id || null;
    }

    const augmentedProperties: Record<string, unknown> = {
      ...properties,
    };

    if (typeof window !== 'undefined' && !('path' in augmentedProperties)) {
      augmentedProperties.path = window.location.pathname;
    }

    const { error } = await supabase.from('analytics_events').insert({
      tenant_id: tenantId,
      event_type: eventName,
      event_data: augmentedProperties,
      page_url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      session_id: null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      user_id: userId,
    } as any);

    if (error) {
      // Log detailed error information even in production for monitoring
      console.error('Analytics event insertion failed', {
        eventName,
        userId,
        tenantId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      // Don't throw - analytics failures shouldn't break user experience
      // But we need to know about them for debugging
      if (import.meta.env.DEV) {
        console.warn('Analytics event details:', {
          eventData: augmentedProperties,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        });
      }
    }
  } catch (error) {
    // Catch unexpected errors (network, auth, etc.)
    console.error('Analytics event logging error:', {
      eventName,
      error: error instanceof Error ? error.message : String(error),
      userId,
    });

    // Log additional details in development
    if (import.meta.env.DEV) {
      console.warn('Analytics error details:', {
        stack: error instanceof Error ? error.stack : undefined,
        properties,
      });
    }

    // Analytics failures should never break the user experience
    // Errors are logged but not propagated
  }
}

export function logVisaCalculatorCardClick(variant: 'card' | 'cta_button'): void {
  void logAnalyticsEvent('visa_calculator_card_click', {
    source: 'landing_page',
    properties: { variant },
  });
}

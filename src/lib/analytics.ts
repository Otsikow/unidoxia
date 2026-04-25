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
      throw error;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to log analytics event:', error);
    }
  }
}

export function logVisaCalculatorCardClick(variant: 'card' | 'cta_button'): void {
  void logAnalyticsEvent('visa_calculator_card_click', {
    source: 'landing_page',
    properties: { variant },
  });
}


type GA4EventParams = Record<string, string | number | boolean | null | undefined>;

function logGA4Event(eventName: string, params: GA4EventParams = {}): void {
  if (typeof window === 'undefined') return;

  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('event', eventName, params);
    return;
  }

  const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event: eventName, ...params });
  }
}

export function logWhatsAppLauncherClick(): void {
  logGA4Event('whatsapp_chat_launcher_click', {
    event_category: 'engagement',
    event_label: 'zoe_whatsapp_chat_launcher',
    cta_location: 'floating_launcher',
    destination_channel: 'whatsapp',
    conversion_intent: 'chat_start',
    value: 1,
    link_url: 'https://wa.me/447360961803',
  });
}

export function logFreeConsultationWhatsAppClick(): void {
  logGA4Event('book_free_consultation_whatsapp_click', {
    event_category: 'conversion',
    event_label: 'hero_book_free_consultation_whatsapp_cta',
    cta_location: 'hero_section',
    destination_channel: 'whatsapp',
    conversion_intent: 'consultation_booking',
    value: 1,
    link_url: 'https://wa.me/447360961803',
  });
}

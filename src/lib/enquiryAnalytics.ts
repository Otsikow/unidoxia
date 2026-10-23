// Do not create a second tracker, queue events before consent, or include form
// values, URL queries, contact details, or identifiers in conversion events.
export function trackEnquiry(event: 'enquiry_start' | 'enquiry_submit_success') {
  const analytics = window as typeof window & { gtag?: (...args: unknown[]) => void };
  analytics.gtag?.('event', event, { event_category: 'enquiry', form_id: 'free_consultation' });
}

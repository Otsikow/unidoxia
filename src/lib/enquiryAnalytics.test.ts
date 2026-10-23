import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackEnquiry } from './enquiryAnalytics';

afterEach(() => { delete (window as any).gtag; });
describe('enquiry analytics', () => {
  it('does not install a tracker or queue events when none is available', () => {
    expect(() => trackEnquiry('enquiry_start')).not.toThrow();
    expect((window as any).gtag).toBeUndefined();
  });
  it('passes only fixed event metadata to the existing tracker', () => {
    const gtag = vi.fn(); (window as any).gtag = gtag;
    trackEnquiry('enquiry_start'); trackEnquiry('enquiry_submit_success');
    expect(gtag.mock.calls).toEqual([
      ['event', 'enquiry_start', { event_category: 'enquiry', form_id: 'free_consultation' }],
      ['event', 'enquiry_submit_success', { event_category: 'enquiry', form_id: 'free_consultation' }],
    ]);
  });
});

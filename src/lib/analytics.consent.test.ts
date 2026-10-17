import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAnalyticsEvent, logGA4Event } from "./analytics";
import { setConsentPreferences } from "./cookieConsent";
const { insert } = vi.hoisted(() => ({
  insert: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(() => ({ insert })),
  },
}));
beforeEach(() => {
  localStorage.clear();
  insert.mockClear();
});
describe("analytics consent", () => {
  it("blocks internal and GA analytics before consent and after rejection", async () => {
    const gtag = vi.fn();
    Object.assign(window, { gtag });
    await logAnalyticsEvent("before_consent");
    logGA4Event("before_consent");
    setConsentPreferences({ analytics: false, marketing: true });
    await logAnalyticsEvent("marketing_only");
    logGA4Event("marketing_only");
    expect(insert).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
  });
  it("permits analytics with specific analytics consent", async () => {
    const gtag = vi.fn();
    Object.assign(window, { gtag });
    setConsentPreferences({ analytics: true, marketing: false });
    await logAnalyticsEvent("consented");
    logGA4Event("consented");
    expect(insert).toHaveBeenCalledOnce();
    expect(gtag).toHaveBeenCalledWith("event", "consented", {});
  });
});

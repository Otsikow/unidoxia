import { useSyncExternalStore } from "react";

const CONSENT_KEY = "unidoxia-cookie-consent";
const CHOICE_KEY = "unidoxia-cookie-consent-choice";
const VERSION = "2";
const CHANGE_EVENT = "cookie-consent-change";
export const COOKIE_SETTINGS_EVENT = "cookie-settings-open";
export type ConsentPreferences = { analytics: boolean; marketing: boolean };
type ConsentChoice = "all" | "essential" | "custom";

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(CONSENT_KEY) !== VERSION) return null;
    const preferences = JSON.parse(
      window.localStorage.getItem(CHOICE_KEY) ?? "null",
    );
    return preferences &&
      typeof preferences.analytics === "boolean" &&
      typeof preferences.marketing === "boolean"
      ? { analytics: preferences.analytics, marketing: preferences.marketing }
      : null;
  } catch {
    return null;
  }
}

export function getConsentChoice(): ConsentChoice | null {
  const preferences = getConsentPreferences();
  if (!preferences) return null;
  if (preferences.analytics && preferences.marketing) return "all";
  return preferences.analytics || preferences.marketing
    ? "custom"
    : "essential";
}

export function hasAnalyticsConsent(): boolean {
  return getConsentPreferences()?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return getConsentPreferences()?.marketing === true;
}

export function subscribeToConsent(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function setConsentPreferences(preferences: ConsentPreferences) {
  const previous = getConsentPreferences();
  try {
    window.localStorage.setItem(CHOICE_KEY, JSON.stringify(preferences));
    window.localStorage.setItem(CONSENT_KEY, VERSION);
  } catch {
    // If preferences cannot be saved, optional content stays blocked.
    return false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  if (
    (previous?.analytics && !preferences.analytics) ||
    (previous?.marketing && !preferences.marketing)
  ) {
    // A fresh document stops activity from scripts that have already executed.
    window.location.reload();
  }
  return true;
}

export function setConsentChoice(choice: "all" | "essential") {
  setConsentPreferences({
    analytics: choice === "all",
    marketing: choice === "all",
  });
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

export function useOptionalContentConsent() {
  return useSyncExternalStore(
    subscribeToConsent,
    hasAnalyticsConsent,
    () => false,
  );
}

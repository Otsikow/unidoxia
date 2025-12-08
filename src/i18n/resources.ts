// Only import English as the default/fallback language
// Other locales are loaded dynamically on demand
import en from "./locales/en";

export const languageList = ["en", "fr", "de", "pt", "it"] as const;

export type SupportedLanguage = (typeof languageList)[number];

// Initial resources - only English is bundled
// Other languages are loaded on-demand via loadLocale()
export const resources = {
  en: { translation: en },
} as const;

export type AppResource = typeof resources;

// Dynamic locale loaders - these create separate chunks for each language
const localeLoaders: Record<SupportedLanguage, () => Promise<{ default: typeof en }>> = {
  en: () => Promise.resolve({ default: en }), // Already loaded
  de: () => import("./locales/de"),
  fr: () => import("./locales/fr"),
  pt: () => import("./locales/pt"),
  it: () => import("./locales/it"),
};

// Track which locales have been loaded
const loadedLocales = new Set<SupportedLanguage>(["en"]);

/**
 * Dynamically load a locale's translations.
 * Returns true if the locale was loaded (or already loaded), false on error.
 */
export async function loadLocale(lang: SupportedLanguage): Promise<boolean> {
  if (loadedLocales.has(lang)) {
    return true;
  }

  const loader = localeLoaders[lang];
  if (!loader) {
    console.warn(`No loader found for locale: ${lang}`);
    return false;
  }

  try {
    const module = await loader();
    // Dynamic import to avoid bundling i18next with this module
    const { default: i18n } = await import("i18next");
    i18n.addResourceBundle(lang, "translation", module.default, true, true);
    loadedLocales.add(lang);
    return true;
  } catch (error) {
    console.error(`Failed to load locale: ${lang}`, error);
    return false;
  }
}

/**
 * Preload a locale in the background (non-blocking).
 * Useful for anticipated language switches.
 */
export function preloadLocale(lang: SupportedLanguage): void {
  if (loadedLocales.has(lang)) return;
  // Fire and forget - don't block
  loadLocale(lang).catch(() => {
    // Silently ignore preload failures
  });
}

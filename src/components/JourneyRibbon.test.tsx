import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { JourneyRibbon } from "./JourneyRibbon";
import en from "@/i18n/locales/en";
import de from "@/i18n/locales/de";
import fr from "@/i18n/locales/fr";
import pt from "@/i18n/locales/pt";
import es from "@/i18n/locales/es";
import itLocale from "@/i18n/locales/it";
import ar from "@/i18n/locales/ar";
import hi from "@/i18n/locales/hi";
import sw from "@/i18n/locales/sw";
import zh from "@/i18n/locales/zh";

const LOCALES = { en, de, fr, pt, es, it: itLocale, ar, hi, sw, zh };

const BANNED_STEP_2_METRIC = [
  "24h",
  "average match time",
  "durchschnittliche Matching-Zeit",
  "délai moyen de matching",
  "tempo médio de matching",
];

type JourneyItems = {
  matched?: { metricValue?: string; metricLabel?: string };
  offers?: { metricValue?: string; metricLabel?: string };
};

function journeyItems(locale: unknown): JourneyItems | undefined {
  const root = locale as { pages?: { index?: { journeyRibbon?: { items?: JourneyItems } } } };
  return root.pages?.index?.journeyRibbon?.items;
}

describe("JourneyRibbon step metrics", () => {
  it("does not keep a 24h average-match-time metric in any locale", () => {
    for (const [name, locale] of Object.entries(LOCALES)) {
      const items = journeyItems(locale);
      for (const step of ["matched", "offers"] as const) {
        const metric = items?.[step];
        if (metric) {
          expect(metric.metricValue ?? "", `${name} ${step} metricValue`).toBe("");
          expect(metric.metricLabel ?? "", `${name} ${step} metricLabel`).toBe("");
        }
      }
      const blob = JSON.stringify(locale);
      for (const phrase of BANNED_STEP_2_METRIC) {
        expect(blob, `${name}: ${phrase}`).not.toContain(phrase);
      }
    }
  });

  it("renders step 2 and step 3 without a metric", async () => {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: { en: { translation: en } },
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    });

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <JourneyRibbon />
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(screen.queryByText("24h")).toBeNull();
    expect(screen.queryByText(/average match time/i)).toBeNull();
    expect(screen.queryByText("Offer")).toBeNull();
    expect(screen.queryByText("to enrolment")).toBeNull();
    expect(screen.queryByText("University application support")).toBeNull();
  });
});

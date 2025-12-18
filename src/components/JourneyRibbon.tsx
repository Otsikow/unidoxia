import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, UserPlus, Users, Award } from "lucide-react";

interface JourneySegmentConfig {
  key: "profile" | "matched" | "offers";
  icon: typeof UserPlus;
  gradient: string;
  ctaHref?: string;
}

const SEGMENT_CONFIG: JourneySegmentConfig[] = [
  { key: "profile", icon: UserPlus, gradient: "from-primary via-sky-500 to-cyan-500", ctaHref: "/auth/signup?role=student" },
  { key: "matched", icon: Users, gradient: "from-purple-600 via-fuchsia-500 to-pink-500", ctaHref: `/agents/onboarding?next=${encodeURIComponent("/auth/signup?role=agent")}` },
  { key: "offers", icon: Award, gradient: "from-emerald-500 via-teal-500 to-primary" },
];

export const JourneyRibbon = () => {
  const { t } = useTranslation();

  const segments = useMemo(
    () =>
      SEGMENT_CONFIG.map((segment) => {
        const baseKey = `pages.index.journeyRibbon.items.${segment.key}`;
        const ctaLabel = t(`${baseKey}.ctaLabel`, { defaultValue: "" });

        return {
          ...segment,
          stage: t(`${baseKey}.stage`),
          metricValue: t(`${baseKey}.metricValue`),
          metricLabel: t(`${baseKey}.metricLabel`),
          description: t(`${baseKey}.description`),
          ctaLabel: ctaLabel.trim() ? ctaLabel : null,
        };
      }),
    [t],
  );

  const marqueeSegments = useMemo(() => {
    // Duplicate the data set to ensure a seamless, jitter-free marquee loop.
    return Array.from({ length: 2 }, (_, loopIndex) =>
      segments.map((segment) => ({ ...segment, loopIndex })),
    ).flat();
  }, [segments]);

  const marqueeDurationSeconds = useMemo(
    () => Math.max(60, segments.length * 12),
    [segments.length],
  );

  return (
    <div className="relative mx-auto mt-8 max-w-6xl px-4 sm:mt-12 sm:px-6 lg:mt-16">
      <div className="absolute inset-0 -translate-y-6 scale-105 rounded-[40px] bg-primary/10 blur-3xl" />

      <div className="journey-marquee" aria-label="UniDoxia journey metrics marquee">
        <div className="journey-marquee__glow" />
        <div className="journey-marquee__fade journey-marquee__fade--left" />
        <div className="journey-marquee__fade journey-marquee__fade--right" />

        <div
          className="journey-marquee__track"
          style={{
            ["--marquee-duration" as string]: `${marqueeDurationSeconds}s`,
            ["--item-count" as string]: marqueeSegments.length,
          }}
        >
          {marqueeSegments.map((segment, index) => (
            <div
              key={`${segment.key}-${index}`}
              className="journey-marquee__item"
              style={{ ["--item-index" as string]: index }}
            >
              <div className="journey-marquee__card-wrapper">
                <div
                  className={`journey-marquee__card group relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-lg sm:min-h-[320px] sm:rounded-3xl sm:p-6 ${segment.gradient}`}
                >
                  <div className="journey-marquee__card-overlay" aria-hidden />

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm shadow-inner">
                      <segment.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90 shadow-sm sm:text-xs">
                        {segment.stage}
                      </span>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl font-bold leading-none drop-shadow-sm sm:text-4xl">{segment.metricValue}</span>
                        <span className="max-w-[140px] break-words text-[11px] font-semibold uppercase text-white/80 sm:text-xs">
                          {segment.metricLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-relaxed text-white/90 sm:mt-5 sm:text-base">
                    {segment.description}
                  </p>
                  {segment.ctaHref && segment.ctaLabel && (
                    <Link
                      to={segment.ctaHref}
                      className="mt-4 inline-flex items-center text-xs font-semibold text-white transition hover:text-white/80 active:text-white/60 sm:mt-6 sm:text-sm"
                    >
                      <span className="truncate">{segment.ctaLabel}</span>
                      <ChevronRight className="ml-1 h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                    </Link>
                  )}
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-20 group-active:opacity-30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_55%)]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

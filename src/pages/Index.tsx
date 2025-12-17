"use client";

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Users, FileCheck, Clock, Sparkles, Calculator } from "lucide-react";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { JourneyRibbon } from "@/components/JourneyRibbon";
import { StudyProgramSearch } from "@/components/landing/StudyProgramSearch";
import { SEO } from "@/components/SEO";
import { TypewriterText } from "@/components/TypewriterText";
import { SuccessStoriesMarquee } from "@/components/landing/SuccessStoriesMarquee";

import { logVisaCalculatorCardClick } from "@/lib/analytics";

/* ---------- Static Assets ---------- */
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import studentsStudyingGroup from "@/assets/students-studying-group.png";
import agentsCta from "@/assets/agents-cta.jpeg";
import destinationsCta from "@/assets/destinations-cta.jpeg";
import visaEligibilityImage from "@/assets/visa-eligibility-checklist.png";
import applyEasilyImage from "@/assets/features/apply-easily.jpeg";
import trackRealTimeImage from "@/assets/features/track-real-time.jpeg";
import connectAgentImage from "@/assets/features/connect-agent.jpeg";

/* ---------- Lazy Loaded Sections ---------- */
const FeaturedUniversitiesSection = lazy(() => import("@/components/landing/FeaturedUniversitiesSection"));
const StoryboardSection = lazy(() => import("@/components/landing/StoryboardSection"));
const AIFeeCalculator = lazy(() => import("@/components/landing/AIFeeCalculator"));
const WhoUniDoxiaIsForSection = lazy(() => import("@/components/landing/WhoUniDoxiaIsForSection"));
const ZoeExperienceSection = lazy(() => import("@/components/landing/ZoeExperienceSection"));
const ContactForm = lazy(() =>
  import("@/components/ContactForm").then(m => ({ default: m.ContactForm }))
);

/* ---------- Skeleton Loader ---------- */
const SectionLoader = () => (
  <div className="container mx-auto px-4 py-20">
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const Index = () => {
  const { t } = useTranslation();

  /* ---------- Hero Video State ---------- */
  const [shouldRenderHeroVideo, setShouldRenderHeroVideo] = useState(true);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------- Motion & Bandwidth Check ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const conn = (navigator as any).connection;
    const saveData = Boolean(conn?.saveData);
    const effectiveType = String(conn?.effectiveType ?? "");
    const isSlowConnection = ["slow-2g", "2g"].includes(effectiveType);

    if (prefersReducedMotion || saveData || isSlowConnection) {
      setShouldRenderHeroVideo(false);
    }
  }, []);

  /* ---------- Hero Video Preload & Autoplay ---------- */
  useEffect(() => {
    if (!shouldRenderHeroVideo) return;

    const videoEl = heroVideoRef.current;
    if (!videoEl) return;

    const activateVideo = () => {
      setHeroVideoReady(true);
      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          /* Autoplay may be blocked; ignore silently */
        });
      }
    };

    if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      activateVideo();
      return;
    }

    videoEl.addEventListener("canplaythrough", activateVideo, { once: true });
    videoEl.addEventListener("loadeddata", activateVideo, { once: true });

    return () => {
      videoEl.removeEventListener("canplaythrough", activateVideo);
      videoEl.removeEventListener("loadeddata", activateVideo);
    };
  }, [shouldRenderHeroVideo]);

  /* ---------- Hero CTAs ---------- */
  const heroCtas = useMemo(
    () =>
      [
        { key: "students", href: "/auth/signup?role=student", image: studentsStudyingGroup },
        {
          key: "agents",
          href: `/agents/onboarding?next=${encodeURIComponent("/auth/signup?role=agent")}`,
          image: agentsCta,
        },
        { key: "universities", href: "/partnership", image: destinationsCta },
      ].map(cta => ({
        ...cta,
        badge: t(`pages.index.hero.ctas.${cta.key}.badge`),
        title: t(`pages.index.hero.ctas.${cta.key}.title`),
        description: t(`pages.index.hero.ctas.${cta.key}.description`),
        action: t(`pages.index.hero.ctas.${cta.key}.action`),
      })),
    [t]
  );

  /* ---------- Hero Text ---------- */
  const heroTitleParts = useMemo(
    () =>
      t("pages.index.hero.title", { returnObjects: true }) as {
        prefix: string;
        highlight: string;
        suffix?: string;
      },
    [t]
  );

  const heroDescription = t("pages.index.hero.description");

  /* ---------- Features ---------- */
  const features = useMemo(
    () =>
      [
        { key: "applyEasily", icon: FileCheck, color: "from-blue-500 to-cyan-500", image: applyEasilyImage },
        { key: "trackRealtime", icon: Clock, color: "from-purple-500 to-pink-500", image: trackRealTimeImage },
        { key: "connectAgents", icon: Users, color: "from-orange-500 to-red-500", image: connectAgentImage },
      ].map(f => ({
        ...f,
        title: t(`pages.index.features.cards.${f.key}.title`),
        description: t(`pages.index.features.cards.${f.key}.description`),
      })),
    [t]
  );

  /* ---------- FAQ ---------- */
  const faqs = useMemo(
    () =>
      t("pages.index.faq.sections", { returnObjects: true }) as Array<{
        audience: string;
        items: { question: string; answer: string }[];
      }>,
    [t]
  );

  /* ---------- Translations ---------- */
  const featuresHeading = t("pages.index.features.heading");
  const visaBadgeLabel = t("pages.index.visa.badge");
  const visaTitle = t("pages.index.visa.title");
  const visaDescription = t("pages.index.visa.description");
  const visaButtonLabel = t("pages.index.visa.cta");
  const faqHeading = t("pages.index.faq.heading");
  const faqSubtitle = t("pages.index.faq.subtitle");
  const contactHeading = t("pages.index.contact.heading");
  const contactSubtitle = t("pages.index.contact.subtitle");
  const footerText = t("layout.footer.copyright", { year: new Date().getFullYear() });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <SEO
        title="UniDoxia - Your Path to International Education"
        description="Connect with top universities worldwide. Streamline your study abroad journey with expert guidance, AI tools, tracking, and full support."
        keywords="study abroad, university applications, international education, AI tools, visa calculator"
      />

      {/* ---------- HERO ---------- */}
      <section className="hero-video-container">
        <LandingHeader />

        {shouldRenderHeroVideo ? (
          <>
            <div
              className={`hero-fallback ${heroVideoReady ? "is-hidden" : ""}`}
              aria-hidden
            />
            <video
              ref={heroVideoRef}
              className={`hero-video ${heroVideoReady ? "is-ready" : "is-loading"}`}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            >
              <source src="/videos/hero-video.mp4" type="video/mp4" />
            </video>
          </>
        ) : (
          <div className="hero-fallback" aria-hidden />
        )}

        <div className="hero-video-overlay" />

        <div className="hero-content">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia logo"
            className="hero-logo mb-8 h-24 sm:h-32 md:h-40 opacity-50 brightness-0 invert"
          />

          <h1 className="hero-text text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white">
            Apply <span className="opacity-70">•</span> Get Your Visa <span className="opacity-70">•</span> Study Abroad
          </h1>
        </div>
      </section>

      {/* ---------- WELCOME ---------- */}
      <section className="py-16 text-center">
        <TypewriterText
          prefix={heroTitleParts.prefix}
          highlight={heroTitleParts.highlight}
          phrases={["Your Future", "Your Dreams", "Success"]}
          suffix={heroTitleParts.suffix}
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{heroDescription}</p>
      </section>

      <StudyProgramSearch />

      {/* ---------- VISA ---------- */}
      <section className="py-24 container mx-auto grid lg:grid-cols-2 gap-14 px-4">
        <div className="space-y-6">
          <Badge variant="secondary">{visaBadgeLabel}</Badge>
          <h2 className="text-4xl font-bold">{visaTitle}</h2>
          <p className="text-muted-foreground">{visaDescription}</p>

          <Button asChild size="lg">
            <Link to="/visa-calculator" onClick={() => logVisaCalculatorCardClick("cta_button")}>
              <Calculator className="mr-2 h-5 w-5" />
              {visaButtonLabel}
            </Link>
          </Button>
        </div>

        <img src={visaEligibilityImage} alt="Visa eligibility" className="rounded-2xl shadow-2xl" />
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">{featuresHeading}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map(f => (
            <Card key={f.key}>
              <img src={f.image} alt={f.title} className="h-48 w-full object-cover rounded-t-xl" />
              <CardContent className="p-8">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${f.color} mb-4`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- LAZY SECTIONS ---------- */}
      <Suspense fallback={<SectionLoader />}><WhoUniDoxiaIsForSection /></Suspense>
      <Suspense fallback={<SectionLoader />}><AIFeeCalculator /></Suspense>
      <Suspense fallback={<SectionLoader />}><ZoeExperienceSection /></Suspense>
      <Suspense fallback={<SectionLoader />}><FeaturedUniversitiesSection /></Suspense>
      <Suspense fallback={<SectionLoader />}><StoryboardSection /></Suspense>

      <SuccessStoriesMarquee />

      {/* ---------- FAQ ---------- */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">{faqHeading}</h2>
        <p className="text-muted-foreground text-center mb-12">{faqSubtitle}</p>

        {faqs.map((section, i) => (
          <div key={i} className="max-w-4xl mx-auto mb-12">
            <h3 className="text-xl font-semibold mb-4">
              {t("pages.index.faq.audienceHeading", { audience: section.audience })}
            </h3>
            <Accordion type="single" collapsible>
              {section.items.map((faq, j) => (
                <AccordionItem key={j} value={`${i}-${j}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </section>

      {/* ---------- CONTACT ---------- */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">{contactHeading}</h2>
        <p className="text-muted-foreground text-center mb-12">{contactSubtitle}</p>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <Suspense fallback={<SectionLoader />}>
              <ContactForm />
            </Suspense>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t py-12 text-center text-sm text-muted-foreground">
        {footerText}
      </footer>
    </div>
  );
};

export default Index;

"use client";

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Users,
  FileCheck,
  Clock,
  Sparkles,
  Calculator,
} from "lucide-react";

import { StudyProgramSearch } from "@/components/landing/StudyProgramSearch";
import { SEO } from "@/components/SEO";
import { TypewriterText } from "@/components/TypewriterText";
import { SuccessStoriesMarquee } from "@/components/landing/SuccessStoriesMarquee";

import { logVisaCalculatorCardClick } from "@/lib/analytics";

/* ---------- Static Assets ---------- */
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import visaEligibilityImage from "@/assets/visa-eligibility-checklist.png";
import applyEasilyImage from "@/assets/features/apply-easily.jpeg";
import trackRealTimeImage from "@/assets/features/track-real-time.jpeg";
import connectAgentImage from "@/assets/features/connect-agent.jpeg";

/* ---------- Lazy Loaded Sections ---------- */
const FeaturedUniversitiesSection = lazy(
  () => import("@/components/landing/FeaturedUniversitiesSection")
);
const StoryboardSection = lazy(
  () => import("@/components/landing/StoryboardSection")
);
const AIFeeCalculator = lazy(
  () => import("@/components/landing/AIFeeCalculator")
);
const ZoeExperienceSection = lazy(
  () => import("@/components/landing/ZoeExperienceSection")
);
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

  /* ---------- Footer / Contact ---------- */
  const contactHeading = t("pages.index.contact.heading");
  const contactSubtitle = t("pages.index.contact.subtitle");
  const footerText = t("layout.footer.copyright", {
    year: new Date().getFullYear(),
  });

  /* ---------- Hero Video State ---------- */
  const [shouldRenderHeroVideo, setShouldRenderHeroVideo] = useState(true);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------- Motion & Bandwidth Check ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const conn = (navigator as any).connection;
    const saveData = Boolean(conn?.saveData);
    const effectiveType = String(conn?.effectiveType ?? "");
    const isSlowConnection = ["slow-2g", "2g"].includes(effectiveType);

    if (prefersReducedMotion || saveData || isSlowConnection) {
      setShouldRenderHeroVideo(false);
    }
  }, []);

  /* ---------- Hero Video Preload ---------- */
  useEffect(() => {
    if (!shouldRenderHeroVideo) return;
    const video = heroVideoRef.current;
    if (!video) return;

    const activate = () => {
      setHeroVideoReady(true);
      video.play().catch(() => {});
    };

    if (video.readyState >= 2) {
      activate();
    } else {
      video.addEventListener("canplaythrough", activate, { once: true });
      video.addEventListener("loadeddata", activate, { once: true });
    }

    return () => {
      video.removeEventListener("canplaythrough", activate);
      video.removeEventListener("loadeddata", activate);
    };
  }, [shouldRenderHeroVideo]);

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
        {
          key: "applyEasily",
          icon: FileCheck,
          image: applyEasilyImage,
          color: "from-blue-500 to-cyan-500",
        },
        {
          key: "trackRealtime",
          icon: Clock,
          image: trackRealTimeImage,
          color: "from-purple-500 to-pink-500",
        },
        {
          key: "connectAgents",
          icon: Users,
          image: connectAgentImage,
          color: "from-orange-500 to-red-500",
        },
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SEO
        title="UniDoxia – Your Path to International Education"
        description="Guided study abroad applications with real human support, verified agents, and AI-powered tools."
      />

      {/* ---------- HERO ---------- */}
      <section
        id="home"
        className="hero-video-container scroll-mt-20"
      >
        {shouldRenderHeroVideo ? (
          <>
            <div
              className={`hero-fallback ${
                heroVideoReady ? "is-hidden" : ""
              }`}
              aria-hidden
            />
            <video
              ref={heroVideoRef}
              className={`hero-video ${
                heroVideoReady ? "is-ready" : "is-loading"
              }`}
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

        <div className="hero-content text-center">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia logo"
            className="mx-auto mb-6 h-24 brightness-0 invert"
          />

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            UniDoxia: Get accepted into global universities — without
            guesswork or hidden fees.
          </h1>

          <p className="text-xl text-white/90 mb-10">
            From Africa to the world — we personally guide your study
            abroad journey.
          </p>

          <Button asChild size="lg">
            <Link to="/auth/signup?role=student">
              Start Your Study Journey
            </Link>
          </Button>
        </div>
      </section>

      {/* ---------- WELCOME ---------- */}
      <section className="py-16 text-center">
        <TypewriterText
          prefix={heroTitleParts.prefix}
          highlight={heroTitleParts.highlight}
          phrases={["Your Future", "Your Dreams", "Success"]}
          suffix={heroTitleParts.suffix}
          className="text-4xl font-bold"
        />
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          {heroDescription}
        </p>
      </section>

      <StudyProgramSearch sectionId="destinations" />

      {/* ---------- FEATURES ---------- */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map(f => (
            <Card key={f.key}>
              <img
                src={f.image}
                alt={f.title}
                className="h-48 w-full object-cover rounded-t-xl"
              />
              <CardContent className="p-8">
                <div
                  className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${f.color} mb-4`}
                >
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="scroll-mt-24">
        <div className="container mx-auto px-4 text-center space-y-2 mb-6">
          <Badge variant="secondary" className="mx-auto w-fit">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold">
            Transparent pricing, no surprises
          </h2>
        </div>

        <Suspense fallback={<SectionLoader />}>
          <AIFeeCalculator />
        </Suspense>
      </section>

      {/* ---------- LAZY SECTIONS ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <ZoeExperienceSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <FeaturedUniversitiesSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <StoryboardSection />
      </Suspense>

      {/* ---------- STORIES ---------- */}
      <section id="stories" className="scroll-mt-24">
        <SuccessStoriesMarquee />
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="container mx-auto px-4 py-20">
        {faqs.map((section, i) => (
          <div key={i} className="max-w-4xl mx-auto mb-12">
            <h3 className="text-xl font-semibold mb-4">
              {section.audience}
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
        <h2 className="text-3xl font-bold text-center mb-4">
          {contactHeading}
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          {contactSubtitle}
        </p>

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

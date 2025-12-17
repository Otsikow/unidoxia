"use client";

import { Link } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
  useCallback,
  memo,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { logVisaCalculatorCardClick } from "@/lib/analytics";
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

import { LandingHeader } from "@/components/landing/LandingHeader";
import { AnimatedStackedCards } from "@/components/landing/AnimatedStackedCards";
import { JourneyRibbon } from "@/components/JourneyRibbon";
import { StudyProgramSearch } from "@/components/landing/StudyProgramSearch";
import { SEO } from "@/components/SEO";
import { TypewriterText } from "@/components/TypewriterText";
import { HeroVideo } from "@/components/performance/HeroVideo";
import {
  LandingSectionSkeleton,
  FeatureCardSkeleton,
  TestimonialSkeleton,
} from "@/components/performance/SkeletonLoaders";

/* Assets */
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import studentsStudyingGroup from "@/assets/students-studying-group.png";
import agentsCta from "@/assets/agents-cta.jpeg";
import destinationsCta from "@/assets/destinations-cta.jpeg";
import visaEligibilityImage from "@/assets/visa-eligibility-checklist.png";
import applyEasilyImage from "@/assets/features/apply-easily.jpeg";
import trackRealTimeImage from "@/assets/features/track-real-time.jpeg";
import connectAgentImage from "@/assets/features/connect-agent.jpeg";

/* Lazy sections */
const FeaturedUniversitiesSection = lazy(
  () => import("@/components/landing/FeaturedUniversitiesSection"),
);
const StoryboardSection = lazy(
  () => import("@/components/landing/StoryboardSection"),
);
const AIFeeCalculator = lazy(
  () => import("@/components/landing/AIFeeCalculator"),
);
const ZoeExperienceSection = lazy(
  () => import("@/components/landing/ZoeExperienceSection"),
);
const ContactForm = lazy(() =>
  import("@/components/ContactForm").then((m) => ({ default: m.ContactForm })),
);

/* Skeletons */
const SectionLoader = memo(() => <LandingSectionSkeleton height="py-16" />);
const FeatureSectionLoader = memo(() => (
  <div className="container mx-auto px-4 py-20">
    <div className="grid md:grid-cols-3 gap-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <FeatureCardSkeleton key={i} />
      ))}
    </div>
  </div>
));
const TestimonialLoader = memo(() => (
  <div className="container mx-auto px-4 py-20">
    <TestimonialSkeleton />
  </div>
));

const Index = memo(function Index() {
  const { t } = useTranslation();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  /* HERO CTAs */
  const heroCtas = useMemo(
    () =>
      [
        {
          key: "students" as const,
          href: "/onboarding/welcome",
          image: studentsStudyingGroup,
        },
        {
          key: "agents" as const,
          href: `/agents/onboarding?next=${encodeURIComponent(
            "/auth/signup?role=agent",
          )}`,
          image: agentsCta,
        },
        {
          key: "universities" as const,
          href: "/partnership",
          image: destinationsCta,
        },
      ].map((cta) => ({
        ...cta,
        badge: t(`pages.index.hero.ctas.${cta.key}.badge`),
        title: t(`pages.index.hero.ctas.${cta.key}.title`),
        description: t(`pages.index.hero.ctas.${cta.key}.description`),
        action: t(`pages.index.hero.ctas.${cta.key}.action`),
      })),
    [t],
  );

  const heroTitleParts = useMemo(
    () =>
      t("pages.index.hero.title", { returnObjects: true }) as {
        prefix: string;
        highlight: string;
        suffix?: string;
      },
    [t],
  );

  const heroDescription = t("pages.index.hero.description");

  /* FEATURES */
  const features = useMemo(
    () =>
      [
        {
          key: "applyEasily",
          icon: FileCheck,
          color: "from-blue-500 to-cyan-500",
          image: applyEasilyImage,
        },
        {
          key: "trackRealtime",
          icon: Clock,
          color: "from-purple-500 to-pink-500",
          image: trackRealTimeImage,
        },
        {
          key: "connectAgents",
          icon: Users,
          color: "from-orange-500 to-red-500",
          image: connectAgentImage,
        },
      ].map((feature) => ({
        ...feature,
        title: t(`pages.index.features.cards.${feature.key}.title`),
        description: t(
          `pages.index.features.cards.${feature.key}.description`,
        ),
      })),
    [t],
  );

  /* TESTIMONIALS */
  const testimonials = useMemo(
    () =>
      (t("pages.index.testimonials.items", {
        returnObjects: true,
      }) as Array<{
        name: string;
        role: string;
        country: string;
        quote: string;
      }>) || [],
    [t],
  );

  useEffect(() => {
    if (!testimonials.length) return;
    const interval = setInterval(
      () =>
        setCurrentTestimonial(
          (prev) => (prev + 1) % testimonials.length,
        ),
      5000,
    );
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <SEO
        title="UniDoxia - Your Path to International Education"
        description="Connect with top universities worldwide. Streamline your study abroad journey with AI tools, visa guidance, and real-time tracking."
      />

      <LandingHeader />

      <HeroVideo
        videoSrc="/videos/hero-video.mp4"
        posterSrc={studentsStudyingGroup}
        fallbackImageSrc={studentsStudyingGroup}
        loadDelay={0}
      />

      {/* HERO OVERLAY */}
      <section className="hero-video-container absolute inset-0 pointer-events-none">
        <div className="hero-content pointer-events-auto">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia logo"
            className="hero-logo mb-8 h-24 sm:h-32 md:h-40 opacity-50 brightness-0 invert"
            fetchPriority="high"
          />

          <h1 className="hero-text text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white">
            Apply • Get Your Visa • Study Abroad
          </h1>
        </div>
      </section>

      {/* TYPEWRITER */}
      <section className="py-12 text-center">
        <TypewriterText
          prefix={heroTitleParts.prefix}
          highlight={heroTitleParts.highlight}
          phrases={["Your Future", "Your Dreams", "Success"]}
          suffix={heroTitleParts.suffix}
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
        />
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {heroDescription}
        </p>
      </section>

      <StudyProgramSearch />

      {/* VISA */}
      <section className="py-24">
        <div className="container mx-auto grid gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {t("pages.index.visa.badge")}
            </span>

            <h2 className="text-4xl font-bold">
              {t("pages.index.visa.title")}
            </h2>

            <p className="text-lg text-muted-foreground">
              {t("pages.index.visa.description")}
            </p>

            <Button asChild size="lg" className="gap-2">
              <Link
                to="/visa-calculator"
                onClick={() =>
                  logVisaCalculatorCardClick("cta_button")
                }
              >
                <Calculator className="h-5 w-5" />
                {t("pages.index.visa.cta")}
              </Link>
            </Button>
          </div>

          <img
            src={visaEligibilityImage}
            alt="Visa eligibility"
            className="rounded-2xl shadow-2xl"
            loading="lazy"
          />
        </div>
      </section>

      {/* LAZY SECTIONS */}
      <Suspense fallback={<SectionLoader />}>
        <AIFeeCalculator />
        <ZoeExperienceSection />
        <FeaturedUniversitiesSection />
        <StoryboardSection />
      </Suspense>

      {/* TESTIMONIALS */}
      <section className="py-20 text-center">
        <h2 className="text-4xl font-bold mb-12">
          {t("pages.index.testimonials.heading")}
        </h2>

        {testimonials.length ? (
          <AnimatedStackedCards
            cards={testimonials.map((t, i) => ({
              id: `testimonial-${i}`,
              username: t.name,
              timestamp: t.country,
              content: t.quote,
            }))}
          />
        ) : (
          <TestimonialLoader />
        )}
      </section>

      {/* CONTACT */}
      <section className="py-20">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8">
            <Suspense fallback={<SectionLoader />}>
              <ContactForm />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </div>
  );
});

export default Index;

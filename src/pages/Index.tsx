"use client";

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Users,
  FileCheck,
  Clock,
  Sparkles,
  ArrowRight,
  MessageCircle,
  CalendarCheck,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { StudyProgramSearch } from "@/components/landing/StudyProgramSearch";
import { SEO } from "@/components/SEO";
import { SuccessStoriesMarquee } from "@/components/landing/SuccessStoriesMarquee";
import { logFreeConsultationWhatsAppClick } from "@/lib/analytics";

/* ---------- Static Assets ---------- */
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import agentsCta from "@/assets/agents-cta.jpeg";
import destinationsCta from "@/assets/destinations-cta.jpeg";
import applyEasilyImage from "@/assets/features/apply-easily.jpeg";
import trackRealTimeImage from "@/assets/keeping-you-informed.png";
import connectAgentImage from "@/assets/features/connect-agent.jpeg";

/* ---------- Lazy Loaded Sections ---------- */
const FeaturedUniversitiesSection = lazy(() => import("@/components/landing/FeaturedUniversitiesSection"));
const StoryboardSection = lazy(() => import("@/components/landing/StoryboardSection"));
const ZoeExperienceSection = lazy(() => import("@/components/landing/ZoeExperienceSection"));
const LatestFromBlog = lazy(() => import("@/components/landing/LatestFromBlog"));
const ContactForm = lazy(() => import("@/components/ContactForm").then((m) => ({ default: m.ContactForm })));

const WHATSAPP_URL = "https://wa.me/447360961803";

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
  const [shouldRenderHeroVideo, setShouldRenderHeroVideo] = useState(() => {
    if (typeof window === "undefined") return true;
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as any).connection;
    const saveData = Boolean(conn?.saveData);
    const effectiveType = String(conn?.effectiveType ?? "");
    const isSlowConnection = ["slow-2g", "2g"].includes(effectiveType);
    return !(prefersReducedMotion || saveData || isSlowConnection);
  });
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!shouldRenderHeroVideo) return;
    const videoEl = heroVideoRef.current;
    if (!videoEl) return;

    const activateVideo = () => {
      setHeroVideoReady(true);
      videoEl.currentTime = 0;
      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    activateVideo();

    const handleCanPlay = () => setHeroVideoReady(true);
    videoEl.addEventListener("loadeddata", handleCanPlay);
    videoEl.addEventListener("canplay", handleCanPlay);
    return () => {
      videoEl.removeEventListener("loadeddata", handleCanPlay);
      videoEl.removeEventListener("canplay", handleCanPlay);
    };
  }, [shouldRenderHeroVideo]);

  /* ---------- Partner CTAs (Agents + Universities) ---------- */
  const partnerCtas = useMemo(
    () =>
      [
        {
          key: "agents",
          href: `/agents/onboarding?next=${encodeURIComponent("/auth/signup?role=agent")}`,
          image: agentsCta,
          badge: "Agents",
          title: "Manage students and applications",
          description: "Add authorised students, organise documents and track application activity from one workspace. Commission information is shown only where supported and agreed.",
          action: "Explore Agent Tools",
        },
        {
          key: "universities",
          href: "/partnership",
          image: destinationsCta,
          badge: "Universities",
          title: "Discuss international student recruitment",
          description: "Explore a transparent recruitment relationship focused on African student markets and supported by structured application workflows.",
          action: "Discuss a Partnership",
        },
      ],
    [],
  );

  /* ---------- Features ---------- */
  const features = useMemo(
    () =>
      [
        {
          key: "applyEasily",
          icon: FileCheck,
          color: "from-blue-500 to-cyan-500",
          image: applyEasilyImage,
          href: "/auth/signup?role=student",
          title: "Prepare Your Application With Confidence",
          description: "Build one profile, organise your documents and prepare applications with clear guidance.",
          action: "Start Your Application",
        },
        {
          key: "trackRealtime",
          icon: Clock,
          color: "from-purple-500 to-pink-500",
          image: trackRealTimeImage,
          href: "/courses",
          title: "Keep Track of Your Next Steps",
          description: "Review application activity, outstanding information and status updates in one place.",
          action: "Explore Courses",
        },
        {
          key: "connectAgents",
          icon: Users,
          color: "from-orange-500 to-red-500",
          image: connectAgentImage,
          href: "/free-consultation",
          title: "Get Personal Guidance",
          description: "Speak with the UniDoxia team about course discovery, application preparation and practical next steps.",
          action: "Speak With an Adviser",
        },
      ],
    [],
  );

  /* ---------- FAQ ---------- */
  const faqs = useMemo(
    () =>
      t("pages.index.faq.sections", { returnObjects: true }) as Array<{
        audience: string;
        items: { question: string; answer: string }[];
      }>,
    [t],
  );

  const featuresHeading = "Why UniDoxia";
  const faqHeading = t("pages.index.faq.heading");
  const faqSubtitle = t("pages.index.faq.subtitle");
  const contactHeading = t("pages.index.contact.heading");
  const contactSubtitle = t("pages.index.contact.subtitle");
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <SEO
        title="Study Abroad Support for International Students | UniDoxia"
        description="UniDoxia helps international students discover courses and universities, prepare stronger applications, and understand visa and scholarship requirements."
        canonicalPath="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "UniDoxia",
            url: "https://unidoxia.com",
            logo: "https://unidoxia.com/favicon.png",
            email: "info@unidoxia.com",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "UniDoxia",
            url: "https://unidoxia.com",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://unidoxia.com/courses?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />

      {/* ---------- HERO ---------- */}
      <section className="hero-video-container">
        <LandingHeader />

        <div
          className={`hero-fallback ${heroVideoReady ? "is-hidden" : ""}`}
          style={{ backgroundColor: "#0e1a2b" }}
          aria-hidden
        />

        {shouldRenderHeroVideo && (
          <video
            ref={heroVideoRef}
            className={`hero-video ${heroVideoReady ? "is-ready" : "is-loading"}`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/videos/hero-poster.jpg"
            // @ts-expect-error - fetchpriority is valid HTML attribute
            fetchpriority="high"
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>
        )}

        <div className="hero-overlay" aria-hidden />

        <div className="hero-content">
          <div className="hero-content-inner flex flex-col items-center gap-6 text-white">
            <img
              src={unidoxiaLogo}
              alt="UniDoxia logo"
              className="hero-logo mb-1 h-20 sm:h-24 md:h-28 w-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] brightness-0 invert"
            />

            <div className="hero-text space-y-3 md:space-y-4 text-white max-w-4xl text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.75rem] font-bold leading-[1.08] tracking-[-0.03em] [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
                Global universities. Built around African students.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]">
                Discover international courses, prepare your documents, manage applications and
                track your next steps in one place—with guidance shaped around African applicants
                and open to students worldwide.
              </p>
              <p className="text-xs sm:text-sm text-white/85 italic">
                Application guidance and technology for clearer international study decisions.
              </p>
            </div>

            {/* Primary + Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="hero-cta-button bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-xl w-full sm:w-auto"
              >
                <Link to="/auth/signup?role=student">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Your Application
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-md border-white/60 text-white hover:bg-white/20 hover:text-white font-semibold shadow-lg w-full sm:w-auto"
              >
                <Link to="/free-consultation">
                  <CalendarCheck className="mr-2 h-5 w-5" />
                  Book a Free Consultation
                </Link>
              </Button>
            </div>

            {/* Tertiary WhatsApp */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={logFreeConsultationWhatsAppClick}
              className="inline-flex items-center gap-2 text-sm sm:text-base text-white/90 hover:text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>

            {/* Trust ribbon — in normal flow */}
            <p className="mt-1 inline-flex max-w-full items-center rounded-full bg-slate-950/60 px-5 py-2.5 text-center text-xs sm:text-sm font-medium tracking-tight text-white/90 shadow-lg ring-1 ring-white/15 backdrop-blur-md">
              Explore universities and study opportunities worldwide. Entry requirements,
              availability and application routes vary by institution.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- STUDY PROGRAM SEARCH ---------- */}
      <StudyProgramSearch />

      {/* ---------- TRUST BAND: UK knowledge-trained guidance ---------- */}
      <section
        aria-labelledby="uk-knowledge-trained-heading"
        className="border-y bg-muted/30"
      >
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <h2
              id="uk-knowledge-trained-heading"
              className="text-lg sm:text-xl font-semibold tracking-tight"
            >
              UK knowledge-trained guidance
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Eric Arthur, CEO of UniDoxia, has completed the British Council UK knowledge agent and counsellor training.
            </p>
          </div>
          <Link
            to="/about"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm shrink-0"
          >
            View training details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>


      {/* ---------- WHY UNIDOXIA / FEATURES ---------- */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">{featuresHeading}</h2>
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {features.map((f) => (
            <Card key={f.key} className="landing-feature-card flex flex-col h-full overflow-hidden shadow-card">
              <img
                src={f.image}
                alt={f.title}
                loading="lazy"
                className="h-48 w-full object-cover rounded-t-xl"
              />
              <CardContent className="p-8 flex flex-col gap-4 h-full">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold leading-snug">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
                <div className="mt-auto">
                  <Button
                    asChild
                    className="w-full justify-between bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Link to={f.href}>
                      <span>{f.action}</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <StoryboardSection />
      </Suspense>

      {/* ---------- ZOE AI ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <ZoeExperienceSection />
      </Suspense>

      {/* ---------- FEATURED UNIVERSITIES ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <FeaturedUniversitiesSection />
      </Suspense>

      {/* ---------- FACTUAL TRUST ---------- */}
      <SuccessStoriesMarquee />

      {/* ---------- LATEST FROM BLOG ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <LatestFromBlog />
      </Suspense>

      {/* ---------- PARTNER WITH UNIDOXIA ---------- */}
      <section className="container mx-auto px-4 py-16" aria-labelledby="partner-heading">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 id="partner-heading" className="text-3xl font-bold mb-3">
            Partner with UniDoxia
          </h2>
          <p className="text-muted-foreground">
            Grow with us — whether you recruit international students or represent a university.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
          {partnerCtas.map((cta) => (
            <Card key={cta.key} className="h-full overflow-hidden shadow-card">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={cta.image}
                  alt={cta.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <CardContent className="p-6 space-y-4 flex flex-col">
                <Badge variant="secondary" className="uppercase tracking-wide text-xs px-3 py-1 w-max">
                  {cta.badge}
                </Badge>
                <h3 className="text-xl font-semibold leading-snug text-card-foreground">{cta.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{cta.description}</p>
                <Button asChild className="w-full mt-auto">
                  <Link to={cta.href}>{cta.action}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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

      {/* ---------- CONTACT + FINAL CTA ---------- */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto mb-12 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-10 text-center shadow-card">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to take the next step?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Book a free consultation with our advisors and get a clear plan for your study-abroad
            journey — or reach us instantly on WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/free-consultation">
                <CalendarCheck className="mr-2 h-5 w-5" />
                Book a Free Consultation
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={logFreeConsultationWhatsAppClick}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Chat on WhatsApp
              </a>
            </Button>
          </div>
        </div>

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

    </div>
  );
};

export default Index;

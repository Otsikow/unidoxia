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
  Calculator,
  ArrowRight,
  MessageCircle,
  CalendarCheck,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { StudyProgramSearch } from "@/components/landing/StudyProgramSearch";
import { SEO } from "@/components/SEO";
import { SuccessStoriesMarquee } from "@/components/landing/SuccessStoriesMarquee";
import { logFreeConsultationWhatsAppClick, logVisaCalculatorCardClick } from "@/lib/analytics";

/* ---------- Static Assets ---------- */
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import agentsCta from "@/assets/agents-cta.jpeg";
import destinationsCta from "@/assets/destinations-cta.jpeg";
import visaEligibilityImage from "@/assets/visa-eligibility-checklist.png";
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
        },
        {
          key: "universities",
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
        },
        {
          key: "trackRealtime",
          icon: Clock,
          color: "from-purple-500 to-pink-500",
          image: trackRealTimeImage,
          href: "/courses",
        },
        {
          key: "connectAgents",
          icon: Users,
          color: "from-orange-500 to-red-500",
          image: connectAgentImage,
          href: "/free-consultation",
        },
      ].map((f) => ({
        ...f,
        title: t(`pages.index.features.cards.${f.key}.title`),
        description: t(`pages.index.features.cards.${f.key}.description`),
        action: t(`pages.index.features.cards.${f.key}.action`),
      })),
    [t],
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
              className="hero-logo mb-2 h-28 sm:h-36 md:h-44 w-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] brightness-0 invert"
            />

            <div className="hero-text space-y-3 md:space-y-4 text-white max-w-4xl text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
                Study Abroad Opportunities for Students Worldwide
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/95 leading-relaxed max-w-3xl mx-auto [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]">
                UniDoxia helps students secure admission, navigate visa processes, and access
                trusted universities across Europe, the UK, Canada, the USA, Australia, and beyond.
              </p>
              <p className="text-xs sm:text-sm text-white/85 italic">
                Guiding students step by step since 2014.
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
            <p className="mt-2 inline-flex max-w-full items-center rounded-2xl bg-slate-950/85 px-5 py-3 text-center text-sm sm:text-base font-semibold tracking-tight text-white shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
              UniDoxia connects students worldwide to trusted international study opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- STUDY PROGRAM SEARCH ---------- */}
      <StudyProgramSearch />

      {/* ---------- WHY UNIDOXIA / FEATURES ---------- */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">{featuresHeading}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <Card key={f.key} className="flex flex-col h-full overflow-hidden shadow-card">
              <img
                src={f.image}
                alt={f.title}
                loading="lazy"
                className="h-48 w-full object-cover rounded-t-xl"
              />
              <CardContent className="p-8 flex flex-col gap-4 h-full">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${f.color} w-max`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold leading-snug">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
                <div className="mt-auto">
                  <Button
                    asChild
                    className={`w-full justify-between bg-gradient-to-r ${f.color} text-white shadow-lg hover:opacity-95`}
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

      {/* ---------- ZOE ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <ZoeExperienceSection />
      </Suspense>

      {/* ---------- FEATURED UNIVERSITIES ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <FeaturedUniversitiesSection />
      </Suspense>

      {/* ---------- STORYBOARD / HOW IT WORKS ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <StoryboardSection />
      </Suspense>

      {/* ---------- VISA GUIDANCE ---------- */}
      <section className="py-24 container mx-auto grid lg:grid-cols-2 gap-14 px-4 items-center">
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
        <img
          src={visaEligibilityImage}
          alt="Visa eligibility"
          loading="lazy"
          className="rounded-2xl shadow-2xl"
        />
      </section>

      {/* ---------- SUCCESS STORIES ---------- */}
      <SuccessStoriesMarquee />

      {/* ---------- LATEST FROM BLOG ---------- */}
      <Suspense fallback={<SectionLoader />}>
        <LatestFromBlog />
      </Suspense>

      {/* ---------- EXPLORE UNIDOXIA (compact) ---------- */}
      <section className="container mx-auto px-4 py-10" aria-labelledby="explore-heading">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <h2 id="explore-heading" className="text-2xl sm:text-3xl font-bold mb-2">
            Explore UniDoxia
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Courses, scholarships, visa guidance, and weekly source-checked advice.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/courses", title: "Study Abroad Courses", desc: "Search programmes by country, subject, and level." },
            { to: "/scholarships", title: "Scholarships", desc: "Discover funding opportunities for international students." },
            { to: "/visa-calculator", title: "Visa Guidance", desc: "Estimate visa requirements and understand what's needed." },
            { to: "/blog", title: "Student Advice Blog", desc: "Weekly, source-checked guidance on visas and admissions." },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-xl border p-5 hover:border-primary/60 hover:bg-muted/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h3 className="font-semibold mb-1 group-hover:text-primary">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-sm text-primary">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

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

      <footer className="border-t py-12 text-center text-sm text-muted-foreground">
        {footerText}
      </footer>
    </div>
  );
};

export default Index;

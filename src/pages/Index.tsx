"use client";

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, lazy, Suspense, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { logVisaCalculatorCardClick } from "@/lib/analytics";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, FileCheck, Clock, Star, Quote, ChevronLeft, ChevronRight, Sparkles, Calculator } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { JourneyRibbon } from "@/components/JourneyRibbon";
import { StudyProgramSearch } from "@/components/landing/StudyProgramSearch";
import { SEO } from "@/components/SEO";
import { TypewriterText } from "@/components/TypewriterText";
import { HeroVideo } from "@/components/performance/HeroVideo";
import { LandingSectionSkeleton, FeatureCardSkeleton, TestimonialSkeleton } from "@/components/performance/SkeletonLoaders";
import { OptimizedImage } from "@/components/performance/OptimizedImage";

// Static assets - these are URL references, not heavy JS
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import studentsStudyingGroup from "@/assets/students-studying-group.png";
import agentsCta from "@/assets/agents-cta.jpeg";
import destinationsCta from "@/assets/destinations-cta.jpeg";
import visaEligibilityImage from "@/assets/visa-eligibility-checklist.png";
import applyEasilyImage from "@/assets/features/apply-easily.jpeg";
import trackRealTimeImage from "@/assets/features/track-real-time.jpeg";
import connectAgentImage from "@/assets/features/connect-agent.jpeg";

// ==========================================
// LAZY LOAD BELOW-THE-FOLD COMPONENTS
// These are loaded after initial paint for faster First Contentful Paint
// ==========================================

const FeaturedUniversitiesSection = lazy(() => import("@/components/landing/FeaturedUniversitiesSection"));
const StoryboardSection = lazy(() => import("@/components/landing/StoryboardSection"));
const AIDocumentCheckerSection = lazy(() => import("@/components/landing/AIDocumentCheckerSection"));
const AIFeeCalculator = lazy(() => import("@/components/landing/AIFeeCalculator"));
const ZoeExperienceSection = lazy(() => import("@/components/landing/ZoeExperienceSection"));
const ContactForm = lazy(() => import("@/components/ContactForm").then(m => ({ default: m.ContactForm })));

// Performance-optimized skeleton loaders (no spinners - instant visual feedback)
const SectionLoader = memo(() => (
  <LandingSectionSkeleton height="py-16" />
));

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
  const {
    t
  } = useTranslation();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // HERO CTAs
  const heroCtas = useMemo(() => [{
    key: "students" as const,
    href: "/onboarding/welcome",
    image: studentsStudyingGroup
  }, {
    key: "agents" as const,
    href: `/agents/onboarding?next=${encodeURIComponent("/auth/signup?role=agent")}`,
    image: agentsCta
  }, {
    key: "universities" as const,
    href: "/partnership",
    image: destinationsCta
  }].map(cta => ({
    ...cta,
    badge: t(`pages.index.hero.ctas.${cta.key}.badge`),
    title: t(`pages.index.hero.ctas.${cta.key}.title`),
    description: t(`pages.index.hero.ctas.${cta.key}.description`),
    action: t(`pages.index.hero.ctas.${cta.key}.action`)
  })), [t]);
  const heroTitleParts = useMemo(() => t("pages.index.hero.title", {
    returnObjects: true
  }) as {
    prefix: string;
    highlight: string;
    suffix?: string;
  }, [t]);
  const heroDescription = t("pages.index.hero.description");

  // FEATURES
  const features = useMemo(() => [{
    key: "applyEasily" as const,
    icon: FileCheck,
    color: "from-blue-500 to-cyan-500",
    image: applyEasilyImage
  }, {
    key: "trackRealtime" as const,
    icon: Clock,
    color: "from-purple-500 to-pink-500",
    image: trackRealTimeImage
  }, {
    key: "connectAgents" as const,
    icon: Users,
    color: "from-orange-500 to-red-500",
    image: connectAgentImage
  }].map(feature => ({
    ...feature,
    title: t(`pages.index.features.cards.${feature.key}.title`),
    description: t(`pages.index.features.cards.${feature.key}.description`)
  })), [t]);

  // TESTIMONIALS
  const testimonials = useMemo(() => t("pages.index.testimonials.items", {
    returnObjects: true
  }) as Array<{
    name: string;
    role: string;
    country: string;
    quote: string;
    rating: number;
  }>, [t]);
  const testimonialCount = testimonials.length;
  useEffect(() => {
    const interval = setInterval(() => setCurrentTestimonial(prev => (prev + 1) % (testimonialCount || 1)), 5000);
    return () => clearInterval(interval);
  }, [testimonialCount]);
  const nextTestimonial = useCallback(() => setCurrentTestimonial(prev => (prev + 1) % testimonialCount), [testimonialCount]);
  const prevTestimonial = useCallback(() => setCurrentTestimonial(prev => prev === 0 ? testimonialCount - 1 : prev - 1), [testimonialCount]);

  // FAQ
  const faqs = useMemo(() => t("pages.index.faq.sections", {
    returnObjects: true
  }) as Array<{
    audience: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  }>, [t]);

  // TRANSLATION STRINGS
  const featuresHeading = t("pages.index.features.heading");
  const visaBadgeLabel = t("pages.index.visa.badge");
  const visaTitle = t("pages.index.visa.title");
  const visaDescription = t("pages.index.visa.description");
  const visaButtonLabel = t("pages.index.visa.cta");
  const testimonialsHeading = t("pages.index.testimonials.heading");
  const faqHeading = t("pages.index.faq.heading");
  const faqSubtitle = t("pages.index.faq.subtitle");
  const contactHeading = t("pages.index.contact.heading");
  const contactSubtitle = t("pages.index.contact.subtitle");
  const footerText = t("layout.footer.copyright", {
    year: new Date().getFullYear()
  });
  return <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <SEO title="UniDoxia - Your Path to International Education" description="Connect with top universities worldwide. Streamline your study abroad journey with expert guidance, AI tools, tracking, and full support." keywords="study abroad, university applications, international education, AI tools, visa calculator" />

      <LandingHeader />

      {/* HERO VIDEO SECTION - Optimized for instant playback */}
      <HeroVideo
        videoSrc="/videos/hero-video.mp4"
        posterSrc={studentsStudyingGroup}
        fallbackImageSrc={studentsStudyingGroup}
        loadDelay={0}
      />
      {/* Hero Content Overlay */}
      <section className="hero-video-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, minHeight: '100vh', pointerEvents: 'none' }}>
        <div className="hero-content" style={{ pointerEvents: 'auto' }}>
          {/* Logo at top */}
          <img
            src={unidoxiaLogo}
            alt="UniDoxia logo"
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="hero-logo mb-8 h-24 w-auto sm:h-32 md:h-40 opacity-50 drop-shadow-2xl brightness-0 invert"
          />

          {/* Main Text */}
          <h1 className="hero-text text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg">
            Apply{" "}
            <span className="text-white/90">•</span>{" "}
            Get Your Visa{" "}
            <span className="text-white/90">•</span>{" "}
            Study Abroad
          </h1>
        </div>
      </section>

      {/* WELCOME SECTION - Above Search */}
      <section className="relative py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <TypewriterText
            prefix={heroTitleParts.prefix}
            highlight={heroTitleParts.highlight}
            phrases={["Your Future", "Your Dreams", "Success"]}
            suffix={heroTitleParts.suffix}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            typingSpeed={90}
            deletingSpeed={45}
            pauseDuration={2200}
            startDelay={500}
            loop={true}
          />

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {heroDescription}
          </p>
        </div>
      </section>

      {/* STUDY PROGRAM SEARCH */}
      <StudyProgramSearch className="pt-0" />

      {/* VISA CALCULATOR */}
      <section className="relative py-24">
        <div className="container mx-auto grid items-center gap-14 px-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-primary/20">
              <Sparkles className="h-4 w-4" />
              {visaBadgeLabel}
            </span>

            <h2 className="text-4xl font-bold leading-tight sm:text-5xl">
              {visaTitle}
            </h2>

            <p className="text-lg text-muted-foreground">{visaDescription}</p>

            <Button asChild size="lg" className="gap-2">
              <Link to="/visa-calculator" onClick={() => logVisaCalculatorCardClick("cta_button")}>
                <Calculator className="h-5 w-5" />
                {visaButtonLabel}
              </Link>
            </Button>
          </div>

          <div className="relative">
            <img src={visaEligibilityImage} alt="Student checking visa eligibility" className="w-full h-auto rounded-2xl shadow-2xl" />
          </div>
        </div>
      </section>

      {/* CTA CARDS SECTION */}
      <section className="relative bg-gradient-to-b from-background to-muted/20 py-16 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
            {heroCtas.map(cta => <Link key={cta.key} to={cta.href} className="block h-full">
                <Card className="group flex h-full flex-col overflow-hidden rounded-3xl border border-primary/10 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
                  <div className="relative h-48 overflow-hidden sm:h-56">
                    <img src={cta.image} alt={cta.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90 group-hover:opacity-80" />

                    <Badge className="absolute left-4 top-4 bg-background/90 text-foreground">
                      {cta.badge}
                    </Badge>
                  </div>

                  <CardContent className="flex flex-1 flex-col gap-4 p-6 text-left">
                    <h3 className="text-2xl font-bold">{cta.title}</h3>
                    <p className="flex-1 text-sm text-muted-foreground">
                      {cta.description}
                    </p>
                    <Button className="w-full sm:w-auto">{cta.action}</Button>
                  </CardContent>
                </Card>
              </Link>)}
          </div>

          <JourneyRibbon />
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">
          {featuresHeading}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map(f => <Card key={f.key} className="relative overflow-hidden group hover:shadow-2xl transition-shadow duration-300">
              {/* Feature Image */}
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={f.image} 
                  alt={f.title} 
                  className="w-full h-full object-cover rounded-t-xl"
                  loading="lazy"
                />
              </div>
              <CardContent className="p-8">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${f.color} mb-6 shadow-lg`}>
                  <f.icon className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* AI Sections - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <AIDocumentCheckerSection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <AIFeeCalculator />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <ZoeExperienceSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <FeaturedUniversitiesSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <StoryboardSection />
      </Suspense>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-12">{testimonialsHeading}</h2>

        <Card className="max-w-3xl mx-auto border-2 shadow-xl">
          <CardContent className="p-10">
            <Quote className="h-10 w-10 text-primary/20 mb-6 mx-auto" />

            <p className="italic text-xl mb-6">
              "{testimonials[currentTestimonial].quote}"
            </p>

            <div className="flex justify-center gap-1 mb-6">
              {Array.from({
              length: testimonials[currentTestimonial].rating
            }).map((_, i) => <Star key={i} className="h-5 w-5 fill-primary text-primary" />)}
            </div>

            <div className="text-lg font-bold">
              {testimonials[currentTestimonial].name}
            </div>
            <div className="text-muted-foreground">
              {testimonials[currentTestimonial].role} —{" "}
              {testimonials[currentTestimonial].country}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-8">
          <Button variant="ghost" size="icon" onClick={prevTestimonial}>
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button variant="ghost" size="icon" onClick={nextTestimonial}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{faqHeading}</h2>
          <p className="text-muted-foreground">{faqSubtitle}</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {faqs.map((section, sectionIndex) => <div key={sectionIndex} className="space-y-6">
              <h3 className="text-2xl font-semibold text-left">
                {t("pages.index.faq.audienceHeading", {
              audience: section.audience
            })}
              </h3>

              <Accordion type="single" collapsible className="space-y-4">
                {section.items.map((faq, faqIndex) => <AccordionItem key={faqIndex} value={`item-${sectionIndex}-${faqIndex}`} className="border rounded-lg bg-card">
                    <AccordionTrigger className="py-6 px-4 font-semibold text-left">
                      {faq.question}
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-6 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>)}
              </Accordion>
            </div>)}
        </div>
      </section>

      {/* CONTACT */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{contactHeading}</h2>
          <p className="text-muted-foreground">{contactSubtitle}</p>
        </div>

        <Card className="max-w-2xl mx-auto border-2">
          <CardContent className="p-8">
            <Suspense fallback={<SectionLoader />}>
              <ContactForm />
            </Suspense>
          </CardContent>
        </Card>
      </section>

      {/* FOOTER */}
      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
          {footerText}
        </div>
      </footer>
    </div>;
});
export default Index;
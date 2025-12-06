"use client";

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/ContactForm";
import { logVisaCalculatorCardClick } from "@/lib/analytics";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, FileCheck, Clock, Star, Quote, ChevronLeft, ChevronRight, Sparkles, Calculator } from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import studentsStudyingGroup from "@/assets/students-studying-group.png";
import agentStudentConsulting from "@/assets/agent-student-consulting.png";
import universityBuildings from "@/assets/university-buildings.png";
import visaEligibilityImage from "@/assets/visa-eligibility-checklist.png";
import { FeaturedUniversitiesSection } from "@/components/landing/FeaturedUniversitiesSection";
import { StoryboardSection } from "@/components/landing/StoryboardSection";
import { AIDocumentCheckerSection } from "@/components/landing/AIDocumentCheckerSection";
import { AIFeeCalculator } from "@/components/landing/AIFeeCalculator";
import { ZoeExperienceSection } from "@/components/landing/ZoeExperienceSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ThreeDCarousel, type ThreeDCarouselCard } from "@/components/landing/ThreeDCarousel";
import { JourneyRibbon } from "@/components/JourneyRibbon";
import { SEO } from "@/components/SEO";
import studentJourney from "@/assets/student-journey.png";
import globalDestinations from "@/assets/global-destinations.png";
const Index = () => {
  const {
    t
  } = useTranslation();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // HERO CTAs
  const heroCtas = useMemo(() => [{
    key: "students" as const,
    href: "/auth/signup?role=student",
    image: studentsStudyingGroup
  }, {
    key: "agents" as const,
    href: "/auth/signup?role=agent",
    image: agentStudentConsulting
  }, {
    key: "universities" as const,
    href: "/partnership",
    image: universityBuildings
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
  const carouselCards = useMemo<ThreeDCarouselCard[]>(() => [{
    title: "Build your roadmap",
    description: "Task checklists and smart reminders keep thousands of students organized from transcripts to statements.",
    metricValue: "5000+",
    metricLabel: "personalized plans created",
    actionLabel: "Meet your agent",
    actionHref: "/auth/signup?role=student",
    image: studentJourney,
    gradient: "from-[#3B1F5E] via-[#1A0F30] to-[#0A081D]",
    accent: "bg-gradient-to-r from-[#C4A1FF]/20 via-[#7AE8FF]/20 to-[#FFD166]/25"
  }, {
    title: "Collaborate with advisors",
    description: "Verified advisors co-edit documents, answer questions, and align timelines in real time across devices.",
    metricValue: "24h",
    metricLabel: "average agent response",
    actionLabel: "Collaborate now",
    actionHref: "/auth/signup?role=agent",
    image: agentStudentConsulting,
    gradient: "from-[#251943] via-[#1B1236] to-[#0C0A1C]",
    accent: "bg-gradient-to-r from-[#8B5CF6]/25 via-[#6EE7FF]/20 to-[#FDE68A]/20"
  }, {
    title: "Streamline applications",
    description: "Centralized submissions with proactive nudges keep applications on track and mistake-free.",
    metricValue: "95%",
    metricLabel: "success rate",
    actionLabel: "See smart automations",
    actionHref: "/course-discovery",
    image: visaEligibilityImage,
    gradient: "from-[#1F2343] via-[#17192F] to-[#0C0B1B]",
    accent: "bg-gradient-to-r from-[#6EE7FF]/25 via-[#A78BFA]/20 to-[#FBBF24]/25"
  }, {
    title: "Launch your journey",
    description: "Visa-ready checklists and pre-departure prep carry students from campus access to arrival with confidence.",
    metricValue: "50+",
    metricLabel: "countries represented",
    actionLabel: "Explore destinations",
    actionHref: "/university-directory",
    image: globalDestinations,
    gradient: "from-[#1E0F2F] via-[#120C24] to-[#090816]",
    accent: "bg-gradient-to-r from-[#9F7AEA]/25 via-[#7EE0FF]/20 to-[#FCD34D]/20"
  }], []);

  // FEATURES
  const features = useMemo(() => [{
    key: "applyEasily" as const,
    icon: FileCheck,
    color: "from-blue-500 to-cyan-500"
  }, {
    key: "trackRealtime" as const,
    icon: Clock,
    color: "from-purple-500 to-pink-500"
  }, {
    key: "connectAgents" as const,
    icon: Users,
    color: "from-orange-500 to-red-500"
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
  const nextTestimonial = () => setCurrentTestimonial(prev => (prev + 1) % testimonialCount);
  const prevTestimonial = () => setCurrentTestimonial(prev => prev === 0 ? testimonialCount - 1 : prev - 1);

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

      {/* HERO VIDEO SECTION */}
      <section className="hero-video-container">
        {/* Background Video */}
        <video className="hero-video" autoPlay loop muted playsInline poster="/videos/hero-poster.jpg">
          <source src="/videos/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Dark Overlay */}
        <div className="hero-video-overlay" />

        {/* Content */}
        <div className="hero-content">
          {/* Logo at top */}
          <img src={unidoxiaLogo} alt="UniDoxia logo" className="hero-logo mb-8 h-24 w-auto sm:h-32 md:h-40 opacity-50 drop-shadow-2xl brightness-0 invert" />

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

      {/* CTA CARDS SECTION */}
      <section className="relative bg-gradient-to-b from-background to-muted/20 py-16 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {heroTitleParts.prefix}{" "}
            <span className="text-primary">{heroTitleParts.highlight}</span>
            {heroTitleParts.suffix ? ` ${heroTitleParts.suffix}` : ""}
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            {heroDescription}
          </p>

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

      {/* NEO-STYLE 3D CAROUSEL */}
      

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">
          {featuresHeading}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map(f => <Card key={f.key} className="relative overflow-hidden group hover:shadow-2xl">
              <CardContent className="p-8">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${f.color} mb-6`}>
                  <f.icon className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>)}
        </div>
      </section>

      {/* AI Sections */}
      <AIDocumentCheckerSection />

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

      <AIFeeCalculator />

      <ZoeExperienceSection />
      <FeaturedUniversitiesSection />
      <StoryboardSection />

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
            <ContactForm />
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
};
export default Index;
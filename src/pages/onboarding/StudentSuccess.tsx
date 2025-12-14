"use client";

import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Quote, GraduationCap, Plane, FileCheck, Award } from "lucide-react";
import { OnboardingProgressNav } from "@/components/onboarding/OnboardingProgressNav";

// Success story data representing African students
const successStories = [
  {
    id: 1,
    name: "Adaeze Okonkwo",
    country: "Nigeria",
    flag: "🇳🇬",
    destination: "🇬🇧 UK",
    university: "University of Manchester",
    program: "MSc Data Science",
    image: "A",
    quote: "UniDoxia made my dream of studying in the UK a reality!",
    achievement: "admission",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    id: 2,
    name: "Kwame Asante",
    country: "Ghana",
    flag: "🇬🇭",
    destination: "🇨🇦 Canada",
    university: "University of Toronto",
    program: "MBA",
    image: "K",
    quote: "Got my study permit in just 3 weeks with their guidance!",
    achievement: "visa",
    color: "from-yellow-500/20 to-amber-500/20",
  },
  {
    id: 3,
    name: "Fatima Hassan",
    country: "Kenya",
    flag: "🇰🇪",
    destination: "🇺🇸 USA",
    university: "MIT",
    program: "Computer Engineering",
    image: "F",
    quote: "From Nairobi to MIT - this platform changed my life!",
    achievement: "admission",
    color: "from-red-500/20 to-rose-500/20",
  },
  {
    id: 4,
    name: "Tendai Moyo",
    country: "Zimbabwe",
    flag: "🇿🇼",
    destination: "🇦🇺 Australia",
    university: "University of Sydney",
    program: "Medicine",
    image: "T",
    quote: "The scholarship finder helped me secure full funding!",
    achievement: "scholarship",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: 5,
    name: "Amira Diallo",
    country: "Senegal",
    flag: "🇸🇳",
    destination: "🇩🇪 Germany",
    university: "TU Munich",
    program: "Mechanical Engineering",
    image: "D",
    quote: "Zero tuition + great career prospects. Best decision ever!",
    achievement: "visa",
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    id: 6,
    name: "Chidi Nnamdi",
    country: "Nigeria",
    flag: "🇳🇬",
    destination: "🇮🇪 Ireland",
    university: "Trinity College Dublin",
    program: "Law",
    image: "C",
    quote: "The step-by-step process made everything so simple!",
    achievement: "admission",
    color: "from-orange-500/20 to-amber-500/20",
  },
];

// Achievement badge component
const AchievementBadge = ({ type }: { type: string }) => {
  const badges = {
    admission: { icon: GraduationCap, label: "Admitted", color: "bg-green-500/20 text-green-600" },
    visa: { icon: Plane, label: "Visa Approved", color: "bg-blue-500/20 text-blue-600" },
    scholarship: { icon: Award, label: "Scholarship", color: "bg-yellow-500/20 text-yellow-600" },
  };

  const badge = badges[type as keyof typeof badges] || badges.admission;
  const Icon = badge.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${badge.color}`}>
      <Icon className="w-3 h-3" />
      {badge.label}
    </div>
  );
};

const AnimatedCardRow = ({
  stories,
  animationDuration,
  reverse = false,
  activeIndex,
  offsetDelay = 0,
}: {
  stories: typeof successStories;
  animationDuration: number;
  reverse?: boolean;
  activeIndex: number;
  offsetDelay?: number;
}) => {
  const trackClass = reverse ? "animate-marquee-reverse" : "animate-marquee";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-background/60 shadow-lg backdrop-blur-lg">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent" />
      <div
        className={`flex gap-3 sm:gap-4 py-4 ${trackClass}`}
        style={{
          animationDuration: `${animationDuration}s`,
          animationDelay: `${offsetDelay}s`,
        }}
      >
        {stories.map((story, index) => (
          <TestimonialCard
            key={`${story.id}-${index}`}
            story={story}
            index={index}
            isActive={index % successStories.length === activeIndex}
          />
        ))}
      </div>
    </div>
  );
};

// Floating star component
const FloatingStar = ({ 
  delay, 
  size, 
  left, 
  top,
  duration 
}: { 
  delay: number; 
  size: number; 
  left: number;
  top: number;
  duration: number;
}) => (
  <div
    className="absolute text-primary/40 pointer-events-none animate-float-star"
    style={{
      left: `${left}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    <Star className="fill-current" style={{ width: size, height: size }} />
  </div>
);

// Testimonial card component with sliding animation
const TestimonialCard = ({
  story,
  index,
  isActive,
}: {
  story: typeof successStories[0];
  index: number;
  isActive: boolean;
}) => {
  const slideDirection = index % 2 === 0 ? "slide-left" : "slide-right";

  return (
    <div
      className={`
        relative flex flex-col p-3 sm:p-4 rounded-2xl border border-border/50
        bg-gradient-to-br ${story.color} backdrop-blur-sm
        transition-all duration-700 ease-out
        min-w-[240px] sm:min-w-[260px] max-w-sm shadow-lg
        ${isActive ? "scale-100 opacity-100 ring-2 ring-primary/40 shadow-2xl" : "scale-95 opacity-70"}
        animate-${slideDirection}
        hover:-translate-y-1 hover:shadow-2xl
      `}
      style={{
        animationDelay: `${index * 0.15}s`,
        animationFillMode: "forwards",
      }}
    >
      {/* Quote icon */}
      <Quote className="absolute top-2 right-2 w-4 h-4 text-primary/20" />

      {/* Header with avatar and info */}
      <div className="flex items-start gap-3 mb-2">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
            {story.image}
          </div>
          <span className="absolute -bottom-1 -right-1 text-sm">{story.flag}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">
            {story.name}
          </h4>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {story.country} → {story.destination}
          </p>
          <p className="text-[10px] sm:text-xs text-primary font-medium truncate">
            {story.university}
          </p>
        </div>
      </div>

      {/* Achievement badge */}
      <div className="mb-2">
        <AchievementBadge type={story.achievement} />
      </div>

      {/* Quote */}
      <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
        "{story.quote}"
      </p>

      {/* Program */}
      <div className="mt-2 pt-2 border-t border-border/30">
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          📚 {story.program}
        </span>
      </div>
    </div>
  );
};

// Stats counter component
const StatsCounter = ({ 
  value, 
  label, 
  delay 
}: { 
  value: string; 
  label: string; 
  delay: number;
}) => (
  <div 
    className="text-center animate-fade-in-up opacity-0"
    style={{ animationDelay: `${delay}s`, animationFillMode: "forwards" }}
  >
    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
      {value}
    </div>
    <div className="text-[10px] sm:text-xs text-muted-foreground">
      {label}
    </div>
  </div>
);

// Background decoration with animated elements
const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Gradient orbs */}
    <div className="absolute top-10 left-10 w-64 h-64 bg-green-500/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />

    {/* Confetti-like decorations */}
    <div className="absolute top-20 right-20 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0.5s" }} />
    <div className="absolute top-40 left-16 w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "1s" }} />
    <div className="absolute bottom-32 right-28 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "1.5s" }} />
  </div>
);

export default function OnboardingStudentSuccess() {
  const [showContent, setShowContent] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-rotate through active testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % successStories.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Generate floating stars
  const stars = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: Math.random() * 3,
        size: Math.random() * 12 + 8,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 2 + 3,
      })),
    []
  );

  const marqueeStories = useMemo(
    () => [...successStories, ...successStories],
    []
  );

  const staggeredMarqueeStories = useMemo(() => {
    const rotated = [...successStories.slice(3), ...successStories.slice(0, 3)];
    return [...rotated, ...rotated];
  }, []);

  const handleNext = () => {
    navigate("/onboarding/destinations");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

      {/* Floating stars */}
      {stars.map((star) => (
        <FloatingStar key={star.id} {...star} />
      ))}

      {/* Main content */}
      <div
        className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-5xl">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-2 sm:mb-3 animate-fade-in-up">
            Join Thousands of Students{" "}
            <span className="text-primary">Succeeding Abroad</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-6 sm:mb-8 animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.1s" }}
          >
            Real stories. Real success. Your future is next.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-6 sm:gap-10 md:gap-16 mb-6 sm:mb-8">
            <StatsCounter value="10,000+" label="Students Placed" delay={0.2} />
            <StatsCounter value="95%" label="Visa Success" delay={0.3} />
            <StatsCounter value="50+" label="Countries" delay={0.4} />
          </div>

          {/* Testimonial cards grid - Animated collage */}
          <div className="w-full max-w-5xl space-y-4 sm:space-y-5 mb-6 sm:mb-8">
            <AnimatedCardRow
              stories={marqueeStories}
              animationDuration={26}
              activeIndex={activeIndex}
            />
            <AnimatedCardRow
              stories={staggeredMarqueeStories}
              animationDuration={28}
              reverse
              activeIndex={(activeIndex + 2) % successStories.length}
              offsetDelay={1.5}
            />
          </div>

          {/* Success indicators */}
          <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <FileCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Verified success stories from real students
            </span>
          </div>

          {/* CTA Button */}
          <div
            className="w-full max-w-xs animate-fade-in-up"
            style={{ animationDelay: "0.7s" }}
          >
            <Button onClick={handleNext} size="lg" className="w-full gap-2 text-base shadow-lg">
              Continue to destinations
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Skip option */}
          <Link
            to="/onboarding/destinations"
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-in"
            style={{ animationDelay: "0.8s" }}
          >
            Skip for now
          </Link>
        </div>

        <div className="container mx-auto max-w-5xl mt-auto pt-6">
          <OnboardingProgressNav
            previousHref="/onboarding/visa-requirements"
            previousLabel="Back to requirements"
            nextHref="/onboarding/destinations"
            nextLabel="Next: Destinations"
            steps={[
              { label: "Welcome", href: "/onboarding/welcome" },
              { label: "Visa requirements", href: "/onboarding/visa-requirements" },
              { label: "Student success", href: "/onboarding/success-stories", active: true },
              { label: "Destinations", href: "/onboarding/destinations" },
            ]}
          />
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-star {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-15px) rotate(180deg);
            opacity: 0.7;
          }
        }

        @keyframes slide-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-right {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-float-star {
          animation: float-star 4s ease-in-out infinite;
        }

        .animate-slide-left {
          animation: slide-left 0.6s ease-out forwards;
        }

        .animate-slide-right {
          animation: slide-right 0.6s ease-out forwards;
        }

        .animate-marquee {
          animation: marquee linear infinite;
        }

        .animate-marquee-reverse {
          animation: marquee-reverse linear infinite;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

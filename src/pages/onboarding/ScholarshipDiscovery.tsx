"use client";

import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Sparkles, Trophy, Star, Medal, Gift, GraduationCap } from "lucide-react";
import BackButton from "@/components/BackButton";

// Country scholarship badge data
const scholarshipBadges = [
  {
    id: "germany",
    country: "Germany",
    flag: "🇩🇪",
    name: "DAAD Scholarship",
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/40",
    amount: "Full Funding",
    icon: GraduationCap,
  },
  {
    id: "ireland",
    country: "Ireland",
    flag: "🇮🇪",
    name: "Government of Ireland",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/40",
    amount: "€16,000/year",
    icon: Award,
  },
  {
    id: "uk",
    country: "UK",
    flag: "🇬🇧",
    name: "Chevening",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
    amount: "Full Funding",
    icon: Trophy,
  },
  {
    id: "usa",
    country: "USA",
    flag: "🇺🇸",
    name: "Fulbright",
    color: "from-red-500 to-rose-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/40",
    amount: "Full Funding",
    icon: Star,
  },
  {
    id: "canada",
    country: "Canada",
    flag: "🇨🇦",
    name: "Vanier CGS",
    color: "from-red-600 to-red-700",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/40",
    amount: "$50,000/year",
    icon: Medal,
  },
  {
    id: "australia",
    country: "Australia",
    flag: "🇦🇺",
    name: "Australia Awards",
    color: "from-blue-600 to-yellow-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
    amount: "Full Funding",
    icon: Gift,
  },
];

// Floating scholarship badge component (confetti-like rising animation)
const FloatingScholarshipBadge = ({
  badge,
  delay,
  startX,
  duration,
}: {
  badge: typeof scholarshipBadges[0];
  delay: number;
  startX: number;
  duration: number;
}) => {
  const Icon = badge.icon;
  
  return (
    <div
      className={`absolute pointer-events-none ${badge.bgColor} ${badge.borderColor} border rounded-xl px-3 py-2 backdrop-blur-sm shadow-lg`}
      style={{
        left: `${startX}%`,
        bottom: "-80px",
        animation: `floatUpBadge ${duration}s ease-out ${delay}s infinite`,
        opacity: 0,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{badge.flag}</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-foreground/80 whitespace-nowrap">{badge.name}</span>
          <span className="text-[9px] text-muted-foreground">{badge.amount}</span>
        </div>
        <Icon className="w-3 h-3 text-primary/60" />
      </div>
    </div>
  );
};

// Shimmer effect component for scholarship cards
const ShimmerCard = ({
  badge,
  delay,
  featured,
}: {
  badge: typeof scholarshipBadges[0];
  delay: number;
  featured?: boolean;
}) => {
  const Icon = badge.icon;
  const size = featured ? "scale-110" : "";
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 ${badge.borderColor} ${badge.bgColor}
        p-4 sm:p-5 transition-all duration-500 hover:scale-105
        animate-fade-in-up opacity-0 ${size}
        ${featured ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""}
      `}
      style={{
        animationDelay: `${delay}s`,
        animationFillMode: "forwards",
      }}
    >
      {/* Shimmer overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
        style={{
          animation: `shimmer 3s ease-in-out ${delay + 0.5}s infinite`,
        }}
      />
      
      {/* Card content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-2">
        {/* Flag and icon */}
        <div className="relative">
          <span className="text-3xl sm:text-4xl">{badge.flag}</span>
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-gradient-to-br ${badge.color}`}>
            <Icon className="w-3 h-3 text-white" />
          </div>
        </div>
        
        {/* Country name */}
        <h3 className="font-semibold text-sm sm:text-base text-foreground">
          {badge.country}
        </h3>
        
        {/* Scholarship name */}
        <p className="text-xs text-muted-foreground">
          {badge.name}
        </p>
        
        {/* Amount badge */}
        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${badge.color} text-white`}>
          {badge.amount}
        </span>
      </div>
      
      {/* Sparkle decorations */}
      <Sparkles 
        className="absolute top-2 right-2 w-3 h-3 text-primary/40 animate-pulse" 
        style={{ animationDelay: `${delay}s` }}
      />
    </div>
  );
};

// Background decoration with rising particles
const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Gradient orbs */}
    <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div className="absolute bottom-20 right-10 w-80 h-80 bg-green-500/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />
    
    {/* Subtle grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
  </div>
);

// AI scanning animation
const AIScanningIndicator = () => (
  <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/5 rounded-full border border-primary/20 animate-fade-in" style={{ animationDelay: "0.8s" }}>
    <div className="relative">
      <div className="w-2 h-2 bg-primary rounded-full animate-ping absolute" />
      <div className="w-2 h-2 bg-primary rounded-full" />
    </div>
    <span className="text-xs sm:text-sm text-muted-foreground">
      AI scanning <span className="text-primary font-medium">12,000+</span> scholarships worldwide
    </span>
  </div>
);

export default function OnboardingScholarshipDiscovery() {
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Generate floating badges for confetti effect
  const floatingBadges = useMemo(() => {
    const badges: Array<{
      badge: typeof scholarshipBadges[0];
      delay: number;
      startX: number;
      duration: number;
    }> = [];
    
    for (let i = 0; i < 12; i++) {
      badges.push({
        badge: scholarshipBadges[i % scholarshipBadges.length],
        delay: Math.random() * 8,
        startX: Math.random() * 80 + 10,
        duration: Math.random() * 4 + 6,
      });
    }
    
    return badges;
  }, []);

  // Featured badges (Germany and Ireland as specified)
  const featuredBadges = scholarshipBadges.filter(
    b => b.id === "germany" || b.id === "ireland"
  );
  const otherBadges = scholarshipBadges.filter(
    b => b.id !== "germany" && b.id !== "ireland"
  );

  const handleNext = () => {
    navigate("/auth/signup?role=student");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

      {/* Floating scholarship badges (confetti effect) */}
      {floatingBadges.map((item, index) => (
        <FloatingScholarshipBadge
          key={index}
          badge={item.badge}
          delay={item.delay}
          startX={item.startX}
          duration={item.duration}
        />
      ))}

      {/* Main content */}
      <div className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}>
        {/* Back button */}
        <div className="container mx-auto max-w-4xl">
          <BackButton fallback="/onboarding/destinations" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-4xl">
          {/* Sparkle icon */}
          <div className="relative mb-4 animate-fade-in">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-subtle" />
            <div className="relative bg-primary/10 rounded-full p-4">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 animate-fade-in-up">
            Discover Scholarships{" "}
            <span className="text-primary block sm:inline">You Never Knew Existed</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-6 sm:mb-8 animate-fade-in-up max-w-xl" style={{ animationDelay: "0.1s" }}>
            Our AI scans international databases to match you instantly.
          </p>

          {/* AI Scanning indicator */}
          <AIScanningIndicator />

          {/* Featured scholarships (Germany & Ireland) */}
          <div className="mt-8 mb-4">
            <p className="text-xs text-center text-muted-foreground mb-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              Featured Opportunities
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {featuredBadges.map((badge, index) => (
                <ShimmerCard
                  key={badge.id}
                  badge={badge}
                  delay={0.4 + index * 0.15}
                  featured
                />
              ))}
            </div>
          </div>

          {/* Other scholarships */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-2xl mb-8">
            {otherBadges.map((badge, index) => (
              <ShimmerCard
                key={badge.id}
                badge={badge}
                delay={0.7 + index * 0.1}
              />
            ))}
          </div>

          {/* Trust indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 animate-fade-in" style={{ animationDelay: "1.2s" }}>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>Updated daily</span>
            </div>
            <span className="text-muted-foreground/40">•</span>
            <span>50+ Countries</span>
            <span className="text-muted-foreground/40">•</span>
            <span>AI-powered matching</span>
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "1s" }}>
            <Button 
              onClick={handleNext}
              size="lg" 
              className="w-full gap-2 text-base"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Skip option */}
          <Link 
            to="/auth/signup?role=student" 
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-in"
            style={{ animationDelay: "1.1s" }}
          >
            Skip for now
          </Link>
        </div>

        {/* Progress indicator */}
        <div className="container mx-auto max-w-4xl mt-auto pt-6">
          <div className="flex justify-center gap-2">
            <Link to="/onboarding/welcome" className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
            <Link to="/onboarding/destinations" className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes floatUpBadge {
          0% {
            transform: translateY(0) rotate(-5deg) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
            transform: translateY(-10vh) rotate(0deg) scale(1);
          }
          50% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-100vh) rotate(5deg) scale(0.9);
            opacity: 0;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          50%, 100% {
            transform: translateX(100%);
          }
        }

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
      `}</style>
    </div>
  );
}

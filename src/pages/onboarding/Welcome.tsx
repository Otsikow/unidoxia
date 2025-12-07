"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, GraduationCap, Users } from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";

// Floating particle component
const FloatingParticle = ({ delay, size, left, duration }: { delay: number; size: number; left: number; duration: number }) => (
  <div
    className="absolute rounded-full bg-primary/20 pointer-events-none"
    style={{
      width: size,
      height: size,
      left: `${left}%`,
      bottom: "-20px",
      animation: `floatUp ${duration}s ease-in-out ${delay}s infinite`,
    }}
  />
);

// World map connection lines
const WorldMapLines = () => (
  <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Connection lines representing global network */}
    <path d="M100,300 Q300,100 500,300" stroke="url(#lineGradient)" strokeWidth="2" fill="none" className="animate-pulse-subtle">
      <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="4s" repeatCount="indefinite" />
    </path>
    <path d="M500,300 Q700,500 900,300" stroke="url(#lineGradient)" strokeWidth="2" fill="none" className="animate-pulse-subtle" style={{ animationDelay: "1s" }}>
      <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="4s" begin="1s" repeatCount="indefinite" />
    </path>
    <path d="M200,400 Q500,200 800,400" stroke="url(#lineGradient)" strokeWidth="2" fill="none" className="animate-pulse-subtle" style={{ animationDelay: "2s" }}>
      <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="4s" begin="2s" repeatCount="indefinite" />
    </path>
    {/* Dots representing cities */}
    <circle cx="150" cy="280" r="4" fill="hsl(var(--primary))" className="animate-pulse-subtle" />
    <circle cx="500" cy="300" r="6" fill="hsl(var(--primary))" className="animate-pulse-subtle" />
    <circle cx="850" cy="280" r="4" fill="hsl(var(--primary))" className="animate-pulse-subtle" />
    <circle cx="300" cy="180" r="3" fill="hsl(var(--primary))" className="animate-pulse-subtle" />
    <circle cx="700" cy="420" r="3" fill="hsl(var(--primary))" className="animate-pulse-subtle" />
  </svg>
);

// Animated landmark icon component
const LandmarkIcon = ({ 
  icon: Icon, 
  label, 
  delay, 
  position 
}: { 
  icon: React.ElementType; 
  label: string; 
  delay: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}) => (
  <div 
    className="absolute flex flex-col items-center gap-1 animate-fade-in opacity-0"
    style={{ 
      ...position,
      animationDelay: `${delay}s`,
      animationFillMode: "forwards"
    }}
  >
    <div className="relative">
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse-subtle" />
      <div className="relative bg-background/80 backdrop-blur-sm border border-primary/30 rounded-full p-3 shadow-lg">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
      </div>
    </div>
    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium whitespace-nowrap">{label}</span>
  </div>
);

// Gateway portal component
const GlowingGateway = () => (
  <div className="relative w-48 h-64 sm:w-56 sm:h-72 md:w-64 md:h-80 mx-auto">
    {/* Outer glow */}
    <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/20 to-transparent rounded-t-full blur-2xl animate-pulse-subtle" />
    
    {/* Gateway arch */}
    <div className="absolute inset-4 border-4 border-primary/60 rounded-t-full bg-gradient-to-b from-primary/10 via-background/50 to-background/80 backdrop-blur-sm overflow-hidden">
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-primary/20" />
      
      {/* Portal effect */}
      <div className="absolute inset-8 rounded-t-full bg-gradient-to-b from-primary/30 via-primary/10 to-transparent animate-pulse-subtle" style={{ animationDuration: "3s" }} />
      
      {/* Students silhouette placeholder */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4">
        <div className="flex justify-center items-end gap-1">
          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-primary/60" />
        </div>
      </div>
    </div>
    
    {/* Sparkle effects */}
    <Sparkles className="absolute top-4 left-4 w-4 h-4 text-primary animate-pulse-subtle" style={{ animationDelay: "0.5s" }} />
    <Sparkles className="absolute top-8 right-6 w-3 h-3 text-primary animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <Sparkles className="absolute top-16 left-8 w-3 h-3 text-primary animate-pulse-subtle" style={{ animationDelay: "1.5s" }} />
  </div>
);

export default function OnboardingWelcome() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Generate particles
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      size: Math.random() * 6 + 2,
      left: Math.random() * 100,
      duration: Math.random() * 3 + 4,
    })),
    []
  );

  // Country landmarks data
  const landmarks = [
    { icon: GraduationCap, label: "UK", position: { top: "15%", left: "10%" }, delay: 0.5 },
    { icon: Globe, label: "USA", position: { top: "25%", right: "8%" }, delay: 0.7 },
    { icon: GraduationCap, label: "Canada", position: { top: "10%", right: "25%" }, delay: 0.9 },
    { icon: Globe, label: "Australia", position: { bottom: "30%", right: "5%" }, delay: 1.1 },
    { icon: GraduationCap, label: "Germany", position: { bottom: "25%", left: "5%" }, delay: 1.3 },
    { icon: Globe, label: "Ireland", position: { top: "35%", left: "3%" }, delay: 1.5 },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Floating particles */}
      {particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* World map parallax lines */}
      <div className="absolute inset-0 overflow-hidden" style={{ transform: "translateY(-10%)" }}>
        <WorldMapLines />
      </div>

      {/* Country landmark icons */}
      <div className="absolute inset-0 hidden sm:block">
        {landmarks.map((landmark, i) => (
          <LandmarkIcon key={i} {...landmark} />
        ))}
      </div>

      {/* Main content */}
      <div className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo */}
        <img 
          src={unidoxiaLogo} 
          alt="UniDoxia" 
          className="h-12 sm:h-16 w-auto mb-6 sm:mb-8 animate-fade-in"
        />

        {/* Gateway illustration */}
        <div className="mb-6 sm:mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <GlowingGateway />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 animate-fade-in-up px-2" style={{ animationDelay: "0.4s" }}>
          Your Global Study Journey{" "}
          <span className="text-primary">Starts Here</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center max-w-md sm:max-w-lg md:max-w-xl mb-6 sm:mb-8 animate-fade-in-up px-4" style={{ animationDelay: "0.6s" }}>
          Connect with verified institutions across the UK, USA, Canada, Australia, Germany, and Ireland. 
          Your future awaits.
        </p>

        {/* Country flags/indicators - mobile visible */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in-up sm:hidden" style={{ animationDelay: "0.7s" }}>
          {["🇬🇧 UK", "🇺🇸 USA", "🇨🇦 Canada", "🇦🇺 Australia", "🇩🇪 Germany", "🇮🇪 Ireland"].map((country) => (
            <span key={country} className="px-2 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground">
              {country}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-md animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
          <Button 
            asChild 
            size="lg" 
            className="w-full sm:flex-1 gap-2 text-base"
          >
            <Link to="/onboarding/destinations">
              <Sparkles className="w-4 h-4" />
              Get Started
            </Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg" 
            className="w-full sm:flex-1 text-base"
          >
            <Link to="/auth/login">
              Log In
            </Link>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 sm:mt-12 flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "1s" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Verified Partners</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
            <span>50+ Countries</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-8 flex justify-center gap-2 animate-fade-in" style={{ animationDelay: "1.2s" }}>
          <div className="w-2 h-2 rounded-full bg-primary" />
          <Link to="/onboarding/destinations" className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
          <Link to="/onboarding/fast-applications" className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
        </div>
      </div>

      {/* Custom keyframes for float animation */}
      <style>{`
        @keyframes floatUp {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

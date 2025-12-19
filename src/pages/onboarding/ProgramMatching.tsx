"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, GraduationCap, Globe, DollarSign, Target, Brain } from "lucide-react";
import BackButton from "@/components/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { supabase } from "@/integrations/supabase/client";

type CarouselProgram = {
  id: string;
  name: string;
  university: string;
  country: string;
  flag: string;
  level: string;
  duration: string;
  tuition: string;
  color: string;
  borderColor: string;
  accentColor: string;
};

const COLOR_PRESETS = [
  { color: "from-blue-600/20 to-blue-900/20", borderColor: "border-blue-500/40", accentColor: "bg-blue-500" },
  { color: "from-red-600/20 to-red-800/20", borderColor: "border-red-500/40", accentColor: "bg-red-500" },
  { color: "from-green-600/20 to-emerald-900/20", borderColor: "border-green-500/40", accentColor: "bg-green-500" },
  { color: "from-amber-500/20 to-orange-900/20", borderColor: "border-amber-500/40", accentColor: "bg-amber-500" },
  { color: "from-purple-600/20 to-indigo-900/20", borderColor: "border-purple-500/40", accentColor: "bg-purple-500" },
  { color: "from-teal-600/20 to-cyan-900/20", borderColor: "border-teal-500/40", accentColor: "bg-teal-500" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  Canada: "🇨🇦",
  Germany: "🇩🇪",
  Australia: "🇦🇺",
  Ireland: "🇮🇪",
};

const formatDuration = (months?: number | null) => {
  if (!months) return "Duration varies";
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} Year${years > 1 ? "s" : ""}`;
  }
  return `${months} Months`;
};

const formatTuition = (amount?: number | null, currency?: string | null) => {
  if (!amount) return "Contact for fees";
  return `${currency ?? ""} ${amount.toLocaleString()}/yr`;
};

const getCountryFlag = (country?: string | null) => COUNTRY_FLAGS[country || ""] ?? "🌍";

// 3D Rotating Card Component
const ProgramCard = ({
  program,
  position,
  totalCards,
}: {
  program: CarouselProgram;
  position: number;
  totalCards: number;
}) => {
  // Calculate rotation and position for 3D carousel effect
  const angle = (position / totalCards) * 360;
  const radius = 180; // Distance from center
  const radian = (angle * Math.PI) / 180;
  
  const x = Math.sin(radian) * radius;
  const z = Math.cos(radian) * radius - radius;
  const rotateY = -angle;
  const scale = (z + radius * 2) / (radius * 3) * 0.4 + 0.6;
  const opacity = scale > 0.7 ? 1 : scale > 0.5 ? 0.7 : 0.4;
  const zIndex = Math.round(scale * 10);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        x: x - 140, // Center the card (280px / 2)
        y: -160, // Center vertically (320px / 2)
        z,
        rotateY,
        scale,
        opacity,
        zIndex,
      }}
      transition={{
        duration: 0.8,
        ease: [0.32, 0.72, 0, 1],
      }}
    >
      <div
        className={`
          relative w-[280px] h-[320px] rounded-2xl border-2 
          bg-gradient-to-br ${program.color} ${program.borderColor}
          backdrop-blur-xl overflow-hidden
          shadow-xl hover:shadow-2xl transition-shadow
        `}
      >
        {/* Card glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />
        
        {/* Flag and country badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-2xl">{program.flag}</span>
          <span className="text-xs font-medium text-white/80 bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
            {program.country}
          </span>
        </div>

        {/* Level badge */}
        <div className={`absolute top-4 right-4 ${program.accentColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
          {program.level}
        </div>

        {/* Main content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <h3 className="text-xl font-bold text-white mb-1">
            {program.name}
          </h3>
          <p className="text-sm text-white/70 mb-3">
            {program.university}
          </p>
          
          {/* Details row */}
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              {program.duration}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {program.tuition}
            </span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white/30" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// AI Matching indicator dots
const MatchingIndicator = () => (
  <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 rounded-full px-4 py-2 border border-primary/20">
    <Brain className="w-4 h-4 text-primary" />
    <span className="text-sm font-medium text-primary">AI Matching</span>
    <div className="flex gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
    </div>
  </div>
);

// Feature pill component
const FeaturePill = ({
  icon: Icon,
  label,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex items-center gap-2 bg-card/50 dark:bg-card/30 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2"
  >
    <Icon className="w-4 h-4 text-amber-500" />
    <span className="text-sm text-muted-foreground">{label}</span>
  </motion.div>
);

// Background decoration
const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Primary gradient orb */}
    <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
    {/* Gold accent orb */}
    <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    {/* Center subtle orb */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />
    
    {/* Grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
    
    {/* Floating sparkles */}
    <Sparkles className="absolute top-[15%] right-[20%] w-4 h-4 text-amber-400/40 animate-pulse" />
    <Sparkles className="absolute top-[70%] left-[15%] w-3 h-3 text-primary/40 animate-pulse" style={{ animationDelay: "0.5s" }} />
    <Sparkles className="absolute top-[40%] right-[10%] w-3 h-3 text-amber-400/30 animate-pulse" style={{ animationDelay: "1s" }} />
  </div>
);

export default function OnboardingProgramMatching() {
  const [showContent, setShowContent] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [stepCompletion, setStepCompletion] = useState(0.6);
  const [programs, setPrograms] = useState<CarouselProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const totalSteps = 4;
  const navigate = useNavigate();
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from("programs")
          .select(
            `id, name, level, tuition_amount, tuition_currency, duration_months,
            universities:university_id (name, country)`
          )
          .or("active.eq.true,active.is.null")
          .order("name")
          .limit(12);

        if (error) throw error;

        const mappedPrograms: CarouselProgram[] = (data ?? []).map((program, index) => {
          const palette = COLOR_PRESETS[index % COLOR_PRESETS.length];
          const university = (program as any).universities || {};

          return {
            id: program.id,
            name: program.name || "Program",
            university: university.name || "University partner",
            country: university.country || "Global",
            flag: getCountryFlag(university.country),
            level: program.level || "Program",
            duration: formatDuration(program.duration_months),
            tuition: formatTuition(program.tuition_amount, program.tuition_currency),
            ...palette,
          };
        });

        setPrograms(mappedPrograms);
      } catch (error) {
        console.error("Error loading onboarding programs:", error);
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };

    loadPrograms();
  }, []);

  useEffect(() => {
    if (!showContent) return;
    const timer = setTimeout(() => setStepCompletion(1), 250);
    return () => clearTimeout(timer);
  }, [showContent]);

  // Auto-rotate carousel
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }
      
      const delta = time - lastTimeRef.current;
      if (delta > 50) { // Update every 50ms for smooth rotation
        setRotation(prev => (prev + 0.3) % 360);
        lastTimeRef.current = time;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleNext = () => {
    navigate("/auth/signup?role=student");
  };

  // Calculate card positions based on rotation
  const getCardPosition = (index: number) => {
    if (programs.length === 0) return 0;
    return ((index * (360 / programs.length)) + rotation) % 360;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

      {/* Main content */}
      <div className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}>
        {/* Back button */}
        <div className="container mx-auto max-w-5xl">
          <BackButton fallback="/onboarding/destinations" />
        </div>

        <OnboardingProgress
          currentStep={4}
          totalSteps={totalSteps}
          stepCompletion={stepCompletion}
          label="Finalize your course matches to continue"
        />

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-5xl">
          {/* AI Matching indicator */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <MatchingIndicator />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4"
          >
            Smart Matching for Your{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-amber-500 bg-clip-text text-transparent">
              Dream Course
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-2 max-w-xl"
          >
            Instant AI recommendations based on your grades, goals, and budget.
          </motion.p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <FeaturePill icon={GraduationCap} label="Your Grades" delay={0.5} />
            <FeaturePill icon={Target} label="Your Goals" delay={0.6} />
            <FeaturePill icon={DollarSign} label="Your Budget" delay={0.7} />
          </div>

          {/* 3D Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="relative w-full h-[360px] sm:h-[400px] mb-8"
            style={{ perspective: "1200px" }}
          >
            <div
              className="relative w-full h-full"
              style={{ transformStyle: "preserve-3d" }}
            >
              {loadingPrograms ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  Fetching real courses...
                </div>
              ) : programs.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center px-6">
                  No onboarded courses are available yet. Add programs to your university profiles to see them here.
                </div>
              ) : (
                programs.map((program, index) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    position={getCardPosition(index)}
                    totalCards={programs.length}
                  />
                ))
              )}
            </div>
          </motion.div>

          {/* Country indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-2 mb-6"
          >
            {["🇬🇧", "🇺🇸", "🇨🇦", "🇩🇪", "🇦🇺", "🇮🇪"].map((flag, i) => (
              <span
                key={flag}
                className="w-8 h-8 flex items-center justify-center bg-card/50 rounded-full border border-border/50 text-lg animate-bounce-gentle"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {flag}
              </span>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full max-w-xs"
          >
            <Button
              onClick={handleNext}
              size="lg"
              className="w-full gap-2 text-base bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-amber-600/90 transition-all duration-300"
            >
              <Sparkles className="w-4 h-4" />
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

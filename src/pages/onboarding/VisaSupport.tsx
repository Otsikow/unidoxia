"use client";

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileCheck, CheckCircle2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

// Country passport stamp data
const passportStamps = [
  {
    id: "uk",
    country: "United Kingdom",
    code: "UK",
    flag: "🇬🇧",
    color: "from-blue-600 to-red-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
    textColor: "text-blue-600 dark:text-blue-400",
    stampStyle: "rotate-[-8deg]",
  },
  {
    id: "usa",
    country: "United States",
    code: "USA",
    flag: "🇺🇸",
    color: "from-blue-700 to-red-700",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/40",
    textColor: "text-red-600 dark:text-red-400",
    stampStyle: "rotate-[5deg]",
  },
  {
    id: "canada",
    country: "Canada",
    code: "CAN",
    flag: "🇨🇦",
    color: "from-red-600 to-red-700",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/40",
    textColor: "text-red-600 dark:text-red-400",
    stampStyle: "rotate-[-3deg]",
  },
  {
    id: "germany",
    country: "Germany",
    code: "DEU",
    flag: "🇩🇪",
    color: "from-black to-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/40",
    textColor: "text-yellow-600 dark:text-yellow-400",
    stampStyle: "rotate-[7deg]",
  },
  {
    id: "ireland",
    country: "Ireland",
    code: "IRL",
    flag: "🇮🇪",
    color: "from-green-600 to-orange-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/40",
    textColor: "text-green-600 dark:text-green-400",
    stampStyle: "rotate-[-6deg]",
  },
  {
    id: "australia",
    country: "Australia",
    code: "AUS",
    flag: "🇦🇺",
    color: "from-blue-600 to-yellow-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
    textColor: "text-blue-600 dark:text-blue-400",
    stampStyle: "rotate-[4deg]",
  },
];

// Animated passport stamp component
const PassportStamp = ({
  stamp,
  index,
  isVisible,
}: {
  stamp: typeof passportStamps[0];
  index: number;
  isVisible: boolean;
}) => {
  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32
        rounded-xl border-2 border-dashed
        ${stamp.bgColor} ${stamp.borderColor}
        ${stamp.stampStyle}
        transition-all duration-500 ease-out
        ${isVisible 
          ? "opacity-100 scale-100" 
          : "opacity-0 scale-50"
        }
      `}
      style={{
        transitionDelay: `${index * 150}ms`,
        boxShadow: isVisible ? "0 4px 20px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {/* Stamp inner circle effect */}
      <div className={`absolute inset-2 rounded-lg border ${stamp.borderColor} opacity-50`} />
      
      {/* Flag */}
      <span className="text-2xl sm:text-3xl md:text-4xl mb-1 relative z-10">
        {stamp.flag}
      </span>
      
      {/* Country code */}
      <span className={`text-xs sm:text-sm font-bold tracking-wider ${stamp.textColor} relative z-10`}>
        {stamp.code}
      </span>
      
      {/* Decorative stamp marks */}
      <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${stamp.borderColor} border opacity-40`} />
      <div className={`absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full ${stamp.borderColor} border opacity-40`} />
      
      {/* Pop animation overlay */}
      {isVisible && (
        <div 
          className="absolute inset-0 rounded-xl bg-white/20 dark:bg-white/10 animate-ping-once pointer-events-none"
          style={{ animationDelay: `${index * 150}ms` }}
        />
      )}
    </div>
  );
};

// Background decoration with passport page effect
const PassportBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Gradient orbs */}
    <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />
    
    {/* Subtle grid pattern - passport page lines */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:2rem_2rem]" />
    
    {/* Decorative passport page corners */}
    <svg className="absolute top-4 left-4 w-12 h-12 text-muted-foreground/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M3 3v6h6M3 3l6 6" />
    </svg>
    <svg className="absolute top-4 right-4 w-12 h-12 text-muted-foreground/10 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M3 3v6h6M3 3l6 6" />
    </svg>
    <svg className="absolute bottom-4 left-4 w-12 h-12 text-muted-foreground/10 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M3 3v6h6M3 3l6 6" />
    </svg>
    <svg className="absolute bottom-4 right-4 w-12 h-12 text-muted-foreground/10 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M3 3v6h6M3 3l6 6" />
    </svg>
  </div>
);

// Feature highlights
const features = [
  "Personalized checklists",
  "Step-by-step guidance",
  "Document tracking",
];

export default function OnboardingVisaSupport() {
  const [showContent, setShowContent] = useState(false);
  const [stampsVisible, setStampsVisible] = useState(false);
  const [stepCompletion, setStepCompletion] = useState(0.6);
  const totalSteps = 4;
  const navigate = useNavigate();

  useEffect(() => {
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    const stampsTimer = setTimeout(() => setStampsVisible(true), 400);
    
    return () => {
      clearTimeout(contentTimer);
      clearTimeout(stampsTimer);
    };
  }, []);

  useEffect(() => {
    if (!showContent) return;
    const timer = setTimeout(() => setStepCompletion(1), 250);
    return () => clearTimeout(timer);
  }, [showContent]);

  useEffect(() => {
    if (stampsVisible) {
      setStepCompletion((prev) => Math.min(1, prev + 0.2));
    }
  }, [stampsVisible]);

  const handleNext = () => {
    // Navigate to the next onboarding step or signup
    navigate("/auth/signup?role=student");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <PassportBackground />

      {/* Main content */}
      <div className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}>
        {/* Back button */}
        <div className="container mx-auto max-w-4xl">
          <BackButton fallback="/onboarding/destinations" />
        </div>

        <OnboardingProgress
          currentStep={4}
          totalSteps={totalSteps}
          stepCompletion={stepCompletion}
          label="Stay on track with visa support"
        />

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-4xl">
          {/* Passport icon */}
          <div className="mb-4 sm:mb-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-subtle" />
              <div className="relative bg-background/80 backdrop-blur-sm border border-primary/30 rounded-full p-4 shadow-lg">
                <FileCheck className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-2 sm:mb-3 animate-fade-in-up">
            Navigate Visa Requirements{" "}
            <span className="text-primary">Easily</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-6 sm:mb-8 animate-fade-in-up max-w-xl" style={{ animationDelay: "0.1s" }}>
            Get personalized checklists and step-by-step visa guidance.
          </p>

          {/* Passport stamps grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 max-w-lg mx-auto">
            {passportStamps.map((stamp, index) => (
              <PassportStamp
                key={stamp.id}
                stamp={stamp}
                index={index}
                isVisible={stampsVisible}
              />
            ))}
          </div>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: "1.2s" }}>
            {features.map((feature, index) => (
              <div
                key={feature}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-xs sm:text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "1.4s" }}>
            <Button 
              onClick={handleNext}
              size="lg" 
              className="w-full gap-2 text-base"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes ping-once {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .animate-ping-once {
          animation: ping-once 0.5s cubic-bezier(0, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileText, Send, CheckCircle, GraduationCap, Building2 } from "lucide-react";
import BackButton from "@/components/BackButton";

// Application steps data
const applicationSteps = [
  { id: 1, label: "Personal Info", icon: FileText, duration: 800 },
  { id: 2, label: "Documents", icon: FileText, duration: 1200 },
  { id: 3, label: "Review", icon: CheckCircle, duration: 800 },
  { id: 4, label: "Submit", icon: Send, duration: 600 },
];

// University silhouette data with country flags
const universitySilhouettes = [
  { id: "uk", flag: "🇬🇧", name: "United Kingdom", position: { left: "5%", bottom: "8%" }, height: "h-24 sm:h-32", delay: 0.2 },
  { id: "germany", flag: "🇩🇪", name: "Germany", position: { left: "18%", bottom: "8%" }, height: "h-20 sm:h-28", delay: 0.4 },
  { id: "usa", flag: "🇺🇸", name: "United States", position: { left: "35%", bottom: "8%" }, height: "h-28 sm:h-36", delay: 0.6 },
  { id: "ireland", flag: "🇮🇪", name: "Ireland", position: { right: "32%", bottom: "8%" }, height: "h-20 sm:h-26", delay: 0.8 },
  { id: "canada", flag: "🇨🇦", name: "Canada", position: { right: "15%", bottom: "8%" }, height: "h-22 sm:h-30", delay: 1.0 },
  { id: "australia", flag: "🇦🇺", name: "Australia", position: { right: "2%", bottom: "8%" }, height: "h-24 sm:h-32", delay: 1.2 },
];

// Animated progress step component
const ProgressStep = ({
  step,
  index,
  isActive,
  isCompleted,
  totalSteps,
}: {
  step: typeof applicationSteps[0];
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  totalSteps: number;
}) => {
  const Icon = step.icon;

  return (
    <div className="flex flex-col items-center relative">
      {/* Connector line */}
      {index < totalSteps - 1 && (
        <div className="absolute top-5 left-[calc(50%+20px)] w-[calc(100%-8px)] h-0.5 sm:w-16 md:w-20 lg:w-24">
          <div className="h-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary transition-all duration-500 ease-out rounded-full ${
                isCompleted ? "w-full" : "w-0"
              }`}
            />
          </div>
        </div>
      )}

      {/* Step circle */}
      <div
        className={`
          relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
          transition-all duration-500 ease-out z-10
          ${isCompleted 
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
            : isActive 
              ? "bg-primary/20 text-primary border-2 border-primary animate-pulse-subtle" 
              : "bg-muted text-muted-foreground"
          }
        `}
      >
        {isCompleted ? (
          <Check className="w-5 h-5 sm:w-6 sm:h-6 animate-scale-in" />
        ) : (
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        )}

        {/* Active ring animation */}
        {isActive && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
        )}
      </div>

      {/* Step label */}
      <span
        className={`
          mt-2 text-[10px] sm:text-xs font-medium transition-colors duration-300 text-center max-w-[60px] sm:max-w-[80px]
          ${isCompleted || isActive ? "text-primary" : "text-muted-foreground"}
        `}
      >
        {step.label}
      </span>
    </div>
  );
};

// Animated progress bar component
const AnimatedProgressBar = ({ progress }: { progress: number }) => (
  <div className="relative w-full max-w-md mx-auto">
    {/* Background track */}
    <div className="h-2 sm:h-3 bg-muted rounded-full overflow-hidden shadow-inner">
      {/* Progress fill with gradient and glow */}
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-700 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/50 blur-sm rounded-full" />
      </div>
    </div>

    {/* Progress percentage */}
    <div className="flex justify-between items-center mt-2">
      <span className="text-xs text-muted-foreground">Application Progress</span>
      <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
    </div>
  </div>
);

// University campus silhouette component
const CampusSilhouette = ({
  university,
}: {
  university: typeof universitySilhouettes[0];
}) => (
  <div
    className={`absolute flex flex-col items-center gap-1 opacity-0 animate-fade-in-up`}
    style={{
      ...university.position,
      animationDelay: `${university.delay}s`,
      animationFillMode: "forwards",
    }}
  >
    {/* Building silhouette */}
    <div className={`relative ${university.height} w-auto flex items-end`}>
      <Building2 className="w-8 h-full sm:w-12 text-muted-foreground/20 dark:text-muted-foreground/10" />
      <GraduationCap className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/30 dark:text-muted-foreground/20" />
    </div>
    
    {/* Country flag */}
    <span className="text-lg sm:text-xl">{university.flag}</span>
  </div>
);

// Background decoration
const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Gradient orbs */}
    <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div className="absolute bottom-40 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />
    
    {/* Grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
    
    {/* Bottom gradient for silhouettes */}
    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-muted/30 to-transparent" />
  </div>
);

// Floating document particles
const FloatingDocument = ({ delay, left, duration }: { delay: number; left: number; duration: number }) => (
  <div
    className="absolute text-primary/10 pointer-events-none"
    style={{
      left: `${left}%`,
      bottom: "30%",
      animation: `floatDocument ${duration}s ease-in-out ${delay}s infinite`,
    }}
  >
    <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
  </div>
);

export default function OnboardingFastApplications() {
  const [showContent, setShowContent] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Content reveal
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animated progress simulation
  useEffect(() => {
    if (!showContent) return;

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= applicationSteps.length) {
          // Reset after completion
          setTimeout(() => {
            setCurrentStep(0);
            setProgress(0);
          }, 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(stepInterval);
  }, [showContent]);

  // Smooth progress animation
  useEffect(() => {
    const targetProgress = (currentStep / applicationSteps.length) * 100;
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        return prev + diff * 0.1;
      });
    }, 20);

    return () => clearInterval(progressInterval);
  }, [currentStep]);

  // Generate floating documents
  const floatingDocs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        delay: Math.random() * 4,
        left: Math.random() * 90 + 5,
        duration: Math.random() * 2 + 4,
      })),
    []
  );

  const handleNext = () => {
    navigate("/auth/signup?role=student");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

      {/* Floating documents */}
      {floatingDocs.map((doc) => (
        <FloatingDocument key={doc.id} {...doc} />
      ))}

      {/* University silhouettes */}
      <div className="absolute inset-x-0 bottom-0 hidden sm:block">
        {universitySilhouettes.map((uni) => (
          <CampusSilhouette key={uni.id} university={uni} />
        ))}
      </div>

      {/* Main content */}
      <div className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}>
        {/* Back button */}
        <div className="container mx-auto max-w-4xl">
          <BackButton fallback="/onboarding/destinations" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-4xl">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-2 sm:mb-3 animate-fade-in-up">
            Apply to Universities{" "}
            <span className="text-primary">Seamlessly</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-8 sm:mb-12 animate-fade-in-up max-w-xl" style={{ animationDelay: "0.1s" }}>
            Submit perfect applications with guided steps and instant feedback.
          </p>

          {/* Animated Progress Steps */}
          <div className="w-full max-w-lg mb-8 sm:mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex justify-between items-start px-2 sm:px-4">
              {applicationSteps.map((step, index) => (
                <ProgressStep
                  key={step.id}
                  step={step}
                  index={index}
                  isActive={index === currentStep}
                  isCompleted={index < currentStep}
                  totalSteps={applicationSteps.length}
                />
              ))}
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full max-w-md mb-8 sm:mb-10 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <AnimatedProgressBar progress={progress} />
          </div>

          {/* Feature highlights - mobile visible */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 sm:hidden animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            {["🇬🇧 UK", "🇺🇸 USA", "🇩🇪 Germany", "🇮🇪 Ireland", "🇨🇦 Canada", "🇦🇺 Australia"].map((country) => (
              <span key={country} className="px-2 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground">
                {country}
              </span>
            ))}
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
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
            style={{ animationDelay: "0.6s" }}
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
        @keyframes floatDocument {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.1;
          }
          25% {
            transform: translateY(-30px) rotate(5deg);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-50px) rotate(-3deg);
            opacity: 0.15;
          }
          75% {
            transform: translateY(-30px) rotate(3deg);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}

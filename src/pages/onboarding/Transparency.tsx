"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, DollarSign, GraduationCap, Sparkles, BadgePercent, FileCheck } from "lucide-react";
import BackButton from "@/components/BackButton";

// Fee item component that reveals with transparency effect
const FeeItem = ({
  icon: Icon,
  label,
  amount,
  delay,
  revealed,
}: {
  icon: React.ElementType;
  label: string;
  amount: string;
  delay: number;
  revealed: boolean;
}) => (
  <div
    className={`
      relative flex items-center gap-3 p-3 sm:p-4 rounded-xl
      bg-background/80 backdrop-blur-sm border border-border/50
      transition-all duration-700 ease-out
      ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
    `}
    style={{ transitionDelay: `${delay}ms` }}
  >
    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm sm:text-base font-medium text-foreground truncate">{label}</p>
      <p className="text-xs sm:text-sm text-muted-foreground">{amount}</p>
    </div>
    <div className="flex-shrink-0">
      <FileCheck className="w-5 h-5 text-success" />
    </div>
  </div>
);

// Animated shield with transparency layers
const TransparencyShield = ({ revealed }: { revealed: boolean }) => (
  <div className="relative w-48 h-56 sm:w-56 sm:h-64 md:w-64 md:h-72 mx-auto">
    {/* Outer glow */}
    <div 
      className={`
        absolute inset-0 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent 
        rounded-t-full rounded-b-[40%] blur-2xl
        transition-all duration-1000 ease-out
        ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-90"}
      `}
      style={{ transitionDelay: "200ms" }}
    />
    
    {/* Shield background layers - transparency reveal effect */}
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Layer 3 - Back */}
      <div 
        className={`
          absolute w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48
          bg-gradient-to-b from-primary/5 to-primary/10
          rounded-t-full rounded-b-[40%] border border-primary/10
          transition-all duration-700 ease-out
          ${revealed ? "opacity-100 translate-x-6 translate-y-2" : "opacity-0 translate-x-0 translate-y-0"}
        `}
        style={{ transitionDelay: "400ms" }}
      />
      
      {/* Layer 2 - Middle */}
      <div 
        className={`
          absolute w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48
          bg-gradient-to-b from-primary/10 to-primary/20
          rounded-t-full rounded-b-[40%] border border-primary/20
          transition-all duration-700 ease-out
          ${revealed ? "opacity-100 translate-x-3 translate-y-1" : "opacity-0 translate-x-0 translate-y-0"}
        `}
        style={{ transitionDelay: "300ms" }}
      />
      
      {/* Layer 1 - Front (Main shield) */}
      <div 
        className={`
          absolute w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48
          bg-gradient-to-b from-primary/20 via-primary/30 to-primary/10
          rounded-t-full rounded-b-[40%] border-2 border-primary/40
          backdrop-blur-sm overflow-hidden
          transition-all duration-700 ease-out
          ${revealed ? "opacity-100" : "opacity-0"}
        `}
        style={{ transitionDelay: "200ms" }}
      >
        {/* Inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-primary/20" />
        
        {/* Shine effect */}
        <div 
          className={`
            absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent
            transition-all duration-1000 ease-out
            ${revealed ? "translate-x-0 translate-y-0" : "-translate-x-full -translate-y-full"}
          `}
          style={{ transitionDelay: "600ms" }}
        />
        
        {/* Shield icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield 
            className={`
              w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-primary
              transition-all duration-700 ease-out
              ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-50"}
            `}
            style={{ transitionDelay: "500ms" }}
          />
        </div>
      </div>
    </div>
    
    {/* Floating sparkles */}
    <Sparkles 
      className={`
        absolute top-2 right-4 w-4 h-4 text-primary
        transition-all duration-500 ease-out
        ${revealed ? "opacity-100 animate-pulse-subtle" : "opacity-0"}
      `}
      style={{ transitionDelay: "700ms" }}
    />
    <Sparkles 
      className={`
        absolute top-8 left-2 w-3 h-3 text-primary
        transition-all duration-500 ease-out
        ${revealed ? "opacity-100 animate-pulse-subtle" : "opacity-0"}
      `}
      style={{ transitionDelay: "800ms", animationDelay: "0.5s" }}
    />
    <Sparkles 
      className={`
        absolute bottom-16 right-2 w-3 h-3 text-primary
        transition-all duration-500 ease-out
        ${revealed ? "opacity-100 animate-pulse-subtle" : "opacity-0"}
      `}
      style={{ transitionDelay: "900ms", animationDelay: "1s" }}
    />
  </div>
);

// Background decoration
const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Gradient orbs */}
    <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div className="absolute bottom-20 right-10 w-80 h-80 bg-success/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-primary/3 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />
    
    {/* Grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
  </div>
);

// Fee items data
const feeItems = [
  { icon: GraduationCap, label: "Program Fees", amount: "Tuition & course costs clearly listed" },
  { icon: DollarSign, label: "Application Fees", amount: "One-time processing fees shown upfront" },
  { icon: BadgePercent, label: "Scholarships", amount: "Available discounts & financial aid" },
];

export default function OnboardingTransparency() {
  const [showContent, setShowContent] = useState(false);
  const [revealFees, setRevealFees] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial content fade in
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    // Start fee reveal animation
    const feeTimer = setTimeout(() => setRevealFees(true), 600);
    
    return () => {
      clearTimeout(contentTimer);
      clearTimeout(feeTimer);
    };
  }, []);

  const handleNext = () => {
    navigate("/auth/signup?role=student");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

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
            Clear. Honest.{" "}
            <span className="text-primary">No Hidden Fees.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-6 sm:mb-8 animate-fade-in-up max-w-xl" style={{ animationDelay: "0.1s" }}>
            Every cost is shown upfront — no surprises.
          </p>

          {/* Shield illustration */}
          <div className="mb-6 sm:mb-8">
            <TransparencyShield revealed={revealFees} />
          </div>

          {/* Fee items with transparency reveal */}
          <div className="w-full max-w-md space-y-3 mb-8 sm:mb-10">
            {feeItems.map((item, index) => (
              <FeeItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                amount={item.amount}
                delay={800 + index * 200}
                revealed={revealFees}
              />
            ))}
          </div>

          {/* Trust badge */}
          <div 
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-success/10 border border-success/20
              transition-all duration-500 ease-out mb-6
              ${revealFees ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
            style={{ transitionDelay: "1400ms" }}
          >
            <Shield className="w-4 h-4 text-success" />
            <span className="text-sm text-success font-medium">100% Transparent Pricing</span>
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
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
          <button 
            onClick={handleNext}
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-in"
            style={{ animationDelay: "0.8s" }}
          >
            Skip for now
          </button>
        </div>

        {/* Progress indicator */}
        <div className="container mx-auto max-w-4xl mt-auto pt-6">
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

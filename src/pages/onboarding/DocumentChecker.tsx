"use client";

import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, GraduationCap, Award, Check, Shield } from "lucide-react";
import BackButton from "@/components/BackButton";

// Document type definition
interface DocumentItem {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  delay: number;
}

// Floating checkmark component
const FloatingCheckmark = ({ 
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
    className="absolute pointer-events-none animate-float-check opacity-0"
    style={{
      width: size,
      height: size,
      left: `${left}%`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    <div className="w-full h-full rounded-full bg-green-500/20 flex items-center justify-center">
      <Check className="w-3/5 h-3/5 text-green-500" />
    </div>
  </div>
);

// Scanner beam component
const ScannerBeam = ({ isScanning }: { isScanning: boolean }) => (
  <div 
    className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent pointer-events-none transition-opacity ${isScanning ? 'opacity-100' : 'opacity-0'}`}
    style={{
      animation: isScanning ? 'scanDown 2.5s ease-in-out infinite' : 'none',
      boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.4)',
    }}
  />
);

// Document card component with scanning effect
const DocumentCard = ({ 
  document, 
  isScanning, 
  isVerified,
  index 
}: { 
  document: DocumentItem; 
  isScanning: boolean;
  isVerified: boolean;
  index: number;
}) => {
  const Icon = document.icon;
  
  return (
    <div 
      className="relative group animate-fade-in-up opacity-0"
      style={{ 
        animationDelay: `${document.delay}s`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Document container */}
      <div 
        className={`
          relative w-24 h-32 sm:w-28 sm:h-36 md:w-32 md:h-40 
          bg-background/80 backdrop-blur-sm 
          border-2 border-border/50 rounded-lg
          shadow-lg overflow-hidden
          transition-all duration-500
          ${isScanning ? 'border-primary/50' : ''}
          ${isVerified ? 'border-green-500/50' : ''}
        `}
      >
        {/* Scanner beam */}
        <ScannerBeam isScanning={isScanning && !isVerified} />
        
        {/* Document content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          {/* Glow effect during scan */}
          <div 
            className={`
              absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent
              transition-opacity duration-500
              ${isScanning ? 'opacity-100' : 'opacity-0'}
            `}
          />
          
          {/* Icon */}
          <div 
            className={`
              relative w-10 h-10 sm:w-12 sm:h-12 rounded-full 
              flex items-center justify-center mb-2
              transition-all duration-500
              ${document.color}
              ${isVerified ? 'bg-green-500/20' : ''}
            `}
          >
            <Icon 
              className={`
                w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-500
                ${isVerified ? 'text-green-500' : 'text-primary'}
              `} 
            />
          </div>
          
          {/* Label */}
          <span className="text-[10px] sm:text-xs font-medium text-center text-muted-foreground">
            {document.label}
          </span>
          
          {/* Simulated document lines */}
          <div className="mt-2 space-y-1 w-full px-2">
            <div className="h-1 bg-muted/50 rounded-full w-full" />
            <div className="h-1 bg-muted/50 rounded-full w-3/4" />
            <div className="h-1 bg-muted/50 rounded-full w-5/6" />
          </div>
        </div>
        
        {/* Verified checkmark overlay */}
        {isVerified && (
          <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-scale-in z-10">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
        
        {/* Scanning glow border */}
        <div 
          className={`
            absolute inset-0 rounded-lg border-2 border-primary/0
            transition-all duration-500
            ${isScanning && !isVerified ? 'border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : ''}
            ${isVerified ? 'border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}
          `}
        />
      </div>
    </div>
  );
};

// Background decoration
const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Gradient orbs */}
    <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div className="absolute bottom-20 right-10 w-80 h-80 bg-green-500/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: "2s" }} />
    
    {/* Grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
  </div>
);

// AI Shield illustration
const AIShieldIllustration = () => (
  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-subtle" />
    <div className="relative w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center border border-primary/30">
      <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
    </div>
  </div>
);

export default function OnboardingDocumentChecker() {
  const [showContent, setShowContent] = useState(false);
  const [scanPhase, setScanPhase] = useState(0);
  const navigate = useNavigate();

  // Documents to display
  const documents: DocumentItem[] = useMemo(() => [
    { id: "passport", icon: FileText, label: "Passport", color: "bg-blue-500/10", delay: 0.3 },
    { id: "transcript", icon: GraduationCap, label: "Transcript", color: "bg-purple-500/10", delay: 0.5 },
    { id: "certificate", icon: Award, label: "Certificate", color: "bg-amber-500/10", delay: 0.7 },
  ], []);

  // Generate floating checkmarks
  const floatingCheckmarks = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      delay: 2 + Math.random() * 3,
      size: Math.random() * 16 + 12,
      left: Math.random() * 80 + 10,
      top: Math.random() * 60 + 20,
      duration: Math.random() * 2 + 3,
    })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Scanning animation cycle
  useEffect(() => {
    if (!showContent) return;
    
    const scanInterval = setInterval(() => {
      setScanPhase(prev => (prev + 1) % 7);
    }, 1200);

    return () => clearInterval(scanInterval);
  }, [showContent]);

  // Determine which documents are scanning/verified based on phase
  const getDocumentState = (index: number) => {
    const isScanning = scanPhase === index + 1;
    const isVerified = scanPhase > index + 1 || scanPhase === 0;
    return { isScanning, isVerified: scanPhase > 3 ? isVerified : false };
  };

  const handleNext = () => {
    // Navigate to the next step (signup)
    navigate("/auth/signup?role=student");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

      {/* Floating checkmarks */}
      {floatingCheckmarks.map((check) => (
        <FloatingCheckmark key={check.id} {...check} />
      ))}

      {/* Main content */}
      <div className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}>
        {/* Back button */}
        <div className="container mx-auto max-w-4xl">
          <BackButton fallback="/onboarding/destinations" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-4xl">
          {/* AI Shield */}
          <AIShieldIllustration />

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-2 sm:mb-3 animate-fade-in-up">
            Your Documents.{" "}
            <span className="text-primary">Verified by AI.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-8 sm:mb-10 animate-fade-in-up max-w-xl" style={{ animationDelay: "0.1s" }}>
            UniDoxia automatically detects errors to prevent rejections.
          </p>

          {/* Documents showcase */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10">
            {documents.map((doc, index) => {
              const { isScanning, isVerified } = getDocumentState(index);
              return (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isScanning={isScanning}
                  isVerified={isVerified}
                  index={index}
                />
              );
            })}
          </div>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
            {[
              { label: "Error Detection", icon: Check },
              { label: "Format Validation", icon: FileText },
              { label: "Instant Results", icon: Shield },
            ].map((feature) => (
              <div 
                key={feature.label}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-xs sm:text-sm text-muted-foreground"
              >
                <feature.icon className="w-3.5 h-3.5 text-primary" />
                <span>{feature.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
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
            style={{ animationDelay: "1s" }}
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

        @keyframes scanDown {
          0% {
            top: -4px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: calc(100% + 4px);
            opacity: 0;
          }
        }

        @keyframes float-check {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-10px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.5);
          }
        }

        .animate-float-check {
          animation: float-check 4s ease-in-out infinite;
        }

        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 4s ease-in-out infinite;
        }

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

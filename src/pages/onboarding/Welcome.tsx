"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Plane } from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";

// Destination data with landmark images and flags
const destinations = [
  {
    id: "uk",
    name: "UK",
    flag: "🇬🇧",
    image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=300&h=200&fit=crop",
    landmark: "London",
    universities: "150+",
  },
  {
    id: "usa",
    name: "USA",
    flag: "🇺🇸",
    image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=300&h=200&fit=crop",
    landmark: "New York",
    universities: "200+",
  },
  {
    id: "canada",
    name: "Canada",
    flag: "🇨🇦",
    image: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=300&h=200&fit=crop",
    landmark: "Toronto",
    universities: "100+",
  },
  {
    id: "australia",
    name: "Australia",
    flag: "🇦🇺",
    image: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=300&h=200&fit=crop",
    landmark: "Sydney",
    universities: "45+",
  },
  {
    id: "germany",
    name: "Germany",
    flag: "🇩🇪",
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=300&h=200&fit=crop",
    landmark: "Berlin",
    universities: "80+",
  },
  {
    id: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    image: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?w=300&h=200&fit=crop",
    landmark: "Dublin",
    universities: "35+",
  },
];

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

// Animated destination card component
const DestinationCard = ({
  destination,
  index,
  position,
}: {
  destination: typeof destinations[0];
  index: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}) => {
  const floatDelay = index * 0.3;
  const floatDuration = 4 + (index % 3);

  return (
    <div
      className="absolute opacity-0 animate-destination-appear group cursor-pointer"
      style={{
        ...position,
        animationDelay: `${0.5 + index * 0.15}s`,
        animationFillMode: "forwards",
      }}
    >
      <div
        className="relative"
        style={{
          animation: `destinationFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite`,
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Card */}
        <div className="relative w-20 h-24 sm:w-24 sm:h-28 md:w-28 md:h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:border-primary/50">
          {/* Image */}
          <img
            src={destination.image}
            alt={destination.landmark}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Flag badge */}
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 text-lg sm:text-xl md:text-2xl drop-shadow-lg transform transition-transform duration-300 group-hover:scale-125">
            {destination.flag}
          </div>

          {/* Country name */}
          <div className="absolute bottom-0 inset-x-0 p-1.5 sm:p-2">
            <p className="text-white font-bold text-xs sm:text-sm drop-shadow-lg">{destination.name}</p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
              <span className="text-[8px] sm:text-[10px] text-white/80">{destination.universities} unis</span>
            </div>
          </div>
        </div>

        {/* Animated ring on hover */}
        <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/60 group-hover:scale-110 transition-all duration-500" />
      </div>
    </div>
  );
};

// Animated plane component
const FlyingPlane = ({ delay }: { delay: number }) => (
  <div
    className="absolute pointer-events-none opacity-0"
    style={{
      animation: `planeFly 12s linear ${delay}s infinite`,
    }}
  >
    <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60 rotate-45" />
  </div>
);

// World connection lines with animated paths
const WorldMapLines = () => (
  <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Connection arcs */}
    <path d="M100,350 Q350,150 500,300" stroke="url(#lineGradient)" strokeWidth="2" fill="none" filter="url(#glow)">
      <animate attributeName="stroke-dasharray" values="0,1000;500,500;1000,0" dur="4s" repeatCount="indefinite" />
    </path>
    <path d="M500,300 Q650,450 900,250" stroke="url(#lineGradient)" strokeWidth="2" fill="none" filter="url(#glow)">
      <animate attributeName="stroke-dasharray" values="0,1000;500,500;1000,0" dur="4s" begin="1.5s" repeatCount="indefinite" />
    </path>
    <path d="M150,450 Q500,200 850,400" stroke="url(#lineGradient)" strokeWidth="1.5" fill="none" filter="url(#glow)">
      <animate attributeName="stroke-dasharray" values="0,1200;600,600;1200,0" dur="5s" begin="0.8s" repeatCount="indefinite" />
    </path>

    {/* Animated dots on paths */}
    <circle r="4" fill="hsl(var(--primary))" filter="url(#glow)">
      <animateMotion dur="4s" repeatCount="indefinite" path="M100,350 Q350,150 500,300" />
    </circle>
    <circle r="3" fill="hsl(var(--primary))" filter="url(#glow)">
      <animateMotion dur="4s" repeatCount="indefinite" begin="1.5s" path="M500,300 Q650,450 900,250" />
    </circle>
  </svg>
);

// Central globe illustration with orbiting destinations
const CentralGlobe = () => (
  <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto">
    {/* Outer glow ring */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-2xl animate-pulse-slow" />

    {/* Orbiting ring 1 */}
    <div
      className="absolute inset-4 rounded-full border border-primary/20"
      style={{ animation: "orbitSpin 20s linear infinite" }}
    >
      <div className="absolute -top-1 left-1/2 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
    </div>

    {/* Orbiting ring 2 */}
    <div
      className="absolute inset-8 rounded-full border border-primary/30"
      style={{ animation: "orbitSpin 15s linear infinite reverse" }}
    >
      <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
    </div>

    {/* Central content */}
    <div className="absolute inset-12 rounded-full bg-gradient-to-br from-primary/20 via-background to-primary/10 border border-primary/40 flex items-center justify-center overflow-hidden backdrop-blur-sm">
      {/* Globe grid pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <ellipse cx="50" cy="50" rx="45" ry="45" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <ellipse cx="50" cy="50" rx="30" ry="45" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <ellipse cx="50" cy="50" rx="15" ry="45" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <ellipse cx="50" cy="50" rx="45" ry="20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <ellipse cx="50" cy="50" rx="45" ry="35" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
        </svg>
      </div>

      {/* Center icon */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="text-4xl sm:text-5xl animate-bounce-slow">🌍</div>
        <span className="text-[10px] sm:text-xs text-primary font-medium">Study Abroad</span>
      </div>
    </div>

    {/* Sparkle effects */}
    <Sparkles className="absolute top-2 left-8 w-4 h-4 text-primary animate-twinkle" style={{ animationDelay: "0s" }} />
    <Sparkles className="absolute top-8 right-4 w-3 h-3 text-primary animate-twinkle" style={{ animationDelay: "0.5s" }} />
    <Sparkles className="absolute bottom-4 left-4 w-3 h-3 text-primary animate-twinkle" style={{ animationDelay: "1s" }} />
    <Sparkles className="absolute bottom-8 right-8 w-4 h-4 text-primary animate-twinkle" style={{ animationDelay: "1.5s" }} />
  </div>
);

export default function OnboardingWelcome() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Generate particles
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: Math.random() * 5,
        size: Math.random() * 6 + 2,
        left: Math.random() * 100,
        duration: Math.random() * 3 + 4,
      })),
    []
  );

  // Destination card positions (arranged around the center)
  const destinationPositions = [
    { top: "8%", left: "5%" },      // UK - top left
    { top: "5%", right: "8%" },     // USA - top right
    { top: "35%", right: "2%" },    // Canada - right
    { bottom: "25%", right: "5%" }, // Australia - bottom right
    { bottom: "20%", left: "3%" },  // Germany - bottom left
    { top: "40%", left: "2%" },     // Ireland - left
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Floating particles */}
      {particles.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* World map connection lines */}
      <div className="absolute inset-0 overflow-hidden">
        <WorldMapLines />
      </div>

      {/* Flying planes */}
      <FlyingPlane delay={0} />
      <FlyingPlane delay={4} />
      <FlyingPlane delay={8} />

      {/* Destination cards - hidden on mobile, shown on larger screens */}
      <div className="absolute inset-0 hidden lg:block">
        {destinations.map((destination, index) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            index={index}
            position={destinationPositions[index]}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-12 transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo */}
        <img
          src={unidoxiaLogo}
          alt="UniDoxia"
          className="h-12 sm:h-16 w-auto mb-4 sm:mb-6 animate-fade-in"
        />

        {/* Central Globe illustration */}
        <div className="mb-4 sm:mb-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <CentralGlobe />
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 animate-fade-in-up px-2"
          style={{ animationDelay: "0.4s" }}
        >
          Your Global Study Journey{" "}
          <span className="text-primary">Starts Here</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm sm:text-base md:text-lg text-muted-foreground text-center max-w-md sm:max-w-lg md:max-w-xl mb-4 sm:mb-6 animate-fade-in-up px-4"
          style={{ animationDelay: "0.6s" }}
        >
          Connect with verified institutions across the UK, USA, Canada, Australia, Germany, and Ireland.
          Your future awaits.
        </p>

        {/* Country flags carousel - visible on all screen sizes */}
        <div
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in-up max-w-lg"
          style={{ animationDelay: "0.7s" }}
        >
          {destinations.map((dest, index) => (
            <div
              key={dest.id}
              className="group relative px-3 py-2 bg-muted/30 hover:bg-muted/50 rounded-xl border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:scale-105"
              style={{ animationDelay: `${0.8 + index * 0.1}s` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300">
                  {dest.flag}
                </span>
                <span className="text-xs sm:text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                  {dest.name}
                </span>
              </div>
              {/* Hover tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                <span className="text-[10px] text-primary bg-background/90 px-2 py-1 rounded-full border border-primary/20">
                  {dest.universities} Universities
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-md animate-fade-in-up"
          style={{ animationDelay: "0.9s" }}
        >
          <Button asChild size="lg" className="w-full sm:flex-1 gap-2 text-base group">
            <Link to="/onboarding/visa-requirements">
              <Sparkles className="w-4 h-4 group-hover:animate-spin" />
              Get Started
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:flex-1 text-base">
            <Link to="/auth/login">Log In</Link>
          </Button>
        </div>

        {/* Trust indicators */}
        <div
          className="mt-6 sm:mt-10 flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground animate-fade-in-up"
          style={{ animationDelay: "1s" }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Verified Partners</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
            <span>6 Countries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <span>600+ Universities</span>
          </div>
        </div>
      </div>

      {/* Custom keyframes for animations */}
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

        @keyframes destinationFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes orbitSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes planeFly {
          0% {
            left: -5%;
            top: 30%;
            opacity: 0;
            transform: rotate(15deg);
          }
          10% {
            opacity: 0.6;
          }
          50% {
            top: 20%;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            left: 105%;
            top: 40%;
            opacity: 0;
            transform: rotate(15deg);
          }
        }

        .animate-destination-appear {
          animation: destinationAppear 0.8s ease-out forwards;
        }

        @keyframes destinationAppear {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }

        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-pulse-slow {
          animation: pulseSlow 4s ease-in-out infinite;
        }

        @keyframes pulseSlow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}

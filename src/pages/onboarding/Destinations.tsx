"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import BackButton from "@/components/BackButton";

// Country data with iconic landmarks
const countries = [
  {
    id: "uk",
    name: "United Kingdom",
    shortName: "UK",
    flag: "🇬🇧",
    landmark: "Big Ben",
    landmarkImage: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&h=300&fit=crop",
    color: "from-blue-600 to-red-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    hoverColor: "hover:border-blue-500/60 hover:bg-blue-500/20",
    universities: "150+ Universities",
  },
  {
    id: "usa",
    name: "United States",
    shortName: "USA",
    flag: "🇺🇸",
    landmark: "Statue of Liberty",
    landmarkImage: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=400&h=300&fit=crop",
    color: "from-blue-700 to-red-700",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    hoverColor: "hover:border-red-500/60 hover:bg-red-500/20",
    universities: "200+ Universities",
  },
  {
    id: "canada",
    name: "Canada",
    shortName: "Canada",
    flag: "🇨🇦",
    landmark: "CN Tower",
    landmarkImage: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=400&h=300&fit=crop",
    color: "from-red-600 to-red-700",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    hoverColor: "hover:border-red-500/60 hover:bg-red-500/20",
    universities: "100+ Universities",
  },
  {
    id: "australia",
    name: "Australia",
    shortName: "Australia",
    flag: "🇦🇺",
    landmark: "Sydney Opera House",
    landmarkImage: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&h=300&fit=crop",
    color: "from-blue-600 to-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    hoverColor: "hover:border-yellow-500/60 hover:bg-yellow-500/20",
    universities: "45+ Universities",
  },
  {
    id: "germany",
    name: "Germany",
    shortName: "Germany",
    flag: "🇩🇪",
    landmark: "Brandenburg Gate",
    landmarkImage: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=300&fit=crop",
    color: "from-black to-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    hoverColor: "hover:border-yellow-500/60 hover:bg-yellow-500/20",
    universities: "80+ Universities",
  },
  {
    id: "ireland",
    name: "Ireland",
    shortName: "Ireland",
    flag: "🇮🇪",
    landmark: "Cliffs of Moher",
    landmarkImage: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?w=400&h=300&fit=crop",
    color: "from-green-600 to-orange-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    hoverColor: "hover:border-green-500/60 hover:bg-green-500/20",
    universities: "35+ Universities",
  },
];

const CountryBubble = ({
  country,
  index,
  isSelected,
  onSelect,
}: {
  country: typeof countries[0];
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const animationDelay = index * 0.1;

  return (
    <button
      onClick={onSelect}
      className={`
        relative group flex flex-col items-center justify-end overflow-hidden
        rounded-2xl sm:rounded-3xl border-2 transition-all duration-300
        ${country.borderColor} ${country.hoverColor}
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105" : ""}
        animate-fade-in-up opacity-0 cursor-pointer
        hover:scale-105 hover:shadow-lg
        h-40 sm:h-48 md:h-52
      `}
      style={{
        animationDelay: `${animationDelay}s`,
        animation: `fadeInUp 0.5s ease-out ${animationDelay}s forwards`,
        animationFillMode: "forwards",
      }}
      aria-label={`Select ${country.name}`}
    >
      {/* Landmark Image */}
      <div className="absolute inset-0">
        <img
          src={country.landmarkImage}
          alt={country.landmark}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg animate-scale-in z-20">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* Flag in top-left corner */}
      <span className="absolute top-2 left-2 text-2xl sm:text-3xl z-10 drop-shadow-lg">
        {country.flag}
      </span>

      {/* Content at bottom */}
      <div className="relative z-10 p-3 sm:p-4 w-full text-left">
        <span className="font-semibold text-sm sm:text-base text-white block">
          {country.shortName}
        </span>

        <span className="text-[10px] sm:text-xs text-white/80">
          {country.landmark}
        </span>
      </div>

      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs text-primary font-medium opacity-0 group-hover:opacity-100 group-hover:-bottom-6 transition-all duration-300 whitespace-nowrap z-20">
        {country.universities}
      </span>
    </button>
  );
};

const BackgroundDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
    <div
      className="absolute bottom-20 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse-subtle"
      style={{ animationDelay: "1s" }}
    />
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse-subtle"
      style={{ animationDelay: "2s" }}
    />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
  </div>
);

export default function OnboardingDestinations() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleCountry = (countryId: string) => {
    setSelectedCountries((prev) =>
      prev.includes(countryId)
        ? prev.filter((id) => id !== countryId)
        : [...prev, countryId]
    );
  };

  const handleNext = () => {
    if (selectedCountries.length > 0) {
      localStorage.setItem("onboarding_destinations", JSON.stringify(selectedCountries));
    }
    navigate("/onboarding/transparency");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <BackgroundDecoration />

      <div
        className={`relative z-10 min-h-screen flex flex-col px-4 py-6 sm:py-8 transition-all duration-500 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="container mx-auto max-w-4xl">
          <BackButton fallback="/onboarding/success-stories" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center container mx-auto max-w-4xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-2 sm:mb-3 animate-fade-in-up">
            Choose Where Your Future <span className="text-primary">Begins</span>
          </h1>

          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground text-center mb-6 sm:mb-8 animate-fade-in-up max-w-xl"
            style={{ animationDelay: "0.1s" }}
          >
            Study across the world with verified institutions. Select your dream destinations.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full max-w-2xl mb-8 sm:mb-10">
            {countries.map((country, index) => (
              <CountryBubble
                key={country.id}
                country={country}
                index={index}
                isSelected={selectedCountries.includes(country.id)}
                onSelect={() => toggleCountry(country.id)}
              />
            ))}
          </div>

          {selectedCountries.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4 animate-fade-in">
              {selectedCountries.length} destination{selectedCountries.length > 1 ? "s" : ""} selected
            </p>
          )}

          <div className="w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
            <Button onClick={handleNext} size="lg" className="w-full gap-2 text-base">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <Link
            to="/onboarding/transparency"
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-in"
            style={{ animationDelay: "0.8s" }}
          >
            Skip for now
          </Link>
        </div>

        {/* Progress dots */}
        <div className="container mx-auto max-w-4xl mt-auto pt-6">
          <div className="flex justify-center gap-2">

            {/* Dot 1 — Welcome */}
            <Link
              to="/onboarding/welcome"
              className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
            />

            {/* Dot 2 — Success Stories */}
            <Link
              to="/onboarding/success-stories"
              className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
            />

            {/* Dot 3 — Destinations (current) */}
            <div className="w-2 h-2 rounded-full bg-primary" />

            {/* Dot 4 — Transparency */}
            <Link
              to="/onboarding/transparency"
              className="w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
            />

          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

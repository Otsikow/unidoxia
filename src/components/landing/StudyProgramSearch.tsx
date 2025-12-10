import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Country options with flags - aligned with ProgramSearchView
const DESTINATIONS = [
  { value: "all", label: "All Destinations", flag: "🌍" },
  { value: "United Kingdom", label: "United Kingdom", flag: "🇬🇧" },
  { value: "United States", label: "United States", flag: "🇺🇸" },
  { value: "Canada", label: "Canada", flag: "🇨🇦" },
  { value: "Australia", label: "Australia", flag: "🇦🇺" },
  { value: "Germany", label: "Germany", flag: "🇩🇪" },
  { value: "Ireland", label: "Ireland", flag: "🇮🇪" },
] as const;

// Study level options - aligned with ProgramSearchView PROGRAM_LEVELS
const STUDY_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "Undergraduate", label: "Undergraduate" },
  { value: "Postgraduate", label: "Postgraduate" },
  { value: "PHD", label: "PhD / Research" },
] as const;

interface StudyProgramSearchProps {
  className?: string;
}

export function StudyProgramSearch({ className }: StudyProgramSearchProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    
    // Use raw searchTerm for immediate search on button click
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.set("q", trimmedSearch);
    }
    if (selectedDestination !== "all") {
      params.set("country", selectedDestination);
    }
    if (selectedLevel !== "all") {
      params.set("level", selectedLevel);
    }

    navigate(`/search?${params.toString()}`);
  }, [searchTerm, selectedDestination, selectedLevel, navigate]);

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // Clear search input
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("py-12 md:py-16", className)}
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1, 
            y: [0, -4, 0],
          }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.2 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative max-w-6xl mx-auto"
        >
          {/* Glassmorphic Container */}
          <div
            className={cn(
              "relative rounded-2xl md:rounded-3xl p-6 md:p-8",
              "bg-background/80 dark:bg-background/60",
              "backdrop-blur-xl backdrop-saturate-150",
              "border border-border/50",
              "shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]",
              "dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]",
              "transition-all duration-300",
              "hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.15)]",
              "dark:hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.4)]"
            )}
          >
            {/* Subtle gradient overlay */}
            <div
              className="absolute inset-0 rounded-2xl md:rounded-3xl opacity-30 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, transparent 50%, hsl(var(--primary) / 0.03) 100%)",
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              <div className="text-center space-y-3 mb-2">
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-2xl md:text-3xl font-semibold text-primary"
                >
                  Discover Your Perfect Program
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-muted-foreground max-w-3xl mx-auto"
                >
                  Explore curated universities, destinations, and study levels tailored to your ambitions—start by searching what inspires you.
                </motion.p>
              </div>

              {/* Search Input and Filters Grid */}
              <div className="flex flex-col gap-5">
                {/* Main Search Input */}
                <div className="w-full">
                  <div className="relative">
                    <Search
                      className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                        isFocused || searchTerm
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                      aria-hidden="true"
                    />
                    <Input
                      type="text"
                      placeholder="Search programs, universities or keywords…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      aria-label="Search programs and universities"
                      className={cn(
                        "pl-12 h-14 md:h-16 text-base md:text-lg",
                        searchTerm ? "pr-10" : "pr-4",
                        "bg-background/50 dark:bg-background/30",
                        "border-border/60 focus:border-primary/50",
                        "transition-all duration-300",
                        isFocused &&
                          "ring-2 ring-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                      )}
                    />
                    {/* Clear button */}
                    <AnimatePresence>
                      {searchTerm && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          type="button"
                          onClick={handleClearSearch}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    {/* Focus glow effect */}
                    <AnimatePresence>
                      {isFocused && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="absolute inset-0 rounded-md pointer-events-none"
                          style={{
                            boxShadow: "0 0 20px hsl(var(--primary) / 0.2)",
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Destination Dropdown */}
                  <div className="flex-1">
                    <Select
                      value={selectedDestination}
                      onValueChange={setSelectedDestination}
                    >
                      <SelectTrigger className="h-12 md:h-14 bg-background/50 dark:bg-background/30 border-border/60">
                        <SelectValue placeholder="Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {DESTINATIONS.map((dest) => (
                          <SelectItem key={dest.value} value={dest.value}>
                            <span className="flex items-center gap-2">
                              <span>{dest.flag}</span>
                              <span>{dest.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Level of Study Dropdown */}
                  <div className="flex-1">
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                      <SelectTrigger className="h-12 md:h-14 bg-background/50 dark:bg-background/30 border-border/60">
                        <SelectValue placeholder="Level of Study" />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDY_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      onClick={handleSearch}
                      size="lg"
                      className={cn(
                        "h-12 md:h-14 px-8 w-full",
                        "bg-gradient-to-r from-primary to-primary/90",
                        "hover:from-primary/90 hover:to-primary",
                        "text-primary-foreground font-semibold",
                        "shadow-lg shadow-primary/25",
                        "hover:shadow-xl hover:shadow-primary/30",
                        "transition-all duration-300",
                        "relative overflow-hidden",
                        "button-border-beam"
                      )}
                    >
                      {/* Sparkles icon */}
                      <Sparkles className="mr-2 h-4 w-4" />
                      Search

                      {/* Pulse ripple effect on hover */}
                      <motion.div
                        className="absolute inset-0 rounded-md"
                        initial={{ scale: 0, opacity: 0.5 }}
                        whileHover={{
                          scale: 1.5,
                          opacity: 0,
                          transition: { duration: 0.6 },
                        }}
                        style={{
                          background:
                            "radial-gradient(circle, hsl(var(--primary-foreground) / 0.3) 0%, transparent 70%)",
                        }}
                      />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.section>
  );
}

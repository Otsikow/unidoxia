import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/BackButton";
import ProgramRecommendations from "@/components/ai/ProgramRecommendations";
import SoPGenerator from "@/components/ai/SoPGenerator";
import InterviewPractice from "@/components/ai/InterviewPractice";
import { CourseCard, type Course } from "@/components/student/CourseCard";
import { SAMPLE_PROGRAMS } from "@/data/programs-sample";
import {
  Search,
  GraduationCap,
  DollarSign,
  Award,
  MapPin,
  Sparkles,
  FileText,
  MessageSquare,
  X,
  } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

// --- University Images ---
import oxfordImg from "@/assets/university-oxford.jpg";
import harvardImg from "@/assets/university-harvard.jpg";
import mitImg from "@/assets/university-mit.jpg";
import cambridgeImg from "@/assets/university-cambridge.jpg";
import stanfordImg from "@/assets/university-stanford.jpg";
import torontoImg from "@/assets/university-toronto.jpg";
import melbourneImg from "@/assets/university-melbourne.jpg";
import yaleImg from "@/assets/university-yale.jpg";
import princetonImg from "@/assets/university-princeton.jpg";
import uclImg from "@/assets/university-ucl.jpg";
import imperialImg from "@/assets/university-imperial.jpg";
import edinburghImg from "@/assets/university-edinburgh.jpg";
import defaultUniversityImg from "@/assets/university-default.jpg";

const PROGRAM_LEVELS = ["Undergraduate", "Postgraduate", "PHD"];
const MAJOR_DESTINATION_COUNTRIES = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Germany",
  "Ireland",
];
const TAB_TRIGGER_STYLES =
  "gap-2 px-5 py-2 md:px-6 md:py-2.5 text-sm md:text-base font-semibold whitespace-nowrap min-w-[150px] md:min-w-0 snap-start rounded-xl";
const MAX_UNIVERSITY_RESULTS = 50;
const MAX_PROGRAM_RESULTS = 400;
const COURSES_PER_PAGE = 100;

const DISCIPLINE_NORMALIZATION_MAP: Record<string, string> = {
  "Project Managament": "Project Management",
};

const normalizeDisciplineName = (discipline?: string | null): string | null => {
  if (!discipline) return null;
  const trimmed = discipline.trim();
  return DISCIPLINE_NORMALIZATION_MAP[trimmed] ?? trimmed;
};

interface University {
  id: string;
  name: string;
  country: string;
  city: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
}

interface Program {
  id: string;
  name: string;
  level: string;
  discipline: string;
  tuition_amount: number;
  tuition_currency: string;
  duration_months: number;
  university_id: string;
  image_url?: string | null;
}

interface Scholarship {
  id: string;
  name: string;
  amount_cents: number | null;
  currency: string;
  coverage_type: string | null;
  university_id: string | null;
  program_id: string | null;
}

interface SearchResult {
  university: University;
  programs: Program[];
  scholarships: Scholarship[];
}

// --- Helper: choose logo or fallback image ---
const getUniversityVisual = (name: string, logo: string | null): string => {
  const lower = name.toLowerCase();
  if (logo) return logo;
  if (lower.includes("oxford")) return oxfordImg;
  if (lower.includes("harvard")) return harvardImg;
  if (lower.includes("mit") || lower.includes("massachusetts")) return mitImg;
  if (lower.includes("cambridge")) return cambridgeImg;
  if (lower.includes("stanford")) return stanfordImg;
  if (lower.includes("toronto")) return torontoImg;
  if (lower.includes("melbourne")) return melbourneImg;
  if (lower.includes("yale")) return yaleImg;
  if (lower.includes("princeton")) return princetonImg;
  if (lower.includes("ucl") || lower.includes("university college london")) return uclImg;
  if (lower.includes("imperial")) return imperialImg;
  if (lower.includes("edinburgh")) return edinburghImg;
  return defaultUniversityImg;
};

const getProgramVisual = (program: Program, university: University): string => {
  return program.image_url || getUniversityVisual(university.name, university.logo_url);
};

// Helper function to transform course data to CourseCard format
const transformToCourseCardFormat = (
  course: Program &
    {
      university: University;
      next_intake_month?: number;
      next_intake_year?: number;
      applyUrl?: string;
      detailsUrl?: string;
      instant_submission?: boolean;
      is_unidoxia_partner?: boolean;
    },
): Course => {
  return {
    id: course.id,
    university_id: course.university_id,
    name: course.name,
    level: course.level,
    discipline: course.discipline,
    duration_months: course.duration_months,
    tuition_currency: course.tuition_currency,
    tuition_amount: course.tuition_amount,
    university_name: course.university.name,
    university_country: course.university.country,
    university_city: course.university.city || '',
    university_logo_url: course.university.logo_url || undefined,
    next_intake_month: course.next_intake_month,
    next_intake_year: course.next_intake_year,
    applyUrl: course.applyUrl,
    detailsUrl: course.detailsUrl,
    instant_submission: course.instant_submission,
    is_unidoxia_partner: course.is_unidoxia_partner,
  };
};


export interface ProgramSearchViewProps {
  variant?: "page" | "embedded";
  showBackButton?: boolean;
}

export function ProgramSearchView({ variant = "page", showBackButton = true }: ProgramSearchViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  
  // Initialize state from URL params if available
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || searchParams.get("query") || "");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get("country") || "all");
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get("level") || "all");
  const [selectedDiscipline, setSelectedDiscipline] = useState("all");
  const [maxFee, setMaxFee] = useState("");
  const [onlyWithScholarships, setOnlyWithScholarships] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [levels, setLevels] = useState<string[]>(PROGRAM_LEVELS);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("search");
  const [hasSearched, setHasSearched] = useState(false);
  const { t } = useTranslation();

  // All courses listing state
  const [allCourses, setAllCourses] = useState<(Program & { university: University })[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [currentCoursePage, setCurrentCoursePage] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  
  // Check if user is an agent/staff/admin to determine the correct apply URL
  const isAgentOrStaff = profile?.role === 'agent' || profile?.role === 'staff' || profile?.role === 'admin';
  
  // Get the correct apply URL based on user role
  const getApplyUrl = (programId: string) => {
    if (isAgentOrStaff) {
      return `/dashboard/applications/new?program=${programId}`;
    }
    return `/student/applications/new?program=${programId}`;
  };

  const showSEO = variant === "page";
  const shouldShowBackButton = variant === "page" && showBackButton;
  const containerClasses = cn(
    "p-4 md:p-8",
    variant === "page"
      ? "min-h-screen bg-background"
      : "rounded-3xl border border-border bg-card text-card-foreground shadow-lg",
  );
  const contentWrapperClasses = cn(
    "max-w-7xl mx-auto space-y-6",
    variant === "embedded" && "text-card-foreground",
  );
  const headingClass = cn(
    "font-bold",
    variant === "page" ? "text-4xl text-foreground" : "text-3xl",
  );
  const subheadingClass = "text-muted-foreground";

  const translatedTabs = useMemo(
    () => [
      { value: "search", icon: Search, label: t("pages.universitySearch.tabs.search") },
      { value: "recommendations", icon: Sparkles, label: t("pages.universitySearch.tabs.recommendations") },
      { value: "sop", icon: FileText, label: t("pages.universitySearch.tabs.sop") },
      { value: "interview", icon: MessageSquare, label: t("pages.universitySearch.tabs.interview") },
    ],
    [t],
  );

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Track if this is the initial load
  const isInitialMount = useRef(true);
  const hasInitialQuery = useMemo(
    () =>
      Boolean(
        searchParams.get("q") ||
          searchParams.get("query") ||
          searchParams.get("country") ||
          searchParams.get("level") ||
          searchParams.get("discipline") ||
          searchParams.get("maxFee")
      ),
    [searchParams],
  );

  // Utility to exclude placeholder/test universities
  // Keep this generic so the exact Supabase query builder type is preserved (avoids TS mismatches)
  const applyRealUniversityFilters = <Q extends PostgrestFilterBuilder<any, any, any, any>>(
    query: Q,
  ): Q => {
    return query
      .not("name", "ilike", "%placeholder%")
      .not("name", "ilike", "%test university%")
      .not("name", "ilike", "%sample university%")
      .not("name", "ilike", "%demo university%");
  };

  // Load filter options once on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data: programs } = await supabase
          .from("programs")
          .select("level, discipline")
          .eq("active", true);

        if (programs) {
          setLevels(PROGRAM_LEVELS);
          const uniqueDisciplines = [
            ...new Set(programs.map((p) => normalizeDisciplineName(p.discipline)).filter(Boolean)),
          ].sort();
          setDisciplines(uniqueDisciplines);
        }
      } catch (error) {
        console.error("Error loading filters:", error);
      }
    };
    
    loadFilterOptions();
  }, []);

  // Load all courses on mount for browsing
  const loadAllCourses = useCallback(async (page: number = 1) => {
    const offset = (page - 1) * COURSES_PER_PAGE;

    try {
      setLoadingCourses(true);

      // Fallback to sample data when Supabase isn't configured
      if (!isSupabaseConfigured) {
        const filteredPrograms = SAMPLE_PROGRAMS.filter((program) => {
          if (selectedCountry !== "all" && program.university_country !== selectedCountry) return false;
          if (selectedLevel !== "all" && program.level !== selectedLevel) return false;
          if (selectedDiscipline !== "all" && program.discipline !== selectedDiscipline) return false;
          if (maxFee && program.tuition_amount > parseFloat(maxFee)) return false;
          return true;
        });

        const paginated = filteredPrograms.slice(offset, offset + COURSES_PER_PAGE);

        const formattedCourses = paginated.map((program) => ({
          ...program,
          university: {
            id: program.university_id,
            name: program.university_name,
            country: program.university_country,
            city: program.university_city || null,
            logo_url: program.university_logo_url || null,
            website: null,
            description: null,
          },
        }));

        setAllCourses(formattedCourses);
        setCurrentCoursePage(page);
        setTotalCourses(filteredPrograms.length);
        return;
      }

      // Build query with filters
      let query = supabase
        .from("programs")
        .select(`
          id, name, level, discipline, tuition_amount, tuition_currency, duration_months, university_id,
          universities!inner (id, name, country, city, logo_url, website, description, active)
        `, { count: "exact" })
        .eq("active", true)
        .eq("universities.active", true)
        .range(offset, offset + COURSES_PER_PAGE - 1)
        .order("name");

      query = applyRealUniversityFilters(query);

      // Apply filters if set
      if (selectedCountry !== "all") {
        query = query.eq("universities.country", selectedCountry);
      }
      if (selectedLevel !== "all") {
        query = query.eq("level", selectedLevel);
      }
      if (selectedDiscipline !== "all") {
        query = query.eq("discipline", selectedDiscipline);
      }
      if (maxFee) {
        query = query.lte("tuition_amount", parseFloat(maxFee));
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error loading courses:", error);
      }

      const formattedCourses = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        level: p.level,
        discipline: p.discipline,
        tuition_amount: p.tuition_amount,
        tuition_currency: p.tuition_currency,
        duration_months: p.duration_months,
        university_id: p.university_id,
        image_url: null,
        university: {
          id: p.universities.id,
          name: p.universities.name,
          country: p.universities.country,
          city: p.universities.city,
          logo_url: p.universities.logo_url,
          website: p.universities.website,
          description: p.universities.description,
        },
      }));

      setAllCourses(formattedCourses);
      setCurrentCoursePage(page);
      setTotalCourses(count ?? offset + formattedCourses.length);
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  }, [selectedCountry, selectedLevel, selectedDiscipline, maxFee]);

  // Initial load of courses
  useEffect(() => {
    loadAllCourses(1);
  }, [loadAllCourses]);

  // Reload courses when filters change (but only if not actively searching)
  useEffect(() => {
    if (!hasSearched) {
      loadAllCourses(1);
    }
  }, [selectedCountry, selectedLevel, selectedDiscipline, maxFee, hasSearched, loadAllCourses]);

  const totalCoursePages = useMemo(
    () => (totalCourses > 0 ? Math.ceil(totalCourses / COURSES_PER_PAGE) : 1),
    [totalCourses],
  );

  const paginationRange = useMemo<(number | string)[]>(() => {
    if (totalCoursePages <= 7) {
      return Array.from({ length: totalCoursePages }, (_, i) => i + 1);
    }

    const range: (number | string)[] = [1];
    const start = Math.max(2, currentCoursePage - 1);
    const end = Math.min(totalCoursePages - 1, currentCoursePage + 1);

    if (start > 2) {
      range.push("ellipsis-left");
    }

    for (let page = start; page <= end; page++) {
      range.push(page);
    }

    if (end < totalCoursePages - 1) {
      range.push("ellipsis-right");
    }

    range.push(totalCoursePages);
    return range;
  }, [currentCoursePage, totalCoursePages]);

  const courseRangeStart = totalCourses === 0 ? 0 : (currentCoursePage - 1) * COURSES_PER_PAGE + 1;
  const courseRangeEnd = totalCourses === 0 ? 0 : Math.min(totalCourses, currentCoursePage * COURSES_PER_PAGE);

  const handleCoursePageChange = (page: number) => {
    if (page < 1 || page > totalCoursePages || page === currentCoursePage) return;
    loadAllCourses(page);
  };

  const handleSearch = useCallback(async () => {
    setHasSearched(true);
    setLoading(true);
    try {
      // Fallback search when Supabase isn't configured
      if (!isSupabaseConfigured) {
        const searchQuery = debouncedSearchTerm?.trim().toLowerCase() || "";

        const matchesSearch = (program: typeof SAMPLE_PROGRAMS[number]) => {
          if (!searchQuery) return true;
          return (
            program.name.toLowerCase().includes(searchQuery) ||
            program.university_name.toLowerCase().includes(searchQuery)
          );
        };

        const filteredPrograms = SAMPLE_PROGRAMS.filter((program) => {
          if (!matchesSearch(program)) return false;
          if (selectedCountry !== "all" && program.university_country !== selectedCountry) return false;
          if (selectedLevel !== "all" && program.level !== selectedLevel) return false;
          if (selectedDiscipline !== "all" && program.discipline !== selectedDiscipline) return false;
          if (maxFee && program.tuition_amount > parseFloat(maxFee)) return false;
          return true;
        });

        const universitiesMap = new Map<string, SearchResult>();

        filteredPrograms.forEach((program) => {
          const existing = universitiesMap.get(program.university_id);
          const university: University = {
            id: program.university_id,
            name: program.university_name,
            country: program.university_country,
            city: program.university_city,
            logo_url: program.university_logo_url || null,
            website: null,
            description: null,
          };

          if (!existing) {
            universitiesMap.set(program.university_id, {
              university,
              programs: [program],
              scholarships: [],
            });
            return;
          }

          existing.programs.push(program);
        });

        setResults(Array.from(universitiesMap.values()));
        return;
      }

      // Build search query - search both universities and programs
      const searchQuery = debouncedSearchTerm?.trim().toLowerCase() || "";
      
      // Query universities
      let uniQuery = supabase
        .from("universities")
        .select("id, name, country, city, logo_url, website, description")
        .eq("active", true)
        .limit(MAX_UNIVERSITY_RESULTS);

      uniQuery = applyRealUniversityFilters(uniQuery);
      
      if (searchQuery) {
        uniQuery = uniQuery.ilike("name", `%${searchQuery}%`);
      }
      if (selectedCountry !== "all") {
        uniQuery = uniQuery.eq("country", selectedCountry);
      }

      // Query programs in parallel if we have a search term (to also match program names)
        const programSearchQuery = searchQuery
          ? supabase
              .from("programs")
              .select("university_id")
              .eq("active", true)
              .ilike("name", `%${searchQuery}%`)
              .limit(MAX_PROGRAM_RESULTS)
          : null;

      // Execute queries in parallel
      const [uniResult, progMatchResult] = await Promise.all([
        uniQuery,
        programSearchQuery
      ]);

      if (uniResult.error) throw uniResult.error;

      let universitiesData = uniResult.data || [];
      
      // If we searched for programs by name, get those universities too
      if (progMatchResult?.data?.length) {
        const programUniIds = new Set(progMatchResult.data.map(p => p.university_id));
        
        // Fetch universities that matched via program name but weren't already found
        const existingUniIds = new Set(universitiesData.map(u => u.id));
        const missingUniIds = [...programUniIds].filter(id => !existingUniIds.has(id));
        
        if (missingUniIds.length > 0) {
          const { data: additionalUnis } = await applyRealUniversityFilters(
            supabase
              .from("universities")
              .select("id, name, country, city, logo_url, website, description")
              .in("id", missingUniIds)
              .eq("active", true),
          );
          
          if (additionalUnis) {
            // Apply country filter to additional universities
            const filteredAdditional = selectedCountry !== "all"
              ? additionalUnis.filter(u => u.country === selectedCountry)
              : additionalUnis;
            universitiesData = [...universitiesData, ...filteredAdditional];
          }
        }
      }

      if (!universitiesData.length) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Deduplicate universities by name (case-insensitive)
      const seenNames = new Set<string>();
      const universities = universitiesData.filter((uni) => {
        const normalizedName = uni.name.toLowerCase().trim();
        if (seenNames.has(normalizedName)) {
          return false;
        }
        seenNames.add(normalizedName);
        return true;
      });

      const uniIds = universities.map((u) => u.id);
      
      // Build program query with filters
      let progQuery = supabase
        .from("programs")
        .select(
          "id, name, level, discipline, tuition_amount, tuition_currency, duration_months, university_id",
        )
        .in("university_id", uniIds)
        .eq("active", true)
        .limit(MAX_PROGRAM_RESULTS);
      
      if (selectedLevel !== "all") {
        progQuery = progQuery.eq("level", selectedLevel);
      }
      if (selectedDiscipline !== "all") {
        progQuery = progQuery.eq("discipline", selectedDiscipline);
      }
      if (maxFee) {
        progQuery = progQuery.lte("tuition_amount", parseFloat(maxFee));
      }
      // Also filter by program name if searching
      if (searchQuery) {
        progQuery = progQuery.ilike("name", `%${searchQuery}%`);
      }

      // Fetch programs and scholarships in parallel
      const [programsResult, scholarshipsResult] = await Promise.all([
        progQuery,
        supabase
          .from("scholarships")
          .select("id, name, amount_cents, currency, coverage_type, university_id, program_id")
          .in("university_id", uniIds)
          .eq("active", true)
          .limit(MAX_PROGRAM_RESULTS)
      ]);

      let programs: Program[] = [];

      if (programsResult.error) {
        const missingColumn =
          programsResult.error.code === "42703" ||
          programsResult.error.message.toLowerCase().includes("image_url");

        if (!missingColumn) throw programsResult.error;

        const fallbackQuery = supabase
          .from("programs")
          .select("id, name, level, discipline, tuition_amount, tuition_currency, duration_months, university_id")
          .in("university_id", uniIds)
          .or("active.eq.true,active.is.null");

        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) throw fallbackResult.error;
        programs = (fallbackResult.data || []).map((p) => ({ 
          id: p.id,
          name: p.name,
          level: p.level,
          discipline: p.discipline,
          tuition_amount: p.tuition_amount,
          tuition_currency: p.tuition_currency,
          duration_months: p.duration_months,
          university_id: p.university_id,
          image_url: null 
        }));
      } else {
        const data = programsResult.data || [];
        programs = data.map((p: any) => ({ 
          id: p.id,
          name: p.name,
          level: p.level,
          discipline: p.discipline,
          tuition_amount: p.tuition_amount,
          tuition_currency: p.tuition_currency,
          duration_months: p.duration_months,
          university_id: p.university_id,
          image_url: null 
        }));
      }
      const scholarships = scholarshipsResult.data || [];

      // Merge results
      const merged: SearchResult[] = universities
        .map((uni) => ({
          university: uni,
          programs: programs.filter((p) => p.university_id === uni.id),
          scholarships: scholarships.filter((s) => s.university_id === uni.id),
        }))
        .filter(
          (r) =>
            r.programs.length > 0 &&
            (!onlyWithScholarships || r.scholarships.length > 0)
        )
        // Sort by number of matching programs (most relevant first)
        .sort((a, b) => b.programs.length - a.programs.length);

      setResults(merged);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedCountry, selectedLevel, selectedDiscipline, maxFee, onlyWithScholarships]);

  // Auto-search when filters change
  useEffect(() => {
    // Skip the initial mount to avoid double-fetching
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (hasInitialQuery) {
        handleSearch();
      }
      return;
    }

    if (!hasSearched) return;

    handleSearch();
  }, [handleSearch, hasInitialQuery, hasSearched]);

  return (
    <div className={containerClasses}>
      {showSEO && (
        <SEO
          title="Search Courses - UniDoxia"
          description="Find and compare courses from top universities around the world. Filter by country, level, discipline, and more to discover the perfect program for your study abroad journey."
          keywords="course search, find courses, study abroad programs, international programs, student recruitment, find a course, university courses"
        />
      )}
      <div className={contentWrapperClasses}>
        {shouldShowBackButton && (
          <BackButton
            variant="ghost"
            size="sm"
            fallback="/"
            wrapperClassName="mb-4"
          />
        )}
        <div className="space-y-2">
          <h1 className={headingClass}>{t("pages.universitySearch.hero.title")}</h1>
          <p className={subheadingClass}>{t("pages.universitySearch.hero.subtitle")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="relative overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex h-auto gap-2 p-2 rounded-2xl bg-card/90 border border-border shadow-lg min-w-max md:w-full md:justify-center">
                {translatedTabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <tab.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* SEARCH TAB */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                  <CardTitle>{t("pages.universitySearch.filters.title")}</CardTitle>
                  <CardDescription>{t("pages.universitySearch.filters.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                      <Label>{t("pages.universitySearch.filters.fields.courseName.label")}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder={t("pages.universitySearch.filters.fields.courseName.placeholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn("pl-9", searchTerm && "pr-9")}
                        aria-label="Search courses and programs"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                      <Label>{t("pages.universitySearch.filters.fields.country.label")}</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger><SelectValue placeholder={t("pages.universitySearch.filters.fields.country.placeholder")} /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t("pages.universitySearch.filters.fields.country.all")}</SelectItem>
                        {MAJOR_DESTINATION_COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                      <Label>{t("pages.universitySearch.filters.fields.programLevel.label")}</Label>
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger><SelectValue placeholder={t("pages.universitySearch.filters.fields.programLevel.placeholder")} /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t("pages.universitySearch.filters.fields.programLevel.all")}</SelectItem>
                        {levels.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                      <Label>{t("pages.universitySearch.filters.fields.discipline.label")}</Label>
                    <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                        <SelectTrigger><SelectValue placeholder={t("pages.universitySearch.filters.fields.discipline.placeholder")} /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">{t("pages.universitySearch.filters.fields.discipline.all")}</SelectItem>
                        {disciplines.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                      <Label>{t("pages.universitySearch.filters.fields.maxFee.label")}</Label>
                    <Input
                      type="number"
                        placeholder={t("pages.universitySearch.filters.fields.maxFee.placeholder")}
                      value={maxFee}
                      onChange={(e) => setMaxFee(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Checkbox
                      id="scholarships"
                      checked={onlyWithScholarships}
                      onCheckedChange={(checked) => setOnlyWithScholarships(!!checked)}
                    />
                      <Label htmlFor="scholarships" className="ml-2">
                        {t("pages.universitySearch.filters.fields.scholarshipsOnly.label")}
                      </Label>
                  </div>
                </div>
                <Button onClick={handleSearch} className="w-full md:w-auto">
                    <Search className="mr-2 h-4 w-4" />{t("pages.universitySearch.actions.search")}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                  {loading
                    ? t("pages.universitySearch.results.loading")
                    : hasSearched
                      ? t("pages.universitySearch.results.found", { count: results.length })
                      : t("pages.universitySearch.results.startSearching", {
                        defaultValue: "Start searching to see universities and programs",
                      })}
              </h2>

              {!hasSearched ? (
                <div className="space-y-6">
                  {/* Browse All Courses Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{t("pages.universitySearch.browseCourses.title")}</h3>
                        <p className="text-sm text-muted-foreground">{t("pages.universitySearch.browseCourses.subtitle")}</p>
                      </div>
                    </div>
                    
                    {loadingCourses ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <Card key={i} className="overflow-hidden">
                            <CardContent className="pt-6 pb-4 space-y-4">
                              <div className="flex items-start gap-3">
                                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                                </div>
                              </div>
                              <Skeleton className="h-6 w-full" />
                              <div className="flex gap-2">
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                              </div>
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-3/4" />
                              </div>
                              <Skeleton className="h-10 w-full rounded-md" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : allCourses.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                          {t("pages.universitySearch.browseCourses.noCourses")}
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {allCourses.map((course) => (
                            <CourseCard
                              key={course.id}
                              course={transformToCourseCardFormat(course)}
                            />
                          ))}
                        </div>

                        {totalCoursePages > 1 && (
                          <div className="flex flex-col items-center gap-2 pt-6">
                            <div className="text-sm text-muted-foreground">
                              Showing {courseRangeStart} - {courseRangeEnd} of {totalCourses} courses
                            </div>
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    href="#"
                                    className={
                                      currentCoursePage === 1
                                        ? "pointer-events-none opacity-50"
                                        : undefined
                                    }
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleCoursePageChange(currentCoursePage - 1);
                                    }}
                                  />
                                </PaginationItem>
                                {paginationRange.map((page) => (
                                  <PaginationItem key={page}>
                                    {typeof page === "number" ? (
                                      <PaginationLink
                                        href="#"
                                        isActive={page === currentCoursePage}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleCoursePageChange(page);
                                        }}
                                      >
                                        {page}
                                      </PaginationLink>
                                    ) : (
                                      <PaginationEllipsis />
                                    )}
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                  <PaginationNext
                                    href="#"
                                    className={
                                      currentCoursePage === totalCoursePages
                                        ? "pointer-events-none opacity-50"
                                        : undefined
                                    }
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleCoursePageChange(currentCoursePage + 1);
                                    }}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                      {t("pages.universitySearch.results.empty")}
                  </CardContent>
                </Card>
              ) : (
                results.map((r) => (
                  <Card key={r.university.id} className="hover:shadow-lg transition overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-64 h-48 md:h-auto bg-muted flex-shrink-0">
                        <img
                          src={getUniversityVisual(r.university.name, r.university.logo_url)}
                          alt={r.university.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = defaultUniversityImg;
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-2xl">{r.university.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {r.university.city && `${r.university.city}, `}
                                {r.university.country}
                              </CardDescription>
                            </div>
                              {r.scholarships.length > 0 && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {t("pages.universitySearch.results.scholarshipBadge", {
                                    count: r.scholarships.length,
                                  })}
                                </Badge>
                              )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {r.university.description && (
                            <p className="text-sm text-muted-foreground">{r.university.description}</p>
                          )}

                          {/* Programs */}
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                {t("pages.universitySearch.results.programs.heading", {
                                  count: r.programs.length,
                                })}
                              </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {r.programs.slice(0, 4).map((p) => (
                                <div
                                  key={p.id}
                                  className="flex gap-3 rounded-md bg-muted/50 p-3 transition hover:bg-muted"
                                >
                                  <div className="h-16 w-24 overflow-hidden rounded-md bg-muted">
                                    <img
                                      src={getProgramVisual(p, r.university)}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = getUniversityVisual(
                                          r.university.name,
                                          r.university.logo_url,
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <p className="font-medium text-sm leading-tight">{p.name}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant="outline">{p.level}</Badge>
                                      <span className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> {p.tuition_amount.toLocaleString()} {" "}
                                        {p.tuition_currency}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground/90">
                                        {p.duration_months} months
                                      </span>
                                    </div>
                                    <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                                      <Link to={getApplyUrl(p.id)}>
                                        {isAgentOrStaff
                                          ? t("pages.universitySearch.results.programs.submitApplication", { defaultValue: "Submit Application" })
                                          : t("pages.universitySearch.results.programs.apply")}
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {r.programs.length > 4 && (
                              <p className="text-xs text-muted-foreground">
                                  {t("pages.universitySearch.results.programs.more", {
                                    count: r.programs.length - 4,
                                  })}
                              </p>
                            )}
                          </div>

                          {/* Scholarships */}
                            {r.scholarships.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Award className="h-4 w-4" /> {t("pages.universitySearch.results.scholarships.heading")}
                                </h4>
                                <div className="space-y-1">
                                  {r.scholarships.slice(0, 3).map((s) => (
                                    <div
                                      key={s.id}
                                      className="text-sm flex items-center justify-between p-2 rounded-md bg-muted/30"
                                    >
                                      <span>{s.name}</span>
                                      {s.amount_cents ? (
                                        <Badge variant="secondary" className="text-xs">
                                          {(s.amount_cents / 100).toLocaleString()} {s.currency}
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          {s.coverage_type || t("pages.universitySearch.results.scholarships.amountVaries")}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {r.scholarships.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      {t("pages.universitySearch.results.scholarships.more", {
                                        count: r.scholarships.length - 3,
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                          <div className="flex gap-2 pt-4">
                              <Button asChild className="flex-1">
                                <Link to={`/universities/${r.university.id}`}>
                                  {t("pages.universitySearch.results.viewDetails")}
                                </Link>
                              </Button>
                            {r.university.website && (
                              <Button variant="outline" asChild>
                                <a href={r.university.website} target="_blank" rel="noopener noreferrer">
                                    {t("pages.universitySearch.results.visitWebsite")}
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* AI RECOMMENDATIONS TAB */}
          <TabsContent value="recommendations">
            <ProgramRecommendations />
          </TabsContent>

          {/* SOP GENERATOR TAB */}
          <TabsContent value="sop">
            <SoPGenerator />
          </TabsContent>

          {/* INTERVIEW PRACTICE TAB */}
          <TabsContent value="interview">
            <InterviewPractice />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

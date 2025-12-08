import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseCard, Course } from "@/components/student/CourseCard";
import {
  FiltersBar,
  FilterOptions,
  ActiveFilters,
} from "@/components/student/FiltersBar";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, X, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDebounce } from "@/hooks/useDebounce";
import BackButton from "@/components/BackButton";
import { SEO } from "@/components/SEO";
import { ProgramSearchView } from "@/components/course-discovery/ProgramSearchView";

const ITEMS_PER_PAGE = 12;
const DEFAULT_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? "unidoxia";
const DEFAULT_TUITION_RANGE = {
  min: 0,
  max: 100000,
  currency: "USD*",
} as const;
const DEFAULT_DURATION_RANGE = { min: 0, max: 60 } as const;

const createDefaultFilterOptions = (): FilterOptions => ({
  countries: [],
  levels: [],
  disciplines: [],
  tuition_range: { ...DEFAULT_TUITION_RANGE },
  duration_range: { ...DEFAULT_DURATION_RANGE },
});

const createDefaultActiveFilters = (): ActiveFilters => ({
  countries: [],
  levels: [],
  tuitionRange: [DEFAULT_TUITION_RANGE.min, DEFAULT_TUITION_RANGE.max],
  durationRange: [DEFAULT_DURATION_RANGE.min, DEFAULT_DURATION_RANGE.max],
  intakeMonths: [],
});

const getNextIntakeYear = (month: number): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return month < currentMonth ? currentYear + 1 : currentYear;
};

const FALLBACK_COURSES: Course[] = [
  {
    id: "fallback-oxford-cs-msc",
    university_id: "fallback-oxford",
    name: "MSc Computer Science",
    level: "Postgraduate",
    discipline: "Computer Science",
    duration_months: 12,
    tuition_currency: "GBP",
    tuition_amount: 42000,
    intake_months: [9],
    university_name: "University of Oxford",
    university_country: "United Kingdom",
    university_city: "Oxford",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
    instant_submission: true, // Example UniDoxia-onboarded course
  },
  {
    id: "fallback-harvard-mba",
    university_id: "fallback-harvard",
    name: "MBA (Leadership & Strategy)",
    level: "Postgraduate",
    discipline: "Business Administration",
    duration_months: 24,
    tuition_currency: "USD",
    tuition_amount: 73000,
    intake_months: [1, 9],
    university_name: "Harvard University",
    university_country: "United States",
    university_city: "Cambridge",
    university_logo_url: null,
    next_intake_month: 1,
    next_intake_year: getNextIntakeYear(1),
  },
  {
    id: "fallback-toronto-bsc-data",
    university_id: "fallback-toronto",
    name: "BSc Data Science & Analytics",
    level: "Undergraduate",
    discipline: "Data Science",
    duration_months: 48,
    tuition_currency: "CAD",
    tuition_amount: 41000,
    intake_months: [1, 5, 9],
    university_name: "University of Toronto",
    university_country: "Canada",
    university_city: "Toronto",
    university_logo_url: null,
    next_intake_month: 1,
    next_intake_year: getNextIntakeYear(1),
    is_unidoxia_partner: true, // Example UniDoxia partner university
  },
  {
    id: "fallback-melbourne-meng",
    university_id: "fallback-melbourne",
    name: "Master of Engineering (Software)",
    level: "Postgraduate",
    discipline: "Engineering",
    duration_months: 24,
    tuition_currency: "AUD",
    tuition_amount: 52000,
    intake_months: [2, 7],
    university_name: "University of Melbourne",
    university_country: "Australia",
    university_city: "Melbourne",
    university_logo_url: null,
    next_intake_month: 2,
    next_intake_year: getNextIntakeYear(2),
  },
  {
    id: "fallback-mit-eecs",
    university_id: "fallback-mit",
    name: "SB Electrical Engineering and Computer Science",
    level: "Undergraduate",
    discipline: "Computer Science",
    duration_months: 48,
    tuition_currency: "USD",
    tuition_amount: 59750,
    intake_months: [9],
    university_name: "Massachusetts Institute of Technology",
    university_country: "United States",
    university_city: "Cambridge, MA",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
  },
  {
    id: "fallback-ubc-msc-energy",
    university_id: "fallback-ubc",
    name: "MSc Sustainable Energy Systems",
    level: "Postgraduate",
    discipline: "Sustainability",
    duration_months: 18,
    tuition_currency: "CAD",
    tuition_amount: 36000,
    intake_months: [5],
    university_name: "University of British Columbia",
    university_country: "Canada",
    university_city: "Vancouver",
    university_logo_url: null,
    next_intake_month: 5,
    next_intake_year: getNextIntakeYear(5),
  },
  {
    id: "fallback-imperial-msc-robotics",
    university_id: "fallback-imperial",
    name: "MSc Robotics & Autonomous Systems",
    level: "Postgraduate",
    discipline: "Robotics",
    duration_months: 12,
    tuition_currency: "GBP",
    tuition_amount: 41000,
    intake_months: [10],
    university_name: "Imperial College London",
    university_country: "United Kingdom",
    university_city: "London",
    university_logo_url: null,
    next_intake_month: 10,
    next_intake_year: getNextIntakeYear(10),
  },
  {
    id: "fallback-sydney-mph",
    university_id: "fallback-sydney",
    name: "Master of Public Health",
    level: "Postgraduate",
    discipline: "Public Health",
    duration_months: 18,
    tuition_currency: "AUD",
    tuition_amount: 38000,
    intake_months: [3, 7],
    university_name: "University of Sydney",
    university_country: "Australia",
    university_city: "Sydney",
    university_logo_url: null,
    next_intake_month: 3,
    next_intake_year: getNextIntakeYear(3),
  },
  {
    id: "fallback-stanford-msce",
    university_id: "fallback-stanford",
    name: "MS Computer Engineering",
    level: "Postgraduate",
    discipline: "Computer Engineering",
    duration_months: 24,
    tuition_currency: "USD",
    tuition_amount: 60000,
    intake_months: [9],
    university_name: "Stanford University",
    university_country: "United States",
    university_city: "Stanford",
    university_logo_url: null,
    next_intake_month: 9,
    next_intake_year: getNextIntakeYear(9),
  },
  {
    id: "fallback-eth-msc-data",
    university_id: "fallback-eth",
    name: "MSc Data Science",
    level: "Postgraduate",
    discipline: "Data Science",
    duration_months: 18,
    tuition_currency: "CHF",
    tuition_amount: 25000,
    intake_months: [2, 9],
    university_name: "ETH Zürich",
    university_country: "Switzerland",
    university_city: "Zürich",
    university_logo_url: null,
    next_intake_month: 2,
    next_intake_year: getNextIntakeYear(2),
  },
  {
    id: "fallback-tokyo-msc-quantum",
    university_id: "fallback-tokyo",
    name: "MSc Quantum Computing",
    level: "Postgraduate",
    discipline: "Physics",
    duration_months: 24,
    tuition_currency: "JPY",
    tuition_amount: 4600000,
    intake_months: [4],
    university_name: "The University of Tokyo",
    university_country: "Japan",
    university_city: "Tokyo",
    university_logo_url: null,
    next_intake_month: 4,
    next_intake_year: getNextIntakeYear(4),
  },
  {
    id: "fallback-cape-town-bcom",
    university_id: "fallback-cape-town",
    name: "BCom Finance & Analytics",
    level: "Undergraduate",
    discipline: "Finance",
    duration_months: 36,
    tuition_currency: "ZAR",
    tuition_amount: 220000,
    intake_months: [2, 7],
    university_name: "University of Cape Town",
    university_country: "South Africa",
    university_city: "Cape Town",
    university_logo_url: null,
    next_intake_month: 2,
    next_intake_year: getNextIntakeYear(2),
  },
  {
    id: "fallback-uc-berkeley-msds",
    university_id: "fallback-uc-berkeley",
    name: "Master of Information & Data Science",
    level: "Postgraduate",
    discipline: "Information Science",
    duration_months: 20,
    tuition_currency: "USD",
    tuition_amount: 52000,
    intake_months: [1, 5, 9],
    university_name: "University of California, Berkeley",
    university_country: "United States",
    university_city: "Berkeley",
    university_logo_url: null,
    next_intake_month: 1,
    next_intake_year: getNextIntakeYear(1),
  },
];

const SORT_OPTIONS = [
  { value: "name:asc", label: "Name (A-Z)" },
  { value: "name:desc", label: "Name (Z-A)" },
  { value: "tuition:asc", label: "Lowest Tuition" },
  { value: "tuition:desc", label: "Highest Tuition" },
  { value: "intake:asc", label: "Soonest Intake" },
  { value: "duration:asc", label: "Shortest Duration" },
  { value: "duration:desc", label: "Longest Duration" },
];

export default function CourseDiscovery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const isProgramView = searchParams.get("view") === "programs";
  const handleViewChange = useCallback(
    (nextView: "courses" | "programs") => {
      const currentView = isProgramView ? "programs" : "courses";
      if (nextView === currentView) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "courses") {
        params.delete("view");
      } else {
        params.set("view", "programs");
      }

      setSearchParams(params, { replace: true });
    },
    [isProgramView, searchParams, setSearchParams],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name:asc");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(() =>
    createDefaultFilterOptions(),
  );
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    createDefaultActiveFilters(),
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const hasInitializedFilters = useRef(false);
  const fallbackToastShownRef = useRef(false);

  const resolveTenantId = useCallback(async (): Promise<string | null> => {
    try {
      if (user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data?.tenant_id) {
          return data.tenant_id;
        }
      }

      const { data: tenantBySlug, error: slugError } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", DEFAULT_TENANT_SLUG)
        .maybeSingle();

      if (!slugError && tenantBySlug?.id) {
        return tenantBySlug.id;
      }

      const { data: fallbackTenant, error: fallbackError } = await supabase
        .from("tenants")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!fallbackError && fallbackTenant?.id) {
        return fallbackTenant.id;
      }
    } catch (error) {
      console.error("Error resolving tenant ID:", error);
    }

    return null;
  }, [user?.id]);

  const updateFilterOptionsFromCourses = useCallback(
    (courses: Course[], resetActiveFilters: boolean) => {
      if (courses.length === 0) {
        setFilterOptions(createDefaultFilterOptions());
        if (resetActiveFilters) {
          setActiveFilters(createDefaultActiveFilters());
        }
        return;
      }

      const countries = Array.from(
        new Set(
          courses.map((course) => course.university_country).filter(Boolean),
        ),
      ).sort();
      const levels = Array.from(
        new Set(courses.map((course) => course.level).filter(Boolean)),
      ).sort();
      const disciplines = Array.from(
        new Set(courses.map((course) => course.discipline).filter(Boolean)),
      ).sort();

      const tuitionValues = courses
        .map((course) => course.tuition_amount)
        .filter((value) => Number.isFinite(value));
      const durationValues = courses
        .map((course) => course.duration_months)
        .filter((value) => Number.isFinite(value));

      const minTuition = tuitionValues.length
        ? Math.min(...tuitionValues)
        : DEFAULT_TUITION_RANGE.min;
      const maxTuition = tuitionValues.length
        ? Math.max(...tuitionValues)
        : DEFAULT_TUITION_RANGE.max;
      const normalizedTuitionMin = Math.max(
        DEFAULT_TUITION_RANGE.min,
        Math.floor(minTuition / 1000) * 1000,
      );
      const normalizedTuitionMax = Math.max(
        normalizedTuitionMin + 1000,
        Math.ceil(maxTuition / 1000) * 1000,
      );

      const minDuration = durationValues.length
        ? Math.min(...durationValues)
        : DEFAULT_DURATION_RANGE.min;
      const maxDuration = durationValues.length
        ? Math.max(...durationValues)
        : DEFAULT_DURATION_RANGE.max;
      const normalizedDurationMin = Math.max(
        DEFAULT_DURATION_RANGE.min,
        Math.floor(minDuration),
      );
      const normalizedDurationMax = Math.max(
        normalizedDurationMin + 1,
        Math.ceil(maxDuration),
      );

      const nextFilterOptions: FilterOptions = {
        countries,
        levels,
        disciplines,
        tuition_range: {
          min: normalizedTuitionMin,
          max: normalizedTuitionMax,
          currency: DEFAULT_TUITION_RANGE.currency,
        },
        duration_range: {
          min: normalizedDurationMin,
          max: normalizedDurationMax,
        },
      };

      setFilterOptions(nextFilterOptions);

      if (resetActiveFilters) {
        setActiveFilters({
          countries: [],
          levels: [],
          intakeMonths: [],
          tuitionRange: [
            nextFilterOptions.tuition_range.min,
            nextFilterOptions.tuition_range.max,
          ],
          durationRange: [
            nextFilterOptions.duration_range.min,
            nextFilterOptions.duration_range.max,
          ],
        });
      } else {
        setActiveFilters((prev) => {
          const nextTuitionMin = Math.max(
            nextFilterOptions.tuition_range.min,
            prev.tuitionRange[0],
          );
          const nextTuitionMax = Math.min(
            nextFilterOptions.tuition_range.max,
            prev.tuitionRange[1],
          );
          const tuitionRange: [number, number] =
            nextTuitionMin > nextTuitionMax
              ? [
                  nextFilterOptions.tuition_range.min,
                  nextFilterOptions.tuition_range.max,
                ]
              : [nextTuitionMin, nextTuitionMax];

          const nextDurationMin = Math.max(
            nextFilterOptions.duration_range.min,
            prev.durationRange[0],
          );
          const nextDurationMax = Math.min(
            nextFilterOptions.duration_range.max,
            prev.durationRange[1],
          );
          const durationRange: [number, number] =
            nextDurationMin > nextDurationMax
              ? [
                  nextFilterOptions.duration_range.min,
                  nextFilterOptions.duration_range.max,
                ]
              : [nextDurationMin, nextDurationMax];

          return {
            ...prev,
            tuitionRange,
            durationRange,
          };
        });
      }
    },
    [],
  );

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setUsingFallbackData(false);

    try {
      const tenantId = await resolveTenantId();

      if (!tenantId) {
        throw new Error("Unable to determine tenant");
      }

      const { data, error } = await supabase
        .from("programs")
        .select(
          `
          id,
          name,
          level,
          discipline,
          duration_months,
          tuition_currency,
          tuition_amount,
          intake_months,
          instant_submission,
          universities (
            id,
            name,
            country,
            city,
            logo_url,
            is_unidoxia_partner
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("No courses returned from Supabase");
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const transformedCourses: Course[] = (data as any[]).map((item) => {
        const rawIntakes: number[] = Array.isArray(item.intake_months)
          ? item.intake_months.filter((month: number) => Number.isFinite(month))
          : [];
        const sortedIntakes = [...rawIntakes].sort((a, b) => a - b);
        const nextIntakeMonth =
          sortedIntakes.find((month) => month >= currentMonth) ??
          sortedIntakes[0];
        const nextIntakeYear = nextIntakeMonth
          ? nextIntakeMonth < currentMonth
            ? currentYear + 1
            : currentYear
          : undefined;

        return {
          id: item.id,
          university_id: item.universities?.id || '',
          name: item.name,
          level: item.level,
          discipline: item.discipline,
          duration_months: item.duration_months,
          tuition_currency: item.tuition_currency,
          tuition_amount: item.tuition_amount,
          intake_months: rawIntakes,
          university_name: item.universities?.name || "",
          university_country: item.universities?.country || "",
          university_city: item.universities?.city || "",
          university_logo_url: item.universities?.logo_url || null,
          next_intake_month: nextIntakeMonth,
          next_intake_year: nextIntakeYear,
          instant_submission: item.instant_submission ?? false,
          is_unidoxia_partner: item.universities?.is_unidoxia_partner ?? false,
        } satisfies Course;
      });

      setAllCourses(transformedCourses);
      updateFilterOptionsFromCourses(
        transformedCourses,
        !hasInitializedFilters.current,
      );
      hasInitializedFilters.current = true;
      setUsingFallbackData(false);
    } catch (error) {
      console.warn("Falling back to sample course catalogue:", error);
      setAllCourses(FALLBACK_COURSES);
      updateFilterOptionsFromCourses(
        FALLBACK_COURSES,
        !hasInitializedFilters.current,
      );
      hasInitializedFilters.current = true;
      setUsingFallbackData(true);

      if (!fallbackToastShownRef.current) {
        toast({
          title: "Showing sample courses",
          description:
            "We could not load live course data, so a curated sample catalogue is displayed instead.",
        });
        fallbackToastShownRef.current = true;
      }
    } finally {
      setVisibleCount(ITEMS_PER_PAGE);
      setLoading(false);
    }
  }, [resolveTenantId, toast, updateFilterOptionsFromCourses]);

  useEffect(() => {
    hasInitializedFilters.current = false;
    fallbackToastShownRef.current = false;
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [debouncedSearchQuery, activeFilters, sortBy]);

  const filteredCourses = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();

    return allCourses.filter((course) => {
      if (query) {
        const haystack =
          `${course.name} ${course.university_name} ${course.university_country} ${course.discipline}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (
        activeFilters.countries.length > 0 &&
        !activeFilters.countries.includes(course.university_country)
      ) {
        return false;
      }

      if (
        activeFilters.levels.length > 0 &&
        !activeFilters.levels.includes(course.level)
      ) {
        return false;
      }

      if (
        course.tuition_amount < activeFilters.tuitionRange[0] ||
        course.tuition_amount > activeFilters.tuitionRange[1]
      ) {
        return false;
      }

      if (
        course.duration_months < activeFilters.durationRange[0] ||
        course.duration_months > activeFilters.durationRange[1]
      ) {
        return false;
      }

      if (activeFilters.intakeMonths.length > 0) {
        const sourceMonths = course.intake_months?.length
          ? course.intake_months
          : course.next_intake_month
            ? [course.next_intake_month]
            : [];

        if (
          !sourceMonths.some((month) =>
            activeFilters.intakeMonths.includes(month),
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allCourses, debouncedSearchQuery, activeFilters]);

  const sortedCourses = useMemo(() => {
    const coursesToSort = [...filteredCourses];

    switch (sortBy) {
      case "name:asc":
        coursesToSort.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name:desc":
        coursesToSort.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "tuition:asc":
        coursesToSort.sort((a, b) => a.tuition_amount - b.tuition_amount);
        break;
      case "tuition:desc":
        coursesToSort.sort((a, b) => b.tuition_amount - a.tuition_amount);
        break;
      case "intake:asc":
        coursesToSort.sort((a, b) => {
          const aMonth = a.next_intake_month ?? a.intake_months?.[0] ?? 13;
          const bMonth = b.next_intake_month ?? b.intake_months?.[0] ?? 13;
          return aMonth - bMonth;
        });
        break;
      case "duration:asc":
        coursesToSort.sort((a, b) => a.duration_months - b.duration_months);
        break;
      case "duration:desc":
        coursesToSort.sort((a, b) => b.duration_months - a.duration_months);
        break;
      default:
        break;
    }

    return coursesToSort;
  }, [filteredCourses, sortBy]);

  const displayedCourses = useMemo(
    () => sortedCourses.slice(0, Math.min(visibleCount, sortedCourses.length)),
    [sortedCourses, visibleCount],
  );

  const totalCount = sortedCourses.length;
  const hasMoreResults = visibleCount < totalCount;

  const handleLoadMore = useCallback(() => {
    if (!hasMoreResults) {
      return;
    }

    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, totalCount));
      setLoadingMore(false);
    }, 250);
  }, [hasMoreResults, totalCount]);

  const handleResetFilters = useCallback(() => {
    setActiveFilters({
      countries: [],
      levels: [],
      intakeMonths: [],
      tuitionRange: [
        filterOptions.tuition_range.min,
        filterOptions.tuition_range.max,
      ],
      durationRange: [
        filterOptions.duration_range.min,
        filterOptions.duration_range.max,
      ],
    });
  }, [filterOptions]);

  const seoTitle = isProgramView
    ? "Find Programs & Universities - UniDoxia"
    : "Discover Courses - UniDoxia";
  const seoDescription = isProgramView
    ? "Find and compare universities from around the world. Filter by country, course, and more to discover the perfect institution for your study abroad journey."
    : "Explore thousands of courses from top universities worldwide. Filter by discipline, level, tuition, and more to find the right course for your international education.";
  const seoKeywords = isProgramView
    ? "university search, find universities, study abroad courses, international colleges, student recruitment, find a university"
    : "course discovery, find courses, study abroad courses, university courses, international student courses, find a degree";

  return (
    <div className="min-h-screen bg-background">
        <SEO title={seoTitle} description={seoDescription} keywords={seoKeywords} />
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <BackButton
              variant="ghost"
              size="sm"
              fallback="/"
              wrapperClassName="mb-4"
              className="px-0 text-muted-foreground hover:text-foreground"
            />
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isProgramView
                    ? "Find the Right Program & University"
                    : "Discover Your Perfect Course"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isProgramView
                    ? "Search universities, compare courses, and explore AI-powered guidance."
                    : "Explore courses from top universities worldwide"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={isProgramView ? "outline" : "default"}
                  onClick={() => handleViewChange("courses")}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Course Explorer
                </Button>
                <Button
                  variant={isProgramView ? "default" : "outline"}
                  onClick={() => handleViewChange("programs")}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Program Finder
                </Button>
              </div>

              {!isProgramView && (
                <>
                  {/* Search and Sort Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses or universities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Mobile Filter Button */}
                      <Sheet
                        open={mobileFiltersOpen}
                        onOpenChange={setMobileFiltersOpen}
                      >
                        <SheetTrigger asChild>
                          <Button variant="outline" className="lg:hidden">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-full sm:w-[400px] p-0">
                          <SheetHeader className="p-6 pb-0">
                            <SheetTitle>Filters</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4">
                            <FiltersBar
                              filterOptions={filterOptions}
                              activeFilters={activeFilters}
                              onFiltersChange={setActiveFilters}
                              onReset={handleResetFilters}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>

                  {/* Results count */}
                  {!loading && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        Found{" "}
                        <span className="font-semibold text-foreground">
                          {totalCount}
                        </span>{" "}
                        course
                        {totalCount !== 1 ? "s" : ""}
                      </span>
                      {usingFallbackData && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          <Sparkles className="h-3 w-3 text-primary" />
                          Showing sample catalogue
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
      </div>

      {/* Main Content */}
      {isProgramView ? (
        <div className="container mx-auto px-4 py-8">
          <ProgramSearchView variant="embedded" />
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Desktop Filters Sidebar */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <FiltersBar
                filterOptions={filterOptions}
                activeFilters={activeFilters}
                onFiltersChange={setActiveFilters}
                onReset={handleResetFilters}
              />
            </aside>

            {/* Courses Grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingState message="Loading courses..." />
                </div>
              ) : displayedCourses.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters to find more results
                  </p>
                  <Button onClick={handleResetFilters} variant="outline">
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayedCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMoreResults && (
                    <div className="mt-8 flex justify-center">
                      <Button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        size="lg"
                        variant="outline"
                      >
                        {loadingMore ? (
                          <>
                            <LoadingState size="sm" className="mr-2" />
                            Loading...
                          </>
                        ) : (
                          `Load More (${totalCount - displayedCourses.length} remaining)`
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

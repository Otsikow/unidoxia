import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  parseUniversityProfileDetails,
  type UniversityProfileDetails,
} from "@/lib/universityProfile";
import {
  Award,
  Building2,
  ExternalLink,
  Globe,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { SEO } from "@/components/SEO";

// --- University Images ---
import defaultUniversityImg from "@/assets/university-default.jpg";

// Interface for university data from database
// Each university is a unique entity with isolated data - no cross-tenant sharing
interface UniversityFromDB {
  id: string;
  tenant_id: string | null; // Each university has its own tenant for data isolation
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  featured_image_url: string | null;
  submission_config_json: unknown;
  active: boolean | null;
  programCount: number; // Count of programs ONLY for this specific university
  profileDetails: UniversityProfileDetails;
}

// Helper: get the best available image for a university
const getUniversityImage = (university: UniversityFromDB): string => {
  // Priority: hero image from profile > featured_image_url > default
  const heroImage = university.profileDetails?.media?.heroImageUrl;
  if (heroImage) return heroImage;
  if (university.featured_image_url) return university.featured_image_url;
  return defaultUniversityImg;
};

type SortOption =
  | "name-asc"
  | "name-desc"
  | "programs-desc"
  | "programs-asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
  { value: "programs-desc", label: "Courses: High to Low" },
  { value: "programs-asc", label: "Courses: Low to High" },
];

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value: number) => numberFormatter.format(Math.round(value));

export default function UniversityDirectory() {
  const [universities, setUniversities] = useState<UniversityFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch universities from database with proper multi-tenant isolation
  useEffect(() => {
    const fetchUniversities = async () => {
      setLoading(true);
      try {
        // Fetch universities - each university is a unique tenant with isolated data
        const { data: universitiesData, error: uniError } = await supabase
          .from("universities")
          .select(
            "id, name, city, country, website, description, logo_url, featured_image_url, submission_config_json, active, tenant_id",
          )
          // Some seeded universities were missing the active flag. Treat null as visible
          // so that partner universities (Albert A University, John Kols University,
          // Pineapple University, Shalombay University, etc.) always appear for students
          // and agents.
          .or("active.eq.true,active.is.null")
          .order("name");

        if (uniError) throw uniError;

        // MULTI-TENANT ISOLATION: Fetch programs with university_id to count per institution
        // Each program belongs to exactly ONE university - no cross-mixing of data
        const { data: programCounts, error: progError } = await supabase
          .from("programs")
          .select("id, university_id")
          // Programs may also have a missing active flag; include them when counting
          // so the directory metrics remain accurate.
          .or("active.eq.true,active.is.null");

        if (progError) throw progError;

        // Build a map of program counts per university
        // This ensures each university only shows their OWN programs
        const programCountMap: Record<string, number> = {};
        programCounts?.forEach((program) => {
          const uniId = program.university_id;
          if (uniId) {
            programCountMap[uniId] = (programCountMap[uniId] || 0) + 1;
          }
        });

        // Combine data - each university gets ONLY their own program count
        const enrichedUniversities: UniversityFromDB[] = (universitiesData || []).map((uni) => ({
          ...uni,
          // Critical: Only count programs where university_id matches this university's ID
          programCount: programCountMap[uni.id] || 0,
          profileDetails: parseUniversityProfileDetails(uni.submission_config_json),
        }));

        // Deduplicate universities by ID to ensure unique entries
        // Also deduplicate by name (case-insensitive) to prevent visual duplicates
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const deduplicatedUniversities = enrichedUniversities.filter((uni) => {
          // First check by ID (primary key)
          if (seenIds.has(uni.id)) {
            return false;
          }
          seenIds.add(uni.id);
          
          // Then check by name to avoid visual duplicates
          const normalizedName = uni.name.toLowerCase().trim();
          if (seenNames.has(normalizedName)) {
            return false;
          }
          seenNames.add(normalizedName);
          return true;
        });

        setUniversities(deduplicatedUniversities);
      } catch (error) {
        console.error("Error loading universities:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUniversities();
  }, []);

  // Get unique countries for filter
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    universities.forEach((uni) => {
      if (uni.country) countries.add(uni.country);
    });
    return Array.from(countries).sort();
  }, [universities]);

  const summaryMetrics = useMemo(() => {
    const totalUniversities = universities.length;
    const totalPrograms = universities.reduce(
      (sum, uni) => sum + uni.programCount,
      0
    );
    const countriesCount = new Set(
      universities.map((uni) => uni.country).filter(Boolean)
    ).size;
    const universityWithMostPrograms = universities.reduce(
      (prev, current) =>
        current.programCount > (prev?.programCount || 0) ? current : prev,
      universities[0]
    );

    return {
      totalUniversities,
      totalPrograms,
      countriesCount,
      universityWithMostPrograms,
    };
  }, [universities]);

  const filteredUniversities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return universities.filter((university) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          university.name,
          university.city || "",
          university.country || "",
          university.description || "",
          ...(university.profileDetails?.highlights || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCountry =
        selectedCountry === "all" || university.country === selectedCountry;

      return matchesSearch && matchesCountry;
    });
  }, [universities, searchTerm, selectedCountry]);

  const sortedUniversities = useMemo(() => {
    const list = [...filteredUniversities];

    switch (sortOption) {
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "programs-desc":
        return list.sort((a, b) => b.programCount - a.programCount);
      case "programs-asc":
        return list.sort((a, b) => a.programCount - b.programCount);
      default:
        return list;
    }
  }, [filteredUniversities, sortOption]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCountry("all");
    setSortOption("name-asc");
  };

  const renderUniversityCard = (university: UniversityFromDB) => {
    const image = getUniversityImage(university);
    const locationLabel = [university.city, university.country].filter(Boolean).join(", ");
    const tagline = university.profileDetails?.tagline;
    const highlights = university.profileDetails?.highlights || [];

    const cardContent = (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            {/* University Logo */}
            {university.logo_url ? (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background p-1.5">
                <img
                  src={university.logo_url}
                  alt={`${university.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                {university.name}
              </CardTitle>
              {tagline ? (
                <p className="text-xs text-primary font-medium line-clamp-2">{tagline}</p>
              ) : null}
              <CardDescription className="flex flex-wrap items-center gap-1 mt-0.5">
                {locationLabel ? (
                  <span className="flex items-center gap-1 text-xs">
                    <MapPin className="h-3 w-3" />
                    {locationLabel}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
          {university.description ? (
            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {university.description}
            </p>
          ) : null}
        </div>

        {/* Compact Programs Card */}
        <Link 
          to={`/universities/${university.id}?tab=programs`}
          className="block rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-2.5 transition-all hover:border-primary/40 hover:shadow-md hover:from-primary/10 hover:to-primary/15 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary leading-tight">{formatNumber(university.programCount)}</p>
                <p className="text-xs font-medium text-muted-foreground">Courses Available</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-primary font-medium text-xs group-hover:translate-x-0.5 transition-transform">
              <span>View All</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              <MapPin className="h-2.5 w-2.5" />
              Location
            </div>
            <p className="mt-1 font-medium text-foreground text-xs">{university.country || "—"}</p>
            {university.city ? <p className="text-[10px] text-muted-foreground">{university.city}</p> : null}
          </div>
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              <Building2 className="h-2.5 w-2.5" />
              Partner Status
            </div>
            <p className="mt-1 font-medium text-foreground text-xs">Active</p>
          </div>
        </div>

        {highlights.length > 0 ? (
          <div className="rounded-md border bg-background/60 p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Highlights
            </p>
            <ul className="mt-1 space-y-1 text-xs text-foreground">
              {highlights.slice(0, 2).map((highlight, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <TrendingUp className="mt-0.5 h-3 w-3 text-primary flex-shrink-0" />
                  <span className="line-clamp-1">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-1.5 mt-auto">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" asChild>
            <Link to={`/universities/${university.id}`}>
              Explore
            </Link>
          </Button>
          {university.website ? (
            <Button variant="secondary" size="sm" className="h-7 text-xs px-2" asChild>
              <a href={university.website} target="_blank" rel="noreferrer">
                Website
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );

    if (viewMode === "list") {
      return (
        <Card className="overflow-hidden border-border/60 transition-all hover:shadow-lg">
          <div className="flex flex-col gap-0 md:flex-row">
            <div className="h-40 w-full md:h-auto md:w-48">
              <img
                src={image}
                alt={university.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">{cardContent}</div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden border-border/60 transition-all hover:shadow-lg h-full flex flex-col">
        <div className="h-32 w-full flex-shrink-0">
          <img
            src={image}
            alt={university.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 flex flex-col">{cardContent}</div>
      </Card>
    );
  };

  const totalLabel = `${sortedUniversities.length} ${
    sortedUniversities.length === 1 ? "University" : "Universities"
  } Found`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
          <Skeleton className="h-10 w-32" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-96" />
            <Skeleton className="h-6 w-64" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <SEO
        title="University Directory - UniDoxia"
        description="Browse our directory of partner universities from around the world. Find detailed profiles, rankings, and program information to help you choose the right institution."
        keywords="university directory, partner universities, college listings, international universities, student recruitment directory, university finder"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              Partner universities • Live data
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">University Directory</h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Discover partner universities with key information, courses,
                and direct links to explore admissions further.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="h-fit px-3 py-2 text-xs uppercase tracking-wide">
            Live Profiles
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card 
            className="border-border/60 cursor-pointer transition-all hover:shadow-lg hover:border-primary/40"
            onClick={() => {
              const listingSection = document.getElementById('university-listing');
              listingSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                Partner Universities
              </CardTitle>
              <CardDescription>
                Active institutions on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {summaryMetrics.totalUniversities}
              </p>
              <p className="text-sm text-muted-foreground">
                Across {summaryMetrics.countriesCount} countries
              </p>
            </CardContent>
          </Card>

          <Link to="/courses" className="block">
            <Card className="border-border/60 cursor-pointer transition-all hover:shadow-lg hover:border-primary/40 h-full">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Available Courses
                </CardTitle>
                <CardDescription>Active degree pathways</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {formatNumber(summaryMetrics.totalPrograms)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Across all partner universities
                </p>
              </CardContent>
            </Card>
          </Link>

          {summaryMetrics.universityWithMostPrograms ? (
            <Link to={`/universities/${summaryMetrics.universityWithMostPrograms.id}`} className="block">
              <Card className="border-border/60 cursor-pointer transition-all hover:shadow-lg hover:border-primary/40 h-full">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Award className="h-4 w-4 text-primary" />
                    Top University
                  </CardTitle>
                  <CardDescription>Most courses available</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-foreground line-clamp-2">
                    {summaryMetrics.universityWithMostPrograms.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {summaryMetrics.universityWithMostPrograms.programCount} courses
                  </p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Award className="h-4 w-4 text-primary" />
                  Top University
                </CardTitle>
                <CardDescription>Most courses available</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-foreground truncate">—</p>
                <p className="text-sm text-muted-foreground">0 courses</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>
              Find universities by name, location, or keyword.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2">
                <Label className="text-sm text-muted-foreground">Keyword</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by university name, city, or description"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Country</Label>
                <Select
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {availableCountries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Sort By</Label>
                <Select
                  value={sortOption}
                  onValueChange={(value) => setSortOption(value as SortOption)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sort results" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {selectedCountry !== "all"
                  ? `Filtering by ${selectedCountry}`
                  : "Showing all countries"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value) =>
                    setViewMode((value as "grid" | "list") || "grid")
                  }
                  className="rounded-md border bg-muted/40 p-1"
                >
                  <ToggleGroupItem
                    value="grid"
                    className="px-3 py-1 text-xs font-medium"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="list"
                    className="px-3 py-1 text-xs font-medium"
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div id="university-listing" className="space-y-4 scroll-mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-foreground">{totalLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Showing curated results based on your filters and sort preferences.
            </p>
          </div>

          {sortedUniversities.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    No universities match your current filters
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try removing a focus area or broadening the geography to rediscover options.
                  </p>
                </div>
                <Button onClick={handleResetFilters} variant="secondary">
                  Reset filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedUniversities.map((university) => (
                <div key={university.id}>{renderUniversityCard(university)}</div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedUniversities.map((university) => (
                <div key={university.id}>{renderUniversityCard(university)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

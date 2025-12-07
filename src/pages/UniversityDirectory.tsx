import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import BackButton from "@/components/BackButton";
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
interface UniversityFromDB {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  featured_image_url: string | null;
  submission_config_json: unknown;
  active: boolean | null;
  programCount: number;
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
  { value: "programs-desc", label: "Programmes: High to Low" },
  { value: "programs-asc", label: "Programmes: Low to High" },
];

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value: number) => numberFormatter.format(Math.round(value));

const StatItem = ({
  icon: Icon,
  label,
  value,
  subValue,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  href?: string;
}) => {
  const content = (
    <>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      {subValue ? <p className="text-xs text-muted-foreground">{subValue}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50 hover:border-primary/30 cursor-pointer block"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      {content}
    </div>
  );
};

export default function UniversityDirectory() {
  const [universities, setUniversities] = useState<UniversityFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch universities from database
  useEffect(() => {
    const fetchUniversities = async () => {
      setLoading(true);
      try {
        // Fetch universities
        const { data: universitiesData, error: uniError } = await supabase
          .from("universities")
          .select("id, name, city, country, website, description, logo_url, featured_image_url, submission_config_json, active")
          .eq("active", true)
          .order("name");

        if (uniError) throw uniError;

        // Fetch program counts for each university
        const { data: programCounts, error: progError } = await supabase
          .from("programs")
          .select("university_id")
          .eq("active", true);

        if (progError) throw progError;

        // Count programs per university
        const programCountMap: Record<string, number> = {};
        programCounts?.forEach((program) => {
          const uniId = program.university_id;
          if (uniId) {
            programCountMap[uniId] = (programCountMap[uniId] || 0) + 1;
          }
        });

        // Combine data
        const enrichedUniversities: UniversityFromDB[] = (universitiesData || []).map((uni) => ({
          ...uni,
          programCount: programCountMap[uni.id] || 0,
          profileDetails: parseUniversityProfileDetails(uni.submission_config_json),
        }));

        // Deduplicate universities by name (case-insensitive) to prevent duplicates
        const seenNames = new Set<string>();
        const deduplicatedUniversities = enrichedUniversities.filter((uni) => {
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
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-4">
            {/* University Logo */}
            {university.logo_url ? (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background p-2">
                <img
                  src={university.logo_url}
                  alt={`${university.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1.5">
              <CardTitle className="text-2xl text-foreground">
                {university.name}
              </CardTitle>
              {tagline ? (
                <p className="text-sm text-primary font-medium">{tagline}</p>
              ) : null}
              <CardDescription className="flex flex-wrap items-center gap-2">
                {locationLabel ? (
                  <span className="flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4" />
                    {locationLabel}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
          {university.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {university.description}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatItem
            icon={GraduationCap}
            label="Programmes"
            value={formatNumber(university.programCount)}
            href={`/universities/${university.id}?tab=programs`}
          />
          <StatItem
            icon={MapPin}
            label="Location"
            value={university.country || "—"}
          />
        </div>

        {highlights.length > 0 ? (
          <div className="rounded-lg border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Highlights
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground">
              {highlights.slice(0, 3).map((highlight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/universities/${university.id}`}>
              Explore profile
            </Link>
          </Button>
          {university.website ? (
            <Button variant="secondary" size="sm" asChild>
              <a href={university.website} target="_blank" rel="noreferrer">
                Visit website
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );

    if (viewMode === "list") {
      return (
        <Card className="overflow-hidden border-border/60 transition-all hover:shadow-xl">
          <div className="flex flex-col gap-0 md:flex-row">
            <div className="h-56 w-full md:h-auto md:w-72">
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
      <Card className="overflow-hidden border-border/60 transition-all hover:shadow-xl">
        <div className="h-48 w-full">
          <img
            src={image}
            alt={university.name}
            className="h-full w-full object-cover"
          />
        </div>
        {cardContent}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
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
        <BackButton variant="ghost" size="sm" wrapperClassName="mb-2" fallback="/" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              Partner universities • Live data
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">University Directory</h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Discover partner universities with key information, programmes,
                and direct links to explore admissions further.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="h-fit px-3 py-2 text-xs uppercase tracking-wide">
            Live Profiles
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border/60">
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

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <GraduationCap className="h-4 w-4 text-primary" />
                Available Programmes
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

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Award className="h-4 w-4 text-primary" />
                Top University
              </CardTitle>
              <CardDescription>Most programmes available</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-foreground truncate">
                {summaryMetrics.universityWithMostPrograms?.name || "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {summaryMetrics.universityWithMostPrograms?.programCount || 0} programmes
              </p>
            </CardContent>
          </Card>
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

        <div className="space-y-4">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

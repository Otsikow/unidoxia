import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Search,
  GraduationCap,
  DollarSign,
  Award,
  MapPin,
  Sparkles,
  FileText,
  MessageSquare,
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

export interface ProgramSearchViewProps {
  variant?: "page" | "embedded";
}

export function ProgramSearchView({ variant = "page" }: ProgramSearchViewProps) {
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
  const { t } = useTranslation();
  
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
  const showBackButton = variant === "page";
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

  // Load filter options
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const { data: programs } = await supabase
        .from("programs")
        .select("level, discipline")
        // Keep programs even if the active flag is missing so filters remain complete.
        .or("active.eq.true,active.is.null");

      if (programs) {
        setLevels(PROGRAM_LEVELS);
        setDisciplines([...new Set(programs.map((p) => p.discipline))].sort());
      }
    } catch (error) {
      console.error("Error loading filters:", error);
    }
  };

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      let uniQuery = supabase
        .from("universities")
        .select("*")
        // Include universities where the active flag is missing to avoid hiding partners.
        .or("active.eq.true,active.is.null");
      if (searchTerm) uniQuery = uniQuery.ilike("name", `%${searchTerm}%`);
      if (selectedCountry !== "all") uniQuery = uniQuery.eq("country", selectedCountry);

      const { data: universitiesData, error: uniError } = await uniQuery;
      if (uniError) throw uniError;
      if (!universitiesData?.length) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Deduplicate universities by name (case-insensitive) to prevent duplicates
      const seenNames = new Set<string>();
      const universities = universitiesData.filter((uni) => {
        const normalizedName = uni.name.toLowerCase().trim();
        if (seenNames.has(normalizedName)) {
          return false;
        }
        seenNames.add(normalizedName);
        return true;
      });

      const ids = universities.map((u) => u.id);
      let progQuery = supabase
        .from("programs")
        .select("*")
        .in("university_id", ids)
        // Keep programs even if the active flag is null to align with university visibility.
        .or("active.eq.true,active.is.null");
      if (selectedLevel !== "all") progQuery = progQuery.eq("level", selectedLevel);
      if (selectedDiscipline !== "all") progQuery = progQuery.eq("discipline", selectedDiscipline);
      if (maxFee) progQuery = progQuery.lte("tuition_amount", parseFloat(maxFee));

      const { data: programs } = await progQuery;
      const { data: scholarships } = await supabase
        .from("scholarships")
        .select("*")
        .in("university_id", ids)
        .eq("active", true);

      const merged: SearchResult[] = universities
        .map((uni) => ({
          university: uni,
          programs: programs?.filter((p) => p.university_id === uni.id) || [],
          scholarships: scholarships?.filter((s) => s.university_id === uni.id) || [],
        }))
        .filter(
          (r) =>
            r.programs.length > 0 &&
            (!onlyWithScholarships || r.scholarships.length > 0)
        );

      setResults(merged);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCountry, selectedLevel, selectedDiscipline, maxFee, onlyWithScholarships]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  return (
    <div className={containerClasses}>
      {showSEO && (
        <SEO
          title="Search Universities - UniDoxia"
          description="Find and compare universities from around the world. Filter by country, program, and more to discover the perfect institution for your study abroad journey."
          keywords="university search, find universities, study abroad programs, international colleges, student recruitment, find a university"
        />
      )}
      <div className={contentWrapperClasses}>
        {showBackButton && (
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
          <div className="relative">
              <TabsList className="w-full h-auto flex-nowrap justify-start gap-3 md:gap-4 md:justify-center px-4 sm:px-6 py-2 rounded-2xl bg-card/90 border border-border shadow-lg scroll-smooth snap-x snap-mandatory">
                {translatedTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className={TAB_TRIGGER_STYLES}>
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
            </TabsList>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background via-background/70 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/70 to-transparent"
            />
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
                      <Label>{t("pages.universitySearch.filters.fields.universityName.label")}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder={t("pages.universitySearch.filters.fields.universityName.placeholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
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
                    : t("pages.universitySearch.results.found", { count: results.length })}
              </h2>

              {loading ? (
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
                                <div key={p.id} className="p-3 rounded-md bg-muted/50 space-y-2">
                                  <p className="font-medium text-sm">{p.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline">{p.level}</Badge>
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" /> {p.tuition_amount.toLocaleString()}{" "}
                                      {p.tuition_currency}
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

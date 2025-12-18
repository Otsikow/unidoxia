import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingState } from "@/components/LoadingState";
import { ScholarshipFilters } from "@/components/scholarships/ScholarshipFilters";
import { ScholarshipCard } from "@/components/scholarships/ScholarshipCard";
import { ScholarshipDetailDialog } from "@/components/scholarships/ScholarshipDetailDialog";
import { ScholarshipShareDialog } from "@/components/scholarships/ScholarshipShareDialog";
import { ScholarshipAIFinder } from "@/components/scholarships/ScholarshipAIFinder";
import { useScholarshipSearch } from "@/hooks/useScholarshipSearch";
import type {
  ScholarshipSearchFilters,
  ScholarshipSearchResult,
  ScholarshipMatchProfile,
} from "@/types/scholarship";
import {
  FALLBACK_SCHOLARSHIPS,
  SCHOLARSHIP_COUNTRIES,
  SCHOLARSHIP_FUNDING_TYPES,
  SCHOLARSHIP_LEVELS,
  SCHOLARSHIP_FIELDS,
  SCHOLARSHIP_ELIGIBILITY_TAGS,
} from "@/data/scholarships";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  Sparkles,
  Search,
  Bookmark,
  Filter,
  Bell,
  CalendarDays,
  Brain,
  Zap,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

const DEFAULT_FILTERS: ScholarshipSearchFilters = {
  countries: [],
  levels: [],
  fundingTypes: [],
  deadline: "all",
  fieldsOfStudy: [],
  eligibilityTags: [],
};

const STORAGE_KEY = "unidoxia-saved-scholarships";
const ALERTS_STORAGE_KEY = "unidoxia-scholarship-alerts-enabled";

const detectProfileTags = (saved: ScholarshipSearchResult[]): string[] => {
  const tagSet = new Set<string>();
  saved.forEach((scholarship) => {
    (scholarship.tags ?? []).forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet);
};

const normalizeScholarship = (
  scholarship: ScholarshipSearchResult,
): ScholarshipSearchResult => ({
  ...scholarship,
  tags: Array.isArray(scholarship.tags) ? scholarship.tags : [],
  matchReasons: Array.isArray(scholarship.matchReasons)
    ? scholarship.matchReasons
    : [],
});

const sanitizeSavedScholarships = (
  value: unknown,
): Record<string, ScholarshipSearchResult> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = value as Record<string, unknown>;
  const sanitized: Record<string, ScholarshipSearchResult> = {};

  Object.entries(entries).forEach(([id, entry]) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const candidate = entry as ScholarshipSearchResult;
    if (typeof candidate.id !== "string") {
      return;
    }

    sanitized[id] = normalizeScholarship(candidate);
  });

  return sanitized;
};

const inferFiltersFromPrompt = (
  prompt: string,
): Partial<ScholarshipSearchFilters> => {
  const normalized = prompt.toLowerCase();
  const countries = SCHOLARSHIP_COUNTRIES.filter((country) =>
    normalized.includes(country.toLowerCase()),
  );

  const levels: string[] = [];
  if (/(undergraduate|bachelor|bsc)/.test(normalized)) levels.push("Undergraduate");
  if (/(masters|graduate|msc|mba)/.test(normalized)) levels.push("Masters");
  if (/(phd|doctoral)/.test(normalized)) levels.push("PhD");

  const fundingTypes: string[] = [];
  if (/fully funded|full[-\s]?funding/.test(normalized)) fundingTypes.push("Full");
  if (/partial/.test(normalized)) fundingTypes.push("Partial");

  const eligibilityTags: string[] = [];
  if (/women/.test(normalized)) eligibilityTags.push("Women-only");
  if (/(africa|asian|caribbean|latin america)/.test(normalized))
    eligibilityTags.push("Region-specific");
  if (/no ielts|ielts waiver|without ielts/.test(normalized))
    eligibilityTags.push("No IELTS");
  if (/research/.test(normalized)) eligibilityTags.push("Research");
  if (/stem|technology|engineering|science/.test(normalized))
    eligibilityTags.push("STEM");
  if (/business|mba|entrepreneur/.test(normalized))
    eligibilityTags.push("Business");

  const fields = SCHOLARSHIP_FIELDS.filter((field) =>
    normalized.includes(field.toLowerCase()),
  );

  return {
    countries,
    levels,
    fundingTypes,
    fieldsOfStudy: fields,
    eligibilityTags,
  };
};

const ScholarshipsPage = () => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] =
    useState<ScholarshipSearchFilters>(DEFAULT_FILTERS);

  const [selectedScholarship, setSelectedScholarship] =
    useState<ScholarshipSearchResult | null>(null);

  const [savedScholarshipIds, setSavedScholarshipIds] = useState<string[]>([]);
  const [savedRegistry, setSavedRegistry] = useState<
    Record<string, ScholarshipSearchResult>
  >({});

  const [aiPrompt, setAiPrompt] = useState("");
  const [matchProfile, setMatchProfile] = useState<ScholarshipMatchProfile | null>(null);

  // BOTH FEATURES ENABLED
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] =
    useState<ScholarshipSearchResult | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  const savedScholarships = useMemo(
    () => Object.values(savedRegistry),
    [savedRegistry],
  );
  const profileTags = useMemo(
    () => detectProfileTags(savedScholarships),
    [savedScholarships],
  );

  const { toast } = useToast();

  const { results, recommendations, stats, loading, error, refetch } =
    useScholarshipSearch({
      query: debouncedQuery,
      filters,
      profileTags,
      matchProfile,
    });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeSavedScholarships(parsed);
        setSavedRegistry(sanitized);
        setSavedScholarshipIds(Object.keys(sanitized));
        if (Object.keys(sanitized).length !== Object.keys(parsed || {}).length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        }
      } catch (e) {
        console.error("Error loading saved scholarships:", e);
      }
    }

    const alertsStored = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (alertsStored === "true") {
      setAlertsEnabled(true);
    }
  }, []);

  const toggleSave = (scholarship: ScholarshipSearchResult) => {
    const normalizedScholarship = normalizeScholarship(scholarship);
    setSavedRegistry((prev) => {
      const newRegistry = { ...prev };
      if (newRegistry[normalizedScholarship.id]) {
        delete newRegistry[normalizedScholarship.id];
        setSavedScholarshipIds((ids) =>
          ids.filter((id) => id !== normalizedScholarship.id),
        );
        toast({
          title: "Removed from saved",
          description: `${normalizedScholarship.title} removed from your saved scholarships.`,
        });
      } else {
        newRegistry[normalizedScholarship.id] = normalizedScholarship;
        setSavedScholarshipIds((ids) => [...ids, normalizedScholarship.id]);
        toast({
          title: "Saved!",
          description: `${normalizedScholarship.title} added to your saved scholarships.`,
        });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRegistry));
      return newRegistry;
    });
  };

  const toggleAlerts = () => {
    const newVal = !alertsEnabled;
    setAlertsEnabled(newVal);
    localStorage.setItem(ALERTS_STORAGE_KEY, String(newVal));
    toast({
      title: newVal ? "Alerts enabled" : "Alerts disabled",
      description: newVal
        ? "You'll receive notifications for new matching scholarships."
        : "You won't receive scholarship alerts.",
    });
  };

  const handleAiPromptSubmit = () => {
    if (!aiPrompt.trim()) return;
    const inferred = inferFiltersFromPrompt(aiPrompt);
    setFilters((prev) => ({ ...prev, ...inferred }));
    setQuery(aiPrompt);
    toast({
      title: "AI filters applied",
      description: "Searching with AI-enhanced filters.",
    });
  };

  const handleShare = (scholarship: ScholarshipSearchResult) => {
    setShareTarget(scholarship);
    setShareDialogOpen(true);
  };

  const applyProfileFilters = (profile: ScholarshipMatchProfile) => {
    setMatchProfile(profile);
    setFilters((prev) => ({
      ...prev,
      countries: profile.country ? [profile.country] : prev.countries,
      levels: profile.programLevel ? [profile.programLevel] : prev.levels,
      fundingTypes:
        profile.fundingNeed && profile.fundingNeed !== "any"
          ? [profile.fundingNeed === "full" ? "Full" : "Partial"]
          : prev.fundingTypes,
      fieldsOfStudy: profile.fieldOfStudy ? [profile.fieldOfStudy] : prev.fieldsOfStudy,
      deadline:
        profile.deadlinePreference === "flexible"
          ? "flexible"
          : profile.deadlinePreference
            ? "upcoming"
            : prev.deadline,
    }));

    const aiQueryParts = [
      profile.fieldOfStudy,
      profile.programLevel,
      profile.country,
      profile.fundingNeed === "full" ? "fully funded" : undefined,
    ].filter(Boolean);
    if (aiQueryParts.length) {
      const nextQuery = aiQueryParts.join(" ");
      setQuery(nextQuery);
      setAiPrompt(nextQuery);
    }

    toast({
      title: "AI match profile updated",
      description: "Showing scholarships tailored to your background.",
    });
  };

  const allResults = useMemo(() => {
    if (loading) return [];
    const base = error
      ? FALLBACK_SCHOLARSHIPS
      : results.length > 0
        ? results
        : FALLBACK_SCHOLARSHIPS;

    return base.map(normalizeScholarship);
  }, [results, loading, error]);

  const topProfileMatches = useMemo(() => {
    if (!matchProfile) return [];
    return allResults
      .filter((scholarship) => (scholarship.profileMatchScore ?? 0) >= 60)
      .slice(0, 3);
  }, [allResults, matchProfile]);

  return (
    <>
      <SEO 
        title="Find Scholarships - UniDoxia"
        description="Discover scholarships and funding opportunities worldwide. Search by country, level, and eligibility to find the perfect scholarship for your international education journey."
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Find Scholarships</h1>
            <p className="text-muted-foreground">
              Discover funding opportunities for your international education journey
            </p>
          </div>

          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <Button
              variant={alertsEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleAlerts}
            >
              <Bell className="mr-2 h-4 w-4" />
              {alertsEnabled ? "Alerts On" : "Enable Alerts"}
            </Button>
            <Badge variant="outline">
              <Bookmark className="mr-1 h-3 w-3" />
              {savedScholarshipIds.length} Saved
            </Badge>
            {stats && (
              <Badge variant="secondary">
                <CalendarDays className="mr-1 h-3 w-3" />
                {stats.closingSoon} Closing Soon
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <aside className="lg:col-span-1">
              <ScholarshipFilters
                filters={filters}
                onFiltersChange={setFilters}
                countryOptions={SCHOLARSHIP_COUNTRIES}
                levelOptions={SCHOLARSHIP_LEVELS}
                fundingTypeOptions={SCHOLARSHIP_FUNDING_TYPES}
                fieldOptions={SCHOLARSHIP_FIELDS}
                eligibilityOptions={SCHOLARSHIP_ELIGIBILITY_TAGS}
              />
            </aside>

            <main className="lg:col-span-3">
              <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scholarships..."
                  value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-medium">AI-Powered Search</span>
                  </div>
                  <Textarea
                    placeholder="Describe what you're looking for... (e.g., 'Full scholarships for African women studying engineering in Canada')"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAiPromptSubmit} size="sm">
                    Apply AI Filters
                  </Button>
                </div>

                <ScholarshipAIFinder
                  onApplyProfile={applyProfileFilters}
                  activeProfile={matchProfile}
                  loading={loading}
                />
              </div>

              {loading && <LoadingState message="Searching scholarships..." />}

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {matchProfile && (
                <div className="mb-6 rounded-2xl border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                        <Brain className="h-4 w-4" /> Daily AI Matches
                      </p>
                      <h3 className="text-2xl font-bold">Personalized opportunities</h3>
                      <p className="text-sm text-muted-foreground">
                        Based on your GPA, goals, and experience, Zoe monitors scholarships every day.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeof matchProfile.gpa === "number" && (
                        <Badge variant="secondary">GPA {matchProfile.gpa.toFixed(2)}</Badge>
                      )}
                      {matchProfile.country && <Badge variant="outline">{matchProfile.country}</Badge>}
                      {matchProfile.programLevel && <Badge variant="outline">{matchProfile.programLevel}</Badge>}
                      {matchProfile.fundingNeed && matchProfile.fundingNeed !== "any" && (
                        <Badge variant="secondary">{matchProfile.fundingNeed === "full" ? "Full funding" : "Partial funding"}</Badge>
                      )}
                    </div>
                  </div>

                  {topProfileMatches.length ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {topProfileMatches.map((match) => (
                        <div key={match.id} className="rounded-xl border bg-background/60 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold leading-snug line-clamp-2">{match.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {match.profileMatchReasons?.[0] ?? match.matchReasons?.[0] ?? "High compatibility"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="gap-1">
                              <Zap className="h-3.5 w-3.5" />
                              {match.profileMatchScore ?? match.aiScore}%
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3"
                            onClick={() => setSelectedScholarship(match)}
                          >
                            View details
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Zoe is learning your preferences. Save scholarships you like and check back daily for refreshed matches.
                    </p>
                  )}
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="mb-6 bg-primary/5 rounded-lg p-4 border border-primary/10">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Recommended for You
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendations.map((scholarship) => (
                      <ScholarshipCard
                        key={scholarship.id}
                        scholarship={scholarship}
                        isSaved={savedScholarshipIds.includes(scholarship.id)}
                        onToggleSave={toggleSave}
                        onViewDetails={() => setSelectedScholarship(scholarship)}
                        onShare={() => handleShare(scholarship)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {allResults.length} Scholarships Found
                  </h2>
                  {stats && (
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter Results
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {allResults.map((scholarship) => (
                    <ScholarshipCard
                      key={scholarship.id}
                      scholarship={scholarship}
                      isSaved={savedScholarshipIds.includes(scholarship.id)}
                      onToggleSave={toggleSave}
                      onViewDetails={() => setSelectedScholarship(scholarship)}
                      onShare={() => handleShare(scholarship)}
                    />
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {selectedScholarship && (
        <ScholarshipDetailDialog
          scholarship={selectedScholarship}
          open={!!selectedScholarship}
          onOpenChange={(open) => !open && setSelectedScholarship(null)}
          isSaved={savedScholarshipIds.includes(selectedScholarship.id)}
          onToggleSave={toggleSave}
        />
      )}

      {shareTarget && (
        <ScholarshipShareDialog
          scholarship={shareTarget}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}
    </>
  );
};

export default ScholarshipsPage;

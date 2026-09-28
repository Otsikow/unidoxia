import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getPlaceholderBanner } from "@/lib/featuredUniversityBanners";
import featuredPortsmouth from "@/assets/featured-portsmouth.jpg";
import featuredStJohns from "@/assets/featured-st-johns-newfoundland.jpg";
import featuredToowoomba from "@/assets/featured-toowoomba.jpg";
import featuredBremen from "@/assets/featured-bremen.jpg";

interface FeaturedUniversity {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  logo_url: string | null;
  website: string | null;
  ranking: Record<string, unknown> | null;
  featured: boolean | null;
  featured_priority: number | null;
  featured_summary: string | null;
  featured_highlight: string | null;
  featured_image_url?: string | null;
}

const FALLBACK_UNIVERSITIES: FeaturedUniversity[] = [
  {
    id: "fallback-portsmouth",
    name: "University of Portsmouth",
    country: "United Kingdom",
    city: "Portsmouth",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/en/thumb/6/6e/University_of_Portsmouth_coat_of_arms.svg/800px-University_of_Portsmouth_coat_of_arms.svg.png",
    website: "https://www.port.ac.uk",
    ranking: null,
    featured: true,
    featured_priority: 0,
    featured_summary:
      "Explore the institution's published courses, entry requirements and international student information.",
    featured_highlight: "Confirm current course availability and requirements on the official website",
    featured_image_url:
      featuredPortsmouth,
  },
  {
    id: "fallback-memorial",
    name: "Memorial University of Newfoundland",
    country: "Canada",
    city: "St. John’s",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Memorial_University_of_Newfoundland_coat_of_arms.svg/1024px-Memorial_University_of_Newfoundland_coat_of_arms.svg.png",
    website: "https://www.mun.ca",
    ranking: null,
    featured: true,
    featured_priority: 1,
    featured_summary:
      "Explore the institution's published courses, entry requirements and international student information.",
    featured_highlight: "Confirm current fees and funding information on the official website",
    featured_image_url:
      featuredStJohns,
  },
  {
    id: "fallback-southern-queensland",
    name: "University of Southern Queensland",
    country: "Australia",
    city: "Toowoomba",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/University_of_Southern_Queensland_coat_of_arms.svg/800px-University_of_Southern_Queensland_coat_of_arms.svg.png",
    website: "https://www.usq.edu.au",
    ranking: null,
    featured: true,
    featured_priority: 2,
    featured_summary:
      "Explore the institution's published courses, entry requirements and international student information.",
    featured_highlight: "Confirm current study modes and entry requirements on the official website",
    featured_image_url:
      featuredToowoomba,
  },
  {
    id: "fallback-bremen",
    name: "University of Bremen",
    country: "Germany",
    city: "Bremen",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Universit%C3%A4t_Bremen_Logo.svg/512px-Universit%C3%A4t_Bremen_Logo.svg.png",
    website: "https://www.uni-bremen.de/en",
    ranking: null,
    featured: true,
    featured_priority: 3,
    featured_summary:
      "Explore the institution's published courses, entry requirements and international student information.",
    featured_highlight: "Confirm current language, fee and programme information on the official website",
    featured_image_url:
      featuredBremen,
  },
  {
    id: "fallback-portland-state",
    name: "Portland State University",
    country: "United States",
    city: "Portland, OR",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Portland_State_University_logo.svg/512px-Portland_State_University_logo.svg.png",
    website: "https://www.pdx.edu",
    ranking: null,
    featured: true,
    featured_priority: 4,
    featured_summary:
      "Explore the institution's published courses, entry requirements and international student information.",
    featured_highlight: "Confirm current transfer and programme requirements on the official website",
    featured_image_url:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80",
  },
];

export function FeaturedUniversitiesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["featured-universities"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_featured_universities");

      if (error) {
        console.error("Error fetching public featured universities:", error);
        throw error;
      }

      return (data as FeaturedUniversity[]) ?? [];
    },
  });

  const featuredUniversities = useMemo(() => data ?? [], [data]);
  const hasError = Boolean(error);

  const universitiesToDisplay = useMemo(() => {
    if (hasError) {
      return FALLBACK_UNIVERSITIES;
    }

    if (featuredUniversities.length >= 4) {
      return featuredUniversities;
    }

    const needed = 4 - featuredUniversities.length;
    return [
      ...featuredUniversities,
      ...FALLBACK_UNIVERSITIES.slice(0, Math.max(needed, 0)),
    ];
  }, [featuredUniversities, hasError]);

  const isUsingFallback = hasError || featuredUniversities.length < 4;

  const fallbackSummary = "Explore the institution's published programmes and international student information.";
  const fallbackNotice = hasError
    ? "We're showing highlighted institutions while we reconnect to the featured list."
    : "We're showing highlighted institutions while our featured list updates.";
  const topPickLabel = "Featured";
  const priorityLabel = (position: number) => `Display position ${position}`;
  const visitSiteLabel = t("pages.index.featuredUniversities.actions.visitSite");
  const recommendedHighlight = "Confirm current requirements on the official university website";
  const networkLabel = "Universities to Explore";
  const networkSummary = `${universitiesToDisplay.length} institutions currently highlighted for exploration`;
  const scrollLeftLabel = t("pages.index.featuredUniversities.actions.scrollLeft");
  const scrollRightLabel = t("pages.index.featuredUniversities.actions.scrollRight");
  const sectionHeading = "Featured Universities";
  const sectionDescription = "Explore universities and study opportunities. Availability, entry requirements and application routes vary by institution.";
  const partnerCtaHeading = "Discuss a recruitment partnership";
  const partnerCtaDescription = "A listing does not imply endorsement or a formal partnership. Institutions can contact UniDoxia to discuss a separate recruitment agreement.";
  const partnerCtaAction = "Discuss a partnership";

  const formatWebsiteUrl = (website: string | null) => {
    if (!website) return null;
    const trimmed = website.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const scrollBy = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.9;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-0 shadow-lg overflow-hidden">
              {/* Banner skeleton */}
              <Skeleton className="h-48 w-full rounded-none" />
              <CardContent className="space-y-4 pt-12 pb-6 relative">
                {/* Logo skeleton */}
                <div className="absolute -top-8 left-6">
                  <Skeleton className="h-16 w-16 rounded-xl" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {isUsingFallback && (
          <Card className="border-muted/40 bg-muted/10">
            <CardContent className="p-4 text-sm text-muted-foreground">{fallbackNotice}</CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{networkLabel}</p>
            <p className="text-sm text-muted-foreground">{networkSummary}</p>
          </div>
          {universitiesToDisplay.length > 3 && (
            <div className="hidden gap-3 md:flex">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                onClick={() => scrollBy("left")}
                aria-label={scrollLeftLabel}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                onClick={() => scrollBy("right")}
                aria-label={scrollRightLabel}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        <div ref={scrollRef} className="grid gap-6 max-md:overflow-x-auto max-md:pb-2 sm:grid-cols-2 xl:grid-cols-3">
          {universitiesToDisplay.map((university, index) => {
            const formattedWebsite = formatWebsiteUrl(university.website);
            const bannerImage = getPlaceholderBanner(university.name, university.country, university.city);

            return (
              <Card
                key={university.id}
                className={cn(
                  "group relative h-full overflow-hidden border-0 bg-card/90 shadow-lg transition-all duration-300",
                  "hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10"
                )}
              >
                {/* Banner Section */}
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-background/30 p-2 sm:p-2.5">
                  {/* Always show a banner image - either custom or professional placeholder */}
                  <img
                    src={university.featured_image_url || bannerImage}
                    alt={`${university.name} campus`}
                    className="absolute inset-2 !h-[calc(100%-1rem)] !w-[calc(100%-1rem)] rounded-lg object-cover transition-transform duration-500 group-hover:scale-105 sm:inset-2.5 sm:!h-[calc(100%-1.25rem)] sm:!w-[calc(100%-1.25rem)]"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = PLACEHOLDER_BANNERS[0];
                    }}
                  />
                  {/* Logo overlay - kept inside the banner so it never obscures the name */}
                  <div className="absolute bottom-4 left-4 z-10">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border-4 border-background bg-white p-2 shadow-lg">
                      <Building2 aria-hidden="true" className="h-8 w-8 text-primary" />
                      {university.logo_url && (
                        <img
                          src={university.logo_url}
                          alt={`${university.name} logo`}
                          className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] bg-white object-contain"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Top pick badge */}
                  {index < 3 && (
                    <Badge className="absolute right-4 top-4 border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                      <Star className="mr-1 h-3 w-3 fill-current" /> {topPickLabel}
                    </Badge>
                  )}

                  {/* Priority badge */}
                  {typeof university.featured_priority === "number" && (
                    <Badge 
                      variant="secondary" 
                      className="absolute left-4 top-4 border-0 bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm"
                    >
                      {priorityLabel(university.featured_priority + 1)}
                    </Badge>
                  )}
                </div>

                {/* Content Section */}
                <CardContent className="space-y-4 pb-6 pt-6">
                  {/* University name and location */}
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold leading-tight text-foreground line-clamp-2">
                      {university.name}
                    </h3>
                    {(university.city || university.country) && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        {[university.city, university.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {university.featured_summary || university.featured_highlight || fallbackSummary}
                  </p>

                  {/* Rankings/highlights */}
                  {university.ranking && typeof university.ranking === "object" && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(university.ranking)
                        .filter(([, value]) => value !== null && value !== "")
                        .slice(0, 2)
                        .map(([label, value]) => (
                          <Badge 
                            key={label} 
                            variant="secondary" 
                            className="bg-primary/10 text-primary border-0 text-xs font-medium"
                          >
                            {label}: {String(value)}
                          </Badge>
                        ))}
                    </div>
                  )}

                  {/* Highlight tag */}
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-muted-foreground font-medium">
                      {university.featured_highlight || recommendedHighlight}
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="pt-2">
                    {formattedWebsite ? (
                      <Button 
                        asChild 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <a href={formattedWebsite} target="_blank" rel="noopener noreferrer">
                          {visitSiteLabel}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 opacity-50 cursor-not-allowed" 
                        disabled
                      >
                        {visitSiteLabel}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">{partnerCtaHeading}</p>
              <p className="text-muted-foreground max-w-lg">{partnerCtaDescription}</p>
            </div>
            <Button asChild size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow whitespace-nowrap">
              <Link to="/partnership">
                {partnerCtaAction}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
        </div>
      </div>
    );
  };

  return (
    <section className="relative py-24" aria-labelledby="featured-universities-heading">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="container mx-auto px-4 space-y-12">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <GraduationCap className="h-4 w-4" />
            <span>Universities to Explore</span>
          </div>
          <h2 id="featured-universities-heading" className="text-4xl font-bold tracking-tight md:text-5xl">
            {sectionHeading}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{sectionDescription}</p>
        </div>
        {renderContent()}
      </div>
    </section>
  );
}

export default FeaturedUniversitiesSection;

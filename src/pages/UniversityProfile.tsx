import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  MapPin,
  Globe,
  DollarSign,
  Clock,
  FileText,
  Award,
  BookOpen,
  CheckCircle2,
  Mail,
  Phone,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  parseUniversityProfileDetails,
  emptyUniversityProfileDetails,
  type UniversityProfileDetails,
} from "@/lib/universityProfile";
import { formatCourseDuration, formatCourseFee } from "@/lib/marketplacePresentation";
import { SEO } from "@/components/SEO";
import { logAnalyticsEvent } from "@/lib/analytics";
import BackButton from "@/components/BackButton";

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

interface University {
  id: string;
  name: string;
  country: string;
  city: string | null;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  ranking: any;
  featured_image_url: string | null;
  submission_config_json: unknown;
  slug?: string;
  listing_status?: string;
  verification_status?: string;
  partnership_tier?: string;
  last_source_checked_at?: string | null;
}

interface Program {
  id: string;
  name: string;
  level: string;
  discipline: string;
  tuition_amount: number | null;
  tuition_currency: string | null;
  duration_months: number | null;
  description: string | null;
  entry_requirements: any;
  ielts_overall: number | null;
  toefl_overall: number | null;
  intake_months: number[];
  application_details?: {
    routing?: string;
    pgwp?: { status?: "eligible" | "ineligible" | "unknown"; cipCode?: string | null; sourceUrl?: string };
    nursingCollaboration?: string | null;
  } | null;
  program_intakes?: Array<{
    id: string;
    intake_year: number;
    intake_month: number;
    status: "available" | "recruitable" | "waitlisting" | "closed" | "provisional" | "unknown";
    application_deadline?: string | null;
  }>;
}

interface Scholarship {
  id: string;
  name: string;
  amount_cents: number | null;
  currency: string;
  coverage_type: string | null;
}

// Helper: pick image for university
const getUniversityImage = (universityName: string): string => {
  const name = universityName.toLowerCase();

  if (name.includes("oxford")) return oxfordImg;
  if (name.includes("harvard")) return harvardImg;
  if (name.includes("mit") || name.includes("massachusetts institute")) return mitImg;
  if (name.includes("cambridge")) return cambridgeImg;
  if (name.includes("stanford")) return stanfordImg;
  if (name.includes("toronto")) return torontoImg;
  if (name.includes("melbourne")) return melbourneImg;
  if (name.includes("yale")) return yaleImg;
  if (name.includes("princeton")) return princetonImg;
  if (name.includes("ucl") || name.includes("university college london")) return uclImg;
  if (name.includes("imperial")) return imperialImg;
  if (name.includes("edinburgh")) return edinburghImg;
  if (name.includes("berkeley") || name.includes("california")) return defaultUniversityImg;

  return defaultUniversityImg;
};

// Helper: get month name
const getMonthName = (month: number): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[month - 1] || "";
};

const parseEntryRequirements = (requirements: Program["entry_requirements"]): string[] => {
  if (!requirements) return [];
  if (Array.isArray(requirements)) return requirements.filter(Boolean).map(String);
  if (typeof requirements === "string") {
    return requirements
      .split(/\n|,/)
      .map((req) => req.trim())
      .filter(Boolean);
  }
  return [];
};

const publicApplicationRouting = (config: unknown): string | null => {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const value = (config as Record<string, unknown>).applicationRouting;
  return typeof value === "string" ? value : null;
};

const intakeLabel = (intake: NonNullable<Program["program_intakes"]>[number]) =>
  `${getMonthName(intake.intake_month)} ${intake.intake_year}`;

const intakeStatusClasses: Record<string, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  recruitable: "border-emerald-200 bg-emerald-50 text-emerald-800",
  waitlisting: "border-amber-200 bg-amber-50 text-amber-800",
  closed: "border-red-200 bg-red-50 text-red-800",
  provisional: "border-blue-200 bg-blue-50 text-blue-800",
  unknown: "border-border bg-muted text-muted-foreground",
};

export default function UniversityProfile() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState<University | null>(null);
  const [profileDetails, setProfileDetails] = useState<UniversityProfileDetails>(
    emptyUniversityProfileDetails,
  );
  const [programs, setPrograms] = useState<Program[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [programSearch, setProgramSearch] = useState(searchParams.get("q") || "");
  const [programPage, setProgramPage] = useState(1);
  const [programTotal, setProgramTotal] = useState(0);
  const trackedUniversityId = useRef<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const selectedProgramRequirements = selectedProgram
    ? parseEntryRequirements(selectedProgram.entry_requirements)
    : [];
  
  // Check if user is an agent/staff/admin to determine the correct apply URL
  const isAgentOrStaff = profile?.role === 'agent' || profile?.role === 'staff' || profile?.role === 'admin';
  
  // Get the correct apply URL based on user role
  const getApplyUrl = (programId: string) => {
    if (isAgentOrStaff) {
      // Agents need to select a student first, so redirect to dashboard applications
      return `/dashboard/applications/new?program=${programId}`;
    }
    return `/student/applications/new?program=${programId}`;
  };
  
  // Read initial tab from URL params (supports: about, programs, requirements, scholarships)
  const initialTab = searchParams.get("tab") || "about";
  const validTabs = ["about", "programs", "requirements", "scholarships"];
  const [activeTab, setActiveTab] = useState<string>(
    validTabs.includes(initialTab) ? initialTab : "about"
  );

  const loadUniversityData = useCallback(async (universityId: string, page = 1) => {
    setLoading(true);
    try {
      // Load university - fetch by ID to get the specific university
      const baseQuery = (supabase.from("universities") as any).select("*");
      const lookup = universityId.includes("-") && universityId.length !== 36
        ? baseQuery.eq("slug", universityId)
        : baseQuery.eq("id", universityId);
      const { data: universityData, error: uniError } = await lookup.single();

      if (uniError) throw uniError;
      setUniversity(universityData);
      if (trackedUniversityId.current !== universityData.id) {
        trackedUniversityId.current = universityData.id;
        void logAnalyticsEvent("university_profile_view", { source: "university_profile", properties: { university_id: universityData.id } });
      }
      setProfileDetails(
        parseUniversityProfileDetails(universityData?.submission_config_json ?? null),
      );
      const resolvedUniversityId = universityData.id;

      // MULTI-TENANT ISOLATION: Load programs ONLY for this specific university
      // Each university has its own unique programs - no data sharing between institutions
      // The university_id filter ensures complete data isolation
      let programsQuery = supabase
        .from("programs")
        .select("*, program_intakes(*)", { count: "exact" })
        .eq("university_id", resolvedUniversityId)
        .eq("active", true)
        .eq("catalogue_status", "active")
        .order("level")
        .order("name")
        .range((page - 1) * 24, page * 24 - 1);
      if (selectedLevel !== "all") programsQuery = programsQuery.eq("level", selectedLevel);
      if (selectedDiscipline !== "all") programsQuery = programsQuery.eq("discipline", selectedDiscipline);
      const safeProgramSearch = programSearch.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ");
      if (safeProgramSearch) programsQuery = programsQuery.or(`name.ilike.%${safeProgramSearch}%,discipline.ilike.%${safeProgramSearch}%`);
      const { data: programsData, error: progError, count: programCount } = await programsQuery;

      if (progError) throw progError;
      
      // Verification: Ensure all returned programs belong to this university
      const validatedPrograms = (programsData || []).filter(
        (program) => program.university_id === resolvedUniversityId
      );
      setPrograms(validatedPrograms as unknown as Program[]);
      setProgramTotal(programCount || 0);

      // MULTI-TENANT ISOLATION: Load scholarships ONLY for this specific university
      const { data: scholarshipsData } = await supabase
        .from("scholarships")
        .select("*")
        .eq("university_id", resolvedUniversityId)
        .eq("active", true);

      // Verification: Ensure all returned scholarships belong to this university
      const validatedScholarships = (scholarshipsData || []).filter(
        (scholarship) => scholarship.university_id === resolvedUniversityId
      );
      setScholarships(validatedScholarships);
    } catch (error) {
      console.error("Error loading university data:", error);
    } finally {
      setLoading(false);
    }
  }, [programSearch, selectedDiscipline, selectedLevel]);

  useEffect(() => {
    if (id) {
      void loadUniversityData(id, programPage);
    }
  }, [id, loadUniversityData, programPage]);

  const filteredPrograms = programs;

  const levels = [...new Set(programs.map((p) => p.level))];
  const disciplines = [...new Set(programs.map((p) => p.discipline))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">University not found</p>
              <Button asChild className="mt-4">
                <Link to="/universities">Back to Directory</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const heroImage =
    profileDetails.media.heroImageUrl ??
    university.featured_image_url ??
    getUniversityImage(university.name);
  const primaryContact = profileDetails.contacts.primary;
  const guidanceOnly = publicApplicationRouting(university.submission_config_json) === "guidance_only";
  const socialLinks: Array<{ label: string; url: string | null | undefined; icon: LucideIcon }> = [
    { label: "Website", url: university.website, icon: Globe },
    { label: "LinkedIn", url: profileDetails.social.linkedin, icon: Linkedin },
    { label: "Facebook", url: profileDetails.social.facebook, icon: Facebook },
    { label: "Instagram", url: profileDetails.social.instagram, icon: Instagram },
    { label: "YouTube", url: profileDetails.social.youtube, icon: Youtube },
  ].filter((link) => Boolean(link.url));

  return (
    <div className="min-h-screen bg-background">
      <SEO title={university.slug === "lethbridge-polytechnic" ? "Lethbridge Polytechnic Courses, Fees & International Admissions | UniDoxia" : `${university.name} - Courses and International Study | UniDoxia`} description={university.slug === "lethbridge-polytechnic" ? "Explore Lethbridge Polytechnic international courses, fees, admissions and current intakes in Lethbridge, Alberta, Canada." : (university.description || `Explore courses and international study information for ${university.name}.`)} />
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-6">
        <BackButton
          fallback="/universities"
          label={(location.state as any)?.marketplaceBack?.label || "Back to universities"}
          showHistoryMenu={false}
          variant="ghost"
          className="-ml-2 h-10 rounded-xl px-3 font-semibold text-foreground hover:bg-muted"
        />
      </div>
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="relative min-h-[24rem] overflow-hidden rounded-2xl border border-border/60 shadow-lg md:h-[28rem] md:rounded-3xl">
          <img src={heroImage} alt={university.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/45 to-background/10" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 md:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
              {/* University Logo */}
              {university.logo_url ? (
                <div className="flex h-20 w-20 md:h-24 md:w-24 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-background/90 p-3 backdrop-blur-sm shadow-lg">
                  <img
                    src={university.logo_url}
                    alt={`${university.name} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="flex-1 space-y-2">
                <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight">
                  {university.name}
                </h1>
                {profileDetails.tagline ? (
                  <p className="max-w-2xl text-lg text-white/90 drop-shadow">
                    {profileDetails.tagline}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-white/90 drop-shadow">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-3 py-1">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    {university.city && `${university.city}, `}
                    {university.country}
                  </Badge>
                  <Badge 
                    className="bg-primary/80 hover:bg-primary text-white border-primary px-3 py-1 cursor-pointer"
                    onClick={() => setActiveTab("programs")}
                  >
                    <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                    {programTotal} Courses
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {university.verification_status === "admin_verified" ? "Verified profile" : "Listed by UniDoxia"}
                  </Badge>
                  {university.partnership_tier === "partner" && <Badge className="bg-emerald-600 text-white">UniDoxia Partner</Badge>}
                  {university.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                      asChild
                    >
                      <a href={university.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                  {university.listing_status !== "claimed" && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link to={`/universities/${university.slug || university.id}/claim`}>Claim this university</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10">
        {university.listing_status !== "claimed" && (
          <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/35 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex max-w-3xl items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Independent public-information listing</p>
                <p className="text-sm leading-6 text-muted-foreground">This institutional profile has been compiled by UniDoxia using official public information and has not yet been claimed by {university.name}. It does not imply endorsement, representation or a recruitment partnership.</p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to={`/universities/${university.slug || university.id}/claim`}>Represent {university.name}? Claim this profile</Link>
            </Button>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-7">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1.5 md:grid-cols-4">
            <TabsTrigger value="about" className="min-h-10 rounded-xl">
              <BookOpen className="h-4 w-4 mr-2" />
              About
            </TabsTrigger>
            <TabsTrigger value="programs" className="min-h-10 rounded-xl">
              <GraduationCap className="h-4 w-4 mr-2" />
              Programs ({programTotal})
            </TabsTrigger>
            <TabsTrigger value="requirements" className="min-h-10 rounded-xl">
              <FileText className="h-4 w-4 mr-2" />
              Requirements
            </TabsTrigger>
            <TabsTrigger value="scholarships" className="min-h-10 rounded-xl">
              <Award className="h-4 w-4 mr-2" />
              Scholarships ({scholarships.length})
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About {university.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {university.description ? (
                  <p className="text-muted-foreground leading-relaxed">
                    {university.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No description available for this university.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {profileDetails.internationalStudents && <Card><CardHeader><CardTitle className="text-lg">International students</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{profileDetails.internationalStudents}</CardContent></Card>}
              {profileDetails.tuition && <Card><CardHeader><CardTitle className="text-lg">Tuition information</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{profileDetails.tuition}</CardContent></Card>}
              {profileDetails.accommodation && <Card><CardHeader><CardTitle className="text-lg">Accommodation</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{profileDetails.accommodation}</CardContent></Card>}
              {profileDetails.studyLevels.length > 0 && <Card><CardHeader><CardTitle className="text-lg">Study levels</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{profileDetails.studyLevels.map((level) => <Badge key={level} variant="secondary">{level}</Badge>)}</CardContent></Card>}
            </div>

            {profileDetails.sources.length > 0 && <Card><CardHeader><CardTitle className="text-lg">Information sources</CardTitle><CardDescription>Official pages used to prepare this listing.</CardDescription></CardHeader><CardContent className="space-y-2">{profileDetails.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline">{source.label || source.url}{source.checkedAt ? ` · checked ${source.checkedAt}` : ""}</a>)}</CardContent></Card>}

            {university.ranking && (
              <Card>
                <CardHeader>
                  <CardTitle>Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground">
                    {JSON.stringify(university.ranking, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Prominent Courses Card - Clearly Clickable */}
            <Card 
              className="group border-2 border-primary/20 hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10"
              onClick={() => setActiveTab("programs")}
            >
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <GraduationCap className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-3xl font-bold text-foreground">{programTotal}</h3>
                      <Badge variant="secondary" className="text-sm">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xl font-semibold text-foreground">
                      Courses Offered by {university.name}
                    </p>
                    <p className="text-sm text-muted-foreground">Browse the currently listed courses for {university.name}. Confirm current details on the official university website before applying.</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-medium group-hover:translate-x-1 transition-transform">
                    <span>View All Courses</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/>
                      <path d="m12 5 7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="group hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setActiveTab("scholarships")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Award className="h-7 w-7 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-foreground">{scholarships.length}</p>
                      <p className="text-sm text-muted-foreground">Scholarships Available</p>
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10">
                      <MapPin className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-foreground">{university.country}</p>
                      <p className="text-sm text-muted-foreground">{university.city || "Location"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {profileDetails.highlights.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>University Highlights</CardTitle>
                  <CardDescription>
                    Why students and partners choose {university.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {profileDetails.highlights.map((highlight, index) => (
                    <div
                      key={`${highlight}-${index}`}
                      className="flex items-start gap-3 rounded-lg bg-muted/50 p-4"
                    >
                      <Sparkles className="mt-1 h-4 w-4 text-primary" />
                      <p className="text-sm text-muted-foreground">{highlight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {(primaryContact || socialLinks.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Connect with {university.name}</CardTitle>
                  <CardDescription>
                    Speak directly with the admissions team or explore official channels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  {primaryContact ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                        Primary contact
                      </h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {primaryContact.name ? (
                          <p className="text-base font-medium text-foreground">
                            {primaryContact.name}
                          </p>
                        ) : null}
                        {primaryContact.title ? <p>{primaryContact.title}</p> : null}
                        {primaryContact.email ? (
                          <a
                            href={`mailto:${primaryContact.email}`}
                            className="flex items-center gap-2 hover:text-foreground"
                          >
                            <Mail className="h-4 w-4" />
                            {primaryContact.email}
                          </a>
                        ) : null}
                        {primaryContact.phone ? (
                          <a
                            href={`tel:${primaryContact.phone}`}
                            className="flex items-center gap-2 hover:text-foreground"
                          >
                            <Phone className="h-4 w-4" />
                            {primaryContact.phone}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                      Official channels
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((link) => (
                        <Button
                          key={link.label}
                          variant="secondary"
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <a href={link.url ?? "#"} target="_blank" rel="noopener noreferrer">
                            <link.icon className="h-4 w-4" /> {link.label}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Courses</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Input value={programSearch} onChange={(event) => { setProgramSearch(event.target.value); setProgramPage(1); }} placeholder="Search this university's courses" className="mb-2 w-full" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedLevel === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectedLevel("all"); setProgramPage(1); }}
                  >
                    All Levels
                  </Button>
                  {levels.map((level) => (
                    <Button
                      key={level}
                      variant={selectedLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setSelectedLevel(level); setProgramPage(1); }}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                <div className="w-full h-px bg-border my-2" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedDiscipline === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectedDiscipline("all"); setProgramPage(1); }}
                  >
                    All Disciplines
                  </Button>
                  {disciplines.map((discipline) => (
                    <Button
                      key={discipline}
                      variant={selectedDiscipline === discipline ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setSelectedDiscipline(discipline); setProgramPage(1); }}
                    >
                      {discipline}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Programs List */}
            {filteredPrograms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No courses found matching your criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPrograms.map((program) => (
                  <Card key={program.id} className="group flex h-full min-h-[31rem] flex-col overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl">
                    <div className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white p-2 shadow-sm">
                          {university ? (
                            <img
                              src={university.logo_url || getUniversityImage(university.name)}
                              alt={`${university.name} logo`}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getUniversityImage(university.name);
                              }}
                            />
                          ) : (
                            <GraduationCap className="h-7 w-7 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Course</p>
                          <p className="truncate text-sm font-medium text-muted-foreground">{university?.name}</p>
                        </div>
                      </div>
                    </div>

                    <CardHeader className="space-y-4 pb-4">
                      <CardTitle className="line-clamp-3 min-h-[4.5rem] text-xl leading-6 transition-colors group-hover:text-primary">
                        {program.name}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-2">
                        <Badge className="rounded-full px-3" variant="secondary">{program.level}</Badge>
                        <Badge className="rounded-full px-3" variant="outline">{program.discipline}</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                      {program.description && (
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{program.description}</p>
                      )}

                      <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-muted/20 px-4">
                        <div className="flex items-start gap-3 py-3.5">
                          <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tuition fee</p>
                            <p className="mt-0.5 text-sm font-semibold">
                            {formatCourseFee({
                              amount: program.tuition_amount,
                              currency: program.tuition_currency,
                            })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 py-3.5">
                          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duration</p>
                            <p className="mt-0.5 text-sm font-semibold">{formatCourseDuration(program.duration_months)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 py-3.5">
                          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intakes</p>
                            <p className="mt-0.5 text-sm font-semibold">
                              {program.intake_months?.length
                                ? program.intake_months.map(getMonthName).join(", ")
                                : "Check official course page"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {(program.ielts_overall || program.toefl_overall) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {program.ielts_overall && (
                            <Badge variant="outline">IELTS {program.ielts_overall}</Badge>
                          )}
                          {program.toefl_overall && (
                            <Badge variant="outline">TOEFL {program.toefl_overall}</Badge>
                          )}
                        </div>
                      )}
                      {program.program_intakes?.length ? (
                        <div className="flex flex-wrap gap-2" aria-label="Current intake availability">
                          {program.program_intakes.map((intake) => (
                            <Badge key={intake.id} variant="outline" className={intakeStatusClasses[intake.status] || intakeStatusClasses.unknown}>
                              {intakeLabel(intake)} · {intake.status === "available" ? "Open" : intake.status.replaceAll("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {program.application_details?.pgwp && (
                        <Badge variant="outline" className={program.application_details.pgwp.status === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : program.application_details.pgwp.status === "ineligible" ? "border-red-200 bg-red-50 text-red-800" : ""}>
                          PGWP {program.application_details.pgwp.status === "eligible" ? "eligible" : program.application_details.pgwp.status === "ineligible" ? "currently ineligible" : "status not confirmed"}{program.application_details.pgwp.cipCode ? ` · CIP ${program.application_details.pgwp.cipCode}` : ""}
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter className="mt-auto border-t border-border/60 bg-muted/10 p-5">
                      <Button className="w-full rounded-xl" size="lg" onClick={() => setSelectedProgram(program)}>
                        View course details
                      </Button>
                    </CardFooter>
                  </Card>
                  ))}
                </div>
                <Dialog open={Boolean(selectedProgram)} onOpenChange={(open) => !open && setSelectedProgram(null)}>
                  <DialogContent className="max-w-3xl">
                    {selectedProgram && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold">{selectedProgram.name}</DialogTitle>
                          <DialogDescription className="text-base">
                            {university?.name} • {university?.city}, {university?.country}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                          {selectedProgram.description && (
                            <p className="text-muted-foreground leading-relaxed">{selectedProgram.description}</p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatCourseFee({
                                  amount: selectedProgram.tuition_amount,
                                  currency: selectedProgram.tuition_currency,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatCourseDuration(selectedProgram.duration_months)}</span>
                            </div>
                            {selectedProgram.intake_months?.length > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  Intakes: {selectedProgram.intake_months.map(getMonthName).join(", ")}
                                </span>
                              </div>
                            )}
                            {(selectedProgram.ielts_overall || selectedProgram.toefl_overall) && (
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>
                                  {selectedProgram.ielts_overall && `IELTS: ${selectedProgram.ielts_overall}`}
                                  {selectedProgram.ielts_overall && selectedProgram.toefl_overall && " • "}
                                  {selectedProgram.toefl_overall && `TOEFL: ${selectedProgram.toefl_overall}`}
                                </span>
                              </div>
                            )}
                          </div>

                          {selectedProgramRequirements.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-foreground">Entry requirements</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {selectedProgramRequirements.map((requirement, index) => (
                                  <li key={index}>{requirement}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {selectedProgram.application_details?.nursingCollaboration && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                              <p className="font-semibold">Collaborative nursing pathway</p>
                              <p className="mt-1">{selectedProgram.application_details.nursingCollaboration}</p>
                            </div>
                          )}
                          <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                            <p>PGWP eligibility is determined under current Government of Canada rules and can change. Students should confirm their eligibility before enrolling.</p>
                          </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
                          <Button
                            variant="ghost"
                            className="w-full sm:w-auto"
                            onClick={() => setSelectedProgram(null)}
                          >
                            Close
                          </Button>
                          <Button asChild className="w-full sm:w-auto">
                            <Link to={guidanceOnly ? `/contact?subject=${encodeURIComponent(`Application guidance: ${selectedProgram.name} at ${university.name}`)}` : getApplyUrl(selectedProgram.id)}>{guidanceOnly ? "Get application guidance" : "Apply"}</Link>
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Admission Requirements</CardTitle>
                <CardDescription>
                  Requirements may vary by course. Please check individual course details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><h3 className="font-semibold">Academic entry</h3><p className="mt-2 text-sm text-muted-foreground">{profileDetails.entryRequirements || "Check the official course page for current academic requirements."}</p></div>
                  <div><h3 className="font-semibold">English language</h3><p className="mt-2 text-sm text-muted-foreground">{profileDetails.englishRequirements || "Check the official course page for current English-language requirements."}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Course-specific requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Course-Specific Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {programs
                    .filter((p) => p.entry_requirements)
                    .slice(0, 5)
                    .map((program) => (
                      <div key={program.id} className="p-4 rounded-lg bg-muted/50">
                        <h4 className="font-semibold mb-2">{program.name}</h4>
                        <div className="text-sm text-muted-foreground">
                          {typeof program.entry_requirements === 'string' ? (
                            <p>{program.entry_requirements}</p>
                          ) : (
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(program.entry_requirements, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  {programs.filter((p) => p.entry_requirements).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Specific entry requirements will be provided during the application process.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scholarships Tab */}
          <TabsContent value="scholarships" className="space-y-6">
            {scholarships.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No scholarships currently available for this university.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later or contact the university directly for scholarship opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scholarships.map((scholarship) => (
                  <Card key={scholarship.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Award className="h-6 w-6 text-primary mt-1" />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{scholarship.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {scholarship.amount_cents ? (
                              <span className="text-lg font-semibold text-primary">
                                {(scholarship.amount_cents / 100).toLocaleString()} {scholarship.currency}
                              </span>
                            ) : (
                              <span className="text-sm">Amount varies</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {scholarship.coverage_type && (
                        <p className="text-sm text-muted-foreground capitalize">
                          Coverage: {scholarship.coverage_type.replace(/_/g, " ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {programTotal > 24 && <div className="flex items-center justify-center gap-3 pt-4"><Button variant="outline" disabled={programPage === 1} onClick={() => setProgramPage((page) => page - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {programPage} of {Math.ceil(programTotal / 24)}</span><Button variant="outline" disabled={programPage >= Math.ceil(programTotal / 24)} onClick={() => setProgramPage((page) => page + 1)}>Next</Button></div>}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

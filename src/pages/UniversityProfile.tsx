import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/BackButton";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  parseUniversityProfileDetails,
  emptyUniversityProfileDetails,
  type UniversityProfileDetails,
} from "@/lib/universityProfile";

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
}

interface Program {
  id: string;
  name: string;
  level: string;
  discipline: string;
  tuition_amount: number;
  tuition_currency: string;
  duration_months: number;
  description: string | null;
  entry_requirements: any;
  ielts_overall: number | null;
  toefl_overall: number | null;
  intake_months: number[];
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

export default function UniversityProfile() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState<University | null>(null);
  const [profileDetails, setProfileDetails] = useState<UniversityProfileDetails>(
    emptyUniversityProfileDetails,
  );
  const [programs, setPrograms] = useState<Program[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  
  // Read initial tab from URL params (supports: about, programs, requirements, scholarships)
  const initialTab = searchParams.get("tab") || "about";
  const validTabs = ["about", "programs", "requirements", "scholarships"];
  const [activeTab, setActiveTab] = useState<string>(
    validTabs.includes(initialTab) ? initialTab : "about"
  );

  useEffect(() => {
    if (id) {
      loadUniversityData(id);
    }
  }, [id]);

  const loadUniversityData = async (universityId: string) => {
    setLoading(true);
    try {
      // Load university - fetch by ID to get the specific university
      const { data: universityData, error: uniError } = await supabase
        .from("universities")
        .select("*")
        .eq("id", universityId)
        .single();

      if (uniError) throw uniError;
      setUniversity(universityData);
      setProfileDetails(
        parseUniversityProfileDetails(universityData?.submission_config_json ?? null),
      );

      // MULTI-TENANT ISOLATION: Load programs ONLY for this specific university
      // Each university has its own unique programs - no data sharing between institutions
      // The university_id filter ensures complete data isolation
      const { data: programsData, error: progError } = await supabase
        .from("programs")
        .select("*")
        .eq("university_id", universityId) // Critical: Only programs belonging to THIS university
        .eq("active", true)
        .order("level")
        .order("name");

      if (progError) throw progError;
      
      // Verification: Ensure all returned programs belong to this university
      const validatedPrograms = (programsData || []).filter(
        (program) => program.university_id === universityId
      );
      setPrograms(validatedPrograms);

      // MULTI-TENANT ISOLATION: Load scholarships ONLY for this specific university
      const { data: scholarshipsData } = await supabase
        .from("scholarships")
        .select("*")
        .eq("university_id", universityId) // Critical: Only scholarships belonging to THIS university
        .eq("active", true);

      // Verification: Ensure all returned scholarships belong to this university
      const validatedScholarships = (scholarshipsData || []).filter(
        (scholarship) => scholarship.university_id === universityId
      );
      setScholarships(validatedScholarships);
    } catch (error) {
      console.error("Error loading university data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter((program) => {
    const matchesLevel = selectedLevel === "all" || program.level === selectedLevel;
    const matchesDiscipline = selectedDiscipline === "all" || program.discipline === selectedDiscipline;
    return matchesLevel && matchesDiscipline;
  });

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
  const socialLinks: Array<{ label: string; url: string | null | undefined; icon: LucideIcon }> = [
    { label: "Website", url: university.website, icon: Globe },
    { label: "LinkedIn", url: profileDetails.social.linkedin, icon: Linkedin },
    { label: "Facebook", url: profileDetails.social.facebook, icon: Facebook },
    { label: "Instagram", url: profileDetails.social.instagram, icon: Instagram },
    { label: "YouTube", url: profileDetails.social.youtube, icon: Youtube },
  ].filter((link) => Boolean(link.url));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <img src={heroImage} alt={university.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/30" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <BackButton
              variant="ghost"
              className="bg-background/50 backdrop-blur-sm"
              wrapperClassName="mb-4"
              fallback="/universities"
            />
            <div className="flex items-end gap-6">
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
                <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
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
                    {programs.length} Programmes
                  </Badge>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="about">
              <BookOpen className="h-4 w-4 mr-2" />
              About
            </TabsTrigger>
            <TabsTrigger value="programs">
              <GraduationCap className="h-4 w-4 mr-2" />
              Programs ({programs.length})
            </TabsTrigger>
            <TabsTrigger value="requirements">
              <FileText className="h-4 w-4 mr-2" />
              Requirements
            </TabsTrigger>
            <TabsTrigger value="scholarships">
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

            {/* Prominent Programs Card - Clearly Clickable */}
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
                      <h3 className="text-3xl font-bold text-foreground">{programs.length}</h3>
                      <Badge variant="secondary" className="text-sm">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xl font-semibold text-foreground">
                      Programs Offered by {university.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Browse all academic programs exclusive to this university. Each program has been verified and is uniquely offered by {university.name}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-medium group-hover:translate-x-1 transition-transform">
                    <span>View All Programs</span>
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
                <CardTitle>Filter Programs</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedLevel === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLevel("all")}
                  >
                    All Levels
                  </Button>
                  {levels.map((level) => (
                    <Button
                      key={level}
                      variant={selectedLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedLevel(level)}
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
                    onClick={() => setSelectedDiscipline("all")}
                  >
                    All Disciplines
                  </Button>
                  {disciplines.map((discipline) => (
                    <Button
                      key={discipline}
                      variant={selectedDiscipline === discipline ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDiscipline(discipline)}
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
                    No programs found matching your criteria.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPrograms.map((program) => (
                  <Card key={program.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-xl">{program.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="secondary">{program.level}</Badge>
                            <Badge variant="outline">{program.discipline}</Badge>
                          </CardDescription>
                        </div>
                        <Button asChild>
                          <Link to={`/student/applications/new?program=${program.id}`}>
                            Apply Now
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {program.description && (
                        <p className="text-sm text-muted-foreground">{program.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {program.tuition_amount.toLocaleString()} {program.tuition_currency}/year
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{program.duration_months} months</span>
                        </div>
                        {program.intake_months && program.intake_months.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Intakes: {program.intake_months.map(getMonthName).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      {(program.ielts_overall || program.toefl_overall) && (
                        <div className="flex items-center gap-4 text-sm">
                          {program.ielts_overall && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>IELTS: {program.ielts_overall}</span>
                            </div>
                          )}
                          {program.toefl_overall && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>TOEFL: {program.toefl_overall}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Admission Requirements</CardTitle>
                <CardDescription>
                  Requirements may vary by program. Please check individual program details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">Common Requirements:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Valid passport</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Academic transcripts and certificates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>English language proficiency test (IELTS/TOEFL)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Statement of Purpose (SOP)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Letters of Recommendation (LORs)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Resume/CV</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Program-specific requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Program-Specific Requirements</CardTitle>
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

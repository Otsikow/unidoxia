import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  MapPin,
  GraduationCap,
  Eye,
  Plus,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getErrorMessage, logError, formatErrorForToast } from '@/lib/errorUtils';

interface Application {
  id: string;
  status: string;
  intake_year: number;
  intake_month: number;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  app_number: string | null;
  timeline_json: any;
  program: {
    name: string;
    level: string;
    discipline: string;
    university: {
      name: string;
      city: string;
      country: string;
      logo_url: string | null;
    };
  };
}

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground",
    icon: FileText,
  },
  submitted: {
    label: "Submitted",
    color: "bg-info/10 text-info border-info/20",
    icon: CheckCircle,
  },
  screening: {
    label: "Under Review",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
  },
  conditional_offer: {
    label: "Conditional Offer",
    color: "bg-success/10 text-success border-success/20",
    icon: TrendingUp,
  },
  unconditional_offer: {
    label: "Unconditional Offer",
    color: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertCircle,
  },
  visa: {
    label: "Visa Processing",
    color: "bg-accent text-accent-foreground",
    icon: FileText,
  },
  enrolled: {
    label: "Enrolled",
    color: "bg-success text-success-foreground",
    icon: GraduationCap,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-muted text-muted-foreground",
    icon: AlertCircle,
  },
};

export default function ApplicationTrackingSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", user?.id)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) return;

      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          status,
          intake_year,
          intake_month,
          created_at,
          submitted_at,
          updated_at,
          app_number,
          timeline_json,
          program:programs (
            name,
            level,
            discipline,
            university:universities (
              name,
              city,
              country,
              logo_url
            )
          )
        `
        )
        .eq("student_id", studentData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      logError(error, 'ApplicationTrackingSystem.fetchApplications');
      toast(formatErrorForToast(error, 'Failed to load applications'));
    } finally {
      setLoading(false);
    }
  };

  const getIntakeLabel = (month: number, year: number) => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active")
      return !["rejected", "withdrawn", "enrolled"].includes(app.status);
    if (activeFilter === "offers")
      return ["conditional_offer", "unconditional_offer"].includes(app.status);
    if (activeFilter === "draft") return app.status === "draft";
    return app.status === activeFilter;
  });

  const stats = {
    total: applications.length,
    active: applications.filter(
      (a) => !["rejected", "withdrawn", "enrolled"].includes(a.status)
    ).length,
    offers: applications.filter((a) =>
      ["conditional_offer", "unconditional_offer"].includes(a.status)
    ).length,
    draft: applications.filter((a) => a.status === "draft").length,
  };

  // 🌀 Loading state
  if (loading) {
    return (
      <Card className="rounded-xl border shadow-card h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🌀 Empty state
  if (applications.length === 0) {
    return (
      <Card className="rounded-xl border shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Application Tracking
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Track and manage all your university applications in one place
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Applications Yet</h3>
              <p className="text-muted-foreground text-sm">
                Start your journey by browsing courses and creating your first
                application.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Button asChild className="hover-scale">
                <Link to="/courses?view=programs">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Courses
                </Link>
              </Button>
              <Button asChild variant="outline" className="hover-scale">
                <Link to="/student/profile">Complete Profile</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🌀 Main content
  return (
    <Card className="rounded-xl border shadow-card hover:shadow-lg hover:-translate-y-0.5 transition-all h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Application Tracking
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 truncate">
              {stats.total} applications • {stats.active} active • {stats.offers} offers
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button asChild variant="outline" size="sm" className="hover-scale">
            <Link to="/student/application-tracking">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Full View</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="hover-scale">
            <Link to="/student/applications/new">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Application</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 px-4 sm:px-6">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Active ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="offers" className="text-xs sm:text-sm">
              Offers ({stats.offers})
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs sm:text-sm">
              Draft ({stats.draft})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const config = statusConfig[app.status as keyof typeof statusConfig];
              const Icon = config?.icon || FileText;

              return (
                <Card
                  key={app.id}
                  className="hover:shadow-lg transition-all border-l-4"
                  style={{
                    borderLeftColor: config?.color.includes("success")
                      ? "hsl(var(--success))"
                      : config?.color.includes("warning")
                      ? "hsl(var(--warning))"
                      : config?.color.includes("info")
                      ? "hsl(var(--info))"
                      : "hsl(var(--muted))",
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg leading-tight break-words">
                              {app.program.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {app.program.university.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {app.program.university.city},{" "}
                                {app.program.university.country}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {getIntakeLabel(app.intake_month, app.intake_year)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={`${config?.color} border flex items-center gap-1.5 whitespace-nowrap`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {config?.label}
                        </Badge>
                      </div>

                      <Separator />

                      {app.timeline_json &&
                        Array.isArray(app.timeline_json) &&
                        app.timeline_json.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Recent Activity
                            </h4>
                            <div className="space-y-2 pl-6">
                              {app.timeline_json.slice(0, 3).map((event: any, idx: number) => (
                                <div key={idx} className="text-sm flex items-start gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="font-medium">{event.event}</span>
                                    <p className="text-muted-foreground text-xs">{event.description}</p>
                                    <p className="text-muted-foreground text-xs">
                                      {format(new Date(event.date), "MMM dd, yyyy")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="hover-scale flex-1"
                        >
                          <Link to={`/student/applications/${app.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                        {app.status === "draft" && (
                          <Button asChild size="sm" className="hover-scale flex-1">
                            <Link to={`/student/applications/${app.id}`}>
                              <ArrowUpRight className="h-4 w-4 mr-2" />
                              Continue
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {filteredApplications.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground">
              No applications match this filter
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

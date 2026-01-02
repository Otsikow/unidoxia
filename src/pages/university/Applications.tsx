import { useMemo, useState, useEffect, useCallback } from "react";
import { FileStack, Sparkles, BadgeCheck, Eye, Copy, Loader2, Stamp, GraduationCap, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { StatePlaceholder } from "@/components/university/common/StatePlaceholder";
import {
  withUniversityCardStyles,
  withUniversitySurfaceTint,
} from "@/components/university/common/cardStyles";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";
import { ApplicationReviewDialog } from "@/components/university/applications/ApplicationReviewDialog";
import { useExtendedApplication } from "@/hooks/useExtendedApplication";
import { useToast } from "@/hooks/use-toast";
import type { ApplicationRiskBand } from "@/lib/applicationCategorization";

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const isWithinLastDays = (iso: string, days: number) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const diff = Date.now() - date.getTime();
  return diff / (1000 * 60 * 60 * 24) <= days;
};

const titleCase = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatTimeAgo = (date: Date | null) => {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

const RISK_BADGE_STYLES: Record<ApplicationRiskBand, string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  High: "border-red-200 bg-red-50 text-red-800",
};

const ApplicationsPage = () => {
  const { data, isRefetching, refetch, lastUpdated } = useUniversityDashboard();
  const { toast } = useToast();
  const {
    extendedApplication,
    isLoading: isLoadingExtended,
    fetchExtendedApplication,
    clearApplication,
    updateLocalStatus,
    updateLocalNotes,
  } = useExtendedApplication();

  const applications = useMemo(
    () => data?.applications ?? [],
    [data?.applications],
  );

  const universityId = data?.university?.id ?? undefined;
  const tenantId = data?.university?.tenant_id ?? undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "new">("all");
  const [activeCard, setActiveCard] = useState<"total" | "new" | "offers" | "cas" | "enrolled" | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Fetch extended application when selected
  useEffect(() => {
    if (selectedApplicationId && isReviewOpen) {
      void fetchExtendedApplication(selectedApplicationId);
    }
  }, [selectedApplicationId, isReviewOpen, fetchExtendedApplication]);

  const handleOpenReview = useCallback((applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setIsReviewOpen(true);
  }, []);

  const handleCloseReview = useCallback((open: boolean) => {
    if (!open) {
      setIsReviewOpen(false);
      setSelectedApplicationId(null);
      clearApplication();
    }
  }, [clearApplication]);

  const handleStatusUpdate = useCallback(async (applicationId: string, newStatus: string) => {
    console.log("[Applications] Status update received:", { applicationId, newStatus });
    
    // Update local state immediately for instant UI feedback
    updateLocalStatus(newStatus);
    
    // Refetch dashboard data to ensure consistency with server state
    try {
      await refetch();
      console.log("[Applications] Dashboard data refreshed after status update");
    } catch (error) {
      console.error("[Applications] Failed to refresh dashboard data:", error);
      toast({
        title: "Refresh failed",
        description: "Status was saved, but the list may not reflect the change. Try refreshing.",
        variant: "destructive",
      });
    }
  }, [refetch, updateLocalStatus, toast]);

  const handleNotesUpdate = useCallback((applicationId: string, notes: string) => {
    console.log("[Applications] Notes update received:", { applicationId, notes: notes.substring(0, 50) + "..." });
    // Update local state immediately for instant UI feedback
    updateLocalNotes(notes);
  }, [updateLocalNotes]);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch (error) {
      console.error("Copy failed", error);
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const app of applications) {
      if (app.status) set.add(app.status);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return applications.filter((app) => {
      let matchesStatus: boolean;
      const status = app.status.toLowerCase();
      
      if (statusFilter === "all") {
        matchesStatus = true;
      } else if (statusFilter === "offers") {
        // All applications that have reached at least offer stage
        matchesStatus = ["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"].includes(status);
      } else if (statusFilter === "cas") {
        // Applications with CAS/LOA issued (including visa and enrolled)
        matchesStatus = ["cas_loa", "visa", "enrolled"].includes(status);
      } else if (statusFilter === "enrolled") {
        matchesStatus = status === "enrolled";
      } else {
        matchesStatus = status === statusFilter.toLowerCase();
      }

      const matchesSearch =
        term.length === 0 ||
        app.appNumber.toLowerCase().includes(term) ||
        app.studentName.toLowerCase().includes(term) ||
        app.programName.toLowerCase().includes(term);

      const matchesDate =
        dateFilter === "all" || isWithinLastDays(app.createdAt, 7);

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [applications, searchTerm, statusFilter, dateFilter]);

  const handleCardClick = useCallback((card: "total" | "new" | "offers" | "cas" | "enrolled") => {
    // If clicking the same card, deselect it
    if (activeCard === card) {
      setActiveCard(null);
      setStatusFilter("all");
      setDateFilter("all");
      return;
    }

    setActiveCard(card);
    setSearchTerm("");
    setDateFilter("all");

    switch (card) {
      case "total":
        setStatusFilter("all");
        break;
      case "new":
        setStatusFilter("all");
        setDateFilter("new");
        break;
      case "offers":
        setStatusFilter("offers");
        break;
      case "cas":
        setStatusFilter("cas");
        break;
      case "enrolled":
        setStatusFilter("enrolled");
        break;
    }
  }, [activeCard]);

  const metrics = useMemo(() => {
    const total = applications.length;
    const newThisWeek = applications.filter((app) =>
      isWithinLastDays(app.createdAt, 7),
    ).length;
    // Offers issued includes all applications that reached offer stage or beyond
    const offersIssued = applications.filter((app) =>
      ["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"].includes(
        app.status.toLowerCase(),
      ),
    ).length;
    // CAS/LOA issued (students who progressed past offer stage)
    const casIssued = applications.filter((app) =>
      ["cas_loa", "visa", "enrolled"].includes(
        app.status.toLowerCase(),
      ),
    ).length;
    // Enrolled students
    const enrolled = applications.filter((app) =>
      app.status.toLowerCase() === "enrolled",
    ).length;

    return { total, newThisWeek, offersIssued, casIssued, enrolled };
  }, [applications]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Review submitted applications connected to your programs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>Live • Updated {formatTimeAgo(lastUpdated)}</span>
            </div>
          )}
          <Button
            variant="outline"
            className="w-fit gap-2"
            onClick={() => void refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Card 
          className={withUniversityCardStyles(`rounded-2xl text-card-foreground cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${activeCard === "total" ? "ring-2 ring-primary" : ""}`)}
          onClick={() => handleCardClick("total")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("total")}
        > 
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total applications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-foreground">{metrics.total}</p>
            <span className={withUniversitySurfaceTint("inline-flex h-10 w-10 items-center justify-center rounded-xl")}> 
              <FileStack className="h-5 w-5 text-primary" />
            </span>
          </CardContent>
        </Card>

        <Card 
          className={withUniversityCardStyles(`rounded-2xl text-card-foreground cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${activeCard === "new" ? "ring-2 ring-primary" : ""}`)}
          onClick={() => handleCardClick("new")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("new")}
        > 
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-foreground">
              {metrics.newThisWeek}
            </p>
            <span className={withUniversitySurfaceTint("inline-flex h-10 w-10 items-center justify-center rounded-xl")}> 
              <Sparkles className="h-5 w-5 text-primary" />
            </span>
          </CardContent>
        </Card>

        <Card 
          className={withUniversityCardStyles(`rounded-2xl text-card-foreground cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${activeCard === "offers" ? "ring-2 ring-primary" : ""}`)}
          onClick={() => handleCardClick("offers")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("offers")}
        > 
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offers issued
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Conditional + unconditional
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-foreground">
              {metrics.offersIssued}
            </p>
            <span className={withUniversitySurfaceTint("inline-flex h-10 w-10 items-center justify-center rounded-xl")}> 
              <BadgeCheck className="h-5 w-5 text-success" />
            </span>
          </CardContent>
        </Card>

        <Card 
          className={withUniversityCardStyles(`rounded-2xl text-card-foreground cursor-pointer transition-all hover:ring-2 hover:ring-cyan-500/50 ${activeCard === "cas" ? "ring-2 ring-cyan-500" : ""}`)}
          onClick={() => handleCardClick("cas")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("cas")}
        > 
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CAS/LOA issued
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Confirmation letters sent
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-foreground">
              {metrics.casIssued}
            </p>
            <span className={withUniversitySurfaceTint("inline-flex h-10 w-10 items-center justify-center rounded-xl")}> 
              <Stamp className="h-5 w-5 text-cyan-500" />
            </span>
          </CardContent>
        </Card>

        <Card 
          className={withUniversityCardStyles(`rounded-2xl text-card-foreground cursor-pointer transition-all hover:ring-2 hover:ring-emerald-500/50 ${activeCard === "enrolled" ? "ring-2 ring-emerald-500" : ""}`)}
          onClick={() => handleCardClick("enrolled")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("enrolled")}
        > 
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolled
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Successfully enrolled
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold text-foreground">
              {metrics.enrolled}
            </p>
            <span className={withUniversitySurfaceTint("inline-flex h-10 w-10 items-center justify-center rounded-xl")}> 
              <GraduationCap className="h-5 w-5 text-emerald-500" />
            </span>
          </CardContent>
        </Card>
      </section>

      <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}> 
        <CardHeader className="space-y-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Applications queue
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {filteredApplications.length} of {applications.length} applications
              displayed
            </CardDescription>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Search by application ID, student, or course"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="text-sm"
            />

            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setActiveCard(null);
              setDateFilter("all");
            }}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {titleCase(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {applications.length === 0 ? (
            <StatePlaceholder
              title="No applications yet"
              description="Once agents or students submit applications to your programs, they will show up here."
              className="bg-transparent"
            />
          ) : filteredApplications.length === 0 ? (
            <StatePlaceholder
              title="No applications match your filters"
              description="Try clearing the search term or selecting a different status."
              className="bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Application</th>
                    <th className="py-2">Student</th>
                    <th className="py-2">Course</th>
                    <th className="py-2">Tags</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                    <th className="py-2 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="text-muted-foreground transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 font-medium text-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{app.appNumber}</span>
                          <button
                            type="button"
                            className="w-fit"
                            onClick={() => void handleCopy("Application ID", app.id)}
                            aria-label="Copy application ID"
                          >
                            <Badge
                              variant="outline"
                              className="w-fit border-border bg-muted/50 text-[10px] hover:bg-muted/70"
                            >
                              {app.id.slice(0, 8)}…
                              <Copy className="ml-1 inline h-3 w-3 text-muted-foreground" />
                            </Badge>
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className={app.studentName === "Unknown Student" ? "text-muted-foreground italic" : "text-foreground"}>
                            {app.studentName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                              const parts: string[] = [];
                              if (app.studentNationality && app.studentNationality !== "Unknown") {
                                parts.push(app.studentNationality);
                              } else if (app.studentCurrentCountry) {
                                parts.push(`Based in ${app.studentCurrentCountry}`);
                              }
                              const dob = formatDate(app.studentDateOfBirth ?? null);
                              if (dob !== "—") {
                                parts.push(`DOB ${dob}`);
                              }
                              if (typeof app.documentsCount === "number") {
                                const label = app.documentsCount === 1 ? "document" : "documents";
                                parts.push(`${app.documentsCount} ${label}`);
                              }

                              return parts.length > 0 ? parts.join(" • ") : "Student details not provided";
                            })()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-foreground">{app.programName}</span>
                          <span className="text-xs text-muted-foreground">
                            {app.programLevel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[11px]">
                            {app.categorization.level}
                          </Badge>
                          <Badge variant="outline" className="text-[11px]">
                            {app.categorization.route}
                          </Badge>
                          <Badge variant="outline" className="text-[11px]">
                            {app.categorization.geography}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${RISK_BADGE_STYLES[app.categorization.riskBand]}`}
                          >
                            {app.categorization.riskBand} risk
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-primary hover:text-primary"
                          onClick={() => handleOpenReview(app.id)}
                          disabled={selectedApplicationId === app.id && isLoadingExtended}
                        >
                          {selectedApplicationId === app.id && isLoadingExtended ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          Review
                        </Button>
                      </td>
                      <td className="py-3 text-right text-sm text-muted-foreground">
                        {formatDate(app.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ApplicationReviewDialog
        application={extendedApplication}
        open={isReviewOpen}
        onOpenChange={handleCloseReview}
        onStatusUpdate={handleStatusUpdate}
        onNotesUpdate={handleNotesUpdate}
        universityId={universityId}
        tenantId={tenantId}
        isLoading={isLoadingExtended}
      />
    </div>
  );
};

export default ApplicationsPage;

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminReportExportButton from "@/components/admin/AdminReportExportButton";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ApplicationRow {
  id: string;
  status: string | null;
  submitted_at: string | null;
  created_at: string | null;
  app_number: string | null;
  submission_channel: string | null;
  tenant_id?: string | null;
  student: {
    id: string;
    legal_name: string | null;
    current_country: string | null;
    profile: {
      full_name: string | null;
      email: string | null;
    } | null;
  } | null;
  agent: {
    id: string;
    company_name: string | null;
    profile: {
      full_name: string | null;
      email: string | null;
    } | null;
  } | null;
  program: {
    id: string;
    name: string | null;
    level: string | null;
    university: {
      id: string;
      name: string | null;
      country: string | null;
    } | null;
  } | null;
}

interface StaffProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

type DateFilterValue = "all" | "7" | "30" | "90" | "365";

const STAGES = ["Lead", "Applied", "Offer", "Visa", "Enrolled"] as const;

const ALL_FILTER_VALUE = "all";
const STAFF_PLACEHOLDER_VALUE = "select-staff";

const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  lead: 0,
  inquiry: 0,
  prospect: 0,
  draft: 0,
  submitted: 1,
  screening: 1,
  review: 1,
  applied: 1,
  conditional_offer: 2,
  unconditional_offer: 2,
  offer: 2,
  deposit_paid: 2,
  cas_loa: 3,
  visa: 3,
  enrolled: 4,
};

const PIE_COLORS = ["#6366F1", "#22D3EE", "#F97316", "#10B981", "#F43F5E", "#8B5CF6", "#06B6D4"];

const AdminAdmissionsOversight = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const { toast } = useToast();

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [universityFilter, setUniversityFilter] = useState<string>(ALL_FILTER_VALUE);
  const [countryFilter, setCountryFilter] = useState<string>(ALL_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_FILTER_VALUE);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_FILTER_VALUE);

  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(STAFF_PLACEHOLDER_VALUE);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRow | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState<boolean>(false);
  const [assignmentLoading, setAssignmentLoading] = useState<boolean>(false);

  const fetchApplications = useCallback(async () => {
    if (!tenantId) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("applications")
        .select(
          `
            id,
            status,
            submitted_at,
            created_at,
            app_number,
            submission_channel,
            tenant_id,
            student:students (
              id,
              legal_name,
              current_country,
              profile:profiles (
                full_name,
                email
              )
            ),
            agent:agents (
              id,
              company_name,
              profile:profiles (
                full_name,
                email
              )
            ),
            program:programs!inner (
              id,
              name,
              level,
              university:universities (
                id,
                name,
                country
              )
            )
          `,
        )
        .eq("tenant_id", tenantId)
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setApplications((data ?? []) as ApplicationRow[]);
    } catch (err) {
      console.error("Failed to load applications", err);
      setError("Unable to load applications at this time.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) {
      setStaff([]);
      return;
    }

    try {
      const { data, error: staffError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("tenant_id", tenantId)
        .in("role", ["admin", "staff", "counselor"])
        .order("full_name", { ascending: true, nullsFirst: false });

      if (staffError) {
        throw staffError;
      }

      setStaff(data ?? []);
    } catch (err) {
      console.error("Failed to load staff", err);
      setStaff([]);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const uniqueUniversities = useMemo(() => {
    const values = new Set<string>();
    applications.forEach((application) => {
      const name = application.program?.university?.name;
      if (name) {
        values.add(name);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const uniqueCountries = useMemo(() => {
    const values = new Set<string>();
    applications.forEach((application) => {
      const primary =
        application.program?.university?.country ?? application.student?.current_country;
      if (primary) {
        values.add(primary);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const uniqueStatuses = useMemo(() => {
    const values = new Set<string>();
    applications.forEach((application) => {
      if (application.status) {
        values.add(application.status);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const uniqueSources = useMemo(() => {
    const values = new Set<string>();
    applications.forEach((application) => {
      if (application.submission_channel) {
        values.add(application.submission_channel);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const status = application.status ?? "";
      const universityName = application.program?.university?.name ?? "";
      const countryValue =
        application.program?.university?.country ?? application.student?.current_country ?? "";
      const studentName =
        application.student?.legal_name ?? application.student?.profile?.full_name ?? "";
      const programName = application.program?.name ?? "";
      const agentName = application.agent?.profile?.full_name ?? application.agent?.company_name ?? "";
      const applicationSource = application.submission_channel ?? "";

      const searchMatch =
        lowerSearch.length === 0 ||
        [studentName, universityName, programName, agentName, application.app_number ?? ""].some((value) =>
          value?.toLowerCase().includes(lowerSearch),
        );

      const universityMatch =
        universityFilter === ALL_FILTER_VALUE || universityName === universityFilter;
      const countryMatch = countryFilter === ALL_FILTER_VALUE || countryValue === countryFilter;
      const statusMatch = statusFilter === ALL_FILTER_VALUE || status === statusFilter;
      const sourceMatch = sourceFilter === ALL_FILTER_VALUE || applicationSource === sourceFilter;

      const effectiveDate = application.submitted_at ?? application.created_at;
      let dateMatch = true;
      if (dateFilter !== "all" && effectiveDate) {
        const days = Number.parseInt(dateFilter, 10);
        if (!Number.isNaN(days)) {
          const boundary = new Date();
          boundary.setDate(boundary.getDate() - days);
          dateMatch = new Date(effectiveDate) >= boundary;
        }
      }

      return searchMatch && universityMatch && countryMatch && statusMatch && sourceMatch && dateMatch;
    });
  }, [applications, searchTerm, universityFilter, countryFilter, statusFilter, sourceFilter, dateFilter]);

  const totals = useMemo(() => {
    const total = applications.length;
    const offers = applications.filter((item) =>
      ["conditional_offer", "unconditional_offer", "offer"].includes(item.status ?? ""),
    ).length;
    const enrolled = applications.filter((item) => (item.status ?? "").toLowerCase() === "enrolled").length;
    const submitted = applications.filter((item) =>
      ["submitted", "screening", "review", "applied", "conditional_offer", "unconditional_offer", "offer", "cas_loa", "visa", "enrolled"].includes(
        (item.status ?? "").toLowerCase(),
      ),
    ).length;

    const conversionRate = total > 0 ? Math.round((enrolled / total) * 100) : 0;

    return { total, offers, enrolled, submitted, conversionRate };
  }, [applications]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    applications.forEach((application) => {
      const key = (application.status ?? "Unknown").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([key, value]) => ({
        name: key
          .split("_")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" "),
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [applications]);

  const topUniversities = useMemo(() => {
    const counts = new Map<string, number>();
    applications.forEach((application) => {
      const universityName = application.program?.university?.name ?? "Unknown";
      counts.set(universityName, (counts.get(universityName) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [applications]);

  const openAssignmentDialog = (application: ApplicationRow) => {
    setSelectedApplication(application);
    setAssignmentNotes("");
    setSelectedStaffId(STAFF_PLACEHOLDER_VALUE);
    setAssignmentDialogOpen(true);
  };

  const handleAssignment = async () => {
    if (!selectedApplication?.student?.id) {
      toast({
        title: "Missing student",
        description: "Select a valid application before assigning staff.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaffId || selectedStaffId === STAFF_PLACEHOLDER_VALUE) {
      toast({
        title: "Select staff",
        description: "Choose a staff member to oversee this application.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssignmentLoading(true);

      const { error: deleteError } = await supabase
        .from("student_assignments")
        .delete()
        .eq("student_id", selectedApplication.student.id);

      if (deleteError) {
        throw deleteError;
      }

      const { error: insertError } = await supabase.from("student_assignments").insert({
        student_id: selectedApplication.student.id,
        counselor_id: selectedStaffId,
        notes: assignmentNotes ? assignmentNotes.trim() : null,
      });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Staff reassigned",
        description: "The application owner has been updated successfully.",
      });

      setAssignmentDialogOpen(false);
      setSelectedApplication(null);
      setSelectedStaffId(STAFF_PLACEHOLDER_VALUE);
      setAssignmentNotes("");
    } catch (err) {
      console.error("Failed to reassign staff", err);
      toast({
        title: "Unable to reassign",
        description: "Something went wrong while updating the assignment.",
        variant: "destructive",
      });
    } finally {
      setAssignmentLoading(false);
    }
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Unknown";
    return status
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const getStageIndex = (status: string | null) => {
    if (!status) return 0;
    return STATUS_TO_STAGE_INDEX[status.toLowerCase()] ?? 0;
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "outline" | "destructive" => {
    if (!status) return "secondary";
    const normalized = status.toLowerCase();
    if (["enrolled", "visa"].includes(normalized)) return "default";
    if (["conditional_offer", "unconditional_offer", "offer"].includes(normalized)) return "outline";
    if (["withdrawn", "cancelled", "rejected"].includes(normalized)) return "destructive";
    return "secondary";
  };

  const handleExportCsv = useCallback(() => {
    if (filteredApplications.length === 0) {
      toast({
        title: "No data to export",
        description: "Apply filters to select applications before exporting.",
        variant: "destructive",
      });
      return;
    }

    const header = [
      "Application ID",
      "App Number",
      "Source",
      "Student Name",
      "Student Email",
      "Agent",
      "Agent Email",
      "University",
      "Course",
      "Level",
      "Country",
      "Status",
      "Submitted At",
      "Created At",
    ];

    const rows = filteredApplications.map((application) => [
      application.id,
      application.app_number ?? "",
      application.submission_channel ?? "UniDoxia",
      application.student?.legal_name ?? application.student?.profile?.full_name ?? "",
      application.student?.profile?.email ?? "",
      application.agent?.profile?.full_name ?? application.agent?.company_name ?? "",
      application.agent?.profile?.email ?? "",
      application.program?.university?.name ?? "",
      application.program?.name ?? "",
      application.program?.level ?? "",
      application.program?.university?.country ?? application.student?.current_country ?? "",
      formatStatus(application.status),
      application.submitted_at ?? "",
      application.created_at ?? "",
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((value) => {
            const stringValue = String(value ?? "");
            if (/[",\n]/.test(stringValue)) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unidoxia-applications-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${filteredApplications.length} applications to CSV.`,
    });
  }, [filteredApplications, toast]);

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredApplications.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className="py-10 text-center text-sm text-muted-foreground">
              No applications match the current filters.
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return filteredApplications.map((application) => {
      const stageIndex = getStageIndex(application.status);
      const stagePercent = (stageIndex / (STAGES.length - 1)) * 100;
      const stageLabel = STAGES[stageIndex] ?? STAGES[0];
      const submittedDate = application.submitted_at ?? application.created_at;
      const countryValue =
        application.program?.university?.country ?? application.student?.current_country ?? "—";

      return (
        <TableRow key={application.id} className="align-top">
          <TableCell className="min-w-[160px]">
            <div className="space-y-1">
              <p className="font-medium">
                {application.student?.legal_name ?? application.student?.profile?.full_name ?? "Unknown student"}
              </p>
              <p className="text-xs text-muted-foreground">{application.app_number ?? application.id}</p>
            </div>
          </TableCell>
          <TableCell className="min-w-[140px]">
            <div className="space-y-1">
              <p className="font-medium">{application.program?.university?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{application.program?.name ?? "Course TBD"}</p>
            </div>
          </TableCell>
          <TableCell className="w-[160px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{stageLabel}</span>
                <span className="text-muted-foreground">{Math.round(stagePercent)}%</span>
              </div>
              <Progress value={stagePercent} aria-label={`Stage progress ${stageLabel}`} />
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant={getStatusBadgeVariant(application.status)} className="text-xs">
                  {formatStatus(application.status)}
                </Badge>
                {application.submission_channel && (
                  <Badge variant="secondary" className="text-xs">
                    {application.submission_channel}
                  </Badge>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="min-w-[120px]">{countryValue}</TableCell>
          <TableCell className="min-w-[140px]">
            {submittedDate ? format(new Date(submittedDate), "MMM d, yyyy") : "Not submitted"}
          </TableCell>
          <TableCell className="min-w-[140px]">
            {application.agent?.profile?.full_name ?? application.agent?.company_name ?? "—"}
          </TableCell>
          <TableCell className="min-w-[140px]">
            <div className="space-y-1 text-xs">
              <p className="font-medium">{application.student?.profile?.email ?? "—"}</p>
              <p className="text-muted-foreground">{application.agent?.profile?.email ?? ""}</p>
            </div>
          </TableCell>
          <TableCell className="w-[160px]">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAssignmentDialog(application)}
                className="whitespace-nowrap"
              >
                Reassign Staff
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Application actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      window.dispatchEvent(
                        new CustomEvent("zoe:open-chat", {
                          detail: {
                            prompt: `Summarise the current status of application ${application.app_number ?? application.id}`,
                          },
                        }),
                      )
                    }
                  >
                    Ask Zoe for summary
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      window.dispatchEvent(
                        new CustomEvent("zoe:open-chat", {
                          detail: {
                            prompt: `Identify blockers for student ${(application.student?.legal_name ?? application.student?.profile?.full_name) ?? ""}`,
                          },
                        }),
                      )
                    }
                  >
                    Identify blockers
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Admissions oversight</h1>
          <p className="text-sm text-muted-foreground">
            Monitor every application, align staff ownership, and visualise conversion trends across your portfolio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <AdminReportExportButton
            tenantId={tenantId}
            defaultReportType="admissions"
            className="whitespace-nowrap"
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("zoe:open-chat", { detail: { prompt: "Highlight at-risk admissions files this week" } }),
              )
            }
          >
            <Sparkles className="h-4 w-4" />
            Ask Zoe
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void fetchApplications()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admissions data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => {
            setStatusFilter(ALL_FILTER_VALUE);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.total}</div>
            <p className="text-xs text-muted-foreground">Total files across your tenant</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => {
            setStatusFilter("submitted");
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In review / submitted</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.submitted}</div>
            <p className="text-xs text-muted-foreground">Progressing beyond draft stage</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => {
            setStatusFilter("conditional_offer");
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers issued</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.offers}</div>
            <p className="text-xs text-muted-foreground">Conditional + unconditional offers</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => {
            setStatusFilter("enrolled");
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolment conversion</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">{totals.enrolled} students enrolled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
          <CardDescription>Slice the pipeline by institution, market, lifecycle stage, or timeframe.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</span>
              <Input
                placeholder="Student, university, program, or agent"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">University</span>
              <Select value={universityFilter} onValueChange={setUniversityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All universities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All universities</SelectItem>
                  {uniqueUniversities.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Country</span>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All countries</SelectItem>
                  {uniqueCountries.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
                  {uniqueStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</span>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All sources</SelectItem>
                  {uniqueSources.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date submitted</span>
              <Select value={dateFilter} onValueChange={(value: DateFilterValue) => setDateFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last quarter</SelectItem>
                  <SelectItem value="365">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setUniversityFilter(ALL_FILTER_VALUE);
                setCountryFilter(ALL_FILTER_VALUE);
                setStatusFilter(ALL_FILTER_VALUE);
                setSourceFilter(ALL_FILTER_VALUE);
                setDateFilter("all");
              }}
            >
              Clear filters
            </Button>
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredApplications.length}</span> of
              {" "}
              <span className="font-semibold text-foreground">{applications.length}</span> applications.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Application pipeline
            </CardTitle>
            <CardDescription>Every file from lead through enrolment with ownership controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>University &amp; program</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderTableBody()}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" /> Status breakdown
              </CardTitle>
              <CardDescription>Distribution of applications by lifecycle status.</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {applications.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data to visualise yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(value: number) => [`${value} applications`, ""]} />
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Top universities
              </CardTitle>
              <CardDescription>Applications received by leading destinations.</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {topUniversities.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No university submissions yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topUniversities}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} interval={0} angle={-20} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                    <Tooltip formatter={(value: number) => [`${value} applications`, "Applications"]} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reassign staff owner</DialogTitle>
            <DialogDescription>
              Select a staff member to take ownership of this application. The previous assignment will be replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Application</span>
              <p className="text-sm font-medium">
                {selectedApplication?.student?.legal_name ??
                  selectedApplication?.student?.profile?.full_name ??
                  "Unknown student"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedApplication?.program?.university?.name ?? "—"} · {selectedApplication?.program?.name ?? "Course"}
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff member</span>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STAFF_PLACEHOLDER_VALUE} disabled={staff.length > 0}>
                    {staff.length > 0 ? "Select a staff member" : "No staff available"}
                  </SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.full_name ?? "Unnamed"}</span>
                        <span className="text-xs text-muted-foreground">{member.email ?? member.role}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes for assignee</span>
              <Textarea
                placeholder="Add context or next actions for the new owner (optional)"
                value={assignmentNotes}
                onChange={(event) => setAssignmentNotes(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAssignmentDialogOpen(false)} disabled={assignmentLoading}>
              Cancel
            </Button>
            <Button onClick={() => void handleAssignment()} disabled={assignmentLoading} className="gap-2">
              {assignmentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdmissionsOversight;

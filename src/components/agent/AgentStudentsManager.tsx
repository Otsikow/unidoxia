import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import {
  Search,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  FileText,
  MoreHorizontal,
  Eye,
  GraduationCap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SortableButton } from "@/components/SortableButton";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/hooks/useAuth";
import { useTenantStudents } from "@/hooks/useTenantStudents";
import { useSort } from "@/hooks/useSort";
import type { AgentStudent } from "@/hooks/useAgentStudents";
import { useAgentProfileCompletion } from "@/hooks/useAgentProfileCompletion";
import { cn } from "@/lib/utils";
import AgentInviteCodeManager from "./AgentInviteCodeManager";
import InviteStudentDialog from "@/components/students/InviteStudentDialog";
import BackButton from "@/components/BackButton";
import { AgentProfileCompletionCard } from "./AgentProfileCompletionCard";

type SortableColumn = "country" | "status";

const formatRelativeTime = (value: string | null) => {
  if (!value) return "—";
  try {
    const date = parseISO(value);
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch {
    return "—";
  }
};

type StatusFilter = "all" | "onboarded" | "pending";

const statusOptions: Record<StatusFilter, string> = {
  all: "All statuses",
  onboarded: "Onboarded",
  pending: "Pending onboarding",
};

const statusBadgeClass = (status: StatusFilter) => {
  switch (status) {
    case "onboarded":
      return "bg-success/10 text-success border-success/20";
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
};

const StudentTableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-64 mt-2" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const MetricsSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-3">
    {[...Array(3)].map((_, idx) => (
      <Card key={idx}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function AgentStudentsManager() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const agentProfileId = profile?.id ?? null;
  const tenantId = profile?.tenant_id ?? null;
  const isAgent = profile?.role === "agent";

  const {
    completion: agentCompletion,
    checklist: agentChecklist,
    hasAgentProfile,
    isLoading: agentProfileLoading,
  } = useAgentProfileCompletion();
  const isAgentProfileComplete = !isAgent || agentCompletion.percentage >= 100;

  const { data, isLoading, isFetching, isError, error, refetch } = useTenantStudents(tenantId);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { sortState, setSortColumn } = useSort<SortableColumn>({
    column: "status",
    direction: "asc",
  });

  const applicationsBlocked =
    isAgent && (!hasAgentProfile || !isAgentProfileComplete || agentProfileLoading);

  const handleStartApplication = (student: AgentStudent) => {
    if (applicationsBlocked) {
      toast({
        title: "Complete your agent profile",
        description:
          "Finish your agency details and verification documents before submitting applications for students.",
        variant: "destructive",
      });
      navigate("/agent/settings");
      return;
    }
    if (!student.onboarded) {
      toast({
        title: "Student not ready",
        description: "This student needs to complete their onboarding before you can submit applications for them.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/student/applications/new?studentId=${student.studentId}`);
  };

  const handleViewStudent = (student: AgentStudent) => {
    navigate(`/agent/students/${student.studentId}`);
  };

  const handleBrowsePrograms = (student: AgentStudent) => {
    if (!student.onboarded) {
      toast({
        title: "Student not ready",
        description: "This student needs to complete their onboarding before you can browse courses for them.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/courses?view=programs&studentId=${student.studentId}`);
  };

  const allStudents = data ?? [];

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = allStudents.filter((student) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        student.displayName.toLowerCase().includes(normalizedSearch) ||
        student.email.toLowerCase().includes(normalizedSearch) ||
        (student.username?.toLowerCase().includes(normalizedSearch) ?? false);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "onboarded" && student.onboarded) ||
        (statusFilter === "pending" && !student.onboarded);

      return matchesSearch && matchesStatus;
    });

    const sortModifier = sortState.direction === "asc" ? 1 : -1;

    return filtered.sort((a, b) => {
      switch (sortState.column) {
        case "country":
          return (a.country ?? "").localeCompare(b.country ?? "") * sortModifier;
        case "status":
          return (
            (a.onboarded ? 1 : 0) - (b.onboarded ? 1 : 0) ||
            (a.displayName ?? "").localeCompare(b.displayName ?? "")
          ) * sortModifier;
        default:
          return 0;
      }
    });
  }, [allStudents, searchQuery, statusFilter, sortState]);

  const metrics = useMemo(() => {
    const total = allStudents.length;
    const onboarded = allStudents.filter((student) => student.onboarded).length;
    const pending = total - onboarded;
    const totalApplications = allStudents.reduce(
      (accumulator, student) => accumulator + (student.applicationCount ?? 0),
      0,
    );

    return {
      total,
      onboarded,
      pending,
      totalApplications,
    };
  }, [allStudents]);

  if (authLoading) {
    return (
      <div className="space-y-6">
        <MetricsSkeleton />
        <StudentTableSkeleton />
      </div>
    );
  }

  if (!agentProfileId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No agent profile detected</AlertTitle>
        <AlertDescription>
          We could not find an agent profile connected to your account. Please contact support if
          this continues.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />
        <div className="rounded-lg border bg-background/80 px-3 py-2 shadow-sm text-sm">
          <p className="font-semibold text-foreground">Students dashboard</p>
          <p className="text-muted-foreground">Manage your roster and invites.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">My Students</h2>
          <p className="text-sm text-muted-foreground">
            Track student progress, invite new prospects, and monitor application activity.
          </p>
        </div>
        <div className="w-full sm:w-auto flex justify-end">
          <InviteStudentDialog
            agentProfileId={agentProfileId}
            tenantId={tenantId}
            disabled={!tenantId}
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
          />
        </div>
      </div>

      {applicationsBlocked && (
        <AgentProfileCompletionCard
          completion={agentCompletion}
          checklist={agentChecklist}
          loading={agentProfileLoading}
          actionHref="/agent/settings"
        />
      )}

      <AgentInviteCodeManager agentProfileId={agentProfileId} />

      {isLoading ? (
        <MetricsSkeleton />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
              <p className="text-xs text-muted-foreground">In your organization</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Onboarded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{metrics.onboarded}</div>
              <p className="text-xs text-muted-foreground">Ready for applications</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending onboarding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{metrics.pending}</div>
              <p className="text-xs text-muted-foreground">Invited but not completed</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalApplications}</div>
              <p className="text-xs text-muted-foreground">Across all linked students</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0">
              <CardTitle>Students</CardTitle>
              <CardDescription>
                {isFetching ? "Refreshing latest data…" : `${filteredStudents.length} student(s)`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or username…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-full lg:w-[220px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{statusOptions.all}</SelectItem>
                  <SelectItem value="onboarded">{statusOptions.onboarded}</SelectItem>
                  <SelectItem value="pending">{statusOptions.pending}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="lg:w-auto"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load students</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>{error?.message ?? "An unexpected error occurred."}</span>
                <Button variant="outline" onClick={() => refetch()} className="w-fit">
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <StudentTableSkeleton />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-8 w-8" />}
              title={searchQuery ? "No students match your search" : "No students yet"}
              description={
                searchQuery
                  ? "Adjust your filters or search text to see other students."
                  : "Invite your first student to start tracking applications and progress."
              }
              action={
                searchQuery
                  ? undefined
                  : {
                      label: "Invite student",
                      onClick: () => {
                        setStatusFilter("all");
                        setSearchQuery("");
                        setInviteDialogOpen(true);
                      },
                    }
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>
                      <SortableButton
                        column="country"
                        sortState={sortState}
                        onClick={setSortColumn}
                      >
                        Origin
                      </SortableButton>
                    </TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>
                      <SortableButton
                        column="status"
                        sortState={sortState}
                        onClick={setSortColumn}
                      >
                        Status
                      </SortableButton>
                    </TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const status: StatusFilter = student.onboarded ? "onboarded" : "pending";
                    return (
                      <TableRow
                        key={student.studentId}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => handleViewStudent(student)}
                      >
                        <TableCell>
                          <div className="font-medium">{student.displayName}</div>
                          {student.email !== "unknown@example.com" && (
                            <p className="text-xs text-muted-foreground">
                              @{student.username ?? student.profileId.slice(0, 6)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[200px]" title={student.email}>
                                {student.email}
                              </span>
                            </div>
                            {student.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[180px]" title={student.phone}>
                                  {student.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {student.country ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {student.destinationCountries.length > 0
                              ? student.destinationCountries.join(", ")
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(statusBadgeClass(status))}>
                            {student.onboarded ? (
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {statusOptions[status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {student.applicationCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(student.updatedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartApplication(student);
                              }}
                              disabled={!student.onboarded || applicationsBlocked}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Apply</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleBrowsePrograms(student)}
                                  disabled={!student.onboarded}
                                >
                                  <GraduationCap className="mr-2 h-4 w-4" />
                                  Browse Courses
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStartApplication(student)}
                                  disabled={!student.onboarded || applicationsBlocked}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  New Application
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { FileStack, Sparkles, BadgeCheck, Eye, Copy, ArrowUpRight } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

const ApplicationsPage = () => {
  const { data, isRefetching, refetch } = useUniversityDashboard();
  const { toast } = useToast();

  const applications = useMemo(
    () => data?.applications ?? [],
    [data?.applications],
  );
  const documentRequests = useMemo(
    () => data?.documentRequests ?? [],
    [data?.documentRequests],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const selectedApplication = useMemo(
    () =>
      selectedApplicationId
        ? applications.find((app) => app.id === selectedApplicationId) ?? null
        : null,
    [applications, selectedApplicationId],
  );

  const selectedStudentRequests = useMemo(() => {
    const studentId = selectedApplication?.studentId ?? null;
    if (!studentId) return [];
    return documentRequests
      .filter((req) => req.studentId === studentId)
      .slice(0, 6);
  }, [documentRequests, selectedApplication?.studentId]);

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
      const matchesStatus =
        statusFilter === "all" ||
        app.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesSearch =
        term.length === 0 ||
        app.appNumber.toLowerCase().includes(term) ||
        app.studentName.toLowerCase().includes(term) ||
        app.programName.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [applications, searchTerm, statusFilter]);

  const metrics = useMemo(() => {
    const total = applications.length;
    const newThisWeek = applications.filter((app) =>
      isWithinLastDays(app.createdAt, 7),
    ).length;
    const offersIssued = applications.filter((app) =>
      ["conditional_offer", "unconditional_offer"].includes(
        app.status.toLowerCase(),
      ),
    ).length;

    return { total, newThisWeek, offersIssued };
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
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}> 
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

        <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}> 
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

        <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}> 
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                          <span className="text-foreground">{app.studentName}</span>
                          <span className="text-xs text-muted-foreground">
                            {app.studentNationality ?? "—"}
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
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-primary hover:text-primary"
                          onClick={() => setSelectedApplicationId(app.id)}
                        >
                          <Eye className="h-4 w-4" />
                          View
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

      <div className="text-xs text-muted-foreground">
        Tip: Use the back button in the header to return to the previous page.
      </div>

      <Dialog
        open={Boolean(selectedApplicationId)}
        onOpenChange={(open) => setSelectedApplicationId(open ? selectedApplicationId : null)}
      >
        <DialogContent className="max-w-3xl">
          {selectedApplication ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-foreground">
                    {selectedApplication.programName}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedApplication.studentName} • {selectedApplication.programLevel}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Application {selectedApplication.appNumber} • Submitted{" "}
                  {formatDate(selectedApplication.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedApplication.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleCopy("Application number", selectedApplication.appNumber)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy application #
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleCopy("Application ID", selectedApplication.id)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy ID
                  </Button>
                </div>

                <div className={withUniversitySurfaceTint("rounded-2xl border border-border/60 bg-muted/40 p-4")}>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Student
                    </p>
                    <p className="text-sm font-medium text-foreground">{selectedApplication.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      Nationality: {selectedApplication.studentNationality ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open("/university/offers", "_self")}
                  >
                    Go to Offers &amp; CAS
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => window.open("/university/documents", "_self")}
                  >
                    View document requests
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Related document requests
                  </p>
                  {selectedStudentRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No document requests found for this student yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudentRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {req.requestType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Status: {req.status} • Requested {formatDate(req.requestedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.documentUrl ? (
                              <Button variant="outline" size="sm" asChild>
                                <a href={req.documentUrl} target="_blank" rel="noreferrer">
                                  View
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">No file yet</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationsPage;

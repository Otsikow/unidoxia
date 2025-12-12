import { useMemo, useState } from "react";
import { FileStack, Sparkles, BadgeCheck } from "lucide-react";

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

  const applications = useMemo(
    () => data?.applications ?? [],
    [data?.applications],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
                    <th className="py-2 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="text-muted-foreground">
                      <td className="py-3 font-medium text-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{app.appNumber}</span>
                          <Badge
                            variant="outline"
                            className="w-fit border-border bg-muted/50 text-[10px]"
                          >
                            {app.id.slice(0, 8)}…
                          </Badge>
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
    </div>
  );
};

export default ApplicationsPage;

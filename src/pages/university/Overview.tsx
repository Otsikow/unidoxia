import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarPlus,
  FileStack,
  Inbox,
  Sparkles,
  Target,
  ClipboardList,
  CheckCircle2,
  Stamp,
  GraduationCap,
  MapPin,
  Globe,
  Mail,
  Phone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/university/panels/MetricCard";
import { ApplicationSourcesChart } from "@/components/university/panels/ApplicationSourcesChart";
import { ApplicationStatusChart } from "@/components/university/panels/ApplicationStatusChart";
import { StatePlaceholder } from "@/components/university/common/StatePlaceholder";
import {
  withUniversityCardStyles,
  withUniversitySurfaceSubtle,
  withUniversitySurfaceTint,
} from "@/components/university/common/cardStyles";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";
import { Separator } from "@/components/ui/separator";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const pipelineIcons: Record<string, ComponentType<{ className?: string }>> = {
  submitted: FileStack,
  screening: ClipboardList,
  offers: CheckCircle2,
  cas: Stamp,
  enrolled: GraduationCap,
};

const OverviewPage = () => {
  const { data } = useUniversityDashboard();

  if (!data?.university) {
    return (
      <StatePlaceholder
        icon={<Building2 className="h-10 w-10 text-primary" />}
        title="No university profile connected"
        description="Connect your institution to unlock the UniDoxia dashboard experience."
      />
    );
  }

  const {
    university,
    metrics,
    pipeline,
    conversion,
    recentApplications,
    documentRequests,
    programs,
    agents,
    countrySummary,
    statusSummary,
  } = data;

  const details = data.profileDetails;
  const primaryContact = details.contacts.primary;
  const heroImage = details.media.heroImageUrl ?? university.featured_image_url ?? null;

  return (
    <div className="space-y-8">
      <Card className={withUniversityCardStyles("overflow-hidden rounded-3xl text-card-foreground shadow-primary/20")}>
        <CardContent className="space-y-6 p-6 lg:p-8">
          {heroImage ? (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20">
              <img
                src={heroImage}
                alt={`${university.name} campus`}
                className="h-48 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            </div>
          ) : null}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-start gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-lg shadow-primary/20">
                {university.logo_url ? (
                  <img
                    src={university.logo_url}
                    alt={university.name}
                    className="h-16 w-16 rounded-xl object-contain"
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">
                    {university.name}
                  </h1>
                  {details.tagline ? (
                    <p className="text-sm text-primary">{details.tagline}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline" className="border-border bg-muted/60">
                    <MapPin className="mr-1 h-3 w-3" />
                    {[university.city, university.country].filter(Boolean).join(", ") || university.country}
                  </Badge>
                  <Link
                    to="/university/programs"
                    className="transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {programs.length} Courses
                    </Badge>
                  </Link>
                  <Link
                    to="/dashboard/agents"
                    className="transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Badge
                      variant="outline"
                      className="border-success/30 text-success hover:bg-success/10"
                    >
                      {agents.length} Partner Agents
                    </Badge>
                  </Link>
                </div>
                {university.description ? (
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {university.description}
                  </p>
                ) : null}
                {details.highlights.length > 0 ? (
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    {details.highlights.slice(0, 4).map((highlight, index) => (
                      <div
                        key={`${highlight}-${index}`}
                        className={withUniversitySurfaceSubtle(
                          "flex items-start gap-2 rounded-xl p-3 text-sm text-muted-foreground",
                        )}
                      >
                        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={withUniversitySurfaceTint("flex flex-col gap-4 rounded-2xl p-6 text-sm text-muted-foreground bg-muted/60")}> 
              <div className="flex items-center justify-between">
                <span>Total Applications</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatNumber(metrics.totalApplications)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pending Documents</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatNumber(metrics.pendingDocuments)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Acceptance Rate</span>
                <span className="text-lg font-semibold text-success">
                  {metrics.acceptanceRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>New This Week</span>
                <span className="text-lg font-semibold text-primary">
                  {formatNumber(metrics.newApplicationsThisWeek)}
                </span>
              </div>
              <Separator className="bg-border/40" />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Primary contact
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {primaryContact?.name ? (
                    <p className="font-medium text-foreground">{primaryContact.name}</p>
                  ) : null}
                  {primaryContact?.title ? <p>{primaryContact.title}</p> : null}
                  {primaryContact?.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${primaryContact.email}`}
                        className="hover:text-foreground"
                      >
                        {primaryContact.email}
                      </a>
                    </div>
                  ) : null}
                  {primaryContact?.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`tel:${primaryContact.phone}`}
                        className="hover:text-foreground"
                      >
                        {primaryContact.phone}
                      </a>
                    </div>
                  ) : null}
                  {university.website ? (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <a
                        href={university.website}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground"
                      >
                        {university.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Applications"
          value={formatNumber(metrics.totalApplications)}
          description="Total applications connected to your programs"
          icon={<FileStack className="h-5 w-5" />}
          tone="info"
          to="/university/applications"
        />
        <MetricCard
          label="Acceptance Rate"
          value={`${metrics.acceptanceRate}%`}
          description="Offer issuance vs total applications"
          icon={<Target className="h-5 w-5" />}
          tone="success"
          to="/university/offers"
        />
        <MetricCard
          label="New applications (7 days)"
          value={formatNumber(metrics.newApplicationsThisWeek)}
          description="Fresh submissions in the last week"
          icon={<Sparkles className="h-5 w-5" />}
          to="/university/applications"
        />
        <MetricCard
          label="Pending document requests"
          value={formatNumber(metrics.pendingDocuments)}
          description="Awaiting student uploads or verification"
          icon={<Inbox className="h-5 w-5" />}
          tone="warning"
          to="/university/documents"
          footer={
            <Link
              to="/university/documents"
              className="inline-flex items-center gap-1 text-primary hover:text-primary-foreground"
            >
              Manage requests →
            </Link>
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className={withUniversityCardStyles("lg:col-span-3 rounded-2xl text-card-foreground")}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applicant Pipeline
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Track progression across each recruitment stage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline.map((stage) => {
              const Icon = pipelineIcons[stage.key] ?? FileStack;
              return (
                <div
                  key={stage.key}
                  className={withUniversitySurfaceTint("rounded-xl p-4")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={withUniversitySurfaceSubtle("inline-flex h-9 w-9 items-center justify-center rounded-xl")}>
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {stage.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {formatNumber(stage.count)}
                      </p>
                      <p className="text-xs text-muted-foreground">{stage.percentage}% of total</p>
                    </div>
                  </div>
                  <Progress value={stage.percentage} className="mt-3 h-2 bg-primary/20" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={withUniversityCardStyles("lg:col-span-2 rounded-2xl text-card-foreground")}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Health
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Offer-to-enrolment conversion funnel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversion.map((metric) => (
              <div
                key={metric.key}
                className={withUniversitySurfaceTint("rounded-xl p-4 bg-muted/50")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                  <p className="text-2xl font-semibold text-success">
                    {metric.value}%
                  </p>
                </div>
                <Progress value={metric.value} className="mt-3 h-2 bg-primary/20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ApplicationSourcesChart data={countrySummary} />
        <ApplicationStatusChart data={statusSummary} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className={withUniversityCardStyles("lg:col-span-3 rounded-2xl text-card-foreground")}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent Applications
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest five submissions across your programs
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link to="/university/applications">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <StatePlaceholder
                icon={<CalendarPlus className="h-8 w-8 text-muted-foreground" />}
                title="No applications yet"
                description="Your most recent applications will appear here once agents or students submit them."
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
                    {recentApplications.map((application) => (
                      <tr key={application.id} className="text-muted-foreground">
                        <td className="py-3 font-medium text-foreground">
                          {application.appNumber}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span>{application.studentName}</span>
                            <span className="text-xs text-muted-foreground">
                              {application.studentNationality}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span>{application.programName}</span>
                            <span className="text-xs text-muted-foreground">
                              {application.programLevel}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={application.status} />
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground">
                          {formatDate(application.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={withUniversityCardStyles("lg:col-span-2 rounded-2xl text-card-foreground")}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Document Requests Snapshot
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Prioritise outstanding uploads to keep applications moving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={withUniversitySurfaceTint("flex items-center justify-between rounded-xl p-4 bg-muted/50")}>
              <div>
                <p className="text-sm font-semibold text-foreground">Pending requests</p>
                <p className="text-xs text-muted-foreground">
                  Awaiting student or agent uploads
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-warning/10 text-warning"
              >
                {formatNumber(metrics.pendingDocuments)}
              </Badge>
            </div>
            <div className={withUniversitySurfaceTint("flex items-center justify-between rounded-xl p-4 bg-muted/50")}>
              <div>
                <p className="text-sm font-semibold text-foreground">Documents received</p>
                <p className="text-xs text-muted-foreground">
                  Ready for compliance verification
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-success"
              >
                {formatNumber(metrics.receivedDocuments)}
              </Badge>
            </div>
            <div className={withUniversitySurfaceTint("rounded-xl p-4 bg-muted/50")}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Latest requests
              </p>
              <div className="mt-3 space-y-3">
                {documentRequests.slice(0, 3).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All document requests are up to date.
                  </p>
                ) : (
                  documentRequests.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {request.studentName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {request.requestType}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-border bg-muted/60 text-xs"
                      >
                        {request.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full justify-between text-primary hover:text-foreground"
                asChild
              >
                <Link to="/university/documents">
                  Review document queue <span aria-hidden>→</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default OverviewPage;

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getStudentStatusMeta,
  type StudentOperationalStatus,
} from "@/lib/studentStatus";
import { FileWarning, GraduationCap, Globe2, TrendingUp } from "lucide-react";

interface InsightStudent {
  operationalStatus: StudentOperationalStatus;
  preferred_country: string | null;
  current_country: string | null;
  applications: { status: string | null }[];
  documents: { admin_review_status: string | null }[];
}

interface Props {
  students: InsightStudent[];
}

// Investor-friendly palette using semantic-ish HSL accent values
const PIE_COLORS = [
  "hsl(217, 91%, 60%)", // blue
  "hsl(142, 71%, 45%)", // green
  "hsl(38, 92%, 55%)",  // amber
  "hsl(0, 84%, 60%)",   // red
  "hsl(262, 83%, 65%)", // violet
  "hsl(190, 90%, 50%)", // cyan
  "hsl(330, 80%, 60%)", // pink
  "hsl(160, 70%, 45%)", // teal
  "hsl(25, 90%, 55%)",  // orange
  "hsl(280, 70%, 60%)", // purple
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
  fontWeight: 500,
};

const tooltipItemStyle = {
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
};

const tooltipLabelStyle = {
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
};

// High-contrast tick color that adapts to light/dark mode
const axisTickStyle = {
  fontSize: 11,
  fill: "hsl(var(--foreground))",
  fontWeight: 500,
};

const axisStroke = "hsl(var(--foreground) / 0.4)";
const gridStroke = "hsl(var(--foreground) / 0.15)";

export const StudentInsightsCharts = ({ students }: Props) => {
  const total = students.length;

  const statusData = useMemo(() => {
    const counts = new Map<StudentOperationalStatus, number>();
    students.forEach((s) => {
      counts.set(s.operationalStatus, (counts.get(s.operationalStatus) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([status, value]) => ({
        name: getStudentStatusMeta(status).label,
        key: status,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  const countryData = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((s) => {
      const c = (s.preferred_country || s.current_country || "Unknown").trim();
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [students]);

  const applicationFunnel = useMemo(() => {
    let withApp = 0;
    let submitted = 0;
    let offer = 0;
    let enrolled = 0;
    students.forEach((s) => {
      if (s.applications.length > 0) withApp += 1;
      s.applications.forEach((a) => {
        const st = (a.status || "").toLowerCase();
        if (st && st !== "draft") submitted += 1;
        if (
          st.includes("offer") ||
          st === "conditional_offer" ||
          st === "unconditional_offer" ||
          st === "admitted"
        )
          offer += 1;
        if (st === "enrolled") enrolled += 1;
      });
    });
    return [
      { name: "Has Application", value: withApp },
      { name: "Submitted", value: submitted },
      { name: "Offer Received", value: offer },
      { name: "Enrolled", value: enrolled },
    ];
  }, [students]);

  const headlineKpis = useMemo(() => {
    const outstanding = students.filter(
      (s) => s.operationalStatus === "outstanding_documents"
    ).length;
    const inPipeline = students.filter((s) =>
      [
        "application_submitted",
        "under_review",
        "offer_received",
        "admission_granted",
        "cas_loa_issued",
        "visa_stage",
      ].includes(s.operationalStatus)
    ).length;
    const enrolled = students.filter((s) => s.operationalStatus === "enrolled").length;
    const countriesReached = new Set(
      students
        .map((s) => (s.preferred_country || s.current_country || "").trim())
        .filter(Boolean)
    ).size;
    const conversionRate = total > 0 ? Math.round((enrolled / total) * 100) : 0;
    return { outstanding, inPipeline, enrolled, countriesReached, conversionRate };
  }, [students, total]);

  if (total === 0) return null;

  return (
    <div className="space-y-4">
      {/* Investor headline KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription>Outstanding Documents</CardDescription>
            <FileWarning className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{headlineKpis.outstanding}</div>
            <p className="text-xs text-muted-foreground">
              {total > 0
                ? `${Math.round((headlineKpis.outstanding / total) * 100)}% of all students`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription>In Admission Pipeline</CardDescription>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{headlineKpis.inPipeline}</div>
            <p className="text-xs text-muted-foreground">
              Active applications progressing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription>Successfully Enrolled</CardDescription>
            <GraduationCap className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{headlineKpis.enrolled}</div>
            <p className="text-xs text-muted-foreground">
              {headlineKpis.conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription>Destination Countries</CardDescription>
            <Globe2 className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{headlineKpis.countriesReached}</div>
            <p className="text-xs text-muted-foreground">
              Global student demand reach
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Student Status Breakdown</CardTitle>
            <CardDescription>
              Distribution across the admission journey
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {statusData.map((entry, idx) => (
                    <Cell
                      key={entry.key}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))", fontWeight: 500 }}
                  iconSize={10}
                  layout="horizontal"
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top Destination Countries</CardTitle>
            <CardDescription>Where students want to study</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={countryData}
                layout="vertical"
                margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={axisTickStyle} stroke={axisStroke} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={86}
                  tick={axisTickStyle}
                  stroke={axisStroke}
                />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "hsl(var(--foreground) / 0.08)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {countryData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Application Funnel</CardTitle>
            <CardDescription>Conversion through key milestones</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={applicationFunnel}
                margin={{ top: 5, right: 12, left: 0, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="name"
                  tick={axisTickStyle}
                  stroke={axisStroke}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis allowDecimals={false} tick={axisTickStyle} stroke={axisStroke} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "hsl(var(--foreground) / 0.08)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {applicationFunnel.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentInsightsCharts;

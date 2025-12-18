import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePlaceholder } from "../common/StatePlaceholder";
import { withUniversityCardStyles } from "../common/cardStyles";
import { Globe2 } from "lucide-react";
import type { ChartDatum } from "../layout/UniversityDashboardLayout";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
];

interface ApplicationSourcesChartProps {
  data: ChartDatum[];
}

export const ApplicationSourcesChart = ({
  data,
}: ApplicationSourcesChartProps) => {
  return (
    <Card className={withUniversityCardStyles("h-full rounded-2xl bg-muted/40")}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Applications by Country
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <StatePlaceholder
            icon={<Globe2 className="h-8 w-8 text-muted-foreground" />}
            title="No application data yet"
            description="As soon as applications are submitted, we will visualise source markets here."
            className="h-full bg-transparent"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                fill="hsl(var(--primary))"
                dataKey="value"
                label={({ name, percent, cx, cy, midAngle, outerRadius }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius * 1.35;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="hsl(var(--foreground))"
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                      className="text-xs font-medium"
                    >
                      {`${name}: ${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color ?? COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "12px",
                  color: "hsl(var(--card-foreground))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

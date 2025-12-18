import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePlaceholder } from "../common/StatePlaceholder";
import { withUniversityCardStyles } from "../common/cardStyles";
import { CheckCircle } from "lucide-react";
import type { ChartDatum } from "../layout/UniversityDashboardLayout";

interface ApplicationStatusChartProps {
  data: ChartDatum[];
}

export const ApplicationStatusChart = ({
  data,
}: ApplicationStatusChartProps) => {
  return (
    <Card className={withUniversityCardStyles("h-full rounded-2xl bg-muted/40")}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Outcomes
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.every((item) => item.value === 0) ? (
          <StatePlaceholder
            icon={<CheckCircle className="h-8 w-8 text-muted-foreground" />}
            title="No outcome data yet"
            description="Outcome data will populate once applications progress through offers and enrolment."
            className="h-full bg-transparent"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "12px",
                  color: "hsl(var(--card-foreground))",
                }}
              />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color ?? "hsl(var(--primary))"}
                    className="rounded-lg"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

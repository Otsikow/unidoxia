import { formatUkDate } from '@/lib/dateFormat';
import { useState } from "react";
import { Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StaffPagination from "@/components/staff/StaffPagination";
import { useStaffAgents, STAFF_PAGE_SIZE } from "@/hooks/useStaffData";

const formatRate = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return `${value.toFixed(1)}%`;
};

export function StaffAgentsLeaderboard() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useStaffAgents(page);

  const total = (data as any)?.total ?? 0;
  const rows = (data as any)?.data ?? [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-primary" /> Agents
        </CardTitle>
        <CardDescription>Monitor partner performance and conversion trendlines.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/40">
                <TableHead>Agent</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isFetching) && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="space-y-3 py-6">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-6 w-full" />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No agents found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>{agent.region ?? "—"}</TableCell>
                  <TableCell className="text-right">{agent.totalStudents}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      {formatRate(agent.conversionRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {agent.updatedAt ? formatUkDate(agent.updatedAt) : "Not set"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <StaffPagination page={page} total={total} pageSize={STAFF_PAGE_SIZE} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

export default StaffAgentsLeaderboard;

import { formatUkDateTime } from '@/lib/dateFormat';
import { useState } from "react";
import { Users, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StaffPagination from "@/components/staff/StaffPagination";
import { useStaffStudents, STAFF_PAGE_SIZE } from "@/hooks/useStaffData";
import { useAuth } from "@/hooks/useAuth";
import InviteStudentDialog from "@/components/students/InviteStudentDialog";

export function StaffStudentsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const { profile } = useAuth();

  const tenantId = profile?.tenant_id;
  const counselorId = profile?.id;
  const { data, isLoading, isFetching } = useStaffStudents(page, search);

  const total = (data as any)?.total ?? 0;
  const rows = (data as any)?.data ?? [];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" /> Students
          </CardTitle>
          <CardDescription>Live roster synced with Zoe’s risk telemetry.</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <InviteStudentDialog
            tenantId={tenantId}
            counselorProfileId={counselorId}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            disabled={!tenantId || !counselorId}
            onSuccess={() => setPage(1)}
          />
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search students"
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/40">
                <TableHead className="w-[220px]">Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Last updated</TableHead>
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
                    No students found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">{student.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {student.status ?? "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.assignedStaff ?? "Unassigned"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.applications.slice(0, 3).map((app) => (
                        <Badge key={app.id} variant="secondary" className="capitalize">
                          {app.status ?? "pending"}
                        </Badge>
                      ))}
                      {student.applications.length > 3 && (
                        <Badge variant="outline">+{student.applications.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUkDateTime(student.updatedAt)}
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

export default StaffStudentsTable;

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StaffPagination from "@/components/staff/StaffPagination";
import { useStaffPayments, STAFF_PAGE_SIZE } from "@/hooks/useStaffData";

const statusVariants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  paid: { label: "Paid", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  overdue: { label: "Overdue", variant: "default" },
};

export function StaffPaymentsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useStaffPayments(page);

  const total = (data as any)?.total ?? 0;
  const rows = (data as any)?.data ?? [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" /> Payments
        </CardTitle>
        <CardDescription>Reconcile payment milestones and status updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/40">
                <TableHead>Reference</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
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
                    No payments scheduled.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((payment) => {
                const detail = statusVariants[(payment.status ?? "pending").toLowerCase()] ?? statusVariants.pending;
                return (
                  <TableRow key={payment.id} className="hover:bg-muted/40">
                    <TableCell>{payment.reference}</TableCell>
                    <TableCell>{payment.studentName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={detail.variant}>{detail.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.dueAt ? new Date(payment.dueAt).toLocaleDateString('en-GB') : "Not set"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: payment.currency ?? "USD",
                        minimumFractionDigits: 0,
                      }).format(payment.amount ?? 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <StaffPagination page={page} total={total} pageSize={STAFF_PAGE_SIZE} onChange={setPage} />
      </CardContent>
    </Card>
  );
}

export default StaffPaymentsTable;

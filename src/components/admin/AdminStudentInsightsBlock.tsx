"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/LoadingState";
import { StudentInsightsCharts } from "@/components/admin/StudentInsightsCharts";
import {
  deriveStudentStatus,
  type StudentOperationalStatus,
} from "@/lib/studentStatus";

interface StudentLite {
  id: string;
  current_country: string | null;
  preferred_country: string | null;
  manual_status: string | null;
  archived_at: string | null;
  operationalStatus: StudentOperationalStatus;
  applications: { status: string | null }[];
  documents: { admin_review_status: string | null }[];
}

/**
 * Compact student insights for the admin dashboard.
 * Mirrors the data shape used by AdminStudents but fetches only what the
 * insights charts need, keeping the dashboard light-weight.
 */
export const AdminStudentInsightsBlock = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const userRole = profile?.role ?? null;

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const select = `
        id,
        current_country,
        preferred_country,
        manual_status,
        archived_at,
        applications ( status ),
        documents:student_documents ( admin_review_status )
      `;

      const runQuery = async (scopeToTenant: boolean) => {
        let query = supabase.from("students").select(select);
        if (scopeToTenant && tenantId) query = query.eq("tenant_id", tenantId);
        return query.order("created_at", { ascending: false });
      };

      try {
        const canUseUnscoped = userRole === "admin" || userRole === "staff";
        const variants = tenantId
          ? [true, ...(canUseUnscoped ? [false] : [])]
          : [false];
        let response: Awaited<ReturnType<typeof runQuery>> | null = null;
        for (const scopeToTenant of variants) {
          response = await runQuery(scopeToTenant);
          if (response.error) throw response.error;
          if ((response.data?.length ?? 0) > 0 || !scopeToTenant) break;
        }
        const mapped = (response?.data ?? []).map((s: any) => ({
          ...s,
          operationalStatus: deriveStudentStatus(s),
        })) as StudentLite[];
        if (!cancelled) setStudents(mapped);
      } catch (err) {
        console.error("AdminStudentInsightsBlock: failed to load students", err);
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, userRole]);

  const summary = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => !s.archived_at).length;
    const pendingReview = students.filter((s) =>
      s.documents.some((d) => d.admin_review_status === "awaiting_admin_review"),
    ).length;
    return { total, active, pendingReview };
  }, [students]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg font-semibold">
          Student insights
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          A quick snapshot of your student base, pipeline, and geographic reach.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simple summary numbers */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="text-xl sm:text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
              Active
            </p>
            <p className="text-xl sm:text-2xl font-semibold">{summary.active}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
              Pending review
            </p>
            <p className="text-xl sm:text-2xl font-semibold">
              {summary.pendingReview}
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading student insights" size="sm" />
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No student data available yet.
          </p>
        ) : (
          <StudentInsightsCharts students={students as any} />
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStudentInsightsBlock;

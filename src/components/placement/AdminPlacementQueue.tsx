import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  placementClient,
  placementError,
  placementStatuses,
  placementCaseSchema,
} from "@/lib/placement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
export function AdminPlacementQueue() {
  const { user, profile } = useAuth();
  const [page, setPage] = useState(0);
  const [view, setView] = useState("pending");
  const query = useQuery({
    queryKey: ["admin-placement-queue", user?.id, page, view],
    enabled: Boolean(user?.id),
    retry: false,
    queryFn: async () => {
      const statuses =
        view === "pending"
          ? (["submitted", "reviewing", "changes_requested"] as const)
          : (["recommendations_ready"] as const);
      const { data, error, count } = await placementClient
        .from("student_placement_cases")
        .select("*", { count: "exact" })
        .in("status", statuses)
        .order("submitted_at", { ascending: true })
        .order("student_id")
        .range(page * 20, page * 20 + 19);
      if (error) throw error;
      const cases = (data || []).map((v) => placementCaseSchema.parse(v));
      if (!cases.length) return { cases: [], total: count ?? 0 };
      const students = await supabase
        .from("students")
        .select("id,legal_name,reference_code")
        .in(
          "id",
          cases.map((c) => c.student_id),
        );
      if (students.error) throw students.error;
      return {
        cases: cases.map((c) => ({
          ...c,
          student: students.data?.find((s) => s.id === c.student_id),
        })),
        total: count ?? null,
      };
    },
  });
  const rows = query.data?.cases || [];
  return (
    <section
      aria-labelledby="placement-queue-title"
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="placement-queue-title" className="text-lg font-semibold">
          Adviser placement reviews
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          Refresh placement reviews
        </Button>
      </div>
      <div>
        <label
          className="text-sm font-medium mr-3"
          htmlFor="placement-queue-view"
        >
          Review queue
        </label>
        <select
          id="placement-queue-view"
          className="border rounded-md bg-background p-2"
          value={view}
          onChange={(e) => {
            setView(e.target.value);
            setPage(0);
          }}
        >
          <option value="pending">Needs review or matching</option>
          <option value="shared">Shared recommendations and responses</option>
        </select>
      </div>
      {query.isLoading ? (
        <p role="status">Loading study-plan reviews…</p>
      ) : query.error ? (
        <p role="alert">{placementError(query.error)}</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">
          No study plans in this queue.
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {rows.map((c) => (
              <li
                key={c.student_id}
                className="py-3 flex flex-col sm:flex-row sm:justify-between gap-2"
              >
                <Link
                  className="underline font-medium"
                  to={`${profile?.role === "admin" ? "/admin/students" : "/dashboard/placement"}/${c.student_id}?tab=placement`}
                >
                  {c.student?.legal_name || "Open student"}{" "}
                  {c.student?.reference_code && `(${c.student.reference_code})`}
                </Link>
                <span className="text-sm">{placementStatuses[c.status]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!query.error && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || query.isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous reviews
          </Button>
          <span className="text-sm">
            Page {page + 1}
            {query.data?.total != null
              ? ` · ${query.data.total} study plans`
              : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={
              query.isFetching ||
              rows.length < 20 ||
              (query.data?.total != null && (page + 1) * 20 >= query.data.total)
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Next reviews
          </Button>
        </div>
      )}
    </section>
  );
}

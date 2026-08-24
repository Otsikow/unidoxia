import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminComparisonData() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-comparison-data-review"],
    queryFn: async () => {
      const client = supabase as any;
      const [profiles, defaults, proposals] = await Promise.all([
        client.from("program_comparison_profiles").select("program_id, verification_status, review_due_at, last_verified_at, source_url"),
        client.from("university_comparison_defaults").select("university_id, verification_status, review_due_at, last_verified_at, source_url"),
        client.from("catalogue_change_proposals").select("id, status, detected_at, source_url, proposed_changes").eq("status", "pending").order("detected_at", { ascending: false }).limit(20),
      ]);
      if (profiles.error) throw profiles.error;
      if (defaults.error) throw defaults.error;
      if (proposals.error) throw proposals.error;
      const records = [...(profiles.data ?? []), ...(defaults.data ?? [])];
      const now = Date.now();
      return {
        total: records.length,
        verified: records.filter((record) => record.verification_status === "verified").length,
        needsReview: records.filter((record) => record.verification_status !== "verified" || (record.review_due_at && new Date(record.review_due_at).getTime() <= now)).length,
        missingSource: records.filter((record) => !record.source_url || !record.last_verified_at).length,
        proposals: proposals.data ?? [],
      };
    },
  });

  const metrics = [
    { label: "Comparison records", value: data?.total ?? 0, icon: Database },
    { label: "Verified and current", value: data?.verified ?? 0, icon: CheckCircle2 },
    { label: "Needs review", value: data?.needsReview ?? 0, icon: Clock3 },
    { label: "Missing source evidence", value: data?.missingSource ?? 0, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div><h1 className="text-3xl font-bold">Comparison data review</h1><p className="mt-1 text-muted-foreground">Monitor programme costs, requirements, freshness and automated change proposals before they reach students.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{isLoading ? "—" : value}</p></div><Icon className="h-6 w-6 text-primary" /></CardContent></Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle>Pending automated research proposals</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && !data?.proposals.length && <p className="text-sm text-muted-foreground">No proposals are awaiting review.</p>}
          {data?.proposals.map((proposal: any) => (
            <div key={proposal.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">Detected {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(proposal.detected_at))}</p><a className="text-sm text-primary underline" href={proposal.source_url} target="_blank" rel="noreferrer">Review official source</a></div>
              <Badge variant="outline">Approval required</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Public records are visible only when they have a source URL, a verification date and a Verified status. The scheduled freshness function marks records Outdated after their review date or six months.</p>
    </div>
  );
}

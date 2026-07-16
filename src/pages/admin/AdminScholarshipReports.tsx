import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ShieldCheck, Clock, Archive, TrendingUp } from "lucide-react";

type Row = {
  id: string;
  title: string | null;
  status: string;
  verification_status: string;
  last_verified_at: string | null;
  deadline: string | null;
  country: string | null;
  institution_name: string | null;
  updated_at: string;
};

type LogRow = {
  id: string;
  action: string;
  notes: string | null;
  created_at: string;
  scholarship_id: string;
};

type SourceRow = {
  id: string;
  name: string;
  trust_level: string;
  last_checked_at: string | null;
};

const STALE_DAYS = 30;

export default function AdminScholarshipReports() {
  const [scholarships, setScholarships] = useState<Row[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, l, src] = await Promise.all([
        (supabase as any)
          .from("scholarships")
          .select("id, title, status, verification_status, last_verified_at, deadline, country, institution_name, updated_at")
          .order("updated_at", { ascending: false }),
        (supabase as any)
          .from("scholarship_verification_logs")
          .select("id, action, notes, created_at, scholarship_id")
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("scholarship_sources")
          .select("id, name, trust_level, last_checked_at"),
      ]);
      setScholarships((s.data ?? []) as Row[]);
      setLogs((l.data ?? []) as LogRow[]);
      setSources((src.data ?? []) as SourceRow[]);
      setLoading(false);
    })();
  }, []);

  const now = Date.now();
  const isStale = (r: Row) =>
    !r.last_verified_at || now - new Date(r.last_verified_at).getTime() > STALE_DAYS * 86400_000;

  const published = scholarships.filter((r) => r.status === "Published").length;
  const upcoming = scholarships.filter((r) => r.status === "Upcoming").length;
  const pending = scholarships.filter((r) => r.status === "Pending Approval").length;
  const closed = scholarships.filter((r) => r.status === "Closed" || r.status === "Archived").length;
  const stale = scholarships.filter((r) => r.status === "Published" && isStale(r));
  const expiringSoon = scholarships.filter((r) => {
    if (!r.deadline || r.status !== "Published") return false;
    const d = new Date(r.deadline).getTime();
    return d > now && d - now < 14 * 86400_000;
  });
  const staleSources = sources.filter((s) => !s.last_checked_at || now - new Date(s.last_checked_at).getTime() > 60 * 86400_000);

  const byCountry = new Map<string, number>();
  scholarships.filter((r) => r.status === "Published").forEach((r) => {
    const c = r.country ?? "—";
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
  });
  const topCountries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading reports…</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Scholarship reports</h1>
        <p className="text-sm text-muted-foreground">Editorial health, verification freshness, and portfolio coverage.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <Kpi title="Published" value={published} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
        <Kpi title="Upcoming" value={upcoming} icon={<Clock className="h-4 w-4 text-blue-600" />} />
        <Kpi title="Pending" value={pending} icon={<ShieldCheck className="h-4 w-4 text-amber-600" />} />
        <Kpi title="Closed/Archived" value={closed} icon={<Archive className="h-4 w-4 text-muted-foreground" />} />
        <Kpi title="Stale >30d" value={stale.length} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
        <Kpi title="Expiring <14d" value={expiringSoon.length} icon={<TrendingUp className="h-4 w-4 text-rose-600" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Needs re-verification</CardTitle></CardHeader>
          <CardContent>
            {stale.length === 0 ? <p className="text-sm text-muted-foreground">All published scholarships are fresh.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Last verified</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {stale.slice(0, 10).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.last_verified_at ? new Date(r.last_verified_at).toLocaleDateString() : "Never"}</TableCell>
                      <TableCell className="text-right"><Link to="/admin/scholarships" className="text-primary text-xs">Review</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-rose-600" /> Expiring within 14 days</CardTitle></CardHeader>
          <CardContent>
            {expiringSoon.length === 0 ? <p className="text-sm text-muted-foreground">No published scholarships closing soon.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expiringSoon.slice(0, 10).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Coverage by country (Published)</CardTitle></CardHeader>
          <CardContent>
            {topCountries.length === 0 ? <p className="text-sm text-muted-foreground">No published scholarships yet.</p> : (
              <ul className="space-y-2">
                {topCountries.map(([c, n]) => (
                  <li key={c} className="flex items-center justify-between text-sm">
                    <span>{c}</span>
                    <Badge variant="outline">{n}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Source health</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <Kpi title="Total" value={sources.length} />
              <Kpi title="Official" value={sources.filter((s) => s.trust_level === "official").length} />
              <Kpi title="Stale >60d" value={staleSources.length} />
            </div>
            <Link to="/admin/scholarship-sources" className="text-xs text-primary">Manage source directory →</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent verification activity</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">No verification activity yet.</p> : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="text-sm border-l-2 border-primary/40 pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{l.action}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                  </div>
                  {l.notes ? <p className="text-xs text-muted-foreground mt-0.5">{l.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value, icon }: { title: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">{title}{icon}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

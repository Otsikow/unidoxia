"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, ShieldCheck, Plus, ExternalLink, Archive, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

type ScholarshipRow = {
  id: string;
  title: string | null;
  name: string | null;
  slug: string | null;
  academic_year: string | null;
  country: string | null;
  institution_name: string | null;
  sponsor_name: string | null;
  study_level: string | null;
  funding_type: string | null;
  scholarship_value: string | null;
  subject_areas: string[] | null;
  eligible_nationalities: string[] | null;
  african_students_eligible: boolean | null;
  academic_requirements: string | null;
  english_requirements: string | null;
  work_experience_requirements: string | null;
  age_requirements: string | null;
  opening_date: string | null;
  deadline: string | null;
  admission_required_first: boolean | null;
  separate_application_required: boolean | null;
  application_steps: string[] | null;
  official_source_url: string | null;
  official_application_url: string | null;
  summary: string | null;
  full_description: string | null;
  important_conditions: string | null;
  status: string;
  verification_status: string;
  verification_checklist: Record<string, boolean> | null;
  featured: boolean | null;
  last_verified_at: string | null;
  published_at: string | null;
  internal_notes: string | null;
  number_of_awards: number | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = ["Researching","Draft","Verified","Awaiting Approval","Published","Closing Soon","Upcoming","Closed","Archived"];
const VERIFICATION_OPTIONS = ["Unverified","Partially Verified","Fully Verified","Needs Rechecking"];
const FUNDING_OPTIONS = ["Fully funded","Partially funded","Tuition only","Stipend only","Travel only"];
const LEVELS = ["Undergraduate","Masters","PhD","Foundation","Diploma","Undergraduate / Postgraduate","Any"];

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "title_sponsor", label: "Title, sponsor and hosting institution verified on official site" },
  { key: "country_level", label: "Country of study and study level verified" },
  { key: "eligibility", label: "Eligibility (nationality, prior study, experience) verified" },
  { key: "funding", label: "Funding scope verified — partial not called full" },
  { key: "deadline", label: "Deadline verified (with timezone if provided)" },
  { key: "separate_app", label: "Separate scholarship application requirement confirmed" },
  { key: "official_url", label: "Official application URL is live" },
];

const db = supabase as any;

const statusVariant = (s: string) => {
  switch (s) {
    case "Published": return "default";
    case "Closing Soon": return "destructive";
    case "Upcoming": return "secondary";
    case "Verified": case "Awaiting Approval": return "secondary";
    case "Closed": case "Archived": return "outline";
    default: return "outline";
  }
};

const emptyForm = (): Partial<ScholarshipRow> => ({
  title: "",
  slug: "",
  academic_year: "",
  country: "United Kingdom",
  institution_name: "",
  sponsor_name: "",
  study_level: "Masters",
  funding_type: "Partially funded",
  scholarship_value: "",
  subject_areas: [],
  eligible_nationalities: [],
  african_students_eligible: true,
  academic_requirements: "",
  english_requirements: "",
  work_experience_requirements: "",
  opening_date: null,
  deadline: null,
  admission_required_first: true,
  separate_application_required: false,
  application_steps: [],
  official_source_url: "",
  official_application_url: "",
  summary: "",
  full_description: "",
  important_conditions: "",
  status: "Draft",
  verification_status: "Unverified",
  verification_checklist: {},
  featured: false,
  number_of_awards: null,
  internal_notes: "",
});

const arrayField = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export default function AdminScholarships() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ScholarshipRow> | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-scholarships"],
    queryFn: async () => {
      const { data, error } = await db
        .from("scholarships")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScholarshipRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.title, r.name, r.institution_name, r.sponsor_name, r.country, r.academic_year]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  const kpis = useMemo(() => ({
    total: rows.length,
    published: rows.filter((r) => ["Published","Closing Soon","Upcoming"].includes(r.status)).length,
    awaiting: rows.filter((r) => r.status === "Awaiting Approval").length,
    stale: rows.filter((r) => {
      if (!r.last_verified_at) return true;
      const days = (Date.now() - new Date(r.last_verified_at).getTime()) / 86400000;
      return days > 45 && !["Archived","Closed"].includes(r.status);
    }).length,
  }), [rows]);

  const checkDuplicates = async (form: Partial<ScholarshipRow>) => {
    const { data, error } = await db.rpc("find_scholarship_duplicates", {
      p_title: form.title ?? "",
      p_institution: form.institution_name ?? "",
      p_sponsor: form.sponsor_name ?? "",
      p_source_url: form.official_source_url ?? null,
      p_application_url: form.official_application_url ?? null,
      p_academic_year: form.academic_year ?? "",
      p_exclude_id: form.id ?? null,
    });
    if (error) return [];
    return (data ?? []) as any[];
  };

  const openCreate = () => { setEditing(emptyForm()); setDuplicates([]); setEditorOpen(true); };
  const openEdit = (r: ScholarshipRow) => { setEditing({ ...r }); setDuplicates([]); setEditorOpen(true); };

  const save = async (opts?: { publish?: boolean; submitForApproval?: boolean }) => {
    if (!editing) return;
    if (!editing.title || !editing.institution_name || !editing.country || !editing.official_source_url) {
      toast({ title: "Missing required fields", description: "Title, institution, country and official source URL are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const dupes = await checkDuplicates(editing);
      if (dupes.length && !editing.id) {
        setDuplicates(dupes);
        setSaving(false);
        return;
      }
      const payload: any = { ...editing };
      payload.name = payload.title; // keep legacy column populated
      payload.slug = payload.slug || (payload.title as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      if (opts?.submitForApproval) payload.status = "Awaiting Approval";
      if (opts?.publish) {
        payload.status = "Published";
        payload.published_at = new Date().toISOString();
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id) payload.approved_by = u.user.id;
      }

      const { id, created_at, updated_at, ...toWrite } = payload;
      const res = id
        ? await db.from("scholarships").update(toWrite).eq("id", id)
        : await db.from("scholarships").insert(toWrite);
      if (res.error) throw res.error;

      toast({ title: id ? "Scholarship updated" : "Scholarship created" });
      setEditorOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const quickAction = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await db.from("scholarships").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
      toast({ title: "Updated" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const markVerified = (r: ScholarshipRow) => {
    quickAction.mutate({ id: r.id, patch: {
      verification_status: "Fully Verified",
      last_verified_at: new Date().toISOString(),
      status: r.status === "Researching" || r.status === "Draft" ? "Verified" : r.status,
    }});
  };

  const publishNow = async (r: ScholarshipRow) => {
    const { data: u } = await supabase.auth.getUser();
    quickAction.mutate({ id: r.id, patch: {
      status: "Published",
      published_at: new Date().toISOString(),
      approved_by: u?.user?.id ?? null,
    }});
  };

  const archive = (r: ScholarshipRow) => quickAction.mutate({ id: r.id, patch: { status: "Archived" } });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Scholarship management</h1>
          <p className="text-sm text-muted-foreground">Curate, verify and publish scholarship opportunities for the public site.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New scholarship</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total" value={kpis.total} />
        <KpiCard title="Live on site" value={kpis.published} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
        <KpiCard title="Awaiting approval" value={kpis.awaiting} icon={<Send className="h-4 w-4 text-blue-600" />} />
        <KpiCard title="Needs re-verification" value={kpis.stale} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>All scholarships</CardTitle>
            <CardDescription>Includes drafts, verified entries, published records and archives.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search title, institution, country…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <button className="text-left hover:underline" onClick={() => openEdit(r)}>{r.title ?? r.name}</button>
                      {r.academic_year && <div className="text-xs text-muted-foreground">{r.academic_year}</div>}
                    </TableCell>
                    <TableCell>{r.institution_name ?? "—"}</TableCell>
                    <TableCell>{r.country ?? "—"}</TableCell>
                    <TableCell>{r.deadline ? format(new Date(r.deadline), "d MMM yyyy") : "Rolling"}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status) as any}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        {r.verification_status === "Fully Verified" && <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                        {r.verification_status}
                      </div>
                      {r.last_verified_at && <div className="text-xs text-muted-foreground">{format(new Date(r.last_verified_at), "d MMM yyyy")}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                        {r.verification_status !== "Fully Verified" && (
                          <Button size="sm" variant="ghost" onClick={() => markVerified(r)}>Verify</Button>
                        )}
                        {r.status !== "Published" && r.status !== "Archived" && (
                          <Button size="sm" variant="ghost" onClick={() => publishNow(r)}>Publish</Button>
                        )}
                        {r.status !== "Archived" && (
                          <Button size="sm" variant="ghost" onClick={() => archive(r)}><Archive className="h-3.5 w-3.5" /></Button>
                        )}
                        {r.official_source_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={r.official_source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No scholarships match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit scholarship" : "New scholarship"}</DialogTitle>
            <DialogDescription>All published entries must be verified against the official source.</DialogDescription>
          </DialogHeader>

          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm">
              <div className="font-semibold mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Possible duplicates found</div>
              <ul className="space-y-1">
                {duplicates.map((d) => (
                  <li key={d.id}>• {d.title} — {d.institution_name} ({d.academic_year}) — {d.match_reason}</li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDuplicates([])}>Ignore and save anyway</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditorOpen(false); setEditing(null); }}>Cancel</Button>
              </div>
            </div>
          )}

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title *"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Academic year"><Input placeholder="2026/27" value={editing.academic_year ?? ""} onChange={(e) => setEditing({ ...editing, academic_year: e.target.value })} /></Field>
              <Field label="Institution *"><Input value={editing.institution_name ?? ""} onChange={(e) => setEditing({ ...editing, institution_name: e.target.value })} /></Field>
              <Field label="Sponsor"><Input value={editing.sponsor_name ?? ""} onChange={(e) => setEditing({ ...editing, sponsor_name: e.target.value })} /></Field>
              <Field label="Country *">
                <Select value={editing.country ?? ""} onValueChange={(v) => setEditing({ ...editing, country: v })}>
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    {["United Kingdom","Canada","United States","Ireland","Australia","Germany","Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Study level">
                <Select value={editing.study_level ?? ""} onValueChange={(v) => setEditing({ ...editing, study_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Funding type">
                <Select value={editing.funding_type ?? ""} onValueChange={(v) => setEditing({ ...editing, funding_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FUNDING_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Scholarship value"><Input placeholder="£10,000 tuition discount" value={editing.scholarship_value ?? ""} onChange={(e) => setEditing({ ...editing, scholarship_value: e.target.value })} /></Field>
              <Field label="Subject areas (comma separated)"><Input value={(editing.subject_areas ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, subject_areas: arrayField(e.target.value) })} /></Field>
              <Field label="Eligible nationalities (comma separated)"><Input value={(editing.eligible_nationalities ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, eligible_nationalities: arrayField(e.target.value) })} /></Field>
              <Field label="Opening date"><Input type="date" value={editing.opening_date ?? ""} onChange={(e) => setEditing({ ...editing, opening_date: e.target.value || null })} /></Field>
              <Field label="Deadline"><Input type="date" value={editing.deadline ?? ""} onChange={(e) => setEditing({ ...editing, deadline: e.target.value || null })} /></Field>
              <Field label="Official source URL *"><Input value={editing.official_source_url ?? ""} onChange={(e) => setEditing({ ...editing, official_source_url: e.target.value })} /></Field>
              <Field label="Official application URL"><Input value={editing.official_application_url ?? ""} onChange={(e) => setEditing({ ...editing, official_application_url: e.target.value })} /></Field>
              <Field label="Number of awards"><Input type="number" value={editing.number_of_awards ?? ""} onChange={(e) => setEditing({ ...editing, number_of_awards: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Academic requirements"><Textarea rows={2} value={editing.academic_requirements ?? ""} onChange={(e) => setEditing({ ...editing, academic_requirements: e.target.value })} /></Field>
              <Field label="English requirements"><Textarea rows={2} value={editing.english_requirements ?? ""} onChange={(e) => setEditing({ ...editing, english_requirements: e.target.value })} /></Field>
              <Field label="Work experience requirements"><Textarea rows={2} value={editing.work_experience_requirements ?? ""} onChange={(e) => setEditing({ ...editing, work_experience_requirements: e.target.value })} /></Field>
              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.african_students_eligible} onCheckedChange={(v) => setEditing({ ...editing, african_students_eligible: v })} /> African students eligible</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.admission_required_first} onCheckedChange={(v) => setEditing({ ...editing, admission_required_first: v })} /> Admission required first</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.separate_application_required} onCheckedChange={(v) => setEditing({ ...editing, separate_application_required: v })} /> Separate application required</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /> Featured</label>
              </div>
              <Field label="Summary" className="md:col-span-2"><Textarea rows={2} value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></Field>
              <Field label="Full description" className="md:col-span-2"><Textarea rows={4} value={editing.full_description ?? ""} onChange={(e) => setEditing({ ...editing, full_description: e.target.value })} /></Field>
              <Field label="Important conditions / disclaimer" className="md:col-span-2"><Textarea rows={2} value={editing.important_conditions ?? ""} onChange={(e) => setEditing({ ...editing, important_conditions: e.target.value })} /></Field>
              <Field label="Application steps (one per line)" className="md:col-span-2">
                <Textarea rows={4} value={(editing.application_steps ?? []).join("\n")} onChange={(e) => setEditing({ ...editing, application_steps: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
              </Field>

              <div className="md:col-span-2 border rounded-md p-3">
                <div className="font-semibold text-sm mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verification checklist</div>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map((c) => (
                    <label key={c.key} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={!!editing.verification_checklist?.[c.key]}
                        onCheckedChange={(v) => setEditing({ ...editing, verification_checklist: { ...(editing.verification_checklist ?? {}), [c.key]: !!v } })}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs">Verification status</Label>
                    <Select value={editing.verification_status ?? "Unverified"} onValueChange={(v) => setEditing({ ...editing, verification_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VERIFICATION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={editing.status ?? "Draft"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Field label="Internal notes" className="md:col-span-2"><Textarea rows={2} value={editing.internal_notes ?? ""} onChange={(e) => setEditing({ ...editing, internal_notes: e.target.value })} /></Field>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setEditorOpen(false); setEditing(null); }}>Cancel</Button>
            <Button variant="outline" onClick={() => save()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save draft
            </Button>
            <Button variant="outline" onClick={() => save({ submitForApproval: true })} disabled={saving}>Submit for approval</Button>
            <Button onClick={() => save({ publish: true })} disabled={saving}>Publish now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
          {icon}
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

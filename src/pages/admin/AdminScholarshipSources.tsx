import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, ShieldCheck } from "lucide-react";

type SourceRow = {
  id: string;
  name: string;
  organisation: string | null;
  website_url: string;
  country: string | null;
  trust_level: string;
  notes: string | null;
  last_checked_at: string | null;
  created_at: string;
};

const TRUST_LEVELS = ["unverified", "trusted", "official", "flagged"] as const;

const EMPTY = {
  name: "",
  organisation: "",
  website_url: "",
  country: "",
  trust_level: "unverified",
  notes: "",
};

export default function AdminScholarshipSources() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("scholarship_sources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as SourceRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.organisation, r.country, r.website_url].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const submit = async () => {
    if (!form.name.trim() || !form.website_url.trim()) {
      toast.error("Name and website are required");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("scholarship_sources").insert({
      name: form.name.trim(),
      organisation: form.organisation.trim() || null,
      website_url: form.website_url.trim(),
      country: form.country.trim() || null,
      trust_level: form.trust_level,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Source added");
    setForm({ ...EMPTY });
    setOpen(false);
    load();
  };

  const markChecked = async (id: string) => {
    const { error } = await (supabase as any)
      .from("scholarship_sources")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Marked checked"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this source?")) return;
    const { error } = await (supabase as any).from("scholarship_sources").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Scholarship sources</h1>
          <p className="text-sm text-muted-foreground">Directory of official and trusted places we track scholarships from.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add source</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New scholarship source</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Organisation</Label><Input value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} /></div>
              <div><Label>Website URL *</Label><Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div>
                <Label>Trust level</Label>
                <Select value={form.trust_level} onValueChange={(v) => setForm({ ...form, trust_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRUST_LEVELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save source"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Directory ({rows.length})</CardTitle>
          <Input placeholder="Search name, organisation, country, URL…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead>Last checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.organisation ?? "—"}</TableCell>
                    <TableCell>{r.country ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.trust_level === "official" ? "default" : r.trust_level === "flagged" ? "destructive" : "outline"}>{r.trust_level}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.last_checked_at ? new Date(r.last_checked_at).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" asChild><a href={r.website_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                      <Button size="sm" variant="ghost" onClick={() => markChecked(r.id)}><ShieldCheck className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

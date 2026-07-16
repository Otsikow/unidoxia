import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Log = {
  id: string;
  action: string;
  notes: string | null;
  created_at: string;
  verifier_id: string | null;
};

const ACTIONS = ["Verified", "Re-verified", "Flagged", "Corrected", "Archived", "Note"] as const;

export function ScholarshipVerificationLog({ scholarshipId }: { scholarshipId: string }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>("Verified");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("scholarship_verification_logs")
      .select("id, action, notes, created_at, verifier_id")
      .eq("scholarship_id", scholarshipId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setLogs((data ?? []) as Log[]);
    setLoading(false);
  };

  useEffect(() => { if (scholarshipId) load(); /* eslint-disable-next-line */ }, [scholarshipId]);

  const submit = async () => {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("scholarship_verification_logs").insert({
      scholarship_id: scholarshipId,
      action,
      notes: notes.trim() || null,
      verifier_id: userRes.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setNotes("");
    load();
  };

  return (
    <div className="md:col-span-2 border rounded-md p-3 space-y-3">
      <div className="font-semibold text-sm">Verification log</div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2 items-start">
        <div>
          <Label className="text-xs">Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you verify or change?" />
        </div>
        <div className="pt-5">
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}Log
          </Button>
        </div>
      </div>

      <div className="border-t pt-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No log entries yet.</p>
        ) : (
          <ul className="space-y-2 max-h-56 overflow-auto">
            {logs.map((l) => (
              <li key={l.id} className="text-sm border-l-2 border-primary/40 pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{l.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                {l.notes ? <p className="text-xs text-muted-foreground mt-0.5">{l.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

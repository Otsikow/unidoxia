import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { AgentRecord } from "./types";
import { formatCurrency } from "./utils";

interface Props {
  agent: AgentRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function CommissionEditorDialog({ agent, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [rateL1, setRateL1] = useState("");
  const [rateL2, setRateL2] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (agent) {
      setRateL1(agent.commissionRateL1.toFixed(2));
      setRateL2(agent.commissionRateL2.toFixed(2));
      setNotes("");
    }
  }, [agent]);

  const handleSave = async () => {
    if (!agent) return;
    const l1 = Number(rateL1);
    const l2 = Number(rateL2);
    if (!Number.isFinite(l1) || l1 < 0 || l1 > 100) {
      toast({ title: "Invalid rate", description: "L1 rate must be between 0 and 100.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(l2) || l2 < 0 || l2 > 100) {
      toast({ title: "Invalid rate", description: "L2 rate must be between 0 and 100.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("agents")
      .update({ commission_rate_l1: l1, commission_rate_l2: l2 })
      .eq("id", agent.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update commission rates.", variant: "destructive" });
      return;
    }

    toast({ title: "Commission updated", description: `Rates saved for ${agent.name}.` });
    onSaved();
    onOpenChange(false);
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Commission Settings</DialogTitle>
          <DialogDescription>{agent.name} — {agent.companyName || "Individual Agent"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50 border border-border/60">
            <div>
              <p className="text-xs text-muted-foreground">Owed</p>
              <p className="text-lg font-semibold text-amber-400">{formatCurrency(agent.commissionOwed)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-semibold text-emerald-400">{formatCurrency(agent.commissionPaid)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rateL1">L1 Rate (%)</Label>
              <Input
                id="rateL1"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={rateL1}
                onChange={(e) => setRateL1(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Direct referral</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rateL2">L2 Rate (%)</Label>
              <Input
                id="rateL2"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={rateL2}
                onChange={(e) => setRateL2(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Sub-agent referral</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commNotes">Notes (optional)</Label>
            <Textarea
              id="commNotes"
              placeholder="Add notes about this commission change…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

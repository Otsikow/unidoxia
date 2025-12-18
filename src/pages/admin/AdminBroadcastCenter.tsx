import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar, Loader2, Megaphone, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

const AdminBroadcastCenter = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [recipients] = useState([
    { label: "Agents", tone: "bg-primary/10 text-primary" },
    {
      label: "Universities",
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100",
    },
    { label: "Students", tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100" },
  ]);
  const [message, setMessage] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastBroadcastTimestamp, setLastBroadcastTimestamp] = useState<string | null>(null);

  const recipientsDisplay = useMemo(() => recipients, [recipients]);

  const handleSendBroadcast = async () => {
    if (!tenantId) {
      toast({ title: "No tenant detected", description: "Please sign in again to send broadcasts.", variant: "destructive" });
      return;
    }

    if (!message.trim()) {
      toast({ title: "Message required", description: "Please add a message before sending the broadcast." });
      return;
    }

    setSending(true);
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (error) throw error;

      const userRecords = (users ?? []) as Pick<Tables<"profiles">, "id" | "email" | "full_name">[];

      if (userRecords.length === 0) {
        toast({ title: "No active users", description: "There are no active users to email right now." });
        return;
      }

      const notificationTitle = title.trim() || "Admin broadcast";
      const payload = userRecords.map((user) => ({
        user_id: user.id,
        tenant_id: tenantId,
        title: notificationTitle,
        content: message.trim(),
        type: "email",
        action_url: referenceLink || null,
        metadata: {
          channel: "email",
          recipientEmail: user.email,
          recipientName: user.full_name,
          subject: notificationTitle,
          scheduled: scheduleEnabled,
        },
      }));

      const { error: insertError } = await supabase.from("notifications").insert(payload);
      if (insertError) throw insertError;

      setLastBroadcastTimestamp(new Date().toISOString());
      toast({
        title: "Bulk email queued",
        description: `${userRecords.length} recipients will receive this announcement via the email channel.`,
      });
    } catch (err) {
      console.error("Failed to send broadcast", err);
      toast({
        title: "Broadcast failed",
        description: err instanceof Error ? err.message : "Unable to queue the email broadcast.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Broadcast Centre</h1>
          <p className="text-sm text-muted-foreground">
            Deliver coordinated announcements to agents, universities, and students from a single command hub.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Megaphone className="h-4 w-4" />
          Global audience
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose announcement</CardTitle>
          <CardDescription>
            Set the target audiences, craft the message, and optionally schedule delivery for a later time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="broadcast-title">Title</Label>
              <Input
                id="broadcast-title"
                placeholder="Winter intake onboarding"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="flex flex-wrap gap-2">
                {recipientsDisplay.map((chip) => (
                  <Badge key={chip.label} variant="secondary" className={chip.tone}>
                    {chip.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Message</Label>
            <Textarea
              id="broadcast-body"
              placeholder="Share updates, deadlines, or campaign details..."
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="broadcast-link">Reference link</Label>
              <Input
                id="broadcast-link"
                type="url"
                placeholder="https://"
                value={referenceLink}
                onChange={(event) => setReferenceLink(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Enable scheduling</p>
                <p className="text-xs text-muted-foreground">Queue announcement to deploy later.</p>
              </div>
              <Switch id="broadcast-schedule" checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {lastBroadcastTimestamp
                ? `Last queued: ${new Date(lastBroadcastTimestamp).toLocaleString()}`
                : "No broadcasts sent yet"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast({ title: "Draft saved", description: "We will keep this tab open so you can continue later." })}>
                Save draft
              </Button>
              <Button className="gap-2" onClick={handleSendBroadcast} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending" : "Send now"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent broadcasts</CardTitle>
          <CardDescription>Track delivery status and engagement performance for the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Visa document reminder", "Agent commission updates", "University onboarding checklist"].map((title, index) => (
            <div key={title} className="rounded-lg border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">Delivered to all channels • {index + 1}w ago</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Separator orientation="vertical" className="hidden h-6 md:block" />
                  <span>Open rate: {index === 0 ? "68%" : index === 1 ? "74%" : "82%"}</span>
                  <span>Clicks: {index === 0 ? "240" : index === 1 ? "312" : "154"}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBroadcastCenter;

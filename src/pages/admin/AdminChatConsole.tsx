import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Clock4, Eye, Loader2, MessageSquare, Send, ShieldCheck, Target } from "lucide-react";
import MessagesDashboard from "@/components/messages/MessagesDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  audienceLabel,
  createAudienceConversation,
  fetchAudienceContacts,
  sendAudienceMessage,
  type AudienceType,
  type BroadcastSendOptions,
} from "@/lib/messaging/adminAudienceService";
import type { DirectoryProfile } from "@/lib/messaging/directory";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import { cn } from "@/lib/utils";
import { useMessages } from "@/hooks/useMessages";
import { useBroadcastLog } from "@/hooks/admin/useBroadcastLog";

const audienceOptions: AudienceType[] = ["universities", "students", "agents", "all"];

type ScopeOption = "all" | "specific";

const scopeCopy: Record<ScopeOption, string> = {
  all: "Message everyone in this audience",
  specific: "Choose recipients to personalise outreach",
};

const AdminChatConsole = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id ?? DEFAULT_TENANT_ID;

  const messaging = useMessages();
  const { entries: broadcastLog, loading: logLoading, refresh: refreshBroadcastLog } = useBroadcastLog(tenantId);

  const [audience, setAudience] = useState<AudienceType>("universities");
  const [scope, setScope] = useState<ScopeOption>("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<DirectoryProfile[]>([]);
  const [selected, setSelected] = useState<DirectoryProfile[]>([]);

  const selectedIds = useMemo(() => new Set(selected.map((entry) => entry.id)), [selected]);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      const contacts = await fetchAudienceContacts(audience, tenantId, search.trim() || undefined);
      setResults(contacts);
      if (contacts.length === 0) {
        toast({
          title: "No results",
          description: "Try a different name, email, or audience type.",
        });
      }
    } catch (error) {
      console.error("Failed to search contacts", error);
      toast({
        title: "Search failed",
        description: "We could not fetch contacts right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }, [audience, search, tenantId, toast]);

  const handleToggleRecipient = useCallback((entry: DirectoryProfile) => {
    setSelected((current) => {
      if (current.find((item) => item.id === entry.id)) {
        return current.filter((item) => item.id !== entry.id);
      }
      return [...current, entry];
    });
  }, []);

  const resetComposer = useCallback(() => {
    setSubject("");
    setMessage("");
    setSearch("");
    setResults([]);
    setSelected([]);
  }, []);

  const handleSend = useCallback(async () => {
    if (!profile?.id) {
      toast({
        title: "Sign in required",
        description: "You need an admin session to send messages.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({ title: "Message required", description: "Add some content before sending." });
      return;
    }

    setSending(true);
    try {
      const recipients =
        scope === "all"
          ? await fetchAudienceContacts(audience, tenantId)
          : selected;

      if (recipients.length === 0) {
        toast({
          title: "No recipients",
          description: scope === "all"
            ? "We could not find anyone in this audience."
            : "Select at least one recipient to continue.",
          variant: "destructive",
        });
        return;
      }

      const targetCount = recipients.length;
      const broadcastOptions: BroadcastSendOptions = {
        audience,
        scope,
        tenantId,
        targetCount,
        subject: subject.trim() || undefined,
      };

      const conversationId = await createAudienceConversation({
        participantIds: recipients.map((entry) => entry.id),
        createdBy: profile.id,
        tenantId,
        audience,
        scope,
        subject: broadcastOptions.subject,
        targetCount,
      });

      await sendAudienceMessage(conversationId, profile.id, message.trim(), broadcastOptions);

      toast({
        title: "Message delivered",
        description: `Sent to ${recipients.length} ${audienceLabel[audience].toLowerCase()}.`,
      });

      resetComposer();
      await messaging.fetchConversations();
      messaging.setCurrentConversation(conversationId);
      await refreshBroadcastLog();
    } catch (error) {
      console.error("Failed to send broadcast message", error);
      toast({
        title: "Send failed",
        description: "The message could not be delivered. Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [
    audience,
    messaging,
    message,
    profile?.id,
    refreshBroadcastLog,
    resetComposer,
    scope,
    selected,
    subject,
    tenantId,
    toast,
  ]);

  const latestBroadcast = broadcastLog[0];

  const renderDeliveryStatus = (status: "sent" | "delivered" | "read") => {
    switch (status) {
      case "read":
        return (
          <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100">
            <Eye className="h-3.5 w-3.5" />
            Read
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Delivered
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock4 className="h-3.5 w-3.5" />
            Sent
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Messaging Console</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast updates to universities, agents, students, or every user from one place.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-4 w-4" />
          RLS protected
        </Badge>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>New broadcast message</CardTitle>
              <CardDescription>Select an audience, craft the announcement, and deliver instantly.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Audience</Label>
              <div className="grid grid-cols-2 gap-2">
                {audienceOptions.map((option) => (
                  <Button
                    key={option}
                    variant={audience === option ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => setAudience(option)}
                  >
                    <Target className="h-4 w-4" />
                    {audienceLabel[option]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Choose whether to reach universities, students, agents, or every user.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Delivery scope</Label>
              <div className="flex gap-2">
                <Button
                  variant={scope === "all" ? "default" : "outline"}
                  onClick={() => setScope("all")}
                  className="flex-1"
                >
                  Message all
                </Button>
                <Button
                  variant={scope === "specific" ? "default" : "outline"}
                  onClick={() => setScope("specific")}
                  className="flex-1"
                >
                  Pick recipients
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{scopeCopy[scope]}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-subject">Subject (optional)</Label>
              <Input
                id="broadcast-subject"
                placeholder="Admissions update"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Label the thread for quick context.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-message">Message</Label>
            <Textarea
              id="broadcast-message"
              rows={4}
              placeholder="Share deadlines, reminders, or platform updates..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          {scope === "specific" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Recipient search</p>
                  <p className="text-xs text-muted-foreground">
                    Add universities, agents, or students to this broadcast.
                  </p>
                </div>
                <Badge variant="secondary">{selected.length} selected</Badge>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Button onClick={() => void handleSearch()} disabled={searching} className="gap-2">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Search
                </Button>
              </div>

              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.map((entry) => (
                    <Badge
                      key={entry.id}
                      variant="secondary"
                      className="flex items-center gap-2 pr-3"
                    >
                      {entry.full_name}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleToggleRecipient(entry)}
                      >
                        ✕
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <ScrollArea className="h-56 rounded-md border">
                <div className="divide-y">
                  {searching ? (
                    <div className="flex items-center justify-center p-6 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm">Search results will appear here.</p>
                    </div>
                  ) : (
                    results.map((entry) => (
                      <button
                        key={entry.id}
                        className={cn(
                          "flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent",
                          selectedIds.has(entry.id) && "bg-accent/60",
                        )}
                        onClick={() => handleToggleRecipient(entry)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entry.avatar_url || undefined} alt={entry.full_name} />
                          <AvatarFallback>{entry.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{entry.full_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.email}</p>
                        </div>
                        <Badge variant={selectedIds.has(entry.id) ? "default" : "outline"}>
                          {selectedIds.has(entry.id) ? "Added" : "Add"}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {scope === "all"
                ? `This will message every profile in ${audienceLabel[audience].toLowerCase()}.`
                : `Ready to notify ${selected.length} recipient${selected.length === 1 ? "" : "s"}.`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetComposer}>Reset</Button>
              <Button className="gap-2" onClick={() => void handleSend()} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending" : "Send now"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active conversations</CardTitle>
          <CardDescription>
            Continue ongoing threads or review previous broadcasts without leaving the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <MessagesDashboard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery status</CardTitle>
          <CardDescription>Track the most recent broadcast across all user roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading delivery details...
            </div>
          ) : latestBroadcast ? (
            <div className="rounded-lg border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {latestBroadcast.subject || latestBroadcast.title || "Broadcast update"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Audience: {audienceLabel[latestBroadcast.audience ?? "all"]} • Scope: {latestBroadcast.scope}
                  </p>
                </div>
                {renderDeliveryStatus(latestBroadcast.status)}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-sm font-semibold">{latestBroadcast.targetCount} recipients</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                  <p className="text-sm font-semibold">{latestBroadcast.deliveredCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Read</p>
                  <p className="text-sm font-semibold">{latestBroadcast.readCount}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Last updated {latestBroadcast.lastUpdated ? new Date(latestBroadcast.lastUpdated).toLocaleString() : "moments ago"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No broadcasts recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication log</CardTitle>
          <CardDescription>Auditable trail of admin broadcasts by audience and scope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading communication log...
            </div>
          ) : broadcastLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcast activity logged yet.</p>
          ) : (
            broadcastLog.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{entry.subject || entry.title || "Broadcast"}</p>
                    <p className="text-xs text-muted-foreground">
                      Audience: {audienceLabel[entry.audience ?? "all"]} • Scope: {entry.scope}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent {entry.sentAt ? new Date(entry.sentAt).toLocaleString() : new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {renderDeliveryStatus(entry.status)}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="text-sm font-semibold">{entry.targetCount} recipients</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                    <p className="text-sm font-semibold">{entry.deliveredCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Read</p>
                    <p className="text-sm font-semibold">{entry.readCount}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChatConsole;

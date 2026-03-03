import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  Megaphone,
  MessageCircle,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type RecipientType = "all_agents" | "selected_agents" | "all_students" | "selected_students";
type PerformanceTier = "all" | "high" | "medium" | "low" | "at_risk";
type ActiveFilter = "all" | "active" | "inactive";

interface AgentRow {
  profile_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  active: boolean;
  verification_status: string | null;
  performance_tier: Exclude<PerformanceTier, "all">;
  whatsapp_consent: boolean;
}

interface StudentRow {
  profile_id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  active: boolean;
  subscription_type: string | null;
  has_offer: boolean;
  awaiting_documents: boolean;
  whatsapp_consent: boolean;
}

const BROADCAST_RECIPIENT_TYPES: { value: RecipientType; label: string }[] = [
  { value: "all_agents", label: "All Agents" },
  { value: "selected_agents", label: "Selected Agents" },
  { value: "all_students", label: "All Students" },
  { value: "selected_students", label: "Selected Students" },
];

const TEMPLATES_SEED = [
  {
    title: "Scholarship Deadline Reminder",
    subject: "Final Call: Scholarship Applications Close Soon",
    body: "Please submit your pending documents before the scholarship deadline. Visit your dashboard for full checklist and timelines.",
  },
  {
    title: "Agent Compliance Reminder",
    subject: "Compliance Submission Required",
    body: "Please complete all pending compliance tasks in your dashboard to avoid interruption to student allocations.",
  },
];

const parseConsent = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.whatsapp === true || record.consent_whatsapp === true || record.marketing_whatsapp === true;
};

const AdminBroadcastCenter = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;

  const [loadingAudience, setLoadingAudience] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [recipientType, setRecipientType] = useState<RecipientType>("all_agents");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceTier>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [studentsWithOffersOnly, setStudentsWithOffersOnly] = useState(false);
  const [studentsAwaitingDocsOnly, setStudentsAwaitingDocsOnly] = useState(false);
  const [agentsRequiringAttentionOnly, setAgentsRequiringAttentionOnly] = useState(false);

  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [agentAudience, setAgentAudience] = useState<AgentRow[]>([]);
  const [studentAudience, setStudentAudience] = useState<StudentRow[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());

  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);

  const isAgentMode = recipientType === "all_agents" || recipientType === "selected_agents";
  const isSelectedMode = recipientType === "selected_agents" || recipientType === "selected_students";

  const fetchAudience = async () => {
    if (!tenantId) return;
    setLoadingAudience(true);
    try {
      const db = supabase as any;
      const [agentsResult, studentsResult, offersResult, docsResult, templatesResult, historyResult, logsResult] = await Promise.all([
        db
          .from("profiles")
          .select("id, full_name, email, phone, country, active, role, agents(verification_status)")
          .eq("tenant_id", tenantId)
          .eq("role", "agent"),
        db
          .from("profiles")
          .select("id, full_name, email, phone, country, active, role, students(id, plan_type, consent_flags_json)")
          .eq("tenant_id", tenantId)
          .eq("role", "student"),
        db.from("offers").select("application_id"),
        db.from("student_documents").select("student_id, admin_review_status").eq("admin_review_status", "pending"),
        db.from("broadcast_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
        db.from("broadcasts").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
        db
          .from("broadcast_logs")
          .select("id, broadcast_id, recipient_id, channel, status, error_message, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (agentsResult.error) throw agentsResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (offersResult.error) throw offersResult.error;
      if (docsResult.error) throw docsResult.error;

      const offerApplicationIds = new Set((offersResult.data ?? []).map((row: any) => row.application_id));

      const applicationRows = await db
        .from("applications")
        .select("id, student_id, agent_id")
        .in("id", [...offerApplicationIds]);

      const studentIdsWithOffers = new Set((applicationRows.data ?? []).map((a: any) => a.student_id));

      const studentIdsAwaitingDocs = new Set((docsResult.data ?? []).map((row: any) => row.student_id));

      const agents = (agentsResult.data ?? []).map((row: any) => {
        const verificationStatus = row.agents?.[0]?.verification_status ?? null;
        const performanceTier: Exclude<PerformanceTier, "all"> =
          verificationStatus === "verified" ? "high" : verificationStatus === "pending" ? "medium" : "at_risk";

        return {
          profile_id: row.id,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
          country: row.country,
          active: Boolean(row.active),
          verification_status: verificationStatus,
          performance_tier: performanceTier,
          whatsapp_consent: false,
        } as AgentRow;
      });

      const students = (studentsResult.data ?? []).map((row: any) => {
        const student = row.students?.[0];
        const studentId = student?.id ?? "";
        return {
          profile_id: row.id,
          student_id: studentId,
          full_name: row.full_name,
          email: row.email,
          phone: row.phone,
          country: row.country,
          active: Boolean(row.active),
          subscription_type: student?.plan_type ?? null,
          has_offer: studentIdsWithOffers.has(studentId),
          awaiting_documents: studentIdsAwaitingDocs.has(studentId),
          whatsapp_consent: parseConsent(student?.consent_flags_json),
        } as StudentRow;
      });

      setAgentAudience(agents);
      setStudentAudience(students);
      setTemplates([...(templatesResult.data ?? []), ...TEMPLATES_SEED]);
      setHistoryRows(historyResult.data ?? []);
      setDeliveryLogs(logsResult.data ?? []);
    } catch (error) {
      console.error("Failed to load broadcast data", error);
      toast({
        title: "Unable to load broadcast data",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAudience(false);
    }
  };

  useEffect(() => {
    fetchAudience();
  }, [tenantId]);

  useEffect(() => {
    setSelectedRecipientIds(new Set());
  }, [recipientType]);

  const activeAudience = useMemo(() => {
    if (isAgentMode) {
      return agentAudience.filter((agent) => {
        const countryPass = countryFilter === "all" || (agent.country ?? "Unknown") === countryFilter;
        const activePass =
          activeFilter === "all" || (activeFilter === "active" ? agent.active === true : agent.active === false);
        const performancePass = performanceFilter === "all" || agent.performance_tier === performanceFilter;
        const attentionPass = !agentsRequiringAttentionOnly || agent.performance_tier === "at_risk";
        const searchPass =
          !searchQuery.trim() ||
          agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.email.toLowerCase().includes(searchQuery.toLowerCase());

        return countryPass && activePass && performancePass && attentionPass && searchPass;
      });
    }

    return studentAudience.filter((student) => {
      const countryPass = countryFilter === "all" || (student.country ?? "Unknown") === countryFilter;
      const activePass =
        activeFilter === "all" || (activeFilter === "active" ? student.active === true : student.active === false);
      const subscriptionPass =
        subscriptionFilter === "all" || (student.subscription_type ?? "none") === subscriptionFilter;
      const offerPass = !studentsWithOffersOnly || student.has_offer;
      const docsPass = !studentsAwaitingDocsOnly || student.awaiting_documents;
      const searchPass =
        !searchQuery.trim() ||
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());

      return countryPass && activePass && subscriptionPass && offerPass && docsPass && searchPass;
    });
  }, [
    activeFilter,
    agentAudience,
    agentsRequiringAttentionOnly,
    countryFilter,
    isAgentMode,
    performanceFilter,
    searchQuery,
    studentAudience,
    studentsAwaitingDocsOnly,
    studentsWithOffersOnly,
    subscriptionFilter,
  ]);

  const selectableAudience = activeAudience as Array<AgentRow | StudentRow>;

  const selectedAudience = useMemo(() => {
    if (!isSelectedMode) return selectableAudience;
    return selectableAudience.filter((row) => selectedRecipientIds.has(row.profile_id));
  }, [isSelectedMode, selectableAudience, selectedRecipientIds]);

  const whatsappBlockedCount = useMemo(() => {
    return selectedAudience.filter((row) => !row.phone || !row.whatsapp_consent).length;
  }, [selectedAudience]);

  const allCountries = useMemo(() => {
    const source = isAgentMode ? agentAudience : studentAudience;
    return ["all", ...new Set(source.map((row) => row.country ?? "Unknown"))];
  }, [agentAudience, isAgentMode, studentAudience]);

  const subscriptionTypes = useMemo(() => {
    return ["all", ...new Set(studentAudience.map((s) => s.subscription_type ?? "none"))];
  }, [studentAudience]);

  const onSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedRecipientIds(new Set());
      return;
    }
    setSelectedRecipientIds(new Set(selectableAudience.map((row) => row.profile_id)));
  };

  const validate = () => {
    if (!tenantId) return "No tenant context detected.";
    if (!sendEmail && !sendWhatsapp) return "Please choose at least one delivery channel.";
    if (sendEmail && !subject.trim()) return "Subject is required when email is enabled.";
    if (!messageBody.trim()) return "Message body is required.";
    if (selectedAudience.length === 0) return "No recipients match the current selection and filters.";
    if (ctaLabel && !ctaLink) return "CTA link is required when CTA label is provided.";
    if (ctaLink && !ctaLabel) return "CTA label is required when CTA link is provided.";
    return null;
  };

  const handleSaveTemplate = async () => {
    if (!tenantId) return;
    if (!subject.trim() || !messageBody.trim()) {
      toast({ title: "Template requires subject and body" });
      return;
    }

    try {
      const db = supabase as any;
      const { error } = await db.from("broadcast_templates").insert({
        tenant_id: tenantId,
        title: headline.trim() || subject.trim(),
        subject: subject.trim(),
        body: messageBody.trim(),
      });

      if (error) throw error;
      toast({ title: "Template saved" });
      await fetchAudience();
    } catch (error) {
      console.error(error);
      toast({ title: "Unable to save template", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    const validationError = validate();
    if (validationError) {
      toast({ title: "Broadcast validation", description: validationError, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const db = supabase as any;
      const scheduledFor = scheduleAt ? new Date(scheduleAt).toISOString() : null;
      const { data: broadcastInsert, error: broadcastError } = await db
        .from("broadcasts")
        .insert({
          tenant_id: tenantId,
          created_by: profile?.id,
          recipient_type: recipientType,
          filter_json: {
            countryFilter,
            performanceFilter,
            subscriptionFilter,
            activeFilter,
            studentsWithOffersOnly,
            studentsAwaitingDocsOnly,
            agentsRequiringAttentionOnly,
            selectedRecipientIds: isSelectedMode ? Array.from(selectedRecipientIds) : null,
          },
          subject: subject.trim(),
          headline: headline.trim() || null,
          message_body: messageBody.trim(),
          cta_label: ctaLabel.trim() || null,
          cta_url: ctaLink.trim() || null,
          attachments_json: attachments.map((file) => ({ name: file.name, size: file.size, type: file.type })),
          send_email: sendEmail,
          send_whatsapp: sendWhatsapp,
          scheduled_for: scheduledFor,
          status: scheduledFor ? "scheduled" : "sent",
        })
        .select("id")
        .single();

      if (broadcastError) throw broadcastError;

      const rows = selectedAudience.map((recipient) => ({
        tenant_id: tenantId,
        broadcast_id: broadcastInsert.id,
        recipient_id: recipient.profile_id,
        user_type: isAgentMode ? "agent" : "student",
        email: recipient.email,
        phone: recipient.phone,
        whatsapp_consent: recipient.whatsapp_consent,
        email_status: "pending",
        whatsapp_status: "pending",
      }));

      const { error: recipientsError } = await db.from("broadcast_recipients").insert(rows);
      if (recipientsError) throw recipientsError;

      if (!scheduledFor) {
        const { error: invokeError } = await supabase.functions.invoke("broadcast-dispatch", {
          body: { broadcastId: broadcastInsert.id },
        });

        if (invokeError) {
          console.error(invokeError);
          toast({
            title: "Broadcast queued, dispatch pending",
            description: "The broadcast was saved but automatic dispatch could not be triggered.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: scheduledFor ? "Broadcast scheduled" : "Broadcast queued",
        description: scheduledFor
          ? `Broadcast will be sent at ${new Date(scheduledFor).toLocaleString()}.`
          : `${selectedAudience.length} recipients added to dispatch queue.`,
      });

      setSubject("");
      setHeadline("");
      setMessageBody("");
      setCtaLabel("");
      setCtaLink("");
      setScheduleAt("");
      setAttachments([]);
      setSelectedRecipientIds(new Set());
      await fetchAudience();
    } catch (error) {
      console.error("Broadcast failed", error);
      toast({ title: "Broadcast failed", description: "Please review your input and try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Communications / Broadcast Centre</h1>
          <p className="text-sm text-muted-foreground">
            Deliver structured announcements to agents and students via email and WhatsApp with full audit logs.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-2">
          <Megaphone className="h-4 w-4" />
          Infrastructure-grade messaging
        </Badge>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="send">Send Broadcast</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audience Selection</CardTitle>
              <CardDescription>Choose recipients, selection mode, and advanced targeting filters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {BROADCAST_RECIPIENT_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRecipientType(option.value)}
                    className={`rounded-lg border p-3 text-left text-sm transition ${
                      recipientType === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label>Search</Label>
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name or email" />
                </div>
                <div className="space-y-1">
                  <Label>Country</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
                    {allCountries.map((country) => (
                      <option key={country} value={country}>
                        {country === "all" ? "All countries" : country}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Performance Tier</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3" value={performanceFilter} onChange={(e) => setPerformanceFilter(e.target.value as PerformanceTier)}>
                    <option value="all">All tiers</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="at_risk">At Risk</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Subscription Type</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3" value={subscriptionFilter} onChange={(e) => setSubscriptionFilter(e.target.value)}>
                    {subscriptionTypes.map((subscription) => (
                      <option key={subscription} value={subscription}>
                        {subscription === "all" ? "All subscriptions" : subscription}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={activeFilter === "active"} onCheckedChange={(checked) => setActiveFilter(checked ? "active" : "all")} />
                  Active only
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={studentsWithOffersOnly} onCheckedChange={(checked) => setStudentsWithOffersOnly(Boolean(checked))} />
                  Students with offers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={studentsAwaitingDocsOnly} onCheckedChange={(checked) => setStudentsAwaitingDocsOnly(Boolean(checked))} />
                  Students awaiting documents
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={agentsRequiringAttentionOnly} onCheckedChange={(checked) => setAgentsRequiringAttentionOnly(Boolean(checked))} />
                  Agents requiring attention
                </label>
              </div>

              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Recipient list ({selectableAudience.length})</CardTitle>
                      <CardDescription>
                        {isSelectedMode
                          ? "Search and select specific recipients."
                          : "Recipients are auto-selected from current filters."}
                      </CardDescription>
                    </div>
                    {isSelectedMode ? (
                      <Button variant="outline" size="sm" onClick={() => onSelectAllFiltered(selectedRecipientIds.size !== selectableAudience.length)}>
                        {selectedRecipientIds.size === selectableAudience.length ? "Clear all" : "Select filtered"}
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingAudience ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading recipients...
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                          <tr>
                            {isSelectedMode ? <th className="px-3 py-2">Select</th> : null}
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Country</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectableAudience.map((row) => (
                            <tr key={row.profile_id} className="border-t">
                              {isSelectedMode ? (
                                <td className="px-3 py-2">
                                  <Checkbox
                                    checked={selectedRecipientIds.has(row.profile_id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedRecipientIds((prev) => {
                                        const next = new Set(prev);
                                        if (checked) next.add(row.profile_id);
                                        else next.delete(row.profile_id);
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                              ) : null}
                              <td className="px-3 py-2">{row.full_name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                              <td className="px-3 py-2">{row.country ?? "—"}</td>
                              <td className="px-3 py-2">
                                <Badge variant="outline">{row.active ? "Active" : "Inactive"}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Channels</CardTitle>
              <CardDescription>Email is mandatory for formal notices. WhatsApp sends only where phone + consent exist.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={sendEmail} onCheckedChange={(checked) => setSendEmail(Boolean(checked))} />
                Send via Email
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={sendWhatsapp} onCheckedChange={(checked) => setSendWhatsapp(Boolean(checked))} />
                Send via WhatsApp
              </label>
              {sendWhatsapp && whatsappBlockedCount > 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  {whatsappBlockedCount} recipient(s) will be skipped for WhatsApp due to missing phone or consent.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Composer</CardTitle>
              <CardDescription>Craft your message, include optional CTA, and preview channel-specific rendering.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Subject (email required)</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Partnership update" />
                </div>
                <div className="space-y-1">
                  <Label>Headline (optional for WhatsApp)</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Important update" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Message Body</Label>
                <Textarea
                  rows={8}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write your announcement..."
                />
                <p className="text-xs text-muted-foreground">WhatsApp character counter: {messageBody.length}/1024</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>CTA Label (optional)</Label>
                  <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View dashboard" />
                </div>
                <div className="space-y-1">
                  <Label>CTA Link (optional)</Label>
                  <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Attachments (PDF only)</Label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []).filter((file) => file.type === "application/pdf");
                      setAttachments(files);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Schedule for Later (optional)</Label>
                  <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Email preview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="font-semibold">{subject || "(no subject yet)"}</p>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{messageBody || "Compose a message to preview."}</p>
                    {ctaLabel && ctaLink ? <p className="mt-3 text-primary">{ctaLabel} → {ctaLink}</p> : null}
                    <p className="mt-4 text-xs text-muted-foreground">Unsubscribe link will be appended automatically.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">WhatsApp preview</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="font-semibold">{headline || subject || "(headline optional)"}</p>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{messageBody || "Compose a message to preview."}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleSaveTemplate}>Save as template</Button>
                <Button variant="outline" onClick={fetchAudience}>Refresh data</Button>
                <Button className="gap-2" onClick={handleSend} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {scheduleAt ? "Schedule Broadcast" : "Send Broadcast"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
              <CardDescription>Track all sent and scheduled broadcasts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
              ) : (
                historyRows.map((row) => (
                  <div key={row.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{row.subject || row.headline || "Untitled broadcast"}</p>
                      <Badge variant="outline">{row.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Recipient Type: {row.recipient_type}</span>
                      <span>Created {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span>
                      <span>Email: {row.send_email ? "Yes" : "No"}</span>
                      <span>WhatsApp: {row.send_whatsapp ? "Yes" : "No"}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Reusable announcement templates for recurring communications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div key={`${template.title}-${template.subject}`} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{template.title}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSubject(template.subject ?? "");
                        setMessageBody(template.body ?? "");
                        setHeadline(template.title ?? "");
                        toast({ title: "Template loaded into composer" });
                      }}
                    >
                      Use template
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{template.subject}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Logs</CardTitle>
              <CardDescription>Channel-level dispatch outcomes for compliance and troubleshooting.</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No delivery logs available yet.</p>
              ) : (
                <div className="max-h-[460px] overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2">Channel</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Recipient</th>
                        <th className="px-3 py-2">Broadcast</th>
                        <th className="px-3 py-2">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryLogs.map((log) => (
                        <tr key={log.id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {log.channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
                              {log.channel}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={log.status === "failed" ? "destructive" : "outline"} className="gap-1">
                              {log.status === "failed" ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {log.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{log.recipient_id}</td>
                          <td className="px-3 py-2 text-muted-foreground">{log.broadcast_id}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(log.created_at).toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-medium"><Calendar className="h-3.5 w-3.5" /> Scheduling</span>
        <p className="mt-1">
          Scheduled broadcasts remain in status <strong>scheduled</strong> until dispatched by cron/edge execution.
        </p>
      </div>
    </div>
  );
};

export default AdminBroadcastCenter;

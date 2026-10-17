"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import {
  Database,
  Globe,
  KeyRound,
  Mail,
  Settings2,
  ShieldCheck,
  Users,
  Palette,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

/* -------------------------------------------------------------------------- */
/* ✅ Zoe Helper                                                              */
/* -------------------------------------------------------------------------- */
const openZoe = (prompt: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt } }));
};

/* -------------------------------------------------------------------------- */
/* ✅ Seed Data                                                               */
/* -------------------------------------------------------------------------- */
type RoleKey = "admin" | "staff" | "agent" | "university";

type Permission = {
  id: string;
  label: string;
  description: string;
  roles: Record<RoleKey, boolean>;
};

type EmailTemplateKey = "onboarding" | "verification" | "payment";

type EmailTemplate = {
  name: string;
  description: string;
  subject: string;
  body: string;
  sendAutomatically: boolean;
};

type EmailAutomationTrigger = {
  id: string;
  title: string;
  audience: "students" | "universities" | "both";
  description: string;
  cadence: string;
  sampleSubject: string;
  defaultEnabled: boolean;
};

type Integration = {
  id: string;
  name: string;
  provider: string;
  environment: "Production" | "Sandbox";
  apiKey: string;
  status: "Connected" | "Action required";
  scopes: string[];
  lastRotated: string;
};

type LocalizationSettings = {
  primaryLanguage: string;
  supportedLanguages: string[];
  currency: string;
  fallbackCurrency: string;
};

/* -------------------------------------------------------------------------- */
/* ✅ Initial Data Generators                                                 */
/* -------------------------------------------------------------------------- */
const roleLabels: Record<RoleKey, string> = {
  admin: "Admin",
  staff: "Staff",
  agent: "Agent",
  university: "University",
};

const roleOrder: RoleKey[] = ["admin", "staff", "agent", "university"];

const permissionSeed: Permission[] = [
  {
    id: "manage-users",
    label: "User management",
    description: "Create, suspend, and invite new platform users across teams.",
    roles: { admin: true, staff: true, agent: false, university: false },
  },
  {
    id: "workflow-automation",
    label: "Workflow automation",
    description: "Configure lifecycle automations, reminders, and checklist templates.",
    roles: { admin: true, staff: true, agent: true, university: false },
  },
  {
    id: "finance-ledger",
    label: "Finance & payouts",
    description: "Issue invoices, approve partner disbursements, and manage escrow.",
    roles: { admin: true, staff: false, agent: true, university: true },
  },
  {
    id: "content-governance",
    label: "Content governance",
    description: "Publish program updates, announcements, and compliance notices.",
    roles: { admin: true, staff: true, agent: true, university: true },
  },
  {
    id: "data-export",
    label: "Data export",
    description: "Download student rosters, performance metrics, and compliance logs.",
    roles: { admin: true, staff: true, agent: false, university: true },
  },
];

const emailTemplateSeed: Record<EmailTemplateKey, EmailTemplate> = {
  onboarding: {
    name: "Onboarding welcome",
    description: "Sent immediately after a new partner or campus admin is provisioned.",
    subject: "Welcome to UniDoxia — getting started",
    body: "Hi {{first_name}},\n\nThanks for joining UniDoxia. Here’s your launch checklist to activate admissions and finance tools.\n\n— UniDoxia Team",
    sendAutomatically: true,
  },
  verification: {
    name: "Identity verification",
    description: "Used to confirm KYC/KYB verification steps with secure links.",
    subject: "Action required: verify your organization",
    body: "Hi {{first_name}},\n\nWe just need a final verification step to activate compliance workflows. Upload the requested documentation below.",
    sendAutomatically: true,
  },
  payment: {
    name: "Payment confirmation",
    description: "Delivers proof of payment with ledger references and payout date.",
    subject: "Payment received — reference {{payment_reference}}",
    body: "Hi {{first_name}},\n\nWe’ve recorded your payment of {{amount}} for {{program_name}}. Funds will settle by {{payout_date}}.",
    sendAutomatically: true,
  },
};

const emailAutomationTriggers: EmailAutomationTrigger[] = [
  {
    id: "missing-documents",
    title: "Missing documents reminder",
    audience: "students",
    description:
      "Automatically nudges applicants when outstanding transcripts, scores, or recommendations are detected in their checklist.",
    cadence: "Every 72 hours until resolved",
    sampleSubject: "Action needed: upload your missing documents",
    defaultEnabled: true,
  },
  {
    id: "application-submitted",
    title: "Application submitted",
    audience: "both",
    description:
      "Confirms receipt to students and CCs their university liaison with the full submission fingerprint.",
    cadence: "Instant",
    sampleSubject: "We’ve received your application",
    defaultEnabled: true,
  },
  {
    id: "offer-received",
    title: "Offer received",
    audience: "students",
    description:
      "Celebrates new offers with program highlights while alerting the partner university to update their CRM.",
    cadence: "Instant",
    sampleSubject: "🎉 Offer received for {{program_name}}",
    defaultEnabled: true,
  },
  {
    id: "deposit-deadline",
    title: "Deposit deadline approaching",
    audience: "both",
    description:
      "Escalates upcoming payment deadlines with a summary of remaining balance and finance contacts.",
    cadence: "7, 3, and 1 day prior",
    sampleSubject: "Reminder: secure your seat before the deadline",
    defaultEnabled: true,
  },
  {
    id: "visa-interview",
    title: "Visa interview reminder",
    audience: "students",
    description:
      "Delivers embassy checklist guidance and nudges partner universities when students confirm interview slots.",
    cadence: "Weekly until interview date",
    sampleSubject: "Visa interview prep checklist",
    defaultEnabled: true,
  },
];

const integrationSeed: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    provider: "Payments & billing",
    environment: "Production",
    apiKey: "sk_live_9Qp2R************",
    status: "Connected",
    scopes: ["charges", "payouts", "customers"],
    lastRotated: "12 days ago",
  },
  {
    id: "supabase",
    name: "Supabase",
    provider: "Database & auth",
    environment: "Production",
    apiKey: "sbp_live_z3K4a************",
    status: "Connected",
    scopes: ["auth", "storage", "functions"],
    lastRotated: "30 days ago",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    provider: "Transactional email",
    environment: "Sandbox",
    apiKey: "sg_test_V8Lm3************",
    status: "Action required",
    scopes: ["mail.send", "marketing"],
    lastRotated: "Pending rotation",
  },
];

const availableLanguages = [
  { code: "en", label: "English (US)", description: "Default language for the global admin team." },
  { code: "fr", label: "French", description: "Localized messaging for EU-based partners." },
  { code: "es", label: "Spanish", description: "Support for Latin America recruiters." },
  { code: "de", label: "German", description: "DACH region universities and agents." },
  { code: "hi", label: "Hindi", description: "Enable campaigns in the India subcontinent." },
];

const currencyOptions = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "INR", label: "INR — Indian Rupee" },
];

const createInitialLocalization = (): LocalizationSettings => ({
  primaryLanguage: "en",
  supportedLanguages: ["en", "fr", "es"],
  currency: "USD",
  fallbackCurrency: "USD",
});

const automationAudienceLabels: Record<EmailAutomationTrigger["audience"], string> = {
  students: "Students",
  universities: "Universities",
  both: "Students & universities",
};

const automationAudienceTone: Record<EmailAutomationTrigger["audience"], string> = {
  students: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-50",
  universities: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-50",
  both: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-50",
};

/* -------------------------------------------------------------------------- */
/* ✅ Component                                                               */
/* -------------------------------------------------------------------------- */
const AdminSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<Permission[]>(permissionSeed);
  const [emailTemplates, setEmailTemplates] = useState<Record<EmailTemplateKey, EmailTemplate>>(emailTemplateSeed);
  const [automationToggles, setAutomationToggles] = useState<Record<string, boolean>>(() =>
    emailAutomationTriggers.reduce((acc, trigger) => {
      acc[trigger.id] = trigger.defaultEnabled;
      return acc;
    }, {} as Record<string, boolean>),
  );
  const [integrations, setIntegrations] = useState<Integration[]>(integrationSeed);
  const [localization, setLocalization] = useState<LocalizationSettings>(createInitialLocalization);
  const [autoBackups, setAutoBackups] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoFileName, setLogoFileName] = useState("");
  const [faviconFileName, setFaviconFileName] = useState("");

  /* ---------------------------------------------------------------------- */
  /* ✅ Handlers                                                             */
  /* ---------------------------------------------------------------------- */
  const handleBackup = () => {
    toast({
      title: t("admin.settings.backup.started", { defaultValue: "Backup initiated" }),
      description: t("admin.settings.backup.desc", { defaultValue: "System snapshot is being created in the background." }),
    });
  };

  const handleSave = () => {
    toast({
      title: t("admin.settings.saved", { defaultValue: "Settings saved" }),
      description: t("admin.settings.savedDesc", { defaultValue: "Your changes have been successfully saved." }),
    });
  };

  const handleAutomationToggle = (id: string, enabled: boolean) => {
    setAutomationToggles((prev) => ({ ...prev, [id]: enabled }));
    toast({
      title: enabled ? "Automation enabled" : "Automation paused",
      description: enabled
        ? "Zoe will continue sending this touchpoint without supervision."
        : "This workflow will stop emailing until re-enabled.",
    });
  };

  /* ---------------------------------------------------------------------- */
  /* ✅ Render                                                               */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("admin.settings.heading", { defaultValue: "System settings" })}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t("admin.settings.subheading", {
              defaultValue: "Configure branding, governance, integrations, and localization.",
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 sm:w-auto"
          onClick={() =>
            openZoe(
              t("admin.settings.securityPrompt", {
                defaultValue: "Review security posture for settings changes",
              }),
            )
          }
        >
          <ShieldCheck className="h-4 w-4" />
          {t("admin.settings.securityReview", { defaultValue: "Security review" })}
        </Button>
      </div>

      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            {t("admin.settings.branding.title", { defaultValue: "Organization branding" })}
          </CardTitle>
          <CardDescription>
            {t("admin.settings.branding.description", {
              defaultValue: "Control the visual identity used across the admin experience.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>{t("admin.settings.branding.logo.label", { defaultValue: "Upload logo" })}</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFileName(e.target.files?.[0]?.name ?? "")}
            />
            {logoFileName && <p className="text-xs text-muted-foreground">{`Selected: ${logoFileName}`}</p>}
          </div>
          <div>
            <Label>{t("admin.settings.branding.color.label", { defaultValue: "Primary color" })}</Label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 p-1"
              />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t("admin.settings.branding.favicon.label", { defaultValue: "Upload favicon" })}</Label>
            <Input
              type="file"
              accept="image/x-icon,image/png"
              onChange={(e) => setFaviconFileName(e.target.files?.[0]?.name ?? "")}
            />
            {faviconFileName && <p className="text-xs text-muted-foreground">{`Selected: ${faviconFileName}`}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Roles, Emails, Integrations, Localization, Audit */}
      <Tabs defaultValue="roles" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full h-auto grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="roles" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
            <Users className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="truncate">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="emails" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
            <Mail className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="truncate">Emails</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
            <KeyRound className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Integrations</span><span className="sm:hidden">Integ.</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
            <Globe className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Localization</span><span className="sm:hidden">Local</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
            <Database className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="truncate">Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("admin.settings.roles.title", { defaultValue: "Roles & Permissions" })}
              </CardTitle>
              <CardDescription>
                {t("admin.settings.roles.description", {
                  defaultValue: "Control access levels for all user categories.",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Capability</TableHead>
                    {roleOrder.map((r) => (
                      <TableHead key={r}>{roleLabels[r]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>{perm.label}</TableCell>
                      {roleOrder.map((r) => (
                        <TableCell key={r}>
                          <Checkbox checked={perm.roles[r]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr,1.4fr]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>AI email automation</CardTitle>
                <CardDescription>
                  Emails triggered automatically to students and universities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-muted-foreground">
                <p>
                  You don’t have to babysit anything. Zoe watches the admissions lifecycle,
                  reacts to every milestone, and keeps both audiences informed without
                  manual follow-up.
                </p>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Active workflows
                  </p>
                  <ul className="mt-3 space-y-2 text-foreground">
                    {emailAutomationTriggers.map((trigger) => (
                      <li key={trigger.id} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="font-medium">{trigger.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p>
                  Each template is localized, branded, and logged in audit history so your team can
                  prove compliance with partner SLAs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automated touchpoints</CardTitle>
                <CardDescription>
                  Toggle workflows or inspect cadence and subject lines before they go out.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {emailAutomationTriggers.map((trigger) => (
                  <div key={trigger.id} className="rounded-lg border p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">{trigger.title}</p>
                        <p className="text-sm text-muted-foreground">{trigger.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={automationAudienceTone[trigger.audience]}>
                          {automationAudienceLabels[trigger.audience]}
                        </Badge>
                        <Switch
                          checked={automationToggles[trigger.id]}
                          onCheckedChange={(checked) => handleAutomationToggle(trigger.id, checked)}
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Cadence</p>
                        <p className="font-medium text-foreground">{trigger.cadence}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Sample subject</p>
                        <p className="font-medium text-foreground">{trigger.sampleSubject}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Recovery</CardTitle>
              <CardDescription>Manage automated and manual backups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label>Automatic backups</Label>
                <Switch checked={autoBackups} onCheckedChange={setAutoBackups} />
              </div>
              <Separator className="my-4" />
              <Button onClick={handleBackup}>Trigger Manual Backup</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button variant="outline" size="sm" className="w-full sm:w-auto">{t("common.reset", { defaultValue: "Reset" })}</Button>
        <Button onClick={handleSave} size="sm" className="w-full sm:w-auto">{t("common.saveChanges", { defaultValue: "Save changes" })}</Button>
      </div>
    </div>
  );
};

export default AdminSettings;

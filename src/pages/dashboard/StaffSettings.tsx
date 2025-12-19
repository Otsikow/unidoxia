import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Palette, ShieldCheck, Bell, BookOpen, Languages } from "lucide-react";
import { useTheme } from "next-themes";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import BackButton from "@/components/BackButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/providers/LanguageProvider";
import type { SupportedLanguage } from "@/i18n/resources";

const previewThemes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export default function StaffSettings() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const [previewTheme, setPreviewTheme] = useState("light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(false);

  useEffect(() => {
    const resolved = (theme === "system" ? resolvedTheme : theme) ?? "light";
    const normalized = resolved === "dark" ? "dark" : "light";
    if (normalized !== previewTheme) {
      setPreviewTheme(normalized);
    }
  }, [resolvedTheme, theme, previewTheme]);

  const changeLanguage = (code: string) => {
    setLanguage(code as SupportedLanguage);
  };

  const languageOptions = useMemo(
    () =>
      availableLanguages.map((code) => ({
        code,
        label: t(`common.languageNames.${code}`),
      })),
    [availableLanguages, t],
  );

  const handleThemePreview = (themeId: "light" | "dark") => {
    setPreviewTheme(themeId);
    setTheme(themeId);
  };

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <BackButton fallback="/dashboard" label={t("back", { defaultValue: "Back" })} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Settings</h1>
            <p className="text-sm text-muted-foreground">
              Personalize your workspace, manage notifications, and review assigned roles.
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Staff mode
          </Badge>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-xl border bg-background p-2">
            <TabsTrigger value="profile">Profile &amp; Password</TabsTrigger>
            <TabsTrigger value="notifications">Notification Preferences</TabsTrigger>
            <TabsTrigger value="localization">Language &amp; Theme</TabsTrigger>
            <TabsTrigger value="roles">Assigned Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{profile?.full_name?.slice(0, 2).toUpperCase() ?? "ST"}</AvatarFallback>
                  </Avatar>
                  <span>{profile?.full_name ?? "Staff Member"}</span>
                </CardTitle>
                <CardDescription>Update personal information and password.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" defaultValue={profile?.full_name ?? ""} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={profile?.email ?? ""} placeholder="Email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue={profile?.phone ?? ""} placeholder="Phone number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button>Save changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Notification Preferences
                </CardTitle>
                <CardDescription>Decide how Zoe and the platform keep you updated.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Realtime alerts</p>
                    <p className="text-xs text-muted-foreground">Receive updates instantly for tasks, students, and messages.</p>
                  </div>
                  <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Daily digest</p>
                    <p className="text-xs text-muted-foreground">Get a morning summary generated by Zoe.</p>
                  </div>
                  <Switch checked={digestEnabled} onCheckedChange={setDigestEnabled} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="frequency">Digest frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="localization">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5 text-primary" /> Language &amp; Theme
                </CardTitle>
                <CardDescription>Preview theme modes and change localization with react-i18next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={changeLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {previewThemes.map((theme) => (
                    <Card
                      key={theme.id}
                      className={`rounded-xl border ${previewTheme === theme.id ? "border-primary" : "border-muted"}`}
                      role="presentation"
                    >
                      <CardHeader className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Palette className="h-4 w-4" /> {theme.label}
                        </CardTitle>
                        <Button
                          variant={previewTheme === theme.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleThemePreview(theme.id as "dark" | "light")}
                        >
                          Preview
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className={`h-24 rounded-lg border ${theme.id === "dark" ? "bg-zinc-900" : "bg-muted"}`}></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Live theme toggle</p>
                    <p className="text-xs text-muted-foreground">Switch between light and dark mode instantly.</p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Assigned Roles
                </CardTitle>
                <CardDescription>Roles are provisioned by your administrator and are read-only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <span className="font-medium">Primary role</span>
                  <Badge variant="outline">{profile?.role ?? "staff"}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <span className="font-medium">Tenant</span>
                  <Badge variant="outline">{profile?.tenant_id ?? "—"}</Badge>
                </div>
                <div className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground">
                  Need adjustments? Contact your administrator or review the
                  <Button variant="link" className="px-1" asChild>
                    <a href="/resources/staff-handbook.pdf" target="_blank" rel="noreferrer">
                      staff handbook
                    </a>
                  </Button>
                  for escalation procedures.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

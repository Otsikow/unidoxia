"use client";

import { type ComponentType, type SVGProps, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useUserRoles } from "@/hooks/useUserRoles";
import { LoadingState } from "@/components/LoadingState";
import {
  Users,
  GraduationCap,
  CreditCard,
  Library,
  Wrench,
  Sparkles,
  Brain,
  Settings,
  Bell,
  ShieldCheck,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Activity,
  BadgeCheck,
  BookOpen,
  BarChart3,
  Gauge,
  Handshake,
  ScrollText,
  Home,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import BackButton from "@/components/BackButton";

/* -------------------------------------------------------------------------- */
/* Nav Items                                                                  */
/* -------------------------------------------------------------------------- */
interface NavItem {
  to: string;
  labelKey: string;
  descriptionKey: string;
  labelDefault: string;
  descriptionDefault: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", labelKey: "admin.layout.navigation.dashboard.label", descriptionKey: "admin.layout.navigation.dashboard.description", labelDefault: "Dashboard", descriptionDefault: "Key metrics & insights", icon: Gauge },
  { to: "/admin/overview", labelKey: "admin.layout.navigation.overview.label", descriptionKey: "admin.layout.navigation.overview.description", labelDefault: "Overview", descriptionDefault: "Executive summary", icon: BarChart3 },
  { to: "/admin/users", labelKey: "admin.layout.navigation.users.label", descriptionKey: "admin.layout.navigation.users.description", labelDefault: "Users", descriptionDefault: "Administrators & roles", icon: Users },
  { to: "/admin/admissions", labelKey: "admin.layout.navigation.admissions.label", descriptionKey: "admin.layout.navigation.admissions.description", labelDefault: "Admissions Oversight", descriptionDefault: "Pipeline ownership", icon: ScrollText },
  { to: "/admin/payments", labelKey: "admin.layout.navigation.payments.label", descriptionKey: "admin.layout.navigation.payments.description", labelDefault: "Payments", descriptionDefault: "Stripe & payouts", icon: CreditCard },
  { to: "/admin/partners", labelKey: "admin.layout.navigation.partners.label", descriptionKey: "admin.layout.navigation.partners.description", labelDefault: "Partners", descriptionDefault: "Agencies & universities", icon: Handshake },
  { to: "/admin/universities", labelKey: "admin.layout.navigation.universities.label", descriptionKey: "admin.layout.navigation.universities.description", labelDefault: "Universities", descriptionDefault: "Institution partners", icon: GraduationCap },
  { to: "/admin/programs", labelKey: "admin.layout.navigation.programs.label", descriptionKey: "admin.layout.navigation.programs.description", labelDefault: "Courses", descriptionDefault: "Catalogue & intakes", icon: BookOpen },
  { to: "/admin/featured-universities", labelKey: "admin.layout.navigation.featuredUniversities.label", descriptionKey: "admin.layout.navigation.featuredUniversities.description", labelDefault: "Featured Universities", descriptionDefault: "Homepage spotlight", icon: BadgeCheck },
  { to: "/admin/resources", labelKey: "admin.layout.navigation.resources.label", descriptionKey: "admin.layout.navigation.resources.description", labelDefault: "Resources", descriptionDefault: "Content & assets", icon: Library },
  { to: "/admin/agents", labelKey: "admin.layout.navigation.agents.label", descriptionKey: "admin.layout.navigation.agents.description", labelDefault: "Agents", descriptionDefault: "Agency performance", icon: Users },
  { to: "/admin/tools", labelKey: "admin.layout.navigation.tools.label", descriptionKey: "admin.layout.navigation.tools.description", labelDefault: "Tools", descriptionDefault: "Automation & QA", icon: Wrench },
  { to: "/admin/insights", labelKey: "admin.layout.navigation.insights.label", descriptionKey: "admin.layout.navigation.insights.description", labelDefault: "Insights", descriptionDefault: "AI & analytics", icon: Brain },
  { to: "/admin/intelligence", labelKey: "admin.layout.navigation.intelligence.label", descriptionKey: "admin.layout.navigation.intelligence.description", labelDefault: "Zoe Intelligence", descriptionDefault: "AI insights console", icon: Sparkles },
  { to: "/admin/settings", labelKey: "admin.layout.navigation.settings.label", descriptionKey: "admin.layout.navigation.settings.description", labelDefault: "Settings", descriptionDefault: "Tenant configuration", icon: Settings },
  { to: "/admin/notifications", labelKey: "admin.layout.navigation.notifications.label", descriptionKey: "admin.layout.navigation.notifications.description", labelDefault: "Notifications", descriptionDefault: "System alerts", icon: Bell },
  { to: "/admin/logs", labelKey: "admin.layout.navigation.logs.label", descriptionKey: "admin.layout.navigation.logs.description", labelDefault: "Logs", descriptionDefault: "Audit trails", icon: ShieldCheck },
  { to: "/admin/usage-monitoring", labelKey: "admin.layout.navigation.usage.label", descriptionKey: "admin.layout.navigation.usage.description", labelDefault: "Usage Monitoring", descriptionDefault: "Live engagement view", icon: Activity },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
const getInitials = (value: string) =>
  value
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* -------------------------------------------------------------------------- */
/* Admin Layout                                                               */
/* -------------------------------------------------------------------------- */
const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { loading: rolesLoading, hasRole } = useUserRoles();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <LoadingState message="Validating admin permissions" size="md" />
      </div>
    );
  }

  if (!hasRole("admin")) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/20 p-6 text-center">
        <Badge variant="destructive">Access Restricted</Badge>
        <h1 className="text-2xl font-semibold">Administrator role required</h1>
        <Button asChild>
          <NavLink to="/dashboard">Return to dashboard</NavLink>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Mobile Nav */}
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed left-3 top-3 z-50 md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            {/* Sidebar reused */}
          </SheetContent>
        </Sheet>
      )}

      <div className="flex w-full flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="h-9 w-9"
              aria-label="Go to home"
            >
              <Home className="h-5 w-5" />
            </Button>

            {location.pathname !== "/admin/dashboard" && location.pathname !== "/admin" && (
              <BackButton
                variant="ghost"
                size="sm"
                fallback="/admin/dashboard"
                label="Back"
              />
            )}
          </div>

          <NotificationBell notificationsUrl="/admin/notifications" maxItems={7} />
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

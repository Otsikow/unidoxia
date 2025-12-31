"use client";

import { type ComponentType, type SVGProps, useState, useCallback, useEffect } from "react";
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
  ChevronDown,
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
/* ✅ Nav Items with Localization Support - Organized by Category             */
/* -------------------------------------------------------------------------- */
interface NavItem {
  to: string;
  labelKey: string;
  descriptionKey: string;
  labelDefault: string;
  descriptionDefault: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface NavGroup {
  groupKey: string;
  groupDefault: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: "admin.layout.navigation.groups.overview",
    groupDefault: "Overview",
    items: [
      {
        to: "/admin/dashboard",
        labelKey: "admin.layout.navigation.dashboard.label",
        descriptionKey: "admin.layout.navigation.dashboard.description",
        labelDefault: "Dashboard",
        descriptionDefault: "Key metrics & insights",
        icon: Gauge,
      },
      {
        to: "/admin/overview",
        labelKey: "admin.layout.navigation.overview.label",
        descriptionKey: "admin.layout.navigation.overview.description",
        labelDefault: "Executive Summary",
        descriptionDefault: "High-level overview",
        icon: BarChart3,
      },
    ],
  },
  {
    groupKey: "admin.layout.navigation.groups.studentsAgents",
    groupDefault: "Students & Agents",
    items: [
      {
        to: "/admin/admissions",
        labelKey: "admin.layout.navigation.admissions.label",
        descriptionKey: "admin.layout.navigation.admissions.description",
        labelDefault: "Applications",
        descriptionDefault: "Review student documents",
        icon: ScrollText,
      },
      {
        to: "/admin/agents",
        labelKey: "admin.layout.navigation.agents.label",
        descriptionKey: "admin.layout.navigation.agents.description",
        labelDefault: "Agents",
        descriptionDefault: "Agency management",
        icon: Users,
      },
    ],
  },
  {
    groupKey: "admin.layout.navigation.groups.universities",
    groupDefault: "Universities",
    items: [
      {
        to: "/admin/universities",
        labelKey: "admin.layout.navigation.universities.label",
        descriptionKey: "admin.layout.navigation.universities.description",
        labelDefault: "All Universities",
        descriptionDefault: "Institution partners",
        icon: GraduationCap,
      },
      {
        to: "/admin/programs",
        labelKey: "admin.layout.navigation.programs.label",
        descriptionKey: "admin.layout.navigation.programs.description",
        labelDefault: "Courses",
        descriptionDefault: "Catalogue & intakes",
        icon: BookOpen,
      },
      {
        to: "/admin/featured-universities",
        labelKey: "admin.layout.navigation.featuredUniversities.label",
        descriptionKey: "admin.layout.navigation.featuredUniversities.description",
        labelDefault: "Featured",
        descriptionDefault: "Homepage spotlight",
        icon: BadgeCheck,
      },
    ],
  },
  {
    groupKey: "admin.layout.navigation.groups.platform",
    groupDefault: "Platform",
    items: [
      {
        to: "/admin/users",
        labelKey: "admin.layout.navigation.users.label",
        descriptionKey: "admin.layout.navigation.users.description",
        labelDefault: "Users",
        descriptionDefault: "Administrators & roles",
        icon: Users,
      },
      {
        to: "/admin/partners",
        labelKey: "admin.layout.navigation.partners.label",
        descriptionKey: "admin.layout.navigation.partners.description",
        labelDefault: "Partners",
        descriptionDefault: "Agencies & universities",
        icon: Handshake,
      },
      {
        to: "/admin/payments",
        labelKey: "admin.layout.navigation.payments.label",
        descriptionKey: "admin.layout.navigation.payments.description",
        labelDefault: "Payments",
        descriptionDefault: "Stripe & payouts",
        icon: CreditCard,
      },
      {
        to: "/admin/resources",
        labelKey: "admin.layout.navigation.resources.label",
        descriptionKey: "admin.layout.navigation.resources.description",
        labelDefault: "Resources",
        descriptionDefault: "Content & assets",
        icon: Library,
      },
    ],
  },
  {
    groupKey: "admin.layout.navigation.groups.analytics",
    groupDefault: "Analytics",
    items: [
      {
        to: "/admin/insights",
        labelKey: "admin.layout.navigation.insights.label",
        descriptionKey: "admin.layout.navigation.insights.description",
        labelDefault: "Insights",
        descriptionDefault: "AI & analytics",
        icon: Brain,
      },
      {
        to: "/admin/intelligence",
        labelKey: "admin.layout.navigation.intelligence.label",
        descriptionKey: "admin.layout.navigation.intelligence.description",
        labelDefault: "Zoe Intelligence",
        descriptionDefault: "AI insights console",
        icon: Sparkles,
      },
      {
        to: "/admin/usage-monitoring",
        labelKey: "admin.layout.navigation.usage.label",
        descriptionKey: "admin.layout.navigation.usage.description",
        labelDefault: "Usage Monitoring",
        descriptionDefault: "Live engagement",
        icon: Activity,
      },
    ],
  },
  {
    groupKey: "admin.layout.navigation.groups.system",
    groupDefault: "System",
    items: [
      {
        to: "/admin/settings",
        labelKey: "admin.layout.navigation.settings.label",
        descriptionKey: "admin.layout.navigation.settings.description",
        labelDefault: "Settings",
        descriptionDefault: "Configuration",
        icon: Settings,
      },
      {
        to: "/admin/notifications",
        labelKey: "admin.layout.navigation.notifications.label",
        descriptionKey: "admin.layout.navigation.notifications.description",
        labelDefault: "Notifications",
        descriptionDefault: "System alerts",
        icon: Bell,
      },
      {
        to: "/admin/logs",
        labelKey: "admin.layout.navigation.logs.label",
        descriptionKey: "admin.layout.navigation.logs.description",
        labelDefault: "Logs",
        descriptionDefault: "Audit trails",
        icon: ShieldCheck,
      },
      {
        to: "/admin/tools",
        labelKey: "admin.layout.navigation.tools.label",
        descriptionKey: "admin.layout.navigation.tools.description",
        labelDefault: "Tools",
        descriptionDefault: "Automation & QA",
        icon: Wrench,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* ✅ Helpers                                                                 */
/* -------------------------------------------------------------------------- */
const getInitials = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* -------------------------------------------------------------------------- */
/* ✅ Main Admin Layout                                                       */
/* -------------------------------------------------------------------------- */
// Storage key for persisting collapsed state
const COLLAPSED_GROUPS_KEY = "admin_sidebar_collapsed_groups";

const getInitialCollapsedGroups = (): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { loading: rolesLoading, hasRole } = useUserRoles();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(getInitialCollapsedGroups);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(collapsedGroups));
    } catch {
      // Ignore storage errors
    }
  }, [collapsedGroups]);

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ✅ Role Validation                                                     */
  /* ---------------------------------------------------------------------- */
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
        <Badge variant="destructive" className="uppercase tracking-wide">
          Access Restricted
        </Badge>
        <h1 className="text-2xl font-semibold">Administrator role required</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your account does not have the necessary permissions to access the Admin Dashboard. Please contact a system
          administrator if you believe this is an error.
        </p>
        <Button asChild>
          <NavLink to="/dashboard">Return to dashboard</NavLink>
        </Button>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* ✅ Sidebar                                                             */
  /* ---------------------------------------------------------------------- */
  const sidebar = (showCollapseButton = true) => (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        isCollapsed && showCollapseButton ? "w-20" : "w-72"
      )}
    >
      <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-3 border-b px-3 sm:px-4">
        <img
          src={unidoxiaLogo}
          alt={t("admin.layout.sidebar.logoAlt", { defaultValue: "UniDoxia" })}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white object-contain p-1 dark:bg-transparent dark:brightness-0 dark:invert"
        />
        {(!isCollapsed || !showCollapseButton) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {t("admin.layout.sidebar.organization", { defaultValue: "UniDoxia" })}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {t("admin.layout.sidebar.subtitle", { defaultValue: "Admin Control Centre" })}
            </p>
          </div>
        )}
        {showCollapseButton && (
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <nav className="px-2 py-3 sm:py-4">
          {NAV_GROUPS.map((group, groupIndex) => {
            const isGroupCollapsed = collapsedGroups[group.groupKey] ?? false;
            const hasActiveItem = group.items.some((item) => location.pathname.startsWith(item.to));
            
            return (
              <div key={group.groupKey} className={cn(groupIndex > 0 && "mt-4 pt-4 border-t border-border/50")}>
                {/* Collapsible Group Header */}
                {(!isCollapsed || !showCollapseButton) && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.groupKey)}
                    className={cn(
                      "mb-2 px-3 w-full flex items-center justify-between gap-2 group/header",
                      "hover:bg-muted/50 rounded-md py-1.5 -my-1.5 transition-colors",
                      hasActiveItem && isGroupCollapsed && "bg-primary/5"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70",
                      "group-hover/header:text-muted-foreground transition-colors",
                      hasActiveItem && "text-primary/70"
                    )}>
                      {t(group.groupKey, { defaultValue: group.groupDefault })}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
                        "group-hover/header:text-muted-foreground",
                        isGroupCollapsed && "-rotate-90"
                      )}
                    />
                  </button>
                )}
                {isCollapsed && showCollapseButton && groupIndex > 0 && (
                  <div className="mb-2 mx-auto w-6 h-px bg-border/50" />
                )}
                {/* Group Items - Collapsible */}
                <div
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out",
                    // When sidebar is collapsed, always show items (icons only)
                    isCollapsed && showCollapseButton
                      ? "max-h-[1000px] opacity-100"
                      : isGroupCollapsed
                        ? "max-h-0 opacity-0"
                        : "max-h-[1000px] opacity-100"
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "group block rounded-lg p-2 sm:p-2.5 transition touch-manipulation",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <div className={cn("flex items-center gap-2 sm:gap-3", isCollapsed && showCollapseButton && "justify-center")}> 
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                          {(!isCollapsed || !showCollapseButton) && (
                            <div className="flex min-w-0 flex-col">
                              <span className="text-sm font-medium truncate">
                                {t(item.labelKey, { defaultValue: item.labelDefault })}
                              </span>
                              <span className="text-[11px] text-muted-foreground group-hover:text-muted-foreground/80 truncate hidden sm:block">
                                {t(item.descriptionKey, { defaultValue: item.descriptionDefault })}
                              </span>
                            </div>
                          )}
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer user profile */}
      <div className="border-t p-3 sm:p-4">
        <div className={cn("flex items-center gap-2 sm:gap-3", isCollapsed && showCollapseButton && "justify-center")}> 
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "Admin"} />
            <AvatarFallback>{profile?.full_name ? getInitials(profile.full_name) : "AD"}</AvatarFallback>
          </Avatar>
          {(!isCollapsed || !showCollapseButton) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {profile?.full_name ?? t("admin.layout.profile.defaultName", { defaultValue: "Admin" })}
              </p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="mt-2 sm:mt-3 w-full" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
          {(!isCollapsed || !showCollapseButton) && <span className="ml-2">{t("common.actions.logout", { defaultValue: "Logout" })}</span>}
        </Button>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------------- */
  /* ✅ Mobile Navigation Sheet                                            */
  /* ---------------------------------------------------------------------- */
  const mobileNavSheet = isMobile ? (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed left-3 top-3 z-50 h-10 w-10 md:hidden shadow-md">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        {sidebar(false)}
      </SheetContent>
    </Sheet>
  ) : null;

  /* ---------------------------------------------------------------------- */
  /* ✅ Layout Wrapper                                                       */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen bg-muted/20">
      {mobileNavSheet}
      <div className={cn("hidden md:flex shrink-0", isCollapsed ? "md:w-20" : "md:w-72")}>{sidebar(true)}</div>
      <div className="flex w-full min-w-0 flex-col">
        {/* Top Header Bar with Notification Bell */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Go to home"
            >
              <Home className="h-5 w-5" />
            </Button>
            {location.pathname !== "/admin/dashboard" && location.pathname !== "/admin" ? (
              <BackButton
                variant="ghost"
                size="sm"
                showHistoryMenu={false}
                fallback="/admin/dashboard"
                className="h-9 px-2"
                label="Back"
              />
            ) : null}
          </div>
          <NotificationBell notificationsUrl="/admin/notifications" maxItems={7} />
        </header>
        <main className="flex-1 bg-background">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppFooter } from "@/components/layout/AppFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import BackButton from "@/components/BackButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Home } from "lucide-react";

const formatRoleLabel = (role?: string | null) =>
  role ? role.replace(/_/g, " ") : "User";

const getInitials = (value?: string | null) =>
  value
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "UD";

interface DashboardLayoutProps {
  children: ReactNode;
  showToolbarBackButton?: boolean;
}

export function DashboardLayout({ children, showToolbarBackButton = true }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="bg-gradient-subtle min-w-0">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <SidebarToolbar showBackButton={showToolbarBackButton} />
            <main className="flex-1 min-w-0 animate-fade-in overflow-y-auto">
              <div className="page-shell py-4 sm:py-6 lg:py-8">
                {children}
              </div>
            </main>
            <AppFooter />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SidebarToolbar({ showBackButton }: { showBackButton?: boolean }) {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { primaryRole } = useUserRoles();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const roleLabel = formatRoleLabel(primaryRole);

  // Determine notification URL based on role
  const notificationsUrl = (() => {
    switch (primaryRole) {
      case "partner":
        return "/university/notifications";
      case "agent":
        return "/dashboard/notifications";
      case "staff":
        return "/dashboard/notifications";
      case "admin":
        return "/admin/notifications";
      default:
        return "/student/notifications";
    }
  })();

  const showBack =
    showBackButton !== false &&
    location.pathname !== "/dashboard" &&
    location.pathname !== "/dashboard/" &&
    location.pathname !== "/student/dashboard" &&
    location.pathname !== "/";

  return (
    <div className="sticky top-0 z-30 flex flex-col gap-2 sm:gap-3 border-b bg-background/80 px-2 sm:px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top row */}
      <div className="flex items-center gap-2">
        <SidebarTrigger
          className="h-7 w-7 sm:h-8 sm:w-8"
          aria-label={
            state === "collapsed"
              ? "Expand navigation"
              : "Collapse navigation"
          }
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
          aria-label="Go to home"
        >
          <Home className="h-4 w-4" />
        </Button>

        {showBack && (
          <BackButton
            variant="ghost"
            size="sm"
            showHistoryMenu={false}
            fallback="/dashboard"
            className="h-7 px-2"
          />
        )}

        <span className="hidden md:inline text-xs sm:text-sm font-medium text-muted-foreground">
          {state === "collapsed" ? "Expand navigation" : "Collapse navigation"}
        </span>
      </div>

      {/* Greeting card */}
      <div className="flex flex-col gap-2 sm:gap-3 rounded-lg sm:rounded-xl border bg-background/90 p-2 sm:p-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs sm:text-sm font-semibold text-primary">
            {getInitials(profile?.full_name)}
          </div>

          <div className="min-w-0 space-y-0.5 sm:space-y-1">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
              Welcome back
            </p>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="truncate text-sm sm:text-lg font-semibold leading-tight">
                Hi, {firstName}
              </h2>
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-[11px] capitalize"
              >
                {roleLabel}
              </Badge>
            </div>

            <p className="hidden sm:block truncate text-[10px] sm:text-xs text-muted-foreground">
              Your UniDoxia dashboard greeting stays visible.
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell
            notificationsUrl={notificationsUrl}
            maxItems={5}
          />

          <div className="flex items-center gap-2 sm:gap-3 rounded-md sm:rounded-lg border bg-muted/40 px-2 sm:px-3 py-1.5 sm:py-2">
            <div className="hidden sm:block space-y-0.5 text-left">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Theme
              </p>
              <p className="hidden md:block text-[10px] sm:text-xs text-muted-foreground">
                Toggle light or dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

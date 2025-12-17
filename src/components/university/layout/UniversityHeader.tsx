import {
  Menu,
  RefreshCcw,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useUniversityBranding } from "@/hooks/useUniversityBranding";
import BackButton from "@/components/BackButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
interface UniversityHeaderProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  onToggleMobileNav?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
const resolveSectionTitle = (pathname: string) => {
  const base = pathname.replace(/^\/+|\/+$/g, "");
  if (!base || base === "university") return "Overview";

  const parts = base.split("/");
  const lastSegment = parts[parts.length - 1];

  if (lastSegment === "offers") return "Offers & CAS";

  return lastSegment
    .split("-")
    .map((part) =>
      part.toLowerCase() === "cas"
        ? "CAS"
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export const UniversityHeader = ({
  onRefresh,
  refreshing,
  onToggleMobileNav,
  onToggleSidebar,
  sidebarCollapsed = false,
}: UniversityHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const partnerBranding = useUniversityBranding();

  const partnerProfile = useMemo(
    () => ({
      displayName: partnerBranding.displayName,
      avatarUrl: partnerBranding.avatarUrl,
      contactEmail: partnerBranding.contactEmail,
      contactName: partnerBranding.contactName,
      roleLabel: partnerBranding.roleLabel,
    }),
    [
      partnerBranding.displayName,
      partnerBranding.avatarUrl,
      partnerBranding.contactEmail,
      partnerBranding.contactName,
      partnerBranding.roleLabel,
    ],
  );

  const initials = useMemo(() => {
    const basis =
      partnerProfile.displayName ||
      partnerProfile.contactName ||
      profile?.full_name ||
      "UP";

    return (
      basis
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("") || "UP"
    );
  }, [
    partnerProfile.displayName,
    partnerProfile.contactName,
    profile?.full_name,
  ]);

  const title = resolveSectionTitle(location.pathname);

  const showBack =
    location.pathname !== "/university" &&
    location.pathname !== "/university/" &&
    location.pathname !== "/university/overview" &&
    location.pathname !== "/";

  const handleSignOut = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await signOut({ redirectTo: "/auth/login" });
      toast({
        title: "Success",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground lg:hidden"
          onClick={onToggleMobileNav}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden text-muted-foreground hover:text-foreground lg:inline-flex"
          onClick={onToggleSidebar}
          aria-pressed={sidebarCollapsed}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Go to home"
        >
          <Home className="h-5 w-5" />
        </Button>

        {showBack && (
          <BackButton
            variant="ghost"
            size="sm"
            showHistoryMenu={false}
            fallback="/university"
            className="h-8 px-2"
            label="Back"
          />
        )}

        <div>
          <p className="text-xs uppercase tracking-[0.4rem] text-muted-foreground">
            UniDoxia
          </p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            refreshing && "cursor-progress opacity-70",
          )}
        >
          <RefreshCcw
            className={cn("h-5 w-5", refreshing && "animate-spin")}
          />
        </Button>

        <NotificationBell
          notificationsUrl="/university/notifications"
          maxItems={5}
        />

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-xl bg-muted/60 px-2 py-1 hover:bg-muted"
            >
              <Avatar className="h-8 w-8 border border-primary/20 bg-muted">
                {partnerProfile.avatarUrl && (
                  <AvatarImage
                    src={partnerProfile.avatarUrl}
                    alt={partnerProfile.displayName ?? "University Partner"}
                  />
                )}
                <AvatarFallback className="bg-primary/80 text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left leading-tight md:block">
                {partnerBranding.isLoading ? (
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium">
                      {partnerProfile.displayName}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {partnerProfile.roleLabel}
                    </p>
                  </>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">
                  {partnerProfile.displayName}
                </span>
                <span className="text-xs font-medium text-primary">
                  {partnerProfile.roleLabel}
                </span>
                {partnerProfile.contactEmail && (
                  <span className="text-xs text-muted-foreground">
                    {partnerProfile.contactEmail}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => navigate("/profile/settings?tab=profile")}>
              View Profile
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => navigate("/university/profile")}>
              University Profile
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => navigate("/profile/settings?tab=account")}>
              Account Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={handleSignOut}
              disabled={isLoggingOut}
              className="text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

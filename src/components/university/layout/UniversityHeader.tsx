import { Menu, RefreshCcw, Bell, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

interface UniversityHeaderProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  onToggleMobileNav?: () => void;
}

const resolveSectionTitle = (pathname: string) => {
  const base = pathname.replace(/^\/+|\/+$/g, "");
  if (!base || base === "university") return "Overview";
  const parts = base.split("/");
  const lastSegment = parts[parts.length - 1];
  if (lastSegment === "offers") return "Offers & CAS";
  return lastSegment
    .split("-")
    .map((part) => 
      part.toLowerCase() === "cas" ? "CAS" : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
};

export const UniversityHeader = ({
  onRefresh,
  refreshing,
  onToggleMobileNav,
}: UniversityHeaderProps) => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const partnerProfileQuery = useQuery({
    queryKey: ["university-partner-profile", profile?.id, profile?.tenant_id],
    enabled: Boolean(profile?.id),
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      if (!profile?.id) {
        throw new Error("Cannot load partner profile without an authenticated user");
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, tenant_id")
        .eq("id", profile.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      let displayName =
        profileRow?.full_name?.trim() ||
        profile?.full_name?.trim() ||
        "University Partner";
      let avatarUrl = profileRow?.avatar_url ?? profile?.avatar_url ?? null;

      if (profileRow?.tenant_id) {
        // Query university by tenant_id only - don't filter by active status
        // since partners should see their own university regardless of active status
        // (RLS policy already handles proper access control)
        const { data: universityRow, error: universityError } = await supabase
          .from("universities")
          .select("name, logo_url")
          .eq("tenant_id", profileRow.tenant_id)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (!universityError && universityRow) {
          displayName = universityRow.name ?? displayName;
          avatarUrl = universityRow.logo_url ?? avatarUrl;
        } else if (universityError) {
          console.warn(
            "Unable to load university details for header menu",
            universityError,
          );
        }
      }

      return {
        displayName,
        avatarUrl,
        contactEmail: profileRow?.email ?? profile?.email ?? null,
        contactName: profileRow?.full_name ?? profile?.full_name ?? null,
        roleLabel: "University Partner" as const,
      };
    },
  });

  const partnerProfile = partnerProfileQuery.data ?? {
    displayName: profile?.full_name ?? "University Partner",
    avatarUrl: profile?.avatar_url ?? null,
    contactEmail: profile?.email ?? null,
    contactName: profile?.full_name ?? null,
    roleLabel: "University Partner" as const,
  };

  const initials = useMemo(() => {
    const basis =
      partnerProfile.displayName ||
      partnerProfile.contactName ||
      profile?.full_name ||
      "UP";
    const derived = basis
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((namePart) => namePart.charAt(0).toUpperCase())
      .join("");
    return derived || "UP";
  }, [partnerProfile.displayName, partnerProfile.contactName, profile?.full_name]);

  const title = resolveSectionTitle(location.pathname);

  const handleViewProfile = () => {
    navigate("/profile/settings?tab=profile");
  };

  const handleAccountSettings = () => {
    navigate("/profile/settings?tab=account");
  };

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
      console.error("Failed to sign out:", error);
      const description =
        error instanceof Error
          ? error.message
          : "Something went wrong while signing you out. Please try again.";
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground lg:hidden"
          onClick={onToggleMobileNav}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs uppercase tracking-[0.4rem] text-muted-foreground">
            UniDoxia
          </p>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            refreshing && "cursor-progress opacity-70",
          )}
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCcw className={cn("h-5 w-5", refreshing && "animate-spin")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-xl bg-muted/60 px-2 py-1 text-sm text-foreground hover:bg-muted"
            >
                <Avatar className="h-8 w-8 border border-primary/20 bg-muted">
                  {partnerProfile.avatarUrl ? (
                    <AvatarImage
                      src={partnerProfile.avatarUrl}
                      alt={partnerProfile.displayName ?? "University Partner"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/80 text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left leading-tight md:block">
                  {partnerProfileQuery.isLoading ? (
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
          <DropdownMenuContent
            side="bottom"
            align="end"
            className="w-56 border border-border bg-popover text-popover-foreground"
          >
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {partnerProfile.displayName}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {partnerProfile.roleLabel}
                  </span>
                  {partnerProfile.contactName &&
                    partnerProfile.contactName !== partnerProfile.displayName && (
                      <span className="text-xs text-muted-foreground">
                        Contact: {partnerProfile.contactName}
                      </span>
                    )}
                  {partnerProfile.contactEmail && (
                    <span className="text-xs text-muted-foreground">
                      {partnerProfile.contactEmail}
                    </span>
                  )}
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onSelect={handleViewProfile}
                className="focus:bg-muted focus:text-foreground"
              >
                View Profile
            </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => navigate("/university/profile")}
                className="focus:bg-muted focus:text-foreground"
              >
                University Profile
            </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleAccountSettings}
                className="focus:bg-muted focus:text-foreground"
              >
                Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={handleSignOut}
              disabled={isLoggingOut}
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

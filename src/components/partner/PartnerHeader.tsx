import { SidebarTrigger } from "@/components/ui/sidebar";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Home, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";

export function PartnerHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = useMemo(() => {
    if (!profile?.full_name) return "P";
    const [first, second] = profile.full_name.split(" ");
    if (!second) return first.charAt(0).toUpperCase();
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }, [profile?.full_name]);

  const showBack =
    location.pathname !== "/partner" &&
    location.pathname !== "/partner/" &&
    location.pathname !== "/";

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur transition-colors dark:border-slate-900/70 dark:bg-slate-950/75 md:px-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="rounded-lg border border-slate-200/70 bg-white/70 text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="rounded-lg border border-slate-200/70 bg-white/70 text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          aria-label="Go to home"
        >
          <Home className="h-4 w-4" />
        </Button>
        {showBack ? (
          <BackButton
            variant="ghost"
            size="sm"
            showHistoryMenu={false}
            fallback="/partner"
            className="h-9 px-2"
            label="Back"
          />
        ) : null}
        <div className="flex items-center gap-3">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia Partner"
            className="hidden h-12 w-12 rounded-xl border border-slate-200 bg-white p-1 shadow-sm md:block dark:border-slate-800 dark:bg-transparent dark:brightness-0 dark:invert"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">UniDoxia</p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 md:text-2xl">Partner Dashboard</h1>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full border border-slate-200/70 bg-white/70 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
        >
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 justify-center rounded-full bg-blue-500 text-[10px] leading-none text-white">
            3
          </Badge>
          <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
            >
              <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : (
                  <AvatarFallback className="bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-200">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{profile?.full_name ?? "UniDoxia Partner"}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{profile?.email ?? "partner@unidoxia.com"}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 bg-white text-slate-900 shadow-lg dark:bg-slate-900 dark:text-slate-100">
            <DropdownMenuLabel>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{profile?.full_name ?? "UniDoxia Partner"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email ?? "partner@unidoxia.com"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem onClick={() => navigate("/profile/settings")} className="gap-2 text-slate-700 dark:text-slate-200">
              <Settings className="h-4 w-4" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/partner/messages")}
              className="gap-2 text-slate-700 dark:text-slate-200"
            >
              <Bell className="h-4 w-4" />
              Inbox & updates
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem
              onClick={() => {
                void signOut();
              }}
              className="gap-2 text-red-500 focus:text-red-400 dark:text-red-400 dark:focus:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { LucideIcon } from "lucide-react";
import {
  Menu,
  LogOut,
  Settings,
  Home as HomeIcon,
  Search,
  GraduationCap,
  Newspaper,
  MessageCircle,
  Award,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import BackButton from "@/components/BackButton";

// ✅ Finalized Navigation Links (merged correctly)
const navLinks: Array<{
  id: "home" | "search" | "scholarships" | "courses" | "blog" | "contact";
  to: string;
  icon: LucideIcon;
}> = [
  { id: "home", to: "/", icon: HomeIcon },
  { id: "search", to: "/search", icon: Search },
  { id: "scholarships", to: "/scholarships", icon: Award },
  { id: "courses", to: "/courses", icon: GraduationCap },
  { id: "blog", to: "/blog", icon: Newspaper },
  { id: "contact", to: "/contact", icon: MessageCircle },
];

const HIDDEN_BACK_BUTTON_PATHS = new Set(["/"]);

const AppNavbar = () => {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const showBackButton = !HIDDEN_BACK_BUTTON_PATHS.has(location.pathname);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Map 'university' role to 'partner' for backward compatibility
  const isPartnerRole = profile?.role === "partner" || profile?.role === "university";
  const dashboardPath = isPartnerRole ? "/university" : "/dashboard";

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-slide-in-down">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8 lg:py-0">
        {/* LEFT SECTION */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {showBackButton && (
            <BackButton
              variant="ghost"
              size="sm"
              fallback="/"
              showHistoryMenu={false}
              className="h-10 px-2 sm:px-3"
              labelClassName="hidden sm:inline"
              wrapperClassName="hidden xs:inline-flex"
              aria-label={t("common.actions.goBack")}
            />
          )}

          {/* MOBILE NAVIGATION MENU */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-10 w-10 rounded-full p-0 lg:hidden"
                aria-label={t("common.labels.toggleNavigation")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm p-0 sm:max-w-md">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <img
                      src={unidoxiaLogo}
                      alt={t("layout.navbar.brand.short")}
                      className="h-8 w-8 rounded-md object-contain dark:brightness-0 dark:invert"
                    />
                    <span className="text-base font-semibold">
                      {t("layout.navbar.brand.short")}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher size="sm" />
                    <ThemeToggle />
                  </div>
                </div>

                {/* Mobile Links */}
                <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="flex-1">
                          {t(`layout.navbar.links.${link.id}`)}
                        </span>
                      </Link>
                    );
                  })}
                </nav>

                <Separator />

                {/* Mobile Footer Section */}
                <div className="px-6 py-4 space-y-3">
                  {profile ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name} />
                          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button asChild variant="outline" size="sm" onClick={() => setMobileOpen(false)}>
                          <Link to={dashboardPath}>{t("common.navigation.dashboard")}</Link>
                        </Button>
                        <Button asChild size="sm" onClick={() => setMobileOpen(false)}>
                          <Link to="/profile/settings">{t("common.navigation.settings")}</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="col-span-2"
                          onClick={() => {
                            setMobileOpen(false);
                            void signOut();
                          }}
                        >
                          {t("common.actions.logout")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                        <Link to="/auth/login">{t("common.actions.login")}</Link>
                      </Button>
                      <Button asChild className="w-full" onClick={() => setMobileOpen(false)}>
                        <Link to="/auth/signup">{t("common.actions.signup")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* BRAND LOGO */}
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 transition-transform duration-300 hover:scale-105"
          >
            <img
              src={unidoxiaLogo}
              alt={t("layout.navbar.brand.short")}
              className="h-8 w-8 rounded-md object-contain dark:brightness-0 dark:invert"
            />
            <span className="hidden truncate text-base font-semibold sm:inline">
              {t("layout.navbar.brand.full")}
            </span>
          </Link>
        </div>

        {/* CENTER NAV LINKS (Desktop) */}
        <nav className="order-3 hidden w-full items-center justify-center gap-5 lg:order-2 lg:flex lg:w-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group flex flex-col items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-all duration-300 hover:text-primary"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold normal-case tracking-normal">
                  {t(`layout.navbar.links.${link.id}`)}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* RIGHT SECTION */}
        <div className="order-2 flex flex-1 items-center justify-end gap-2 sm:gap-3 lg:order-3">
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || ""} alt={profile.full_name} />
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">{t("common.labels.openUserMenu")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={dashboardPath} className="cursor-pointer">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    {t("common.navigation.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("common.navigation.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("common.actions.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
                <Link to="/auth/login">{t("common.actions.login")}</Link>
              </Button>
              <Button size="sm" asChild className="hidden lg:inline-flex">
                <Link to="/auth/signup">{t("common.actions.signup")}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="lg:hidden">
                <Link to="/auth/login" className="px-2" aria-label={t("common.actions.login")}>
                  {t("common.actions.login")}
                </Link>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher size="sm" />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;

import { useState } from "react";
import { Link } from "react-router-dom";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import {
  Mail,
  Search,
  Calculator,
  MessageSquare,
  LogIn,
  LogOut,
  UserPlus,
  LayoutDashboard,
  Shield,
  FileText,
  Newspaper,
  HelpCircle,
  Linkedin,
  Facebook,
  Instagram,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      {/* Simple Icons "whatsapp" (CC0) */}
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      {/* X (formerly Twitter) logo */}
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.89.14v-3.5a6.34 6.34 0 0 0-5.79 10.68 6.34 6.34 0 0 0 10.89-4.42V8.68a8.24 8.24 0 0 0 4.82 1.55V6.8c-.24 0-.47-.04-.7-.11z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      {/* Reddit logo */}
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

export function AppFooter() {
  const year = new Date().getFullYear();
  const { t } = useTranslation();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut({ redirectTo: "/" });
      toast({
        title: t("common.notifications.success"),
        description: t("auth.messages.logoutSuccess", {
          defaultValue: "You have been signed out.",
        }),
      });
    } catch (error) {
      console.error("Failed to sign out:", error);
      const description =
        error instanceof Error
          ? error.message
          : t("auth.messages.logoutError", {
              defaultValue: "Something went wrong while signing you out. Please try again.",
            });
      toast({
        title: t("common.notifications.error"),
        description,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={unidoxiaLogo}
                alt={t("layout.navbar.brand.full")}
                className="h-9 w-9 rounded-md object-contain dark:brightness-0 dark:invert"
              />
              <span className="font-semibold text-lg">{t("layout.footer.aboutTitle")}</span>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">{t("layout.footer.aboutDescription")}</p>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              University listings do not imply endorsement or a formal recruitment partnership.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:info@unidoxia.com" className="hover:underline">
                info@unidoxia.com
              </a>
            </div>

            <div className="pt-1">
              <p className="text-sm font-medium">
                {t("layout.footer.followUs", { defaultValue: "Follow UniDoxia" })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("layout.footer.followUsSubtitle", {
                  defaultValue: "Follow us on X, LinkedIn, Facebook, Instagram, TikTok, Reddit, and our WhatsApp channel.",
                })}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://x.com/unidoxia"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.x", { defaultValue: "Follow us on X" })}
                    title={t("layout.footer.social.xShort", { defaultValue: "X" })}
                  >
                    <XIcon className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://www.linkedin.com/company/110137778/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.linkedin", { defaultValue: "Follow us on LinkedIn" })}
                    title={t("layout.footer.social.linkedinShort", { defaultValue: "LinkedIn" })}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://www.facebook.com/profile.php?id=61584297605909"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.facebook", { defaultValue: "Follow us on Facebook" })}
                    title={t("layout.footer.social.facebookShort", { defaultValue: "Facebook" })}
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://www.instagram.com/unidoxia/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.instagram", { defaultValue: "Follow us on Instagram" })}
                    title={t("layout.footer.social.instagramShort", { defaultValue: "Instagram" })}
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://www.tiktok.com/@unidoxia.com1"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.tiktok", { defaultValue: "UniDoxia on TikTok" })}
                    title={t("layout.footer.social.tiktokShort", { defaultValue: "TikTok" })}
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://whatsapp.com/channel/0029Vawx2lA2kNFjQrxOc640"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.whatsapp", {
                      defaultValue: "Follow the UniDoxia.com channel on WhatsApp",
                    })}
                    title={t("layout.footer.social.whatsappShort", { defaultValue: "WhatsApp" })}
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full">
                  <a
                    href="https://www.reddit.com/r/UniDoxia"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.reddit", {
                      defaultValue: "Join our Reddit community",
                    })}
                    title={t("layout.footer.social.redditShort", { defaultValue: "Reddit" })}
                  >
                    <RedditIcon className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("layout.footer.headings.platform")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/courses?view=programs" className="inline-flex items-center gap-2 hover:underline">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.platformLinks.search")}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="inline-flex items-center gap-2 hover:underline">
                  <Newspaper className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.platformLinks.blog")}
                </Link>
              </li>
              <li>
                <Link to="/visa-calculator" className="inline-flex items-center gap-2 hover:underline">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.platformLinks.visaCalculator")}
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="inline-flex items-center gap-2 hover:underline">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.platformLinks.feedback")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("layout.footer.headings.support")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/help" className="inline-flex items-center gap-2 hover:underline">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.supportLinks.help")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.supportLinks.contact")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="inline-flex items-center gap-2 hover:underline">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.supportLinks.faq")}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="inline-flex items-center gap-2 hover:underline">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.supportLinks.dashboard")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("layout.footer.headings.accountLegal")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                {user ? (
                  <Button
                    variant="ghost"
                    className="inline-flex items-center gap-2 px-0 text-muted-foreground hover:text-primary"
                    onClick={handleLogout}
                    disabled={loading || isLoggingOut}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.actions.logout")}
                  </Button>
                ) : (
                  <Link to="/auth/login" className="inline-flex items-center gap-2 hover:underline">
                    <LogIn className="h-4 w-4 text-muted-foreground" />
                    {t("layout.footer.accountLinks.login")}
                  </Link>
                )}
              </li>
              <li>
                <Link to="/auth/signup" className="inline-flex items-center gap-2 hover:underline">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.accountLinks.signup")}
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="inline-flex items-center gap-2 hover:underline">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.accountLinks.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className="inline-flex items-center gap-2 hover:underline">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t("layout.footer.accountLinks.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 text-center sm:flex-row sm:text-left">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("layout.footer.copyright", { year })}</p>
            <p className="max-w-xl text-xs text-muted-foreground">
              UniDoxia is a trading name of Global Talent Gateway Ltd, registered in England and Wales,
              company number 16172129. Registered office: 54 Blakey Close, Redcar, England, TS10 4PB.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="hidden sm:inline">{t("layout.footer.questions")} </span>
            <a className="hover:underline" href="mailto:info@unidoxia.com">
              {t("layout.footer.contactEmailLabel")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;

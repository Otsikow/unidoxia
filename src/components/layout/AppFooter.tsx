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
  CreditCard,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PRICING_PLANS, formatPlanPrice } from "@/types/billing";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Minimal WhatsApp-like mark (bubble + handset) */}
      <path d="M7.6 20.3l.7-2.6a7.8 7.8 0 1 1 3.7 1h0a7.8 7.8 0 0 1-3.9-1.1l-2.5.7z" />
      <path d="M10.3 9.6c.2-.5.4-.6.8-.6h.5c.2 0 .4 0 .6.4l.7 1.7c.1.3.1.5 0 .6l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.4 2.1 2.2 1.5 1 1.8.8 2.1.7l.7-.9c.2-.3.4-.3.7-.2l1.7.8c.3.1.5.2.5.5 0 .3-.2 1-.8 1.6-.5.5-1.1.6-1.5.6-.3 0-.7 0-1.2-.2-1.4-.4-3.2-1.5-4.6-3.1-1.2-1.3-2.1-2.8-2.3-4-.1-.5 0-.9.2-1.3z" />
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
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={unidoxiaLogo}
                alt={t("layout.navbar.brand.full")}
                className="h-9 w-9 rounded-md object-contain dark:brightness-0 dark:invert"
              />
              <span className="font-semibold text-lg">{t("layout.footer.aboutTitle")}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t("layout.footer.aboutDescription")}</p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:info@unidoxia.com" className="hover:underline">
                info@unidoxia.com
              </a>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium">
                {t("layout.footer.followUs", { defaultValue: "Follow UniDoxia" })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("layout.footer.followUsSubtitle", {
                  defaultValue: "Follow us on X, LinkedIn, Facebook, Instagram, and our WhatsApp channel.",
                })}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full">
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
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <a
                    href="https://www.linkedin.com/company/110137778/admin/dashboard/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("layout.footer.social.linkedin", { defaultValue: "Follow us on LinkedIn" })}
                    title={t("layout.footer.social.linkedinShort", { defaultValue: "LinkedIn" })}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full">
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
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full">
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
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full">
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

          {/* Pricing Section */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("layout.footer.headings.pricing", { defaultValue: "Pricing" })}
            </h3>
            <div className="space-y-3">
              <Link 
                to="/pricing" 
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <CreditCard className="h-4 w-4" />
                {t("layout.footer.pricing.viewPlans", { defaultValue: "View All Plans" })}
              </Link>
              <div className="space-y-2 text-sm">
                {PRICING_PLANS.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{plan.name}</span>
                    <span className="font-medium">{formatPlanPrice(plan)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("layout.footer.pricing.terms", { 
                    defaultValue: "All payments are one-time and non-refundable. No subscriptions or hidden fees." 
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-green-600" />
                <span>{t("layout.footer.pricing.secure", { defaultValue: "Secure payments via Stripe" })}</span>
              </div>
            </div>
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
          <p className="text-xs text-muted-foreground">{t("layout.footer.copyright", { year })}</p>
          <div className="text-xs text-muted-foreground">
            <span className="hidden sm:inline">{t("layout.footer.questions")}</span>
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
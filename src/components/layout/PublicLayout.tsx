import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";
import BackButton from "@/components/BackButton";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: ReactNode;
  contentClassName?: string;
  /** Override whether to show the back button. By default, it's hidden on "/" */
  showBackButton?: boolean;
}

/** Paths where the back button should be hidden by default */
const HIDDEN_BACK_BUTTON_PATHS = new Set(["/", "/home"]);

/** Path prefixes where the back button should be hidden (pages with their own back navigation) */
const HIDDEN_BACK_BUTTON_PREFIXES = ["/auth/", "/agents/", "/onboarding/"];

export const PublicLayout = ({ children, contentClassName, showBackButton }: PublicLayoutProps) => {
  const location = useLocation();
  
  // Determine if back button should be shown
  const isHiddenPath = HIDDEN_BACK_BUTTON_PATHS.has(location.pathname);
  const isHiddenPrefix = HIDDEN_BACK_BUTTON_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  const shouldShowBackButton = showBackButton ?? (!isHiddenPath && !isHiddenPrefix);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {shouldShowBackButton && (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-12 items-center px-4">
            <BackButton
              variant="ghost"
              size="sm"
              fallback="/"
              showHistoryMenu={false}
              className="gap-2"
            />
          </div>
        </header>
      )}
      <main className={cn("flex-1 w-full", contentClassName)}>
        <div className="page-shell py-6 sm:py-10 lg:py-12">
          {children}
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, Home } from "lucide-react";

interface PublicLayoutProps {
  children: ReactNode;
  contentClassName?: string;
  /** Override whether to show the back button. By default, it's hidden on "/" */
  showBackButton?: boolean;
}

/** Paths where the back button should be hidden by default */
const HIDDEN_BACK_BUTTON_PATHS = new Set(["/", "/home", "/pricing"]);

/** Path prefixes where the back button should be hidden (pages with their own back navigation) */
const HIDDEN_BACK_BUTTON_PREFIXES = ["/auth/", "/agents/", "/onboarding/"];

export const PublicLayout = ({ children, contentClassName, showBackButton }: PublicLayoutProps) => {
  const location = useLocation();
  
  // Determine if back button should be shown
  const isHiddenPath = HIDDEN_BACK_BUTTON_PATHS.has(location.pathname);
  const isHiddenPrefix = HIDDEN_BACK_BUTTON_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  const isHomePath = location.pathname === "/" || location.pathname === "/home";
  const shouldShowBackButton = showBackButton ?? (!isHiddenPath && !isHiddenPrefix);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {shouldShowBackButton && (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <nav aria-label="Page navigation" className="container mx-auto flex min-h-12 items-center justify-between gap-2 px-4 py-1.5">
            <BackButton
              variant="ghost"
              size="sm"
              fallback="/"
              showHistoryMenu={false}
              className="gap-2"
            />
            <div className="flex items-center gap-1 sm:gap-2">
              {!isHomePath && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/" aria-label="Go to UniDoxia home">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Home</span>
                  </Link>
                </Button>
              )}
              {location.pathname !== "/courses" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/courses" aria-label="Browse UniDoxia courses">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Browse courses</span>
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        </header>
      )}
      <main className={cn("flex-1 w-full", contentClassName)}>
        <div className={cn("page-shell", isHomePath ? "py-0" : "py-6 sm:py-10 lg:py-12")}>
          {children}
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

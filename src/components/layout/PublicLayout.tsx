import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";

interface PublicLayoutProps {
  children: ReactNode;
  contentClassName?: string;
  /** Render children without the constrained page shell (full-bleed pages). */
  fullBleed?: boolean;
}

export const PublicLayout = ({ children, contentClassName, fullBleed = false }: PublicLayoutProps) => {
  const location = useLocation();
  const showBack = location.pathname !== "/" && location.pathname !== "";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className={cn("flex-1 w-full", contentClassName)}>
        {fullBleed ? (
          <>
            {showBack ? (
              <div className="fixed left-3 top-3 z-50">
                <BackButton
                  variant="ghost"
                  size="sm"
                  showHistoryMenu={false}
                  fallback="/"
                  wrapperClassName="inline-flex"
                  className="bg-background/80 backdrop-blur border border-border/60 shadow-sm"
                />
              </div>
            ) : null}
            {children}
          </>
        ) : (
          <div className="page-shell py-6 sm:py-10 lg:py-12">
            {showBack ? (
              <div className="mb-4">
                <BackButton
                  variant="ghost"
                  size="sm"
                  showHistoryMenu={false}
                  fallback="/"
                  wrapperClassName="inline-flex"
                />
              </div>
            ) : null}
            {children}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
};

import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";

interface PublicLayoutProps {
  children: ReactNode;
  contentClassName?: string;
}

export const PublicLayout = ({ children, contentClassName }: PublicLayoutProps) => {
  const location = useLocation();
  const showBack = location.pathname !== "/" && location.pathname !== "";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className={cn("flex-1 w-full", contentClassName)}>
        <div className="page-shell py-6 sm:py-10 lg:py-12">
          {/* BackButton removed in favor of GlobalBackButton */}
          {children}
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

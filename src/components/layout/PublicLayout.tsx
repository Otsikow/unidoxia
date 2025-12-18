import { ReactNode } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { cn } from "@/lib/utils";
import AppNavbar from "@/components/layout/AppNavbar";

interface PublicLayoutProps {
  children: ReactNode;
  contentClassName?: string;
}

export const PublicLayout = ({ children, contentClassName }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppNavbar />
      <main className={cn("flex-1 w-full", contentClassName)}>
        <div className="page-shell py-6 sm:py-10 lg:py-12">
          {children}
        </div>
      </main>
      <AppFooter />
    </div>
  );
};

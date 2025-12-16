import { useLocation } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { cn } from "@/lib/utils";

export const GlobalBackButton = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Define paths where the back button should be HIDDEN
  // "except the landing page and the home page"
  // Landing page = "/"
  // Home page = "/dashboard", "/student/dashboard", "/university/overview", "/admin/dashboard" ??
  // Let's hide it on the main entry points.
  const isHidden = 
    pathname === "/" || 
    pathname === "/dashboard" || 
    pathname === "/student/dashboard" ||
    pathname === "/admin/dashboard" ||
    pathname === "/university/overview" ||
    pathname === "/university" ||
    pathname === "/agent/dashboard"; // assuming agent dashboard path

  if (isHidden) return null;

  return (
    <div className="fixed top-4 left-4 z-50 pointer-events-auto">
      <BackButton 
        variant="secondary" // or "ghost" with a background? "outline"?
        size="icon" // Minimalist: just the icon
        className="rounded-full shadow-md bg-background/80 backdrop-blur-sm border border-border hover:bg-background"
        labelClassName="sr-only" // Hide text for minimalist design
        showHistoryMenu={false} // Keep it simple
      />
    </div>
  );
};

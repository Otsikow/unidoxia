import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import BackButton from "@/components/BackButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <SEO title="Page not found | UniDoxia" description="The requested page could not be found." robots="noindex" />
          <h1 className="mb-4 text-6xl font-bold text-primary">Page not found</h1>
          <p className="mb-8 text-xl text-muted-foreground">Oops! Page not found</p>
          <BackButton fallback="/" label="Return to Home" className="px-6" />
        </div>
      </div>
    );
};

export default NotFound;

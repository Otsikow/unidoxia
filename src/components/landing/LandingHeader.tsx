import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogIn, LogOut, PanelsTopLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";

export function LandingHeader() {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 pt-4 sm:pt-6">
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-1.5 py-1 shadow-lg shadow-black/10 backdrop-blur-md dark:border-white/10 dark:bg-black/20">
            {isAuthenticated ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-white/25 bg-white/15 text-white hover:bg-white/20 hover:text-white hover:border-white/35 hover:scale-100 active:scale-100"
                  disabled={loading}
                >
                  <Link to="/dashboard" aria-label="Open your UniDoxia dashboard">
                    <PanelsTopLeft className="h-4 w-4" />
                    Go to App
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-full text-white hover:bg-white/10 hover:text-white hover:scale-100 active:scale-100"
                  onClick={() => void handleSignOut()}
                  disabled={loading || signingOut}
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign Out"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-full text-white hover:bg-white/10 hover:text-white hover:scale-100 active:scale-100"
                  disabled={loading}
                >
                  <Link to="/auth/login" aria-label="Sign in to UniDoxia">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-white/25 bg-white/15 text-white hover:bg-white/20 hover:text-white hover:border-white/35 hover:scale-100 active:scale-100"
                >
                  <Link to="/auth/signup" aria-label="Create a UniDoxia account">
                    <UserPlus className="h-4 w-4" />
                    Sign Up
                  </Link>
                </Button>
              </>
            )}

            <ThemeToggle className="rounded-full text-white hover:bg-white/10 hover:text-white hover:scale-100 active:scale-100" />
          </div>
        </div>
      </div>
    </header>
  );
}

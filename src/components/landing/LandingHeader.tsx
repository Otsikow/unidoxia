import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogIn, LogOut, Menu, PanelsTopLeft, UserPlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";

const PUBLIC_NAV = [
  { to: "/courses", label: "Courses" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/visa-calculator", label: "Visa Guidance" },
  { to: "/blog", label: "Blog" },
  { to: "/partnership", label: "Partners" },
];

export function LandingHeader() {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-3 rounded-full border border-white/20 bg-black/30 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-md">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="UniDoxia home">
            <img src={unidoxiaLogo} alt="UniDoxia" className="h-8 w-auto brightness-0 invert" />
            <span className="hidden sm:inline text-white font-semibold tracking-tight">UniDoxia</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-white/25 bg-white/15 text-white hover:bg-white/20 hover:text-white hover:border-white/35"
                    disabled={loading}
                  >
                    <Link to="/dashboard" aria-label="Open your UniDoxia dashboard">
                      <PanelsTopLeft className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full text-white hover:bg-white/10 hover:text-white"
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
                    className="gap-2 rounded-full text-white hover:bg-white/10 hover:text-white"
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
                    className="gap-2 rounded-full border-white/25 bg-white/15 text-white hover:bg-white/20 hover:text-white hover:border-white/35"
                  >
                    <Link to="/auth/signup" aria-label="Create a UniDoxia account">
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <ThemeToggle className="rounded-full text-white hover:bg-white/10 hover:text-white" />

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-full text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="lg:hidden mt-2 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-md p-3 shadow-xl">
            <nav className="flex flex-col" aria-label="Mobile primary">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2">
              {isAuthenticated ? (
                <>
                  <Button asChild size="sm" variant="outline" className="rounded-full border-white/25 bg-white/15 text-white hover:bg-white/20 hover:text-white flex-1">
                    <Link to="/dashboard" onClick={closeMobile}>Dashboard</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/10 hover:text-white flex-1"
                    onClick={() => { closeMobile(); void handleSignOut(); }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="sm" variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white flex-1">
                    <Link to="/auth/login" onClick={closeMobile}>Sign In</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full border-white/25 bg-white/15 text-white hover:bg-white/20 hover:text-white flex-1">
                    <Link to="/auth/signup" onClick={closeMobile}>Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

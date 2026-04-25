import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CalendarCheck, LogIn, LogOut, Menu, PanelsTopLeft, UserPlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Destinations", href: "/search" },
  { label: "Services", href: "/#why-unidoxia" },
  { label: "Success Stories", href: "/#success-stories" },
  { label: "Contact", href: "/contact" },
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

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="UniDoxia home">
            <img
              src={unidoxiaLogo}
              alt="UniDoxia"
              className="h-8 w-8 rounded-md brightness-0 invert"
            />
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">
              UniDoxia
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-3 py-2 text-sm font-medium text-white/75 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  asChild
                  size="sm"
                  className="hidden sm:inline-flex h-10 rounded-full px-4 bg-gradient-to-r from-[hsl(45_95%_58%)] to-[hsl(35_92%_55%)] text-[hsl(220_42%_9%)] font-semibold border-0 hover:opacity-95"
                  disabled={loading}
                >
                  <Link to="/dashboard">
                    <PanelsTopLeft className="h-4 w-4" />
                    Go to App
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex h-10 rounded-full text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void handleSignOut()}
                  disabled={loading || signingOut}
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "..." : "Sign Out"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden md:inline-flex h-10 rounded-full text-white/85 hover:bg-white/10 hover:text-white"
                >
                  <Link to="/auth/login">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-10 rounded-full px-4 sm:px-5 bg-gradient-to-r from-[hsl(45_95%_58%)] to-[hsl(35_92%_55%)] text-[hsl(220_42%_9%)] font-semibold border-0 hover:opacity-95 shadow-md"
                >
                  <Link to="/contact" aria-label="Book a free consultation">
                    <CalendarCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Book Free Consultation</span>
                    <span className="sm:hidden">Book Call</span>
                  </Link>
                </Button>
              </>
            )}

            <ThemeToggle className="rounded-full text-white hover:bg-white/10 hover:text-white" />

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-full text-white hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {mobileOpen && (
          <div className="lg:hidden mt-2 rounded-2xl border border-white/15 bg-[hsl(220_42%_10%)/0.95] backdrop-blur-md p-3 shadow-xl">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/5 hover:text-white rounded-lg"
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/5 hover:text-white rounded-lg md:hidden"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

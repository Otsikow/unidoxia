import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { homeNav, studentSignup } from "@/lib/homepage.mjs";

export function HomeLink({ href, children, className }: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return href.startsWith("/")
    ? <Link to={href} className={className}>{children}</Link>
    : <a href={href} className={className}>{children}</a>;
}

export function HomeBrand() {
  return (
    <Link to="/" className="udx-brand" aria-label="UniDoxia home">
      <img src="/home/logo.webp" width={40} height={40} alt="" />
      <span>UniDoxia</span>
    </Link>
  );
}

export function HomeHeader() {
  const { user, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ redirectTo: "/" });
      setOpen(false);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="udx-header" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <a className="udx-skip" href="#main-content">Skip to content</a>
      <div className="udx-wrap udx-header-inner">
        <HomeBrand />
        <button
          type="button"
          ref={toggle}
          className="udx-menu"
          aria-expanded={open}
          aria-controls="udx-home-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          Menu
        </button>
        <div id="udx-home-navigation" className="udx-navigation" data-open={open}>
          <nav aria-label="Main navigation" className="udx-nav">
            {homeNav.map(({ href, label }) => (
              <a key={href} href={href} onClick={() => {
                setOpen(false);
                if (href.startsWith("#")) {
                  document.getElementById(href.slice(1))?.focus({ preventScroll: true });
                }
              }}>{label}</a>
            ))}
          </nav>
          <div className="udx-account">
            {user ? (
              <>
                <button type="button" className="udx-quiet" onClick={() => void handleSignOut()} disabled={loading || signingOut}>
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
                <Link className="udx-button udx-button-small" to="/dashboard">Dashboard</Link>
              </>
            ) : (
              <>
                <Link className="udx-quiet" to="/auth/login">Sign in</Link>
                <Link className="udx-button udx-button-small" to={studentSignup}>Get started</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

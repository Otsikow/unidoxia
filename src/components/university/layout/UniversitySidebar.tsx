import { NavLink } from "react-router-dom";
import {
  BarChart3,
  FileSpreadsheet,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Stamp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UniversitySidebarProps {
  onNavigate?: () => void;
  className?: string;
}

const navItems = [
  {
    label: "Overview",
    to: "/university",
    icon: LayoutDashboard,
  },
  {
    label: "Applications",
    to: "/university/applications",
    icon: FileStack,
  },
  {
    label: "Documents",
    to: "/university/documents",
    icon: FileSpreadsheet,
  },
  {
    label: "Messages",
    to: "/university/messages",
    icon: MessageSquare,
  },
  {
    label: "Offers & CAS",
    to: "/university/offers",
    icon: Stamp,
  },
  {
    label: "Analytics",
    to: "/university/analytics",
    icon: BarChart3,
  },
  {
    label: "Courses",
    to: "/university/programs",
    icon: GraduationCap,
  },
  {
    label: "Profile",
    to: "/university/profile",
    icon: Sparkles,
  },
];

export const UniversitySidebar = ({
  onNavigate,
  className,
}: UniversitySidebarProps) => {
  return (
    <aside
      className={cn(
        "hidden w-72 shrink-0 flex-col border-r border-border bg-card px-4 py-6 text-card-foreground shadow-lg lg:flex",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
          U
        </span>
        <div>
          <p className="text-sm uppercase tracking-[0.3rem] text-muted-foreground">
            UniDoxia
          </p>
          <h1 className="text-base font-semibold leading-tight text-foreground">
            University Portal
          </h1>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/university"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground",
                )
              }
              onClick={onNavigate}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isActive ? "scale-110 text-primary-foreground" : "text-muted-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Need assistance?</p>
        <p className="mt-1">
          Visit the partner help center or contact your UniDoxia partnership manager.
        </p>
      </div>
    </aside>
  );
};

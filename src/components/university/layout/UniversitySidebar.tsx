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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UniversitySidebarProps {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
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
  collapsed = false,
}: UniversitySidebarProps) => {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-card py-6 text-card-foreground shadow-lg transition-[width,opacity] duration-300 lg:flex",
        collapsed ? "w-20 px-3" : "w-72 px-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
          U
        </span>
        {!collapsed && (
          <div>
            <p className="text-sm uppercase tracking-[0.3rem] text-muted-foreground">
              UniDoxia
            </p>
            <h1 className="text-base font-semibold leading-tight text-foreground">
              University Portal
            </h1>
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={0}>
        <nav
          className={cn(
            "mt-8 flex flex-1 flex-col gap-1",
            collapsed && "items-center",
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.to} disableHoverableContent={!collapsed}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    end={item.to === "/university"}
                    className={({ isActive }) =>
                      cn(
                        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        collapsed && "justify-center px-3",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground",
                      )
                    }
                    onClick={onNavigate}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            "h-5 w-5 transition-transform duration-200",
                            isActive
                              ? "scale-110 text-primary-foreground"
                              : "text-foreground/70",
                          )}
                        />
                        <span
                          className={cn(
                            "whitespace-nowrap",
                            collapsed && "sr-only",
                          )}
                        >
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                </TooltipTrigger>
                {collapsed ? (
                  <TooltipContent side="right" className="ml-2">
                    {item.label}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      {!collapsed && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Need assistance?</p>
          <p className="mt-1">
            Visit the partner help center or contact your UniDoxia partnership manager.
          </p>
        </div>
      )}
    </aside>
  );
};

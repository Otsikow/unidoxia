import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { BarChart3, FileCheck2, FileText, Home, MessageSquare, Upload } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useMemo, type ComponentType, type SVGProps } from "react";
import { cn } from "@/lib/utils";

type PartnerNavItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  view?: string | null;
  path?: string;
};

const navItems: PartnerNavItem[] = [
  { label: "Dashboard", icon: Home, view: null },
  { label: "Applications", icon: FileText, view: "applications" },
  { label: "Document Requests", icon: Upload, view: "documents" },
  { label: "Offers & CAS", icon: FileCheck2, view: "offers" },
  { label: "Messages", icon: MessageSquare, path: "/partner/messages" },
  { label: "Analytics", icon: BarChart3, view: "analytics" },
];

const DEFAULT_VIEW = "overview";

export function PartnerSidebar() {
  const location = useLocation();
  const { state } = useSidebar();

  const currentView = useMemo(() => {
    if (location.pathname !== "/dashboard") {
      return DEFAULT_VIEW;
    }
    const params = new URLSearchParams(location.search);
    const view = params.get("view");
    return view ?? DEFAULT_VIEW;
  }, [location.pathname, location.search]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200/70 bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 shadow-xl shadow-slate-200/40 transition-colors dark:border-slate-900/60 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 data-[state=collapsed]:bg-white dark:data-[state=collapsed]:bg-slate-950"
    >
      <SidebarHeader className="border-b border-slate-200/70 px-4 py-6 transition-colors dark:border-slate-900/60">
        <div className="flex items-center gap-3">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia"
            className="h-10 w-10 flex-shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1 shadow-sm transition-colors dark:border-slate-800/70 dark:bg-transparent dark:brightness-0 dark:invert"
          />
          {state !== "collapsed" && (
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">UniDoxia</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Partner University</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
                {navItems.map((item) => {
                const Icon = item.icon;
                  const target =
                    item.path ??
                    (item.view === null ? "/dashboard" : `/dashboard?view=${item.view ?? DEFAULT_VIEW}`);
                  const isActive = item.path
                    ? location.pathname === item.path
                    : item.view === null
                      ? currentView === DEFAULT_VIEW
                      : currentView === item.view;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg border border-transparent bg-slate-100/80 text-sm text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900/90 dark:hover:text-slate-100",
                        isActive &&
                          "border-slate-300 bg-gradient-to-r from-white via-blue-100/70 to-white text-slate-900 shadow-inner dark:border-slate-700 dark:from-slate-900 dark:via-blue-900/70 dark:to-slate-900 dark:text-slate-100"
                      )}
                    >
                      <Link to={target} className="flex flex-1 items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0 text-slate-400 transition-colors duration-200 group-hover:text-blue-500 dark:text-slate-300 dark:group-hover:text-blue-300" />
                        {state !== "collapsed" && (
                          <span className="font-medium tracking-wide">{item.label}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="border-t border-slate-200/70 px-2 py-4 transition-colors dark:border-slate-900/60">
        <SidebarTrigger className="w-full justify-center rounded-lg border border-slate-200/80 bg-slate-100/80 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100" />
      </div>
    </Sidebar>
  );
}

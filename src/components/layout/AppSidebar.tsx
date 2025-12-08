import {
  Home,
  Users,
  FileText,
  Building2,
  BookOpen,
  DollarSign,
  Share2,
  MessageSquare,
  CheckSquare,
  Settings,
  BarChart3,
  Upload,
  UserCircle,
  Bell,
  LogOut,
  TrendingUp,
  Search,
  Sparkles,
  GraduationCap,
  Coins,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";

// ✅ Unified menuItems combining both branches
const menuItems = {
  student: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Profile", url: "/student/profile", icon: UserCircle },
    { title: "Universities", url: "/universities", icon: Building2 },
    { title: "Discover Programmes", url: "/courses", icon: Search },
    { title: "My Applications", url: "/student/applications", icon: FileText },
    { title: "Documents", url: "/student/documents", icon: Upload },
    { title: "Messages", url: "/student/messages", icon: MessageSquare },
    { title: "Payments", url: "/student/payments", icon: DollarSign },
    { title: "Notifications", url: "/student/notifications", icon: Bell },
  ],
  agent: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Leads", url: "/dashboard/leads", icon: Users },
    { title: "Students", url: "/dashboard/students", icon: GraduationCap },
    { title: "Universities", url: "/universities", icon: Building2 },
    { title: "Discover Programmes", url: "/courses", icon: Search },
    { title: "Applications", url: "/dashboard/applications", icon: FileText },
    { title: "Tasks", url: "/dashboard/tasks", icon: CheckSquare },
    { title: "Ranking", url: "/dashboard/ranking", icon: TrendingUp },
    { title: "Payments", url: "/dashboard/payments", icon: DollarSign },
    { title: "Commissions", url: "/dashboard/commissions", icon: Coins },
    { title: "Import", url: "/dashboard/import", icon: Upload },
    { title: "Resources", url: "/dashboard/resources", icon: BookOpen },
  ],
  partner: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Applications", url: "/dashboard/applications", icon: FileText },
    { title: "Document Requests", url: "/dashboard/requests", icon: Upload },
    { title: "Offers & CAS", url: "/dashboard/offers", icon: FileText },
    { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Featured Showcase", url: "/university/featured-showcase", icon: Sparkles },
  ],
  staff: [
    { title: "My Dashboard", url: "/dashboard", icon: Home },
    { title: "Students", url: "/dashboard/students", icon: Users },
    { title: "Agents", url: "/dashboard/reports", icon: BarChart3 },
    { title: "Tasks", url: "/dashboard/tasks", icon: CheckSquare },
    { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
    { title: "Payments", url: "/dashboard/payments", icon: DollarSign },
    { title: "Resources", url: "/dashboard/resources", icon: BookOpen },
    { title: "AI Insights", url: "/dashboard/ai-insights", icon: Sparkles },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ],
  admin: [
    { title: "Dashboard", url: "/admin/overview", icon: Home },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Universities", url: "/admin/universities", icon: Building2 },
    {
      title: "Featured Universities",
      url: "/admin/featured-universities",
      icon: Sparkles,
    },
    { title: "Courses", url: "/dashboard/programs", icon: BookOpen },
    { title: "Applications", url: "/dashboard/applications", icon: FileText },
    { title: "Agents", url: "/dashboard/agents", icon: Share2 },
    { title: "Commissions", url: "/dashboard/commissions", icon: DollarSign },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Settings", url: "/profile/settings", icon: Settings },
    { title: "Blog", url: "/admin/blog", icon: FileText },
  ],
};

const formatRoleLabel = (role?: string | null) =>
  role ? role.replace(/_/g, " ") : "User";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { profile, signOut } = useAuth();
  const { primaryRole, loading: rolesLoading } = useUserRoles();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  const isItemActive = (url: string) => {
    if (url === "/dashboard") {
      return location.pathname === url;
    }

    return location.pathname === url || location.pathname.startsWith(`${url}/`);
  };

  const items =
    primaryRole && Object.prototype.hasOwnProperty.call(menuItems, primaryRole)
      ? menuItems[primaryRole as keyof typeof menuItems]
      : menuItems.student;

  return (
    <Sidebar
      collapsible="icon"
      className="relative border-r bg-background/95 transition-[width] duration-300 ease-in-out backdrop-blur supports-[backdrop-filter]:bg-background/90 data-[state=expanded]:w-[clamp(14rem,18vw,16rem)] data-[state=collapsed]:w-[4.25rem]"
    >
      <SidebarRail className="hidden sm:flex" />
      {/* Header */}
      <SidebarHeader className="border-b p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia Logo"
            className="h-8 w-8 md:h-10 md:w-10 rounded-md object-contain flex-shrink-0 dark:brightness-0 dark:invert"
          />
          {state !== "collapsed" && (
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-base md:text-lg truncate">UniDoxia</h2>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {rolesLoading ? "Loading..." : formatRoleLabel(primaryRole)}
              </p>
            </div>
          )}
          <SidebarTrigger
            className="ml-auto hidden h-8 w-8 shrink-0 sm:inline-flex"
            aria-label={state === "collapsed" ? "Expand navigation" : "Collapse navigation"}
          />
        </div>
      </SidebarHeader>

      {/* Menu Content */}
      <SidebarContent className="scrollbar-hide">
        <SidebarGroup>
          {state !== "collapsed" && (
            <SidebarGroupLabel className="text-xs px-3">Navigation</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item, index) => {
                const isActive = isItemActive(item.url);

                return (
                  <SidebarMenuItem
                    key={item.title}
                    className="animate-fade-in-left"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.title : undefined}
                      className={cn(
                        "group relative overflow-hidden border border-transparent",
                        isActive
                          ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary ring-1 ring-primary/40 shadow-[0_10px_30px_-15px_rgba(59,130,246,0.55)]"
                          : "hover:border-accent hover:bg-accent/70 hover:translate-x-1"
                      )}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex w-full items-center gap-3"
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-1 left-1 w-1 rounded-full bg-primary/80 transition-all duration-300",
                            isActive
                              ? "opacity-100 scale-y-100"
                              : "scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-60"
                          )}
                          aria-hidden
                        />
                        <div className="relative">
                          <item.icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0 transition-all duration-200",
                              isActive ? "text-primary" : "group-hover:scale-110"
                            )}
                          />
                          {item.title === "Notifications" && unreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-pulse"
                            >
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </Badge>
                          )}
                        </div>
                        {state !== "collapsed" && (
                          <>
                            <span className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </span>
                            {item.title === "Notifications" && unreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="ml-auto h-5 w-5 flex items-center justify-center text-[10px] animate-pulse"
                              >
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </Badge>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t p-3 md:p-4">
        <div className="space-y-2">
          {state !== "collapsed" && (
            <div className="px-2.5 md:px-3 py-2 bg-muted rounded-lg">
              <p className="text-xs md:text-sm font-medium truncate">
                {profile?.full_name}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size={state === "collapsed" ? "icon" : "sm"}
            className="w-full justify-start"
            onClick={() => navigate("/profile/settings")}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {state !== "collapsed" && <span className="ml-2 text-sm">Settings</span>}
          </Button>
          <Button
            variant="ghost"
            size={state === "collapsed" ? "icon" : "sm"}
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {state !== "collapsed" && <span className="ml-2 text-sm">Sign Out</span>}
          </Button>
        </div>
        <SidebarTrigger
          className="mt-2 w-full sm:hidden"
          aria-label={state === "collapsed" ? "Expand navigation" : "Collapse navigation"}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

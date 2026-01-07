import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Bell,
  BellRing,
  CheckCheck,
  Circle,
  CircleCheck,
  CreditCard,
  Filter,
  ListFilter,
  Loader2,
  ShieldAlert,
  Trash2,
  Users,
  Search,
  X,
  Check,
  MoreHorizontal,
  RefreshCw,
  Volume2,
  VolumeX,
  BellOff,
  Calendar,
  ArrowUpDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NotificationCategory = "new_signups" | "payment_events" | "pending_approvals" | "system_alerts";

type NotificationMetadata = Record<string, unknown>;

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
  metadata: NotificationMetadata;
  category: NotificationCategory;
  actionUrl?: string;
}

type SupabaseNotificationRow = {
  id: string;
  tenant_id: string | null;
  user_id: string;
  type: string | null;
  title: string | null;
  subject?: string | null;
  content: string | null;
  body?: string | null;
  created_at: string;
  read: boolean | null;
  metadata: unknown;
  payload?: unknown;
  action_url: string | null;
};

const CATEGORY_CONFIG: Record<
  NotificationCategory,
  { label: string; description: string; icon: ComponentType<{ className?: string }>; color: string }
> = {
  new_signups: {
    label: "New Signups",
    description: "Recently created student or agent accounts",
    icon: Users,
    color: "text-blue-500 bg-blue-500/10",
  },
  payment_events: {
    label: "Payment Events",
    description: "Invoices, payouts, and billing updates",
    icon: CreditCard,
    color: "text-green-500 bg-green-500/10",
  },
  pending_approvals: {
    label: "Pending Approvals",
    description: "Items awaiting admin review",
    icon: ListFilter,
    color: "text-amber-500 bg-amber-500/10",
  },
  system_alerts: {
    label: "System Alerts",
    description: "Platform or compliance notifications",
    icon: ShieldAlert,
    color: "text-red-500 bg-red-500/10",
  },
};

const CATEGORY_KEYWORDS: Record<NotificationCategory, string[]> = {
  new_signups: ["signup", "sign-up", "registration", "new_student", "new_application", "enrollment", "new_user"],
  payment_events: ["payment", "invoice", "billing", "transaction", "payout", "refund", "commission"],
  pending_approvals: ["approval", "review", "pending", "awaiting", "verification", "compliance"],
  system_alerts: ["alert", "system", "incident", "downtime", "security", "warning", "error"],
};

const getMetadataString = (metadata: NotificationMetadata, key: string) => {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
};

const resolveCategory = (notification: {
  type: string;
  metadata: NotificationMetadata;
  title: string;
  message: string;
}): NotificationCategory => {
  const metadataCategory = getMetadataString(notification.metadata, "category");
  const metadataType = getMetadataString(notification.metadata, "type");
  const base = `${notification.type ?? ""} ${metadataCategory} ${metadataType} ${notification.title ?? ""} ${notification.message ?? ""}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [NotificationCategory, string[]][]) {
    if (keywords.some((keyword) => base.includes(keyword))) {
      return category;
    }
  }

  return "system_alerts";
};

const parseMetadata = (payload: unknown): NotificationMetadata => {
  if (!payload) return {};
  if (typeof payload === "object") return payload as NotificationMetadata;
  try {
    return JSON.parse(String(payload));
  } catch {
    return {};
  }
};

const AdminNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = (data as SupabaseNotificationRow[] | null) ?? [];
      const mapped: AdminNotification[] = rows.map((row) => {
        const metadata = parseMetadata(row.metadata ?? row.payload);
        const metadataType = getMetadataString(metadata, "type");
        const metadataTitle = getMetadataString(metadata, "title") || "Notification";
        const metadataMessage = getMetadataString(metadata, "message");
        const type = row.type && row.type.length > 0 ? row.type : metadataType || "general";
        const title = row.title && row.title.length > 0 ? row.title : row.subject || metadataTitle;
        const message =
          row.content && row.content.length > 0
            ? row.content
            : row.body && row.body.length > 0
              ? row.body
              : metadataMessage;
        return {
          id: row.id,
          title,
          message,
          type,
          createdAt: row.created_at,
          read: !!row.read,
          metadata,
          category: resolveCategory({ type, metadata, title, message }),
          actionUrl: row.action_url || undefined,
        };
      });

      setNotifications(mapped);
    } catch (error) {
      console.error("Failed to fetch admin notifications", error);
      toast({
        title: "Error loading notifications",
        description: "We couldn't load the latest alerts. Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "Notifications updated" });
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel(`admin-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as SupabaseNotificationRow;
            const metadata = parseMetadata(row.metadata ?? row.payload);
            const metadataType = getMetadataString(metadata, "type");
            const metadataTitle = getMetadataString(metadata, "title") || "Notification";
            const metadataMessage = getMetadataString(metadata, "message");
            const type = row.type && row.type.length > 0 ? row.type : metadataType || "general";
            const title = row.title && row.title.length > 0 ? row.title : row.subject || metadataTitle;
            const message =
              row.content && row.content.length > 0
                ? row.content
                : row.body && row.body.length > 0
                  ? row.body
                  : metadataMessage;
            const notification: AdminNotification = {
              id: row.id,
              title,
              message,
              type,
              createdAt: row.created_at,
              read: !!row.read,
              metadata,
              category: resolveCategory({ type, metadata, title, message }),
              actionUrl: row.action_url || undefined,
            };

            setNotifications((prev) => {
              const next = [notification, ...prev.filter((item) => item.id !== notification.id)];
              return next.slice(0, 200);
            });

            if (soundEnabled) {
              // Play notification sound
              try {
                const audio = new Audio("/notification.mp3");
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {
                // Audio not available
              }
            }

            toast({
              title: notification.title,
              description: notification.message,
            });
          }

          if (payload.eventType === "UPDATE") {
            const row = payload.new as SupabaseNotificationRow;
            setNotifications((prev) =>
              prev.map((notification) =>
                notification.id === row.id ? { ...notification, read: !!row.read } : notification
              )
            );
          }

          if (payload.eventType === "DELETE") {
            const row = payload.old as SupabaseNotificationRow;
            setNotifications((prev) => prev.filter((notification) => notification.id !== row.id));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, toast, user?.id, soundEnabled]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const categoryCounts = useMemo(() => {
    return notifications.reduce<Record<NotificationCategory, { total: number; unread: number }>>(
      (acc, notification) => {
        acc[notification.category].total += 1;
        if (!notification.read) acc[notification.category].unread += 1;
        return acc;
      },
      {
        new_signups: { total: 0, unread: 0 },
        payment_events: { total: 0, unread: 0 },
        pending_approvals: { total: 0, unread: 0 },
        system_alerts: { total: 0, unread: 0 },
      }
    );
  }, [notifications]);

  const updateNotificationReadState = useCallback(
    async (notificationId: string, read: boolean) => {
      if (!user?.id) return;
      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read })
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (error) throw error;

        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, read } : notification
          )
        );
      } catch (error) {
        console.error("Failed to update notification read state", error);
        toast({
          title: "Update failed",
          description: "We couldn't update the notification status. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, user?.id]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user?.id) return;
      try {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (error) throw error;

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
        toast({ title: "Deleted", description: "Notification removed" });
      } catch (error) {
        console.error("Failed to delete notification", error);
        toast({
          title: "Delete failed",
          description: "We couldn't delete the notification. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, user?.id]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
      toast({ title: "Success", description: "All notifications marked as read" });
    } catch (error) {
      console.error("Failed to mark all as read", error);
      toast({
        title: "Update failed",
        description: "We couldn't mark all notifications as read. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
    }
  }, [toast, user?.id]);

  const handleClearAll = useCallback(async () => {
    if (!user?.id) return;

    try {
      setBulkUpdating(true);
      const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
      if (error) throw error;

      setNotifications([]);
      setSelectedIds(new Set());
      toast({ title: "Notifications cleared", description: "All notifications have been removed." });
    } catch (error) {
      console.error("Failed to clear notifications", error);
      toast({
        title: "Deletion failed",
        description: "We couldn't clear the notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
      setShowClearDialog(false);
    }
  }, [toast, user?.id]);

  const handleDeleteSelected = useCallback(async () => {
    if (!user?.id || selectedIds.size === 0) return;

    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      toast({
        title: "Deleted",
        description: `${selectedIds.size} notification${selectedIds.size > 1 ? "s" : ""} removed`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete selected notifications", error);
      toast({
        title: "Deletion failed",
        description: "We couldn't delete the selected notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
      setShowDeleteDialog(false);
    }
  }, [toast, user?.id, selectedIds]);

  const handleMarkSelectedRead = useCallback(async () => {
    if (!user?.id || selectedIds.size === 0) return;

    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n))
      );
      toast({
        title: "Success",
        description: `${selectedIds.size} notification${selectedIds.size > 1 ? "s" : ""} marked as read`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to mark selected as read", error);
      toast({
        title: "Update failed",
        description: "We couldn't update the selected notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
    }
  }, [toast, user?.id, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const filteredNotifications = useMemo(() => {
    let result = notifications.filter((notification) => {
      if (showUnreadOnly && notification.read) return false;
      if (categoryFilter !== "all" && notification.category !== categoryFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query) ||
          notification.type.toLowerCase().includes(query)
        );
      }
      return true;
    });

    if (sortOrder === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [notifications, showUnreadOnly, categoryFilter, searchQuery, sortOrder]);

  const categoriesToDisplay: NotificationCategory[] = useMemo(() => {
    if (categoryFilter === "all") {
      return ["new_signups", "payment_events", "pending_approvals", "system_alerts"];
    }
    return [categoryFilter];
  }, [categoryFilter]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Bell className="h-7 w-7" /> Notification Center
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Monitor key tenant activity including new enrollments, finance events, compliance reviews, and platform
              alerts. Updates arrive in real time via Supabase Realtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-9 w-9"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{soundEnabled ? "Mute sounds" : "Enable sounds"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-9 w-9"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || bulkUpdating}
            >
              {bulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
              Mark all read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              disabled={notifications.length === 0 || bulkUpdating}
            >
              {bulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Clear all
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="h-5 w-5" /> Realtime Activity Snapshot
              </CardTitle>
              <CardDescription>Track unread volume across notification groups.</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <CircleCheck className="h-4 w-4 text-primary" /> {unreadCount} unread
              </span>
              <Separator orientation="vertical" className="h-6" />
              <span className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                {filteredNotifications.length} showing
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["new_signups", "payment_events", "pending_approvals", "system_alerts"] as NotificationCategory[]).map(
              (category) => {
                const Icon = CATEGORY_CONFIG[category].icon;
                const stats = categoryCounts[category];
                const isActive = categoryFilter === category;
                return (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(isActive ? "all" : category)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-all hover:shadow-md",
                      isActive && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <div className={cn("rounded-md p-1.5", CATEGORY_CONFIG[category].color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {CATEGORY_CONFIG[category].label}
                      </span>
                      <Badge variant="outline">{stats.total}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{CATEGORY_CONFIG[category].description}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Circle
                        className={cn("h-3 w-3", stats.unread > 0 ? "fill-primary text-primary" : "text-muted-foreground")}
                      />
                      {stats.unread} unread
                    </div>
                  </button>
                );
              }
            )}
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListFilter className="h-5 w-5" /> Filters & Search
              </CardTitle>
              <CardDescription>Refine your notification view.</CardDescription>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[250px]"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Tabs
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as NotificationCategory | "all")}
              >
                <TabsList className="grid grid-cols-5 gap-1">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="new_signups" className="text-xs">Signups</TabsTrigger>
                  <TabsTrigger value="payment_events" className="text-xs">Payments</TabsTrigger>
                  <TabsTrigger value="pending_approvals" className="text-xs">Approvals</TabsTrigger>
                  <TabsTrigger value="system_alerts" className="text-xs">System</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="unread-only"
                    checked={showUnreadOnly}
                    onCheckedChange={(checked) => setShowUnreadOnly(Boolean(checked))}
                  />
                  <Label htmlFor="unread-only" className="text-sm flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5" /> Unread only
                  </Label>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                  className="text-xs"
                >
                  <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                  {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                </Button>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedIds.size} selected</Badge>
                  <Button variant="outline" size="sm" onClick={handleMarkSelectedRead} disabled={bulkUpdating}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Mark read
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={bulkUpdating}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <BellOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">No notifications found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchQuery
                    ? "Try adjusting your search or filters."
                    : showUnreadOnly
                      ? "You're all caught up! No unread notifications."
                      : "When you receive notifications, they'll appear here."}
                </p>
              </div>
              {(searchQuery || showUnreadOnly || categoryFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setShowUnreadOnly(false);
                    setCategoryFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          categoriesToDisplay.map((category) => {
            const items = filteredNotifications.filter((notification) => notification.category === category);
            const Icon = CATEGORY_CONFIG[category].icon;

            if (items.length === 0 && categoryFilter !== "all") {
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={cn("rounded-md p-1.5", CATEGORY_CONFIG[category].color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {CATEGORY_CONFIG[category].label}
                    </CardTitle>
                    <CardDescription>{CATEGORY_CONFIG[category].description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      <CircleCheck className="h-5 w-5" />
                      <span>No notifications in this category right now.</span>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            if (items.length === 0) return null;

            return (
              <Card key={category}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <div className={cn("rounded-md p-1.5", CATEGORY_CONFIG[category].color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {CATEGORY_CONFIG[category].label}
                      <Badge variant="secondary">{items.length}</Badge>
                    </CardTitle>
                    <CardDescription>{CATEGORY_CONFIG[category].description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={items.every((n) => selectedIds.has(n.id))}
                      onCheckedChange={() => {
                        const allSelected = items.every((n) => selectedIds.has(n.id));
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          items.forEach((n) => {
                            if (allSelected) {
                              next.delete(n.id);
                            } else {
                              next.add(n.id);
                            }
                          });
                          return next;
                        });
                      }}
                    />
                    <Label className="text-xs text-muted-foreground">Select all</Label>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((notification) => {
                    const actor = getMetadataString(notification.metadata, "actor");
                    const context = getMetadataString(notification.metadata, "context");
                    const isSelected = selectedIds.has(notification.id);
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "group rounded-lg border p-4 transition-all",
                          notification.read ? "bg-muted/30" : "bg-background shadow-sm",
                          isSelected && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(notification.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {!notification.read && (
                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                  )}
                                  <h3 className="text-sm font-semibold leading-none truncate">
                                    {notification.title}
                                  </h3>
                                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                                    {notification.type.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                  </span>
                                  {actor && <span>By {actor}</span>}
                                  {context && <span>{context}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant={notification.read ? "outline" : "secondary"}
                                  size="sm"
                                  onClick={() => updateNotificationReadState(notification.id, !notification.read)}
                                >
                                  {notification.read ? (
                                    <>
                                      <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Unread
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-1.5 h-3.5 w-3.5" /> Read
                                    </>
                                  )}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateNotificationReadState(notification.id, !notification.read)
                                      }
                                    >
                                      {notification.read ? (
                                        <>
                                          <EyeOff className="mr-2 h-4 w-4" /> Mark as unread
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="mr-2 h-4 w-4" /> Mark as read
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => deleteNotification(notification.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Clear All Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {notifications.length} notifications. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Selected Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected notifications?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedIds.size} notification{selectedIds.size > 1 ? "s" : ""}. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default AdminNotifications;

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  Bell,
  Check,
  X,
  Trash2,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  DollarSign,
  BookOpen,
  CheckCheck,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  BellOff,
  Volume2,
  VolumeX,
  Calendar,
  MoreHorizontal,
  Eye,
  EyeOff,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "application_status" | "message" | "commission" | "course_recommendation";
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  applicationUpdates: boolean;
  messages: boolean;
  documents: boolean;
  deadlines: boolean;
  sound: boolean;
}

type FilterType = "all" | "unread" | "read" | "application_status" | "message" | "commission" | "course_recommendation";

const STORAGE_KEY = "notification_settings";

const getStoredSettings = (): NotificationSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return {
    email: true,
    push: true,
    applicationUpdates: true,
    messages: true,
    documents: true,
    deadlines: true,
    sound: true,
  };
};

const saveSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [settings, setSettings] = useState<NotificationSettings>(getStoredSettings);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, content, type, read, created_at, action_url, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const mapped = (data || []).map((n) => ({
        id: n.id,
        title: n.title || "Notification",
        message: n.content || "",
        type: (n.type as Notification["type"]) || "info",
        read: !!n.read,
        created_at: n.created_at,
        action_url: n.action_url || undefined,
        metadata: (n.metadata as Record<string, unknown>) || {},
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({ title: "Error", description: "Failed to load notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "Notifications updated" });
  };

  const playNotificationSound = useCallback(() => {
    if (!settings.sound) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/notification.mp3");
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {
      // Audio not available
    }
  }, [settings.sound]);

  useEffect(() => {
    fetchNotifications();
    if (!user) return;
    
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const raw = payload.new as Record<string, unknown>;
            const newNotification: Notification = {
              id: raw.id as string,
              title: (raw.title as string) || "Notification",
              message: (raw.content as string) || "",
              type: (raw.type as Notification["type"]) || "info",
              read: !!raw.read,
              created_at: raw.created_at as string,
              action_url: (raw.action_url as string) || undefined,
              metadata: (raw.metadata as Record<string, unknown>) || {},
            };
            
            setNotifications((prev) => [newNotification, ...prev.filter((n) => n.id !== newNotification.id)]);
            if (!newNotification.read) {
              setUnreadCount((prev) => prev + 1);
              playNotificationSound();
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const raw = payload.new as Record<string, unknown>;
            setNotifications((prev) =>
              prev.map((n) => (n.id === raw.id ? { ...n, read: !!raw.read } : n))
            );
            setUnreadCount((prev) => {
              const count = notifications.filter((n) => n.id !== raw.id && !n.read).length + (raw.read ? 0 : 1);
              return count;
            });
          } else if (payload.eventType === "DELETE") {
            const raw = payload.old as Record<string, unknown>;
            setNotifications((prev) => prev.filter((n) => n.id !== raw.id));
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(raw.id as string);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, playNotificationSound, toast, notifications]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const wasUnread = notifications.find((n) => n.id === id)?.read === false;
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
      setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (wasUnread) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast({ title: "Error", description: "Failed to mark as read", variant: "destructive" });
    }
  };

  const markAsUnread = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const wasRead = notifications.find((n) => n.id === id)?.read === true;
      const { error } = await supabase.from("notifications").update({ read: false }).eq("id", id);
      if (error) throw error;
      setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: false } : n)));
      if (wasRead) {
        setUnreadCount((c) => c + 1);
      }
    } catch {
      toast({ title: "Error", description: "Failed to mark as unread", variant: "destructive" });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
      setNotifications((p) => p.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "Success", description: "All notifications marked as read" });
    } catch {
      toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
    } finally {
      setBulkUpdating(false);
    }
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      const wasUnread = notifications.find((n) => n.id === id)?.read === false;
      setNotifications((p) => p.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ title: "Deleted", description: "Notification removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete notification", variant: "destructive" });
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      setBulkUpdating(true);
      const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
      if (error) throw error;
      setNotifications([]);
      setUnreadCount(0);
      setSelectedIds(new Set());
      toast({ title: "Success", description: "All notifications cleared" });
    } catch {
      toast({ title: "Error", description: "Failed to clear notifications", variant: "destructive" });
    } finally {
      setBulkUpdating(false);
      setShowClearDialog(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedIds.size === 0) return;
    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      const deletedUnreadCount = notifications.filter(
        (n) => selectedIds.has(n.id) && !n.read
      ).length;

      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setUnreadCount((prev) => Math.max(0, prev - deletedUnreadCount));
      toast({
        title: "Deleted",
        description: `${selectedIds.size} notification${selectedIds.size > 1 ? "s" : ""} removed`,
      });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Failed to delete selected", variant: "destructive" });
    } finally {
      setBulkUpdating(false);
      setShowDeleteDialog(false);
    }
  };

  const handleMarkSelectedRead = async () => {
    if (!user || selectedIds.size === 0) return;
    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      const markedCount = notifications.filter(
        (n) => selectedIds.has(n.id) && !n.read
      ).length;

      setNotifications((prev) =>
        prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - markedCount));
      toast({
        title: "Success",
        description: `${selectedIds.size} notification${selectedIds.size > 1 ? "s" : ""} marked as read`,
      });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Failed to update selected", variant: "destructive" });
    } finally {
      setBulkUpdating(false);
    }
  };

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

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  const handleSettingsChange = (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast({ title: "Saved", description: "Notification settings updated" });
  };

  const iconFor = (t: string) => {
    switch (t) {
      case "success": return CheckCircle;
      case "warning": return AlertTriangle;
      case "error": return AlertCircle;
      case "application_status": return FileText;
      case "message": return MessageSquare;
      case "commission": return DollarSign;
      case "course_recommendation": return BookOpen;
      default: return Info;
    }
  };

  const colorFor = (t: string) => {
    switch (t) {
      case "success": return "text-green-600 dark:text-green-400 bg-green-500/10";
      case "warning": return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10";
      case "error": return "text-red-600 dark:text-red-400 bg-red-500/10";
      case "application_status": return "text-blue-600 dark:text-blue-400 bg-blue-500/10";
      case "message": return "text-purple-600 dark:text-purple-400 bg-purple-500/10";
      case "commission": return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
      case "course_recommendation": return "text-orange-600 dark:text-orange-400 bg-orange-500/10";
      default: return "text-gray-600 dark:text-gray-400 bg-gray-500/10";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Today at ${format(date, "h:mm a")}`;
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const filtered = notifications.filter((n) => {
    // Filter by type/status
    if (filter === "unread" && n.read) return false;
    if (filter === "read" && !n.read) return false;
    if (filter !== "all" && filter !== "unread" && filter !== "read" && n.type !== filter) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const sortedFiltered = sortOrder === "oldest" ? [...filtered].reverse() : filtered;

  const groupedByDate = sortedFiltered.reduce<Record<string, Notification[]>>((acc, n) => {
    const date = new Date(n.created_at);
    let key: string;
    if (isToday(date)) {
      key = "Today";
    } else if (isYesterday(date)) {
      key = "Yesterday";
    } else {
      key = format(date, "MMMM d, yyyy");
    }
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(n);
    return acc;
  }, {});

  const settingsLabels: Record<keyof NotificationSettings, string> = {
    email: "Email notifications",
    push: "Push notifications",
    applicationUpdates: "Application updates",
    messages: "New messages",
    documents: "Document requests",
    deadlines: "Deadline reminders",
    sound: "Sound alerts",
  };

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Bell className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Notifications</h2>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} new</Badge>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleSettingsChange("sound", !settings.sound)}
            className="h-9 w-9"
          >
            {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={bulkUpdating}>
              {bulkUpdating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1" />}
              Mark all read
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] sm:w-80">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold">Notification Settings</h4>
                  <p className="text-xs text-muted-foreground">
                    Customize how you receive notifications
                  </p>
                </div>
                <Separator />
                <div className="space-y-3">
                  {(Object.keys(settings) as (keyof NotificationSettings)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{settingsLabels[key]}</Label>
                      <Switch
                        checked={settings[key]}
                        onCheckedChange={(checked) => handleSettingsChange(key, checked)}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveSettings} className="w-full" size="sm">
                  Save Settings
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowClearDialog(true)}
              className="h-9 w-9 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="text-xs"
          >
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="sm" onClick={handleMarkSelectedRead} disabled={bulkUpdating}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Mark read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={bulkUpdating}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList className="flex w-full flex-wrap items-center justify-start gap-1 overflow-x-auto rounded-xl border border-border bg-card/80 p-1.5 shadow-sm">
          <TabsTrigger className="px-3 text-xs" value="all">
            All
            <Badge variant="secondary" className="ml-1.5 text-[10px]">{notifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger className="px-3 text-xs" value="unread">
            Unread
            {unreadCount > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px]">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger className="px-3 text-xs" value="read">Read</TabsTrigger>
          <TabsTrigger className="px-3 text-xs" value="application_status">
            <FileText className="mr-1 h-3 w-3" /> Apps
          </TabsTrigger>
          <TabsTrigger className="px-3 text-xs" value="message">
            <MessageSquare className="mr-1 h-3 w-3" /> Messages
          </TabsTrigger>
          <TabsTrigger className="px-3 text-xs" value="commission">
            <DollarSign className="mr-1 h-3 w-3" /> Commissions
          </TabsTrigger>
          <TabsTrigger className="px-3 text-xs" value="course_recommendation">
            <BookOpen className="mr-1 h-3 w-3" /> Courses
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <Card className="w-full border border-border/70 shadow-sm">
            <CardHeader className="space-y-1.5 p-4 sm:p-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Notifications</CardTitle>
                <CardDescription>Stay updated with your activity</CardDescription>
              </div>
              {sortedFiltered.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === sortedFiltered.length && sortedFiltered.length > 0}
                    onCheckedChange={() => {
                      if (selectedIds.size === sortedFiltered.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(sortedFiltered.map((n) => n.id)));
                      }
                    }}
                  />
                  <Label className="text-xs text-muted-foreground">Select all</Label>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading notifications...</p>
                </div>
              ) : sortedFiltered.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <BellOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-1 font-medium">No notifications</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : filter === "unread"
                        ? "You're all caught up! No unread notifications."
                        : "When you receive notifications, they'll appear here."}
                  </p>
                  {(searchQuery || filter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-[65vh]">
                  <div className="divide-y">
                    {Object.entries(groupedByDate).map(([date, items]) => (
                      <div key={date}>
                        <div className="sticky top-0 bg-muted/80 backdrop-blur px-4 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {date}
                        </div>
                        {items.map((n) => {
                          const Icon = iconFor(n.type);
                          const isSelected = selectedIds.has(n.id);
                          return (
                            <div
                              key={n.id}
                              className={cn(
                                "group relative p-4 transition hover:bg-muted/50 cursor-pointer",
                                !n.read && "bg-primary/5",
                                isSelected && "bg-primary/10"
                              )}
                              onClick={() => handleClick(n)}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelect(n.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1"
                                />
                                <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", colorFor(n.type))}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        {!n.read && (
                                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                        )}
                                        <p className={cn("font-medium truncate", !n.read && "text-primary")}>
                                          {n.title}
                                        </p>
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1 self-start opacity-0 transition-opacity group-hover:opacity-100">
                                      {!n.read ? (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => markAsRead(n.id, e)}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => markAsUnread(n.id, e)}
                                        >
                                          <EyeOff className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {n.read ? (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markAsUnread(n.id); }}>
                                              <EyeOff className="mr-2 h-4 w-4" /> Mark as unread
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}>
                                              <Eye className="mr-2 h-4 w-4" /> Mark as read
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={(e) => deleteNotification(n.id, e)}
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
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              onClick={clearAll}
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
              This will permanently delete {selectedIds.size} notification{selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.
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
  );
}

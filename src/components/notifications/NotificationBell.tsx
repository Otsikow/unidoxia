import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Loader2,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  MessageSquare,
  DollarSign,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationBellProps {
  /** Link to full notifications page */
  notificationsUrl?: string;
  /** Maximum notifications to show in dropdown */
  maxItems?: number;
  /** Custom class for the bell button */
  className?: string;
}

export function NotificationBell({
  notificationsUrl = "/student/notifications",
  maxItems = 5,
  className,
}: NotificationBellProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger bell animation
  const triggerBellAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, content, type, read, created_at, action_url, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(maxItems + 10);

      if (error) throw error;

      const mapped = (data || []).map((n) => ({
        id: n.id,
        title: n.title || "Notification",
        message: n.content || "",
        type: n.type || "info",
        read: !!n.read,
        created_at: n.created_at,
        action_url: n.action_url || undefined,
        metadata: (n.metadata as Record<string, unknown>) || {},
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, maxItems]);

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;

    const channel = supabase
      .channel(`notification-bell-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const raw = payload.new as Record<string, unknown>;
            const newNotification: Notification = {
              id: raw.id as string,
              title: (raw.title as string) || "Notification",
              message: (raw.content as string) || "",
              type: (raw.type as string) || "info",
              read: !!raw.read,
              created_at: raw.created_at as string,
              action_url: (raw.action_url as string) || undefined,
              metadata: (raw.metadata as Record<string, unknown>) || {},
            };

            setNotifications((prev) => [
              newNotification,
              ...prev.filter((n) => n.id !== newNotification.id).slice(0, maxItems + 9),
            ]);

            if (!newNotification.read) {
              setUnreadCount((prev) => prev + 1);
              // Play notification sound
              playNotificationSound();
              // Trigger bell animation
              triggerBellAnimation();
              // Show browser notification if permitted
              showBrowserNotification(newNotification);
            }
          } else if (payload.eventType === "UPDATE") {
            const raw = payload.new as Record<string, unknown>;
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === raw.id ? { ...n, read: !!raw.read } : n
              )
            );
            // Refetch unread count on update
            void fetchUnreadCount();
          } else if (payload.eventType === "DELETE") {
            const raw = payload.old as Record<string, unknown>;
            setNotifications((prev) => prev.filter((n) => n.id !== raw.id));
            // Refetch unread count on delete
            void fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, fetchNotifications, maxItems]);

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/notification.mp3");
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser may block autoplay, silently fail
      });
    } catch {
      // Audio not available
    }
  };

  const showBrowserNotification = async (notification: Notification) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        tag: notification.id,
      });
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
          tag: notification.id,
        });
      }
    }
  };

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "Success", description: "All notifications marked as read" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const wasUnread = notifications.find((n) => n.id === id)?.read === false;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      setOpen(false);
      navigate(notification.action_url);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "warning":
        return AlertTriangle;
      case "error":
        return AlertCircle;
      case "application_status":
        return FileText;
      case "message":
        return MessageSquare;
      case "commission":
        return DollarSign;
      case "course_recommendation":
        return BookOpen;
      case "document":
      case "document_request":
        return FileText;
      default:
        return Info;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      case "application_status":
        return "text-blue-500";
      case "message":
        return "text-purple-500";
      case "commission":
        return "text-emerald-500";
      case "course_recommendation":
        return "text-orange-500";
      case "document":
      case "document_request":
        return "text-amber-500";
      default:
        return "text-gray-500";
    }
  };

  const displayNotifications = notifications.slice(0, maxItems);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className={cn("h-5 w-5 transition-transform", isAnimating && "animate-bell-shake")} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70">
                You'll see updates here when they arrive
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {displayNotifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative cursor-pointer px-4 py-3 transition-colors hover:bg-muted/50",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
                          getIconColor(notification.type)
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium line-clamp-1", !notification.read && "text-primary")}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => markAsRead(notification.id, e)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => deleteNotification(notification.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => {
                  setOpen(false);
                  navigate(notificationsUrl);
                }}
              >
                View all notifications
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;

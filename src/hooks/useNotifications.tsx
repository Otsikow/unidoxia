import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  metadata: Record<string, any>;
  action_url: string | null;
  created_at: string;
}

const buildToastContent = (notification: Notification) => {
  const metadata = notification.metadata || {};

  if (notification.type === 'message') {
    const sender = metadata.sender_name || metadata.senderName || 'New message';
    const preview = metadata.preview || notification.content;
    return {
      title: `${sender} sent a message`,
      description: preview,
    };
  }

  if (notification.type === 'application_status') {
    const program = metadata.program_name || metadata.programName;
    const university = metadata.university_name || metadata.universityName;
    const status = metadata.new_status || metadata.status || '';
    const parts = [
      program && university ? `${program} • ${university}` : program || university,
      status ? `Status: ${status}` : null,
    ].filter(Boolean);

    return {
      title: notification.title || 'Application updated',
      description: parts.join(' — ') || notification.content,
    };
  }

  if (notification.type === 'document' || notification.type === 'document_request') {
    const requestType = metadata.request_type || metadata.requestType || metadata.document_type || 'Document';
    return {
      title: notification.title || 'Document Update',
      description: notification.content || `A ${requestType} document requires your attention.`,
    };
  }

  return {
    title: notification.title,
    description: notification.content,
  };
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch notifications - using existing notifications table
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      // Transform data to match our interface
      const transformed = (data || []).map((n: any) => ({
        id: n.id,
        tenant_id: n.tenant_id,
        user_id: n.user_id,
        type: n.type,
        title: n.title ?? n.subject,
        content: n.content ?? n.body ?? n.message ?? '',
        read: !!n.read,
        metadata: (n.metadata as Record<string, any>) || (n.payload as Record<string, any>) || {},
        action_url: n.action_url,
        created_at: n.created_at,
      }));

      setNotifications(transformed);
      setUnreadCount(transformed.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: countError } = await supabase
        .from('notifications')
        .select('id, read')
        .eq('user_id', user.id)
        .eq('read', false);

      if (countError) throw countError;

      setUnreadCount(data?.length || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast({
        title: 'Notification marked as read',
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  }, [user?.id, toast]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (updateError) throw updateError;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: 'All notifications marked as read',
      });
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  }, [user?.id, toast]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const existing = notifications.find(n => n.id === notificationId);

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      if (existing && !existing.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast({
        title: 'Notification deleted',
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  }, [user?.id, notifications, toast]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as any;
            const newNotification: Notification = {
              id: raw.id,
              tenant_id: raw.tenant_id,
              user_id: raw.user_id,
              type: raw.type,
              title: raw.title ?? raw.subject,
              content: raw.content ?? raw.body ?? raw.message ?? '',
              read: !!raw.read,
              metadata: (raw.metadata as Record<string, any>) || (raw.payload as Record<string, any>) || {},
              action_url: raw.action_url,
              created_at: raw.created_at,
            };
            setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);

              const toastContent = buildToastContent(newNotification);
              toast(toastContent);
            }
          } else if (payload.eventType === 'UPDATE') {
            const raw = payload.new as any;
            const updatedNotification: Notification = {
              id: raw.id,
              tenant_id: raw.tenant_id,
              user_id: raw.user_id,
              type: raw.type,
              title: raw.title ?? raw.subject,
              content: raw.content ?? raw.body ?? raw.message ?? '',
              read: !!raw.read,
              metadata: (raw.metadata as Record<string, any>) || (raw.payload as Record<string, any>) || {},
              action_url: raw.action_url,
              created_at: raw.created_at,
            };
            setNotifications(prev =>
              prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
            );
            fetchUnreadCount();
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications, fetchUnreadCount, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}

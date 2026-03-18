import { supabase } from '@/integrations/supabase/client';

export interface CreateNotificationParams {
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
}

/**
 * Create a custom notification using the database function
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, tenantId, type, title, content, metadata = {}, actionUrl } = params;

  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_content: content,
      p_metadata: metadata,
      p_action_url: actionUrl,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error };
  }
}

/**
 * Send a course recommendation notification to a student
 */
export async function sendCourseRecommendation(
  studentId: string,
  programId: string,
  reason?: string
) {
  try {
    const { data, error } = await supabase.rpc('notify_course_recommendation', {
      p_student_id: studentId,
      p_program_id: programId,
      p_reason: reason,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error sending course recommendation:', error);
    return { data: null, error };
  }
}

/**
 * Mark a notification as read using the database function
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId
    });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error };
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId
    });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { error };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { error };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Notification type helpers for better type safety
 */
export const NotificationTypes = {
  APPLICATION_STATUS: 'application_status' as const,
  MESSAGE: 'message' as const,
  COMMISSION: 'commission' as const,
  COURSE_RECOMMENDATION: 'course_recommendation' as const,
  PROFILE_REMINDER: 'profile_reminder' as const,
  GENERAL: 'general' as const,
};

/**
 * Helper to create application status notification
 */
export async function notifyApplicationStatus(
  userId: string,
  tenantId: string,
  programName: string,
  universityName: string,
  newStatus: string,
  actionUrl = '/student/applications'
) {
  return createNotification({
    userId,
    tenantId,
    type: NotificationTypes.APPLICATION_STATUS,
    title: 'Application Status Updated',
    content: `Your application to ${programName} at ${universityName} is now ${newStatus}.`,
    metadata: { programName, universityName, status: newStatus },
    actionUrl,
  });
}

/**
 * Helper to create message notification
 */
export async function notifyNewMessage(
  userId: string,
  tenantId: string,
  senderName: string,
  messagePreview?: string,
  actionUrl = '/student/messages'
) {
  return createNotification({
    userId,
    tenantId,
    type: NotificationTypes.MESSAGE,
    title: 'New Message',
    content: messagePreview 
      ? `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`
      : `${senderName} sent you a message.`,
    metadata: { senderName },
    actionUrl,
  });
}

/**
 * Helper to create commission notification
 */
export async function notifyCommission(
  userId: string,
  tenantId: string,
  amount: number,
  currency: string,
  status: 'approved' | 'paid',
  actionUrl = '/dashboard/commissions'
) {
  const statusText = status === 'paid' ? 'paid' : 'approved';
  return createNotification({
    userId,
    tenantId,
    type: NotificationTypes.COMMISSION,
    title: `Commission ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
    content: `Your commission of ${amount.toFixed(2)} ${currency} has been ${statusText}.`,
    metadata: { amount, currency, status },
    actionUrl,
  });
}

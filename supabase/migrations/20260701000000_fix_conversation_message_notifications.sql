-- Fix notification system for conversation_messages
-- This migration adds proper notification triggers for the modern messaging system
-- to ensure all participants (students, universities, agents, admins) receive notifications

-- ============================================
-- 1. CREATE NOTIFICATION TRIGGER FOR CONVERSATION MESSAGES
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_conversation_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_role TEXT;
  v_participant RECORD;
  v_conversation_tenant_id UUID;
  v_message_preview TEXT;
  v_action_url TEXT;
BEGIN
  -- Get sender information
  SELECT 
    COALESCE(p.full_name, p.email, 'Someone'),
    p.role
  INTO v_sender_name, v_sender_role
  FROM profiles p
  WHERE p.id = NEW.sender_id;

  -- Get conversation tenant_id
  SELECT c.tenant_id INTO v_conversation_tenant_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- If no tenant found, use a default
  IF v_conversation_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_conversation_tenant_id
    FROM profiles
    WHERE id = NEW.sender_id
    LIMIT 1;
  END IF;

  -- Create message preview (truncate if needed)
  v_message_preview := CASE 
    WHEN NEW.content IS NULL OR NEW.content = '' THEN 'Sent an attachment'
    WHEN length(NEW.content) > 100 THEN substring(NEW.content, 1, 100) || '...'
    ELSE NEW.content
  END;

  -- Notify all conversation participants except the sender
  FOR v_participant IN
    SELECT 
      cp.user_id,
      p.role,
      p.tenant_id
    FROM conversation_participants cp
    JOIN profiles p ON cp.user_id = p.id
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
  LOOP
    -- Determine action URL based on participant role
    v_action_url := CASE v_participant.role
      WHEN 'student' THEN '/student/messages'
      WHEN 'partner' THEN '/university/messages'
      WHEN 'agent' THEN '/dashboard/messages'
      WHEN 'staff' THEN '/dashboard/messages'
      WHEN 'admin' THEN '/admin/messages'
      ELSE '/messages'
    END;

    -- Create notification for this participant
    -- Use the participant's tenant_id if available, otherwise use conversation tenant
    PERFORM create_notification(
      COALESCE(v_participant.tenant_id, v_conversation_tenant_id),
      v_participant.user_id,
      'message',
      'New Message from ' || v_sender_name,
      v_message_preview,
      jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'sender_name', v_sender_name,
        'sender_role', v_sender_role,
        'preview', v_message_preview
      ),
      v_action_url
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for new conversation messages
DROP TRIGGER IF EXISTS trg_conversation_message_notification ON public.conversation_messages;
CREATE TRIGGER trg_conversation_message_notification
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_conversation_message();

-- ============================================
-- 2. UPDATE NOTIFICATION RLS POLICIES
-- ============================================

-- Ensure users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. ENSURE PROPER REALTIME PERMISSIONS
-- ============================================

-- Enable realtime for notifications table if not already enabled
DO $$
BEGIN
  -- Ensure the notifications table has realtime enabled
  -- This is done through Supabase dashboard, but we ensure the table structure supports it
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    -- Note: This requires superuser privileges, so we'll just log it
    RAISE NOTICE 'Notifications table may need realtime enabled via Supabase dashboard';
  END IF;
END $$;

-- ============================================
-- 4. FIX NOTIFICATIONS TABLE TO ALLOW NULL TENANT_ID
-- ============================================

-- Some notifications may have null tenant_id for cross-tenant messages
-- We handle this by allowing null tenant_id in the create_notification function

CREATE OR REPLACE FUNCTION public.create_notification(
  p_tenant_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_effective_tenant_id UUID;
BEGIN
  -- If tenant_id is null, try to get it from the user's profile
  v_effective_tenant_id := p_tenant_id;
  
  IF v_effective_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_effective_tenant_id
    FROM profiles
    WHERE id = p_user_id
    LIMIT 1;
  END IF;
  
  -- If still null, use a default tenant (get the first one)
  IF v_effective_tenant_id IS NULL THEN
    SELECT id INTO v_effective_tenant_id
    FROM tenants
    LIMIT 1;
  END IF;

  -- Skip notification if we can't determine user or tenant
  IF p_user_id IS NULL OR v_effective_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (tenant_id, user_id, type, title, content, metadata, action_url)
  VALUES (v_effective_tenant_id, p_user_id, p_type, p_title, p_content, p_metadata, p_action_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to create notification: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- ============================================
-- 5. ADD NOTIFICATION FOR DOCUMENT SHARES
-- ============================================

-- Create a function to notify when documents are shared
CREATE OR REPLACE FUNCTION public.notify_document_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name TEXT;
  v_student_tenant_id UUID;
  v_document_type TEXT;
  v_partner_record RECORD;
BEGIN
  -- Get student information
  SELECT 
    COALESCE(s.legal_name, s.preferred_name, p.full_name, 'A student'),
    s.tenant_id
  INTO v_student_name, v_student_tenant_id
  FROM students s
  LEFT JOIN profiles p ON s.profile_id = p.id
  WHERE s.id = NEW.student_id;

  -- Get document type
  v_document_type := REPLACE(REPLACE(INITCAP(COALESCE(NEW.document_type, 'Document')), '_', ' '), '-', ' ');

  -- Only notify on new document uploads (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Notify university partners for all applications from this student
    FOR v_partner_record IN
      SELECT DISTINCT
        p.id AS partner_id,
        p.tenant_id AS partner_tenant_id,
        u.name AS university_name,
        pr.name AS program_name
      FROM applications a
      JOIN programs pr ON a.program_id = pr.id
      JOIN universities u ON pr.university_id = u.id
      JOIN profiles p ON p.tenant_id = u.tenant_id AND p.role = 'partner'
      WHERE a.student_id = NEW.student_id
    LOOP
      PERFORM create_notification(
        v_partner_record.partner_tenant_id,
        v_partner_record.partner_id,
        'document',
        '📄 New Document Uploaded',
        v_student_name || ' has uploaded a new ' || v_document_type || '.',
        jsonb_build_object(
          'document_id', NEW.id,
          'document_type', NEW.document_type,
          'student_name', v_student_name
        ),
        '/university/documents'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Check if trigger already exists before creating
DROP TRIGGER IF EXISTS trg_document_shared ON public.student_documents;
CREATE TRIGGER trg_document_shared
  AFTER INSERT ON public.student_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_shared();

-- ============================================
-- 6. GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.notify_conversation_message() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_document_shared() TO authenticated;

-- ============================================
-- 7. ADD INDEXES FOR BETTER PERFORMANCE
-- ============================================

-- Index for faster notification queries by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created 
  ON notifications(user_id, created_at DESC) 
  WHERE read = FALSE;

-- ============================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION public.notify_conversation_message() IS 
  'Sends real-time notifications to all conversation participants when a new message is sent. Supports students, universities, agents, and admins with role-appropriate action URLs.';

COMMENT ON FUNCTION public.notify_document_shared() IS 
  'Notifies university partners when students upload new documents.';

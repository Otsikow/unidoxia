-- ============================================================================
-- MESSAGING SYSTEM DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this script to diagnose messaging issues and verify data integrity.
-- ============================================================================

-- 1. Check conversation_participants table schema
SELECT 'conversation_participants schema:' AS section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'conversation_participants'
ORDER BY ordinal_position;

-- 2. Check conversations table schema
SELECT 'conversations schema:' AS section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'conversations'
ORDER BY ordinal_position;

-- 3. Check total message counts
SELECT 'Message Statistics:' AS section;
SELECT 
  (SELECT COUNT(*) FROM public.conversations) AS total_conversations,
  (SELECT COUNT(*) FROM public.conversation_participants) AS total_participants,
  (SELECT COUNT(*) FROM public.conversation_messages) AS total_messages;

-- 4. Check for orphaned conversations (no participants)
SELECT 'Orphaned Conversations (no participants):' AS section;
SELECT c.id, c.tenant_id, c.created_at
FROM public.conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = c.id
);

-- 5. Check for orphaned messages (no conversation)
SELECT 'Orphaned Messages (no conversation):' AS section;
SELECT cm.id, cm.conversation_id, cm.sender_id, cm.content, cm.created_at
FROM public.conversation_messages cm
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = cm.conversation_id
);

-- 6. Check for messages where sender is not a participant
SELECT 'Messages with non-participant senders:' AS section;
SELECT cm.id, cm.conversation_id, cm.sender_id, LEFT(cm.content, 50) AS content_preview, cm.created_at
FROM public.conversation_messages cm
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = cm.conversation_id
  AND cp.user_id = cm.sender_id
)
LIMIT 20;

-- 7. Check RLS policies on key tables
SELECT 'RLS Policies on conversation_participants:' AS section;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'conversation_participants';

SELECT 'RLS Policies on conversation_messages:' AS section;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'conversation_messages';

-- 8. Check if key functions exist
SELECT 'Key Functions:' AS section;
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
AND p.proname IN ('get_or_create_conversation', 'get_messaging_contacts', 'get_platform_tenant_id');

-- 9. Recent messages by tenant
SELECT 'Recent Messages by Tenant (last 24 hours):' AS section;
SELECT 
  c.tenant_id,
  t.name AS tenant_name,
  COUNT(DISTINCT c.id) AS conversation_count,
  COUNT(cm.id) AS message_count
FROM public.conversations c
LEFT JOIN public.tenants t ON t.id = c.tenant_id
LEFT JOIN public.conversation_messages cm ON cm.conversation_id = c.id AND cm.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.tenant_id, t.name
ORDER BY message_count DESC;

-- 10. Check for issues with message audit log (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_audit_log') THEN
    RAISE NOTICE 'Message audit log exists';
  ELSE
    RAISE NOTICE 'Message audit log does not exist (this is okay)';
  END IF;
END $$;

SELECT 'Diagnostic complete.' AS status;

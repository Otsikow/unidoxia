-- Fix bidirectional messaging by ensuring get_or_create_conversation returns the same direct conversation
-- for a pair of users regardless of tenant_id, preventing split threads between student(shared tenant)
-- and university(isolated tenant).

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_id UUID,
  p_other_user_id UUID,
  p_tenant_id UUID
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- 1) Prefer an existing direct conversation between the two users in ANY tenant.
  SELECT c.id INTO v_conversation_id
    FROM public.conversations c
   WHERE c.is_group = FALSE
     AND EXISTS (
       SELECT 1 FROM public.conversation_participants cp1
        WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user_id
     )
     AND EXISTS (
       SELECT 1 FROM public.conversation_participants cp2
        WHERE cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id
     )
   ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
   LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    -- Ensure both are still participants (idempotent)
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, p_user_id, 'owner'),
      (v_conversation_id, p_other_user_id, 'member')
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET joined_at = now();

    RETURN v_conversation_id;
  END IF;

  -- 2) Create new conversation scoped to requested tenant.
  INSERT INTO public.conversations (tenant_id, created_by, is_group, type)
  VALUES (p_tenant_id, p_user_id, FALSE, 'direct')
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES
    (v_conversation_id, p_user_id, 'owner'),
    (v_conversation_id, p_other_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;
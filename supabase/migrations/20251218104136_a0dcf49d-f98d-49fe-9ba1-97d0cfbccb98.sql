-- Create trigger to update last_message_at when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.conversation_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message_at();

-- Update existing conversations with their last message timestamp
UPDATE public.conversations c
SET last_message_at = (
  SELECT MAX(cm.created_at)
  FROM public.conversation_messages cm
  WHERE cm.conversation_id = c.id
)
WHERE EXISTS (
  SELECT 1 FROM public.conversation_messages cm WHERE cm.conversation_id = c.id
);
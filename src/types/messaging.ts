export interface Conversation {
  id: string;
  tenant_id: string;
  title: string | null;
  type: string | null;
  is_group: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_message_at?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  metadata?: Record<string, unknown> | null;
  participants?: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string | null;
  last_read_at: string;
  profile?: {
    id: string;
    full_name: string;
    email?: string | null;
    avatar_url: string | null;
    role?: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string | null;
  attachments: MessageAttachment[];
  metadata?: Record<string, unknown> | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface TypingIndicator {
  user_id: string;
  conversation_id: string;
  started_at: string | null;
  expires_at?: string;
  profile?: {
    full_name: string;
  };
}

export interface MessageAttachment {
  id: string;
  type: "image" | "file" | "audio" | "video" | string;
  url: string;
  name?: string | null;
  size?: number | null;
  mime_type?: string | null;
  preview_url?: string | null;
  storage_path?: string | null;
  duration_ms?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface SendMessagePayload {
  content: string;
  attachments?: MessageAttachment[];
  messageType?: string;
  metadata?: Record<string, unknown> | null;
}

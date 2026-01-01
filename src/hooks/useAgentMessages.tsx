import { useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  useMessages,
  type Conversation,
  type Message,
  type TypingIndicator,
} from './useMessages';

const PARTNER_MESSAGING_ROLES = new Set(['agent', 'partner', 'staff', 'admin']);

export function useAgentMessages() {
  const { profile } = useAuth();
  const messaging = useMessages();

  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    typingUsers,
    loading,
    sendMessage,
    startTyping,
    stopTyping,
    getOrCreateConversation,
    fetchConversations,
    markConversationAsRead,
    removeConversation,
    deleteMessage,
    error,
  } = messaging;

  // Check if user has a role that can use partner messaging
  // Don't disable based on error - let the UI handle error states
  const hasRequiredRole = useMemo(() => {
    const role = profile?.role;
    if (!role) return false;
    return PARTNER_MESSAGING_ROLES.has(role);
  }, [profile?.role]);

  // Messaging is enabled if user has the required role
  // Even if there's an error, we still consider it "enabled" to allow retry
  const enabled = hasRequiredRole;

  // Return real functions when user has required role, even if there's an error
  // This allows the UI to show error states and retry functionality
  return {
    enabled,
    error,
    conversations: enabled ? conversations : ([] as Conversation[]),
    currentConversation: enabled ? currentConversation : null,
    setCurrentConversation,
    messages: enabled ? messages : ([] as Message[]),
    typingUsers: enabled ? typingUsers : ([] as TypingIndicator[]),
    loading,
    sendMessage,
    startTyping,
    stopTyping,
    getOrCreateConversation,
    fetchConversations,
    markConversationAsRead,
    removeConversation,
    deleteMessage,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type {
  Conversation,
  ConversationParticipant,
  Message,
  TypingIndicator,
  MessageAttachment,
  SendMessagePayload,
} from "@/types/messaging";

// Re-export types for consumers
export type { Conversation, Message, TypingIndicator, MessageAttachment, SendMessagePayload } from "@/types/messaging";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import {
  registerDirectoryProfile,
  findDirectoryProfileById,
  getDefaultProfileForRole,
  type DirectoryProfile,
} from "@/lib/messaging/directory";
import {
  initializeMockMessagingState,
  sortConversations,
} from "@/lib/messaging/mockService";

/* ======================================================
   Utilities
====================================================== */

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeAttachment = (a: MessageAttachment, i: number): MessageAttachment => ({
  id: a.id ?? createId(`att-${i}`),
  type: a.type ?? "file",
  url: a.url,
  name: a.name ?? null,
  size: a.size ?? null,
  mime_type: a.mime_type ?? null,
  preview_url: a.preview_url ?? a.url,
  storage_path: a.storage_path ?? null,
  duration_ms: a.duration_ms ?? null,
  meta: a.meta ?? null,
});

const buildParticipant = (
  profile: DirectoryProfile,
  conversationId: string,
  ts: string,
): ConversationParticipant => ({
  id: `${conversationId}-${profile.id}`,
  conversation_id: conversationId,
  user_id: profile.id,
  joined_at: ts,
  last_read_at: ts,
  profile: {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: profile.role,
  },
});

/* ======================================================
   Hook
====================================================== */

export function useMessages() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesById, setMessagesById] = useState<Record<string, Message[]>>({});
  const [currentConversation, setCurrentConversationState] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationsRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<Record<string, Message[]>>({});
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  /* ======================================================
     Resolve Current Profile
  ======================================================= */

  const resolvedProfile = useMemo<DirectoryProfile>(() => {
    if (profile) {
      const p: DirectoryProfile = {
        id: profile.id,
        full_name: profile.full_name || profile.email || "You",
        email: profile.email,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role as DirectoryProfile["role"],
        tenant_id: profile.tenant_id ?? DEFAULT_TENANT_ID,
      };
      registerDirectoryProfile(p);
      return p;
    }

    if (user?.id) {
      const inferredRole =
        (user.user_metadata?.role as DirectoryProfile["role"]) ?? "student";
      const fallback: DirectoryProfile = {
        id: user.id,
        full_name: user.email ?? "User",
        email: user.email ?? "",
        avatar_url: null,
        role: inferredRole,
        tenant_id: DEFAULT_TENANT_ID,
      };
      registerDirectoryProfile(fallback);
      return fallback;
    }

    const anon = getDefaultProfileForRole("student")!;
    registerDirectoryProfile(anon);
    return anon;
  }, [profile, user]);

  const tenantId = resolvedProfile.tenant_id ?? DEFAULT_TENANT_ID;
  const currentUserId = resolvedProfile.id;
  const usingMockMessaging = !isSupabaseConfigured;

  /* ======================================================
     Fetch Messages for a Conversation (DB)
  ======================================================= */

  const fetchMessagesForConversation = useCallback(async (conversationId: string): Promise<Message[]> => {
    if (!conversationId || !user?.id) return [];

    const { data, error } = await supabase
      .from("conversation_messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        attachments,
        metadata,
        reply_to_id,
        edited_at,
        deleted_at,
        created_at,
        sender:profiles!conversation_messages_sender_profile_fkey(id, full_name, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return [];
    }

    const mapped: Message[] = (data ?? []).map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      content: m.content,
      message_type: m.message_type,
      attachments: m.attachments ?? [],
      metadata: m.metadata ?? null,
      reply_to_id: m.reply_to_id,
      edited_at: m.edited_at,
      deleted_at: m.deleted_at,
      created_at: m.created_at,
      sender: m.sender ? {
        id: m.sender.id,
        full_name: m.sender.full_name,
        avatar_url: m.sender.avatar_url,
      } : undefined,
    }));

    return mapped;
  }, [user?.id]);

  /* ======================================================
     Fetch Conversations (DB)
  ======================================================= */

  const fetchConversationsFromDb = useCallback(async (): Promise<Conversation[]> => {
    if (!user?.id) return [];

    const { data: memberships, error: membershipError } = await supabase
      .from("conversation_participants")
      .select("conversation_id,last_read_at")
      .eq("user_id", user.id);

    if (membershipError || !memberships?.length) return [];

    const ids = memberships.map((m) => m.conversation_id);

    const { data: convs } = await supabase
      .from("conversations")
      .select(
        `
        id,
        tenant_id,
        type,
        is_group,
        created_at,
        updated_at,
        last_message_at,
        participants:conversation_participants(
          user_id,
          last_read_at,
          profile:profiles(id, full_name, avatar_url, role)
        )
      `,
      )
      .in("id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    // Map DB results to Conversation type with required fields
    const mapped = (convs ?? []).map((c: any) => ({
      ...c,
      title: c.title ?? null,
    })) as Conversation[];
    return sortConversations(mapped);
  }, [user?.id]);

  /* ======================================================
     Set Current Conversation & Load Messages
  ======================================================= */

  const setCurrentConversation = useCallback(async (id: string | null) => {
    setCurrentConversationState(id);
    
    if (!id) {
      setMessages([]);
      return;
    }

    // Check if we already have messages cached
    if (messagesRef.current[id]?.length) {
      setMessages(messagesRef.current[id]);
    }

    if (usingMockMessaging) {
      setMessages(messagesRef.current[id] ?? []);
      return;
    }

    // Fetch messages from database
    setLoadingMessages(true);
    try {
      const msgs = await fetchMessagesForConversation(id);
      messagesRef.current = { ...messagesRef.current, [id]: msgs };
      setMessagesById((prev) => ({ ...prev, [id]: msgs }));
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [fetchMessagesForConversation, usingMockMessaging]);

  /* ======================================================
     Realtime Subscription for New Messages
  ======================================================= */

  useEffect(() => {
    if (usingMockMessaging || !user?.id) return;

    // Subscribe to new messages in conversations the user participates in
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Check if user is a participant in this conversation
          const isParticipant = conversationsRef.current.some(
            (c) => c.id === newMessage.conversation_id
          );
          
          if (!isParticipant) return;

          // Fetch sender info for the message
          const { data: senderData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          const message: Message = {
            id: newMessage.id,
            conversation_id: newMessage.conversation_id,
            sender_id: newMessage.sender_id,
            content: newMessage.content,
            message_type: newMessage.message_type,
            attachments: newMessage.attachments ?? [],
            metadata: newMessage.metadata ?? null,
            reply_to_id: newMessage.reply_to_id,
            edited_at: newMessage.edited_at,
            deleted_at: newMessage.deleted_at,
            created_at: newMessage.created_at,
            sender: senderData ? {
              id: senderData.id,
              full_name: senderData.full_name,
              avatar_url: senderData.avatar_url,
            } : undefined,
          };

          // Update messages cache
          setMessagesById((prev) => {
            const existing = prev[newMessage.conversation_id] ?? [];
            // Avoid duplicates
            if (existing.some((m) => m.id === message.id)) return prev;
            const next = [...existing, message];
            messagesRef.current = { ...prev, [newMessage.conversation_id]: next };
            return messagesRef.current;
          });

          // If this is the current conversation, update visible messages
          setCurrentConversationState((currentId) => {
            if (currentId === newMessage.conversation_id) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === message.id)) return prev;
                return [...prev, message];
              });
            }
            return currentId;
          });

          // Refresh conversations to update last_message_at
          const convs = await fetchConversationsFromDb();
          conversationsRef.current = convs;
          setConversations(convs);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user?.id, usingMockMessaging, fetchConversationsFromDb]);

  /* ======================================================
     Bootstrap
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        if (usingMockMessaging) {
          const state = initializeMockMessagingState(currentUserId, tenantId, {
            currentProfile: resolvedProfile,
          });
          conversationsRef.current = state.conversations;
          messagesRef.current = state.messagesById;
          if (cancelled) return;
          setConversations(state.conversations);
          setMessagesById(state.messagesById);
          setCurrentConversationState(state.conversations[0]?.id ?? null);
          return;
        }

        if (!user?.id) {
          setConversations([]);
          return;
        }

        const convs = await fetchConversationsFromDb();
        if (cancelled) return;
        conversationsRef.current = convs;
        setConversations(convs);
        
        // If there are conversations, load messages for the first one
        if (convs.length > 0) {
          const firstConvId = convs[0].id;
          setCurrentConversationState(firstConvId);
          const msgs = await fetchMessagesForConversation(firstConvId);
          messagesRef.current = { [firstConvId]: msgs };
          setMessagesById({ [firstConvId]: msgs });
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Messaging bootstrap failed:", err);
        setError("Unable to load messages.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, fetchConversationsFromDb, fetchMessagesForConversation, resolvedProfile, tenantId, usingMockMessaging, user?.id]);

  /* ======================================================
     Send Message
  ======================================================= */

  const sendMessage = useCallback(
    async (conversationId: string, payload: SendMessagePayload) => {
      if (!conversationId || !currentUserId) return;
      const content = payload.content?.trim();
      if (!content && !(payload.attachments?.length)) return;

      const createdAt = new Date().toISOString();
      const attachments = (payload.attachments ?? []).map(normalizeAttachment);

      const optimistic: Message = {
        id: createId("msg"),
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content ?? "",
        message_type: payload.messageType ?? "text",
        attachments,
        metadata: payload.metadata ?? null,
        reply_to_id: null,
        edited_at: null,
        deleted_at: null,
        created_at: createdAt,
        sender: {
          id: resolvedProfile.id,
          full_name: resolvedProfile.full_name,
          avatar_url: resolvedProfile.avatar_url,
        },
      };

      // Optimistic update
      setMessagesById((prev) => {
        const next = [...(prev[conversationId] ?? []), optimistic];
        messagesRef.current = { ...prev, [conversationId]: next };
        return messagesRef.current;
      });
      
      setCurrentConversationState((currentId) => {
        if (currentId === conversationId) {
          setMessages((prev) => [...prev, optimistic]);
        }
        return currentId;
      });

      if (usingMockMessaging) return;

      const { data, error } = await supabase.from("conversation_messages").insert([{
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        attachments: attachments as unknown as any[],
        message_type: payload.messageType ?? "text",
      }]).select().single();

      if (error) {
        toast({
          title: "Message failed",
          description: error.message,
          variant: "destructive",
        });
        // Remove optimistic message on failure
        setMessagesById((prev) => {
          const filtered = (prev[conversationId] ?? []).filter((m) => m.id !== optimistic.id);
          messagesRef.current = { ...prev, [conversationId]: filtered };
          return messagesRef.current;
        });
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return;
      }

      // Replace optimistic message with real one
      if (data) {
        setMessagesById((prev) => {
          const updated = (prev[conversationId] ?? []).map((m) =>
            m.id === optimistic.id ? { ...optimistic, id: data.id } : m
          );
          messagesRef.current = { ...prev, [conversationId]: updated };
          return messagesRef.current;
        });
        setMessages((prev) => prev.map((m) =>
          m.id === optimistic.id ? { ...optimistic, id: data.id } : m
        ));
      }

      // Refresh conversations to update order
      const convs = await fetchConversationsFromDb();
      conversationsRef.current = convs;
      setConversations(convs);
    },
    [currentUserId, resolvedProfile, toast, usingMockMessaging, fetchConversationsFromDb],
  );

  /* ======================================================
     Create / Get Conversation
  ======================================================= */

  const getOrCreateConversation = useCallback(
    async (otherUserId: string) => {
      if (!otherUserId || otherUserId === currentUserId) {
        toast({
          title: "Invalid recipient",
          description: "You cannot message yourself.",
          variant: "destructive",
        });
        return null;
      }

      let otherProfile = findDirectoryProfileById(otherUserId);

      if (!otherProfile) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role, tenant_id")
          .eq("id", otherUserId)
          .single();

        if (!data) {
          toast({
            title: "Unable to message",
            description: "Recipient profile not found.",
            variant: "destructive",
          });
          return null;
        }

        otherProfile = {
          id: data.id,
          full_name: data.full_name ?? "User",
          email: data.email ?? "",
          avatar_url: data.avatar_url ?? null,
          role: data.role,
          tenant_id: data.tenant_id ?? DEFAULT_TENANT_ID,
        };
        registerDirectoryProfile(otherProfile);
      }

      const existing = conversationsRef.current.find(
        (c) =>
          !c.is_group &&
          c.participants?.some((p) => p.user_id === otherUserId) &&
          c.participants?.some((p) => p.user_id === currentUserId),
      );

      if (existing) {
        await setCurrentConversation(existing.id);
        return existing.id;
      }

      if (usingMockMessaging) {
        const id = createId("conv");
        const ts = new Date().toISOString();
        const conv: Conversation = {
          id,
          tenant_id: tenantId,
          title: null,
          type: "direct",
          is_group: false,
          created_at: ts,
          updated_at: ts,
          last_message_at: null,
          participants: [
            buildParticipant(resolvedProfile, id, ts),
            buildParticipant(otherProfile, id, ts),
          ],
          unreadCount: 0,
        };
        setConversations((p) => {
          const next = sortConversations([...p, conv]);
          conversationsRef.current = next;
          return next;
        });
        await setCurrentConversation(id);
        return id;
      }

      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        p_user_id: currentUserId,
        p_other_user_id: otherUserId,
        p_tenant_id: tenantId,
      });

      if (error || !data) {
        toast({
          title: "Unable to start conversation",
          description: "Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const convs = await fetchConversationsFromDb();
      conversationsRef.current = convs;
      setConversations(convs);
      await setCurrentConversation(data as string);
      return data as string;
    },
    [
      currentUserId,
      fetchConversationsFromDb,
      resolvedProfile,
      setCurrentConversation,
      tenantId,
      toast,
      usingMockMessaging,
    ],
  );

  // Stub functions for missing features
  const startTyping = useCallback((_conversationId: string) => {
    // TODO: Implement typing indicator
  }, []);

  const stopTyping = useCallback((_conversationId: string) => {
    // TODO: Implement typing indicator
  }, []);

  const fetchConversations = useCallback(async () => {
    if (usingMockMessaging) return;
    const convs = await fetchConversationsFromDb();
    conversationsRef.current = convs;
    setConversations(convs);
  }, [fetchConversationsFromDb, usingMockMessaging]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id || !conversationId) return;
    
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  }, [user?.id]);

  const removeConversation = useCallback(async (_conversationId: string) => {
    // TODO: Implement conversation removal
  }, []);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    typingUsers,
    loading,
    loadingMessages,
    error,
    sendMessage,
    getOrCreateConversation,
    startTyping,
    stopTyping,
    fetchConversations,
    markConversationAsRead,
    removeConversation,
  };
}

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
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import {
  registerDirectoryProfile,
  findDirectoryProfileById,
  getDefaultProfileForRole,
  getPlaceholderIdForRole,
  type DirectoryProfile,
} from "@/lib/messaging/directory";
import { getMessagingContactIds } from "@/lib/messaging/relationships";
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
  const [error, setError] = useState<string | null>(null);

  const conversationsRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<Record<string, Message[]>>({});
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);

  /* ======================================================
     Resolve Current Profile (CRITICAL FIX)
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
      .order("updated_at", { ascending: false });

    return sortConversations((convs ?? []) as Conversation[]);
  }, [user?.id]);

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
        setCurrentConversationState(convs[0]?.id ?? null);
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
  }, [currentUserId, fetchConversationsFromDb, resolvedProfile, tenantId, usingMockMessaging, user?.id]);

  /* ======================================================
     Messaging Actions
  ======================================================= */

  const setCurrentConversation = useCallback((id: string | null) => {
    setCurrentConversationState(id);
    setMessages(id ? messagesRef.current[id] ?? [] : []);
  }, []);

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

      setMessagesById((prev) => {
        const next = [...(prev[conversationId] ?? []), optimistic];
        messagesRef.current = { ...prev, [conversationId]: next };
        if (currentConversation === conversationId) setMessages(next);
        return messagesRef.current;
      });

      if (usingMockMessaging) return;

      const { error } = await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        attachments,
        message_type: payload.messageType ?? "text",
      });

      if (error) {
        toast({
          title: "Message failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [currentConversation, currentUserId, resolvedProfile, toast, usingMockMessaging],
  );

  /* ======================================================
     Create / Get Conversation (FIXED)
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
        setCurrentConversation(existing.id);
        return existing.id;
      }

      if (usingMockMessaging) {
        const id = createId("conv");
        const ts = new Date().toISOString();
        const conv: Conversation = {
          id,
          tenant_id: tenantId,
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
        setCurrentConversation(id);
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
      setCurrentConversation(data as string);
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

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    typingUsers,
    loading,
    error,
    sendMessage,
    getOrCreateConversation,
  };
}

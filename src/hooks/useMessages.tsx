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

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeAttachment = (attachment: MessageAttachment, index: number): MessageAttachment => ({
  id: attachment.id ?? createId(`attachment-${index}`),
  type: attachment.type ?? "file",
  url: attachment.url,
  name: attachment.name ?? null,
  size: attachment.size ?? null,
  mime_type: attachment.mime_type ?? null,
  preview_url: attachment.preview_url ?? attachment.url,
  storage_path: attachment.storage_path ?? null,
  duration_ms: attachment.duration_ms ?? null,
  meta: attachment.meta ?? null,
});

const buildParticipant = (
  profile: DirectoryProfile,
  conversationId: string,
  lastRead: string,
): ConversationParticipant => ({
  id: `${conversationId}-${profile.id}`,
  conversation_id: conversationId,
  user_id: profile.id,
  joined_at: lastRead,
  last_read_at: lastRead,
  profile: {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: profile.role,
  },
});

const resolveDirectoryProfile = (
  profile: DirectoryProfile | null,
  fallbackRole: DirectoryProfile["role"],
) => {
  if (profile) return profile;
  return (
    getDefaultProfileForRole(fallbackRole) ??
    getDefaultProfileForRole("student") ?? {
      id: "demo-student",
      full_name: "Demo Student",
      email: "student@example.com",
      avatar_url: null,
      role: fallbackRole,
      tenant_id: DEFAULT_TENANT_ID,
    }
  );
};

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
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const conversationIdsRef = useRef<Set<string>>(new Set());
  const profileCacheRef = useRef<
    Record<string, { id: string; full_name: string; avatar_url: string | null; role?: string | null }>
  >({});
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);

  const resolvedProfile = useMemo<DirectoryProfile>(() => {
    if (profile) {
      const normalized: DirectoryProfile = {
        id: profile.id,
        full_name: profile.full_name || profile.email || "You",
        email: profile.email,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role as DirectoryProfile["role"],
        tenant_id: profile.tenant_id ?? DEFAULT_TENANT_ID,
      };
      registerDirectoryProfile(normalized);
      return normalized;
    }

    const inferredRole = (user?.user_metadata?.role as DirectoryProfile["role"]) ?? "student";
    if (user?.id) {
      const existing = findDirectoryProfileById(user.id);
      if (existing) {
        registerDirectoryProfile(existing);
        return existing;
      }
      const generated: DirectoryProfile = {
        id: user.id,
        full_name: user.email ?? "Bridge Global User",
        email: user.email ?? "user@example.com",
        avatar_url: null,
        role: inferredRole,
        tenant_id: DEFAULT_TENANT_ID,
      };
      registerDirectoryProfile(generated);
      return generated;
    }

    const fallback = resolveDirectoryProfile(null, inferredRole);
    registerDirectoryProfile(fallback);
    return fallback;
  }, [profile, user]);

  const tenantId = profile?.tenant_id ?? resolvedProfile.tenant_id ?? DEFAULT_TENANT_ID;
  const currentUserId = resolvedProfile.id;

  const allowedContacts = useMemo(() => {
    const ids = getMessagingContactIds(resolvedProfile);
    return ids.length > 0 ? new Set(ids) : null;
  }, [resolvedProfile]);

  const aliasMap = useMemo(() => {
    const placeholder = getPlaceholderIdForRole(resolvedProfile.role);
    if (placeholder && placeholder !== resolvedProfile.id) {
      return { [placeholder]: resolvedProfile.id };
    }
    return {};
  }, [resolvedProfile.id, resolvedProfile.role]);

  const usingMockMessaging = !isSupabaseConfigured;

  const hydrateCachesFromConversations = useCallback((nextConversations: Conversation[]) => {
    const cache = { ...profileCacheRef.current };
    nextConversations.forEach((conv) => {
      (conv.participants ?? []).forEach((p) => {
        if (p.profile?.id) {
          cache[p.profile.id] = {
            id: p.profile.id,
            full_name: p.profile.full_name,
            avatar_url: p.profile.avatar_url ?? null,
            role: p.profile.role ?? null,
          };
        }
      });
    });
    profileCacheRef.current = cache;
  }, []);

  const normalizeDbAttachment = useCallback(
    (attachment: MessageAttachment, index: number): MessageAttachment => normalizeAttachment(attachment, index),
    [],
  );

  const fetchConversationsFromDb = useCallback(async (): Promise<Conversation[]> => {
    if (!user?.id) return [];

    // Fetch the user's conversation memberships first (authoritative list).
    const { data: memberships, error: membershipError } = await supabase
      .from("conversation_participants")
      .select("conversation_id,last_read_at,role")
      .eq("user_id", user.id);
    if (membershipError) throw membershipError;

    const conversationIds = (memberships ?? []).map((m) => m.conversation_id).filter(Boolean) as string[];
    conversationIdsRef.current = new Set(conversationIds);

    if (conversationIds.length === 0) return [];

    const { data: convRows, error: convError } = await supabase
      .from("conversations")
      .select(
        `
          id,
          tenant_id,
          title,
          type,
          is_group,
          created_at,
          updated_at,
          last_message_at,
          name,
          avatar_url,
          metadata,
          participants:conversation_participants(
            id,
            conversation_id,
            user_id,
            joined_at,
            last_read_at,
            role,
            profile:profiles(id, full_name, avatar_url, role)
          )
        `,
      )
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false });
    if (convError) throw convError;

    const conversationsRaw = (convRows ?? []) as unknown as Conversation[];

    // Fetch recent messages in bulk to hydrate previews + unread counts.
    const { data: recentMessages } = await supabase
      .from("conversation_messages")
      .select(
        `
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
          sender:profiles(id, full_name, avatar_url)
        `,
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(600);

    const lastReadByConversation = new Map<string, string>();
    (memberships ?? []).forEach((m: any) => {
      if (m?.conversation_id) lastReadByConversation.set(m.conversation_id, m.last_read_at ?? new Date(0).toISOString());
    });

    const latestByConversation = new Map<string, Message>();
    const unreadCountByConversation = new Map<string, number>();
    (recentMessages ?? []).forEach((row: any) => {
      const conversationId = row.conversation_id as string;
      if (!conversationId) return;
      if (!latestByConversation.has(conversationId)) {
        latestByConversation.set(conversationId, {
          id: row.id,
          conversation_id: conversationId,
          sender_id: row.sender_id,
          content: row.content ?? "",
          message_type: row.message_type ?? "text",
          attachments: Array.isArray(row.attachments)
            ? row.attachments.map((a: any, idx: number) => normalizeDbAttachment(a, idx))
            : [],
          metadata: row.metadata ?? null,
          reply_to_id: row.reply_to_id ?? null,
          edited_at: row.edited_at ?? null,
          deleted_at: row.deleted_at ?? null,
          created_at: row.created_at ?? new Date().toISOString(),
          sender: row.sender
            ? { id: row.sender.id, full_name: row.sender.full_name, avatar_url: row.sender.avatar_url ?? null }
            : undefined,
        });
      }

      const lastRead = lastReadByConversation.get(conversationId);
      const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
      const lastReadAt = lastRead ? new Date(lastRead).getTime() : 0;
      if (createdAt > lastReadAt && row.sender_id !== user.id) {
        unreadCountByConversation.set(conversationId, (unreadCountByConversation.get(conversationId) ?? 0) + 1);
      }
    });

    const withMeta = conversationsRaw.map((conv) => {
      const latest = latestByConversation.get(conv.id);
      return {
        ...conv,
        lastMessage: latest,
        unreadCount: unreadCountByConversation.get(conv.id) ?? 0,
      } as Conversation;
    });

    return sortConversations(withMeta);
  }, [normalizeDbAttachment, user?.id]);

  const ensureRealtimeSubscriptions = useCallback(() => {
    if (!user?.id) return;

    // Clean up existing channels (if any)
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }

    const messagesChannel = supabase
      .channel(`conversation-messages-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages" }, async (payload) => {
        const row = payload.new as any;
        const conversationId = row?.conversation_id as string | undefined;
        if (!conversationId || !conversationIdsRef.current.has(conversationId)) return;

        const cached = profileCacheRef.current[row.sender_id] ?? null;
        let sender = cached;
        if (!sender && row?.sender_id) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, role")
            .eq("id", row.sender_id)
            .maybeSingle();
          if (profileRow?.id) {
            sender = {
              id: profileRow.id,
              full_name: profileRow.full_name,
              avatar_url: profileRow.avatar_url ?? null,
              role: (profileRow as any).role ?? null,
            };
            profileCacheRef.current = { ...profileCacheRef.current, [profileRow.id]: sender };
          }
        }

        const message: Message = {
          id: row.id,
          conversation_id: conversationId,
          sender_id: row.sender_id,
          content: row.content ?? "",
          message_type: row.message_type ?? "text",
          attachments: Array.isArray(row.attachments)
            ? row.attachments.map((a: any, idx: number) => normalizeAttachment(a, idx))
            : [],
          metadata: row.metadata ?? null,
          reply_to_id: row.reply_to_id ?? null,
          edited_at: row.edited_at ?? null,
          deleted_at: row.deleted_at ?? null,
          created_at: row.created_at ?? new Date().toISOString(),
          sender: sender ? { id: sender.id, full_name: sender.full_name, avatar_url: sender.avatar_url } : undefined,
        };

        // Update messages cache + visible list if needed.
        setMessagesById((previous) => {
          const existing = previous[conversationId] ?? [];
          if (existing.some((m) => m.id === message.id)) return previous;
          const nextMessages = [...existing, message];
          const next = { ...previous, [conversationId]: nextMessages };
          messagesRef.current = next;
          if (currentConversation === conversationId) {
            setMessages(nextMessages);
          }
          return next;
        });

        // Update conversation preview + unread count.
        setConversations((previous) => {
          const next = previous.map((conv) => {
            if (conv.id !== conversationId) return conv;
            const isCurrent = currentConversation === conversationId;
            const nextUnread =
              message.sender_id !== user.id && !isCurrent ? (conv.unreadCount ?? 0) + 1 : 0;
            return {
              ...conv,
              lastMessage: message,
              last_message_at: message.created_at,
              updated_at: message.created_at,
              unreadCount: nextUnread,
            };
          });
          const sorted = sortConversations(next);
          conversationsRef.current = sorted;
          return sorted;
        });
      })
      .subscribe();

    const typingChannel = supabase
      .channel(`conversation-typing-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "typing_indicators" }, (payload) => {
        const record = (payload.eventType === "DELETE" ? (payload.old as any) : (payload.new as any)) ?? null;
        const conversationId = record?.conversation_id as string | undefined;
        const typingUserId = record?.user_id as string | undefined;
        if (!conversationId || !typingUserId) return;
        if (!conversationIdsRef.current.has(conversationId)) return;
        if (typingUserId === user.id) return;
        if (currentConversation && conversationId !== currentConversation) return;

        setTypingUsers((previous) => {
          const without = previous.filter(
            (t) => t.user_id !== typingUserId || t.conversation_id !== conversationId,
          );
          if (payload.eventType === "DELETE") return without;

          const expiresAt = record?.expires_at ? new Date(record.expires_at).getTime() : 0;
          if (expiresAt && expiresAt < Date.now()) return without;

          const cached = profileCacheRef.current[typingUserId];
          const next: TypingIndicator = {
            user_id: typingUserId,
            conversation_id: conversationId,
            started_at: record?.started_at ?? null,
            expires_at: record?.expires_at ?? undefined,
            profile: { full_name: cached?.full_name ?? "Participant" },
          };
          return [...without, next];
        });
      })
      .subscribe();

    realtimeChannelRef.current = messagesChannel;
    typingChannelRef.current = typingChannel;
  }, [currentConversation, user?.id]);

  // Bootstrap: DB messaging (preferred) or mock fallback.
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        if (usingMockMessaging) {
          const state = initializeMockMessagingState(currentUserId, tenantId, {
            currentProfile: resolvedProfile,
            aliasMap,
          });
          conversationsRef.current = state.conversations;
          messagesRef.current = state.messagesById;
          if (cancelled) return;
          setConversations(state.conversations);
          setMessagesById(state.messagesById);
          hydrateCachesFromConversations(state.conversations);
          setCurrentConversationState((previous) => {
            if (previous && state.conversations.some((item) => item.id === previous)) {
              return previous;
            }
            return state.conversations[0]?.id ?? null;
          });
          return;
        }

        const convs = await fetchConversationsFromDb();
        if (cancelled) return;
        conversationsRef.current = convs;
        setConversations(convs);
        hydrateCachesFromConversations(convs);
        setCurrentConversationState((previous) => {
          if (previous && convs.some((item) => item.id === previous)) return previous;
          return convs[0]?.id ?? null;
        });
        ensureRealtimeSubscriptions();
      } catch (err) {
        if (cancelled) return;
        console.error("Messaging bootstrap failed:", err);
        setError("Messaging is temporarily unavailable. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    aliasMap,
    currentUserId,
    ensureRealtimeSubscriptions,
    fetchConversationsFromDb,
    hydrateCachesFromConversations,
    resolvedProfile,
    tenantId,
    usingMockMessaging,
  ]);

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }
    setMessages(messagesRef.current[currentConversation] ?? []);
  }, [currentConversation, messagesById]);

  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
      typingTimeoutsRef.current = {};
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
    };
  }, []);

  const fetchMessagesFromDb = useCallback(
    async (conversationId?: string) => {
      if (!conversationId || !user?.id) return;
      const { data, error } = await supabase
        .from("conversation_messages")
        .select(
          `
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
          sender:profiles(id, full_name, avatar_url)
        `,
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(600);
      if (error) throw error;
      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        conversation_id: row.conversation_id,
        sender_id: row.sender_id,
        content: row.content ?? "",
        message_type: row.message_type ?? "text",
        attachments: Array.isArray(row.attachments)
          ? row.attachments.map((a: any, idx: number) => normalizeAttachment(a, idx))
          : [],
        metadata: row.metadata ?? null,
        reply_to_id: row.reply_to_id ?? null,
        edited_at: row.edited_at ?? null,
        deleted_at: row.deleted_at ?? null,
        created_at: row.created_at ?? new Date().toISOString(),
        sender: row.sender
          ? { id: row.sender.id, full_name: row.sender.full_name, avatar_url: row.sender.avatar_url ?? null }
          : undefined,
      })) as Message[];

      setMessagesById((previous) => {
        const next = { ...previous, [conversationId]: mapped };
        messagesRef.current = next;
        return next;
      });
      setMessages(mapped);
    },
    [user?.id],
  );

  const markConversationAsReadDb = useCallback(
    async (conversationId: string) => {
      if (!user?.id) return;
      try {
        const { error: rpcError } = await supabase.rpc("mark_conversation_read", {
          p_conversation_id: conversationId,
        } as any);
        if (rpcError) {
          // Fallback for environments without the RPC function
          await supabase
            .from("conversation_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id);
        }
      } catch {
        await supabase
          .from("conversation_participants")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);
      }
    },
    [user?.id],
  );

  const setCurrentConversation = useCallback(
    (conversationId: string | null) => {
      setCurrentConversationState(conversationId);
      if (conversationId) {
        // Optimistically show cached messages, then refresh from DB.
        setMessages(messagesRef.current[conversationId] ?? []);
        if (!usingMockMessaging) {
          void fetchMessagesFromDb(conversationId).finally(() => void markConversationAsReadDb(conversationId));
        } else {
          void Promise.resolve();
        }
      } else {
        setMessages([]);
        setTypingUsers([]);
      }
    },
    [fetchMessagesFromDb, markConversationAsReadDb, usingMockMessaging],
  );

  const sendMessage = useCallback(
    async (conversationId: string, payload: SendMessagePayload) => {
      if (!conversationId || !currentUserId) return;
      const trimmed = payload.content?.trim();
      const hasAttachments = Boolean(payload.attachments && payload.attachments.length > 0);
      if (!trimmed && !hasAttachments) return;

      const createdAt = new Date().toISOString();
      const attachments = (payload.attachments ?? []).map((attachment, index) =>
        normalizeAttachment(attachment, index),
      );

      // Mock messaging writes locally only.
      if (usingMockMessaging) {
        const message: Message = {
          id: createId("msg"),
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: trimmed ?? "",
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

        setMessagesById((previous) => {
          const existing = previous[conversationId] ?? [];
          const nextMessages = [...existing, message];
          const next = { ...previous, [conversationId]: nextMessages };
          messagesRef.current = next;
          if (currentConversation === conversationId) {
            setMessages(nextMessages);
          }
          return next;
        });
        setConversations((previous) => {
          const next = previous.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;
            const updatedParticipants = (conversation.participants ?? []).map((participant) =>
              participant.user_id === currentUserId
                ? { ...participant, last_read_at: createdAt }
                : participant,
            );
            return {
              ...conversation,
              participants: updatedParticipants,
              lastMessage: message,
              last_message_at: createdAt,
              updated_at: createdAt,
              unreadCount: 0,
            };
          });
          const sorted = sortConversations(next);
          conversationsRef.current = sorted;
          return sorted;
        });
        return;
      }

      // Real DB insert (realtime subscription will also update, but we keep optimistic UI).
      const optimisticId = createId("msg");
      const optimistic: Message = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: trimmed ?? "",
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

      setMessagesById((previous) => {
        const existing = previous[conversationId] ?? [];
        const nextMessages = [...existing, optimistic];
        const next = { ...previous, [conversationId]: nextMessages };
        messagesRef.current = next;
        if (currentConversation === conversationId) {
          setMessages(nextMessages);
        }
        return next;
      });

      setConversations((previous) => {
        const next = previous.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          return {
            ...conversation,
            lastMessage: optimistic,
            last_message_at: createdAt,
            updated_at: createdAt,
            unreadCount: 0,
          };
        });
        const sorted = sortConversations(next);
        conversationsRef.current = sorted;
        return sorted;
      });

      const { data: inserted, error: insertError } = await supabase
        .from("conversation_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: trimmed ?? "",
          message_type: payload.messageType ?? "text",
          attachments: attachments as any,
          metadata: payload.metadata ?? null,
        } as any)
        .select(
          `
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
          sender:profiles(id, full_name, avatar_url)
        `,
        )
        .single();

      if (insertError) {
        toast({
          title: "Message failed",
          description: insertError.message ?? "Unable to send message.",
          variant: "destructive",
        });
        // Roll back optimistic message.
        setMessagesById((previous) => {
          const existing = previous[conversationId] ?? [];
          const nextMessages = existing.filter((m) => m.id !== optimisticId);
          const next = { ...previous, [conversationId]: nextMessages };
          messagesRef.current = next;
          if (currentConversation === conversationId) {
            setMessages(nextMessages);
          }
          return next;
        });
        return;
      }

      // Replace optimistic message with server message.
      const serverMessage: Message = {
        id: (inserted as any).id,
        conversation_id: (inserted as any).conversation_id,
        sender_id: (inserted as any).sender_id,
        content: (inserted as any).content ?? "",
        message_type: (inserted as any).message_type ?? "text",
        attachments: Array.isArray((inserted as any).attachments)
          ? (inserted as any).attachments.map((a: any, idx: number) => normalizeAttachment(a, idx))
          : attachments,
        metadata: (inserted as any).metadata ?? null,
        reply_to_id: (inserted as any).reply_to_id ?? null,
        edited_at: (inserted as any).edited_at ?? null,
        deleted_at: (inserted as any).deleted_at ?? null,
        created_at: (inserted as any).created_at ?? createdAt,
        sender: (inserted as any).sender
          ? {
              id: (inserted as any).sender.id,
              full_name: (inserted as any).sender.full_name,
              avatar_url: (inserted as any).sender.avatar_url ?? null,
            }
          : optimistic.sender,
      };

      setMessagesById((previous) => {
        const existing = previous[conversationId] ?? [];
        const replaced = existing.map((m) => (m.id === optimisticId ? serverMessage : m));
        const next = { ...previous, [conversationId]: replaced };
        messagesRef.current = next;
        if (currentConversation === conversationId) {
          setMessages(replaced);
        }
        return next;
      });
    },
    [currentConversation, currentUserId, resolvedProfile, toast, usingMockMessaging],
  );

  const startTyping = useCallback(
    async (conversationId?: string) => {
      if (!conversationId) return;
      if (usingMockMessaging) {
        // Mock typing: show a random participant typing.
        const conversation = conversationsRef.current.find((item) => item.id === conversationId);
        if (!conversation) return;
        const others = (conversation.participants ?? []).filter((participant) => participant.user_id !== currentUserId);
        if (others.length === 0) return;
        const participant = others[Math.floor(Math.random() * others.length)];
        const indicator: TypingIndicator = {
          user_id: participant.user_id,
          conversation_id: conversationId,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 4000).toISOString(),
          profile: { full_name: participant.profile?.full_name ?? "Participant" },
        };
        setTypingUsers((previous) => {
          const filtered = previous.filter(
            (item) => item.user_id !== indicator.user_id || item.conversation_id !== conversationId,
          );
          return [...filtered, indicator];
        });
        const timeoutKey = `${conversationId}-${indicator.user_id}`;
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey]);
        }
        typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
          setTypingUsers((previous) =>
            previous.filter((item) => item.user_id !== indicator.user_id || item.conversation_id !== conversationId),
          );
          delete typingTimeoutsRef.current[timeoutKey];
        }, 4000);
        return;
      }

      if (!user?.id) return;
      const now = new Date();
      const expires = new Date(now.getTime() + 10_000).toISOString();
      await supabase
        .from("typing_indicators")
        .upsert(
          {
            conversation_id: conversationId,
            user_id: user.id,
            started_at: now.toISOString(),
            expires_at: expires,
          } as any,
          { onConflict: "conversation_id,user_id" } as any,
        );
    },
    [currentUserId, usingMockMessaging, user?.id],
  );

  const stopTyping = useCallback(async (conversationId?: string) => {
    if (!conversationId) return;
    if (usingMockMessaging) {
      setTypingUsers((previous) => previous.filter((item) => item.conversation_id !== conversationId));
      Object.entries(typingTimeoutsRef.current).forEach(([key, timeout]) => {
        if (key.startsWith(`${conversationId}-`)) {
          clearTimeout(timeout);
          delete typingTimeoutsRef.current[key];
        }
      });
      return;
    }

    if (!user?.id) return;
    await supabase
      .from("typing_indicators")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  }, [usingMockMessaging, user?.id]);

  const getOrCreateConversation = useCallback(
    async (otherUserId: string) => {
      const otherProfile = findDirectoryProfileById(otherUserId);
      if (!otherProfile) return null;

      if (allowedContacts && !allowedContacts.has(otherUserId)) {
        toast({
          title: "Messaging restricted",
          description: "You can only start conversations with contacts linked to your account.",
          variant: "destructive",
        });
        return null;
      }

      const existing = conversationsRef.current.find((conversation) => {
        if (conversation.is_group) return false;
        const participants = conversation.participants ?? [];
        return (
          participants.some((participant) => participant.user_id === otherUserId) &&
          participants.some((participant) => participant.user_id === currentUserId)
        );
      });

      if (existing) {
        setCurrentConversation(existing.id);
        return existing.id;
      }

      if (usingMockMessaging) {
        const conversationId = createId("conv");
        const createdAt = new Date().toISOString();
        const participants = [
          buildParticipant(resolvedProfile, conversationId, createdAt),
          buildParticipant(otherProfile, conversationId, createdAt),
        ];
        const conversation: Conversation = {
          id: conversationId,
          tenant_id: tenantId,
          title: null,
          type: "direct",
          is_group: false,
          created_at: createdAt,
          updated_at: createdAt,
          last_message_at: null,
          name: null,
          avatar_url: otherProfile.avatar_url,
          metadata: otherProfile.headline ? { subtitle: otherProfile.headline } : null,
          participants,
          unreadCount: 0,
        };

        setConversations((previous) => {
          const next = sortConversations([...previous, conversation]);
          conversationsRef.current = next;
          return next;
        });
        setMessagesById((previous) => {
          const next = { ...previous, [conversationId]: [] };
          messagesRef.current = next;
          return next;
        });
        setCurrentConversation(conversationId);
        toast({
          title: "Conversation created",
          description: `You can now message ${otherProfile.full_name}.`,
        });
        return conversationId;
      }

      if (!user?.id) return null;
      try {
        const { data, error: rpcError } = await supabase.rpc("get_or_create_conversation", {
          p_user_id: user.id,
          p_other_user_id: otherUserId,
          p_tenant_id: tenantId,
        } as any);
        if (rpcError) throw rpcError;

        const conversationId = (data as any) as string;
        if (!conversationId) return null;
        const convs = await fetchConversationsFromDb();
        conversationsRef.current = convs;
        setConversations(convs);
        hydrateCachesFromConversations(convs);
        ensureRealtimeSubscriptions();
        setCurrentConversation(conversationId);
        return conversationId;
      } catch (err) {
        console.error("Failed to start conversation:", err);
        toast({
          title: "Unable to start conversation",
          description:
            err instanceof Error ? err.message : "Please try again in a moment.",
          variant: "destructive",
        });
        return null;
      }
    },
    [
      allowedContacts,
      currentUserId,
      ensureRealtimeSubscriptions,
      fetchConversationsFromDb,
      hydrateCachesFromConversations,
      resolvedProfile,
      setCurrentConversation,
      tenantId,
      toast,
      usingMockMessaging,
      user?.id,
    ],
  );

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (usingMockMessaging) {
        setConversations((previous) => {
          const sorted = sortConversations(previous);
          conversationsRef.current = sorted;
          return sorted;
        });
        return;
      }
      const convs = await fetchConversationsFromDb();
      conversationsRef.current = convs;
      setConversations(convs);
      hydrateCachesFromConversations(convs);
      ensureRealtimeSubscriptions();
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setError("Messaging is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [ensureRealtimeSubscriptions, fetchConversationsFromDb, hydrateCachesFromConversations, usingMockMessaging, user?.id]);

  const fetchMessages = useCallback(async (conversationId?: string) => {
    if (!conversationId) return;
    if (usingMockMessaging) {
      setMessages(messagesRef.current[conversationId] ?? []);
      return;
    }
    try {
      await fetchMessagesFromDb(conversationId);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [fetchMessagesFromDb, usingMockMessaging]);

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      setConversations((previous) => {
        const next = previous.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          const updatedParticipants = (conversation.participants ?? []).map((participant) =>
            participant.user_id === currentUserId
              ? { ...participant, last_read_at: new Date().toISOString() }
              : participant,
          );
          return { ...conversation, participants: updatedParticipants, unreadCount: 0 };
        });
        const sorted = sortConversations(next);
        conversationsRef.current = sorted;
        return sorted;
      });

      if (!usingMockMessaging) {
        await markConversationAsReadDb(conversationId);
      }
      return Promise.resolve();
    },
    [currentUserId, markConversationAsReadDb, usingMockMessaging],
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      if (!usingMockMessaging && user?.id) {
        await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);
      }

      setConversations((previous) => {
        const next = previous.filter((conversation) => conversation.id !== conversationId);
        conversationsRef.current = next;
        return next;
      });
      setMessagesById((previous) => {
        const { [conversationId]: _removed, ...rest } = previous;
        messagesRef.current = rest;
        return rest;
      });
      if (currentConversation === conversationId) {
        setCurrentConversationState(null);
        setMessages([]);
      }
      return Promise.resolve();
    },
    [currentConversation, usingMockMessaging, user?.id],
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
    startTyping,
    stopTyping,
    getOrCreateConversation,
    fetchConversations,
    fetchMessages,
    markConversationAsRead,
    removeConversation,
  };
}

export type {
  Conversation,
  ConversationParticipant,
  Message,
  TypingIndicator,
  MessageAttachment,
  SendMessagePayload,
} from "@/types/messaging";

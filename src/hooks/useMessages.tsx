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
   Constants for retry and recovery
====================================================== */

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const MESSAGE_CACHE_KEY = "unidoxia_pending_messages";
const CONVERSATION_CACHE_KEY = "unidoxia_conversations_cache";

/* ======================================================
   Utilities
====================================================== */

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isLikelyDuplicateMessage = (existing: Message, incoming: Message) => {
  if (existing.id === incoming.id) return true;

  const sameSender = existing.sender_id === incoming.sender_id;
  const contentMatch = (existing.content || "").trim() === (incoming.content || "").trim();
  const typeMatch = (existing.message_type ?? "text") === (incoming.message_type ?? "text");
  const attachmentsMatch = (existing.attachments?.length ?? 0) === (incoming.attachments?.length ?? 0);

  const existingCreated = new Date(existing.created_at).getTime();
  const incomingCreated = new Date(incoming.created_at).getTime();
  const timeDiff = Math.abs(existingCreated - incomingCreated);

  return (
    sameSender &&
    contentMatch &&
    typeMatch &&
    attachmentsMatch &&
    Number.isFinite(timeDiff) &&
    timeDiff < 10_000
  );
};

/**
 * Retry a function with exponential backoff
 */
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error);
      
      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Store pending messages in localStorage for recovery
 */
const storePendingMessage = (message: {
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
  timestamp: string;
}) => {
  try {
    const pending = JSON.parse(localStorage.getItem(MESSAGE_CACHE_KEY) || "[]");
    pending.push({ ...message, id: createId("pending") });
    localStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(pending));
  } catch {
    // Silently fail if localStorage is not available
  }
};

/**
 * Remove a pending message after successful send
 */
const removePendingMessage = (messageId: string) => {
  try {
    const pending = JSON.parse(localStorage.getItem(MESSAGE_CACHE_KEY) || "[]");
    const filtered = pending.filter((m: { id: string }) => m.id !== messageId);
    localStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
};

/**
 * Get all pending messages for recovery
 */
const getPendingMessages = (): Array<{
  id: string;
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
  timestamp: string;
}> => {
  try {
    return JSON.parse(localStorage.getItem(MESSAGE_CACHE_KEY) || "[]");
  } catch {
    return [];
  }
};

/**
 * Cache conversations for offline access
 */
const cacheConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(CONVERSATION_CACHE_KEY, JSON.stringify({
      data: conversations,
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // Silently fail
  }
};

/**
 * Get cached conversations
 */
const getCachedConversations = (): Conversation[] => {
  try {
    const cached = JSON.parse(localStorage.getItem(CONVERSATION_CACHE_KEY) || "{}");
    // Only use cache if less than 5 minutes old
    if (cached.data && cached.timestamp) {
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < 5 * 60 * 1000) {
        return cached.data;
      }
    }
    return [];
  } catch {
    return [];
  }
};

/**
 * Parse database errors into user-friendly messages
 */
const parseDbError = (error: { message?: string; code?: string }): string => {
  const message = error.message?.toLowerCase() || "";
  
  if (message.includes("column") && message.includes("does not exist")) {
    return "Database schema needs updating. Please contact support.";
  }
  if (message.includes("messaging not permitted")) {
    return "You don't have permission to message this user.";
  }
  if (message.includes("not authenticated")) {
    return "Please sign in to send messages.";
  }
  if (message.includes("recipient profile not found")) {
    return "Could not find the recipient.";
  }
  if (message.includes("profile not found")) {
    return "Your profile could not be found.";
  }
  if (message.includes("violates row-level security")) {
    return "You don't have permission for this action.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your connection.";
  }
  
  return error.message || "An unexpected error occurred.";
};

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

  const createConversationFallback = useCallback(
    async (otherUserId: string) => {
      if (!currentUserId) return null;

      // Try to find an existing conversation by intersecting participant memberships
      const { data: myMemberships, error: myMembershipsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (myMembershipsError) {
        console.error("Fallback conversation lookup failed (current user):", myMembershipsError);
        return null;
      }

      const { data: otherMemberships, error: otherMembershipsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId);

      if (otherMembershipsError) {
        console.error("Fallback conversation lookup failed (other user):", otherMembershipsError);
        return null;
      }

      const myIds = new Set((myMemberships ?? []).map((m) => m.conversation_id));
      const sharedConversationId = (otherMemberships ?? []).find((m) => myIds.has(m.conversation_id))?.conversation_id;

      if (sharedConversationId) {
        return sharedConversationId as string;
      }

      // Create a new conversation without referencing optional columns like role
      const { data: convRows, error: convError } = await supabase
        .from("conversations")
        .insert([{ tenant_id: tenantId, created_by: currentUserId, is_group: false, type: "direct" }])
        .select("id");

      const convId = Array.isArray(convRows) ? convRows[0]?.id : (convRows as any)?.id;

      if (convError || !convId) {
        console.error("Fallback conversation creation failed:", convError);
        return null;
      }

      const { error: participantError } = await supabase.from("conversation_participants").upsert(
        [
          { conversation_id: convId, user_id: currentUserId },
          { conversation_id: convId, user_id: otherUserId },
        ],
        { onConflict: "conversation_id,user_id" }
      );

      if (participantError) {
        console.error("Fallback participant insertion failed:", participantError);
        return null;
      }

      // Refresh conversations after creating (using inline fetch)
      const { data: refreshedMemberships } = await supabase
        .from("conversation_participants")
        .select("conversation_id,last_read_at")
        .eq("user_id", currentUserId);

      if (refreshedMemberships?.length) {
        const refreshedIds = refreshedMemberships.map((m) => m.conversation_id);
        const { data: refreshedConvs } = await supabase
          .from("conversations")
          .select(`
            id,
            tenant_id,
            title,
            name,
            type,
            is_group,
            created_at,
            updated_at,
            last_message_at,
            avatar_url,
            metadata,
            participants:conversation_participants(
              user_id,
              last_read_at,
              profile:profiles(id, full_name, avatar_url, role)
            )
          `)
          .in("id", refreshedIds)
          .order("last_message_at", { ascending: false, nullsFirst: false });

        const mapped = (refreshedConvs ?? []).map((c: any) => ({
          ...c,
          title: c.title ?? null,
        })) as Conversation[];
        const sortedConvs = sortConversations(mapped);
        conversationsRef.current = sortedConvs;
        setConversations(sortedConvs);
        cacheConversations(sortedConvs);
      }

      return convId as string;
    },
    [currentUserId, tenantId]
  );

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

    // Attempt 1: fetch with nested profile join
    const { data: convs, error: convsError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        tenant_id,
        title,
        name,
        type,
        is_group,
        created_at,
        updated_at,
        last_message_at,
        avatar_url,
        metadata,
        participants:conversation_participants(
          user_id,
          last_read_at,
          profile:profiles(id, full_name, avatar_url, role)
        )
      `,
      )
      .in("id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!convsError) {
      const mapped = (convs ?? []).map((c: any) => ({
        ...c,
        title: c.title ?? null,
      })) as Conversation[];
      return sortConversations(mapped);
    }

    // If the backend schema cache doesn't see the participants->profiles relationship yet,
    // fallback to a 2-step fetch (participants + profiles) so messaging still works.
    const errMsg = (convsError as any)?.message?.toLowerCase?.() ?? "";
    const isSchemaCacheIssue = errMsg.includes("could not find a relationship") && errMsg.includes("conversation_participants") && errMsg.includes("profiles");

    if (!isSchemaCacheIssue) {
      console.error("Failed to fetch conversations:", convsError);
      return [];
    }

    // Attempt 2: fetch conversations + participants + profiles separately
    const { data: baseConvs, error: baseError } = await supabase
      .from("conversations")
      .select(
        "id, tenant_id, title, name, type, is_group, created_at, updated_at, last_message_at, avatar_url, metadata"
      )
      .in("id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (baseError) {
      console.error("Failed to fetch conversations (fallback):", baseError);
      return [];
    }

    const { data: parts, error: partsError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, last_read_at")
      .in("conversation_id", ids);

    if (partsError) {
      console.error("Failed to fetch participants (fallback):", partsError);
      return [];
    }

    const userIds = Array.from(new Set((parts ?? []).map((p: any) => p.user_id)));

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("id", userIds);

    if (profilesError) {
      console.error("Failed to fetch profiles (fallback):", profilesError);
      return [];
    }

    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
    const participantsByConv = new Map<string, any[]>();

    for (const p of parts ?? []) {
      const arr = participantsByConv.get((p as any).conversation_id) ?? [];
      arr.push({
        id: `${(p as any).conversation_id}-${(p as any).user_id}`,
        conversation_id: (p as any).conversation_id,
        user_id: (p as any).user_id,
        joined_at: new Date().toISOString(),
        last_read_at: (p as any).last_read_at ?? null,
        profile: profileMap.get((p as any).user_id)
          ? {
              id: (p as any).user_id,
              full_name: profileMap.get((p as any).user_id).full_name,
              avatar_url: profileMap.get((p as any).user_id).avatar_url,
              role: profileMap.get((p as any).user_id).role,
            }
          : undefined,
      });
      participantsByConv.set((p as any).conversation_id, arr);
    }

    const fallbackMapped: Conversation[] = (baseConvs ?? []).map((c: any) => ({
      ...c,
      title: null,
      participants: participantsByConv.get(c.id) ?? [],
    }));

    return sortConversations(fallbackMapped);
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
          const mergeWithExisting = (existingMessages: Message[]) => {
            const duplicateIndex = existingMessages.findIndex((m) =>
              isLikelyDuplicateMessage(m, message)
            );

            if (duplicateIndex !== -1) {
              const next = [...existingMessages];
              next[duplicateIndex] = message;
              return next;
            }

            return [...existingMessages, message];
          };

          setMessagesById((prev) => {
            const existing = prev[newMessage.conversation_id] ?? [];
            const next = mergeWithExisting(existing);
            messagesRef.current = { ...prev, [newMessage.conversation_id]: next };
            return messagesRef.current;
          });

          // If this is the current conversation, update visible messages
          setCurrentConversationState((currentId) => {
            if (currentId === newMessage.conversation_id) {
              setMessages((prev) => mergeWithExisting(prev));
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
     Bootstrap (with cache fallback and pending message retry)
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

        // Try to load cached conversations while fetching fresh data
        const cachedConvs = getCachedConversations();
        if (cachedConvs.length > 0 && !cancelled) {
          conversationsRef.current = cachedConvs;
          setConversations(cachedConvs);
        }

        // Fetch fresh conversations with retry
        let convs: Conversation[] = [];
        try {
          convs = await retryWithBackoff(() => fetchConversationsFromDb(), 2, 500);
          if (cancelled) return;
          conversationsRef.current = convs;
          setConversations(convs);
          cacheConversations(convs);
        } catch (fetchError) {
          console.error("Failed to fetch conversations:", fetchError);
          // Use cached data if available, otherwise show error
          if (cachedConvs.length === 0) {
            setError("Unable to load messages. Please check your connection.");
          } else {
            // Use cached conversations
            convs = cachedConvs;
          }
        }
        
        // If there are conversations, load messages for the first one
        if (convs.length > 0) {
          const firstConvId = convs[0].id;
          setCurrentConversationState(firstConvId);
          
          try {
            const msgs = await retryWithBackoff(
              () => fetchMessagesForConversation(firstConvId), 
              2, 
              500
            );
            messagesRef.current = { [firstConvId]: msgs };
            setMessagesById({ [firstConvId]: msgs });
            setMessages(msgs);
          } catch (msgError) {
            console.error("Failed to fetch messages:", msgError);
            // Continue without messages - they'll be fetched when conversation is selected
          }
        }

        // Attempt to retry any pending messages from previous sessions
        const pendingMessages = getPendingMessages();
        if (pendingMessages.length > 0) {
          console.log(`Found ${pendingMessages.length} pending messages to retry`);
          // We'll retry them in background without blocking the UI
          setTimeout(async () => {
            for (const pending of pendingMessages) {
              try {
                const { error } = await supabase.from("conversation_messages").insert([{
                  conversation_id: pending.conversationId,
                  sender_id: currentUserId,
                  content: pending.content,
                  attachments: (pending.attachments ?? []) as unknown as Record<string, never>[],
                  message_type: "text",
                }]);
                
                if (!error) {
                  removePendingMessage(pending.id);
                  console.log(`Successfully sent pending message ${pending.id}`);
                }
              } catch (e) {
                console.warn(`Failed to retry pending message ${pending.id}:`, e);
              }
            }
          }, 2000);
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
     Send Message (with retry and recovery)
  ======================================================= */

  const sendMessage = useCallback(
    async (conversationId: string, payload: SendMessagePayload) => {
      if (!conversationId || !currentUserId) return;
      const content = payload.content?.trim();
      if (!content && !(payload.attachments?.length)) return;

      const createdAt = new Date().toISOString();
      const attachments = (payload.attachments ?? []).map(normalizeAttachment);

      const optimisticId = createId("msg");
      const optimistic: Message = {
        id: optimisticId,
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

      // Store pending message for recovery before attempting send
      const pendingMessage = {
        id: optimisticId,
        conversationId,
        content: content ?? "",
        attachments,
        timestamp: createdAt,
      };
      storePendingMessage(pendingMessage);

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

      if (usingMockMessaging) {
        removePendingMessage(optimisticId);
        return;
      }

      try {
        // Use retry logic for reliability
        const data = await retryWithBackoff(async () => {
          const { data, error } = await supabase.from("conversation_messages").insert([{
            conversation_id: conversationId,
            sender_id: currentUserId,
            content,
            attachments: attachments as unknown as any[],
            message_type: payload.messageType ?? "text",
          }]).select().single();

          if (error) {
            throw error;
          }
          return data;
        });

        // Success - remove from pending
        removePendingMessage(optimisticId);

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
        cacheConversations(convs);

      } catch (error: any) {
        console.error("Message send failed after retries:", error);
        
        const userMessage = parseDbError(error);
        toast({
          title: "Message failed",
          description: userMessage,
          variant: "destructive",
        });
        
        // Remove optimistic message on failure
        setMessagesById((prev) => {
          const filtered = (prev[conversationId] ?? []).filter((m) => m.id !== optimistic.id);
          messagesRef.current = { ...prev, [conversationId]: filtered };
          return messagesRef.current;
        });
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        
        // Note: We keep the message in pending storage for potential retry later
      }
    },
    [currentUserId, resolvedProfile, toast, usingMockMessaging, fetchConversationsFromDb],
  );

  /* ======================================================
     Create / Get Conversation (with retry and recovery)
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
        try {
          const { data, error } = await retryWithBackoff(async () => {
            const result = await supabase
              .from("profiles")
              .select("id, full_name, email, avatar_url, role, tenant_id")
              .eq("id", otherUserId)
              .maybeSingle();

            if (result.error) throw result.error;
            return result;
          });

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
        } catch (error: any) {
          console.error("Failed to fetch recipient profile:", error);
          toast({
            title: "Unable to message",
            description: parseDbError(error),
            variant: "destructive",
          });
          return null;
        }
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

      try {
        // Use retry logic for the RPC call
        const conversationId = await retryWithBackoff(async () => {
          const { data, error } = await supabase.rpc("get_or_create_conversation", {
            p_user_id: currentUserId,
            p_other_user_id: otherUserId,
            p_tenant_id: tenantId,
          });

          if (error) {
            console.error("get_or_create_conversation error:", error);
            throw error;
          }

          if (!data) {
            throw new Error("No conversation ID returned");
          }

          return data as string;
        });

        const convs = await fetchConversationsFromDb();
        conversationsRef.current = convs;
        setConversations(convs);
        cacheConversations(convs);
        await setCurrentConversation(conversationId);
        return conversationId;

      } catch (error: any) {
        console.error("get_or_create_conversation failed after retries:", error);

        // Automatically recover from schema mismatches by using a simplified creation path
        if (error?.code === "42703" || error?.message?.toLowerCase().includes("does not exist")) {
          const fallbackId = await createConversationFallback(otherUserId);
          if (fallbackId) {
            return fallbackId;
          }
        }

        // Supabase can sometimes return a PostgREST error when coercing the RPC
        // result into a single JSON object. In that case, fall back to the
        // direct participant-based lookup/creation so the user can continue
        // messaging without seeing a hard error.
        const errorMessage = error?.message?.toLowerCase?.() ?? "";
        if (errorMessage.includes("cannot coerce") || errorMessage.includes("single json object")) {
          const fallbackId = await createConversationFallback(otherUserId);
          if (fallbackId) {
            return fallbackId;
          }
        }

        const userMessage = parseDbError(error);
        toast({
          title: "Unable to start conversation",
          description: userMessage,
          variant: "destructive",
        });
        return null;
      }
    },
    [
      currentUserId,
      fetchConversationsFromDb,
      createConversationFallback,
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
    try {
      const convs = await retryWithBackoff(() => fetchConversationsFromDb(), 2, 500);
      conversationsRef.current = convs;
      setConversations(convs);
      cacheConversations(convs);
    } catch (error) {
      console.error("Failed to refresh conversations:", error);
      // Don't throw - keep showing existing conversations
    }
  }, [fetchConversationsFromDb, usingMockMessaging]);

  /**
   * Retry sending any pending messages that failed previously
   */
  const retryPendingMessages = useCallback(async () => {
    if (usingMockMessaging || !currentUserId) return { success: 0, failed: 0 };
    
    const pendingMessages = getPendingMessages();
    let success = 0;
    let failed = 0;
    
    for (const pending of pendingMessages) {
      try {
        const { error } = await supabase.from("conversation_messages").insert([{
          conversation_id: pending.conversationId,
          sender_id: currentUserId,
          content: pending.content,
          attachments: (pending.attachments ?? []) as unknown as Record<string, never>[],
          message_type: "text",
        }]);
        
        if (!error) {
          removePendingMessage(pending.id);
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    
    if (success > 0) {
      // Refresh conversations after sending pending messages
      await fetchConversations();
    }
    
    return { success, failed };
  }, [currentUserId, fetchConversations, usingMockMessaging]);

  /**
   * Get count of pending messages
   */
  const getPendingMessageCount = useCallback(() => {
    return getPendingMessages().length;
  }, []);

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
    // Recovery functions
    retryPendingMessages,
    getPendingMessageCount,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Send, Loader2, X, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface AdminStudentChatProps {
  studentProfileId: string;
  studentName: string;
  onClose: () => void;
}

export function AdminStudentChat({ studentProfileId, studentName, onClose }: AdminStudentChatProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageContent, setMessageContent] = useState("");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversation and messages
  const fetchChatData = useCallback(async () => {
    if (!studentProfileId || !profile?.id || !profile?.tenant_id) return;

    setLoading(true);
    try {
      // Get or create conversation
      const { data: convId, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_user_id: profile.id,
          p_other_user_id: studentProfileId,
          p_tenant_id: profile.tenant_id,
        }
      );

      if (convError) throw convError;
      if (!convId) return;

      setConversationId(convId);

      // Fetch messages with sender info
      const { data: messagesData, error: msgError } = await supabase
        .from("conversation_messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          created_at,
          sender:profiles!conversation_messages_sender_profile_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("conversation_id", convId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;
      setMessages((messagesData ?? []) as unknown as ChatMessage[]);

      // Mark conversation as read
      await supabase.rpc("mark_conversation_read", { conversation_uuid: convId });
    } catch (err) {
      console.error("Failed to fetch chat data:", err);
      toast({
        title: "Error",
        description: "Failed to load chat history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [studentProfileId, profile?.id, profile?.tenant_id, toast]);

  useEffect(() => {
    void fetchChatData();
  }, [fetchChatData]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`admin-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data: newMessage } = await supabase
            .from("conversation_messages")
            .select(`
              id,
              conversation_id,
              sender_id,
              content,
              message_type,
              created_at,
              sender:profiles!conversation_messages_sender_profile_fkey (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage as unknown as ChatMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const handleSendMessage = async () => {
    const content = messageContent.trim();
    if (!content || !conversationId || !profile?.id) return;

    setSending(true);
    try {
      const { data: inserted, error: msgError } = await supabase
        .from("conversation_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content,
          message_type: "text",
        })
        .select("id, conversation_id, sender_id, content, message_type, created_at")
        .single();

      if (msgError) throw msgError;

      // Optimistically add so the admin immediately sees what was sent.
      if (inserted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === inserted.id)) return prev;
          return [
            ...prev,
            {
              ...inserted,
              sender: {
                id: profile.id,
                full_name: profile.full_name ?? null,
                avatar_url: profile.avatar_url ?? null,
              },
            } as unknown as ChatMessage,
          ];
        });
      }

      setMessageContent("");
      textareaRef.current?.focus();
    } catch (err: any) {
      console.error("Failed to send message:", err);
      toast({
        title: "Error",
        description: err?.message ? `Failed to send message: ${err.message}` : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, "h:mm a");
    }
    return format(date, "MMM d, h:mm a");
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Chat with {studentName}</h3>
            <p className="text-xs text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void fetchChatData()}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.sender_id === profile?.id;
              const senderName = message.sender?.full_name ?? "Unknown";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium mb-1 opacity-80">
                        {senderName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3 bg-muted/20">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={sending || !conversationId}
          />
          <Button
            onClick={() => void handleSendMessage()}
            disabled={sending || !messageContent.trim() || !conversationId}
            size="icon"
            className="h-11 w-11 flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

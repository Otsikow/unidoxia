import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { ChatArea } from "@/components/messages/ChatArea";
import { Button } from "@/components/ui/button";
export function StudentInternalConversation({
  profileId,
}: {
  profileId: string | null;
}) {
  const { user, profile } = useAuth();
  const chat = useMessages();
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const conversation = chat.conversations.find(
    (c) =>
      c.id === chat.currentConversation &&
      c.tenant_id === profile?.tenant_id &&
      c.participants?.some((p) => p.user_id === profileId) &&
      c.participants?.some((p) => p.user_id === user?.id) &&
      !c.participants?.some(
        (p) => p.profile?.role === "student" && p.user_id !== profileId,
      ),
  );
  const open = async () => {
    if (!profileId || opening) return;
    setOpening(true);
    setError("");
    try {
      const id = await chat.getOrCreateConversation(profileId);
      if (!id)
        throw new Error(
          "Conversation could not be opened. Check access and try again.",
        );
      await chat.setCurrentConversation(id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Conversation could not be opened.",
      );
    } finally {
      setOpening(false);
    }
  };
  const latest = chat.messages.at(-1);
  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border"
      aria-label="Student internal conversation"
    >
      {error && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!profileId ? (
        <p className="p-4 text-sm text-muted-foreground">
          This student has no linked portal account. Email and WhatsApp remain
          available where contact details are recorded.
        </p>
      ) : !conversation ? (
        <div className="space-y-3 p-4">
          <h3 className="font-semibold">Portal conversation</h3>
          <p className="text-sm text-muted-foreground">
            View this student’s internal messages. External email and WhatsApp
            replies are separate.
          </p>
          <Button
            disabled={opening || chat.loading}
            onClick={() => void open()}
          >
            {opening ? "Opening…" : "View conversation"}
          </Button>
          {chat.error && <p role="alert">{chat.error}</p>}
        </div>
      ) : (
        <>
          <p className="shrink-0 border-b px-3 py-2 text-xs text-muted-foreground">
            {latest
              ? latest.sender_id === profileId
                ? "Latest internal message is from the student."
                : "Awaiting an internal reply after the latest team message."
              : "No internal messages recorded."}
          </p>
          <ChatArea
            conversation={conversation}
            messages={chat.messages}
            typingUsers={chat.typingUsers}
            loading={chat.loading}
            onSendMessage={(payload) =>
              void chat.sendMessage(conversation.id, payload)
            }
            onStartTyping={() => chat.startTyping(conversation.id)}
            onStopTyping={() => chat.stopTyping(conversation.id)}
            onMarkConversationRead={() =>
              void chat.markConversationAsRead(conversation.id)
            }
          />
        </>
      )}
    </section>
  );
}

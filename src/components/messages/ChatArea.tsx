import { useEffect, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageInput } from './MessageInput';
import type {
  Message,
  TypingIndicator,
  Conversation,
  SendMessagePayload,
} from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, FileText, AudioLines } from 'lucide-react';
import type { UserPresence } from '@/hooks/usePresence';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { getConversationDisplayName } from '@/lib/messaging/conversationDisplay';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingIndicator[];
  loading: boolean;
  onSendMessage: (payload: SendMessagePayload) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  getUserPresence?: (userId: string) => UserPresence | null;
  isUserOnline?: (userId: string) => boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  onMarkConversationRead?: (conversationId: string) => void;
}

export function ChatArea({
  conversation,
  messages,
  typingUsers,
  loading,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  getUserPresence,
  isUserOnline,
  onBack,
  showBackButton,
  onMarkConversationRead,
}: ChatAreaProps) {
  const { user } = useAuth();

  const messageListRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const [readObserverRef, isReadAnchorVisible] =
    useIntersectionObserver<HTMLDivElement>({
      threshold: 0.35,
    });

  /* ---------------- Scroll Handling ---------------- */
  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.clientHeight - container.scrollTop;
      isAtBottomRef.current = distanceFromBottom < 80;
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container || !isAtBottomRef.current) return;

    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, typingUsers]);

  /* ---------------- Read Receipts ---------------- */
  useEffect(() => {
    if (!conversation?.id) return;
    if (!isReadAnchorVisible) return;
    onMarkConversationRead?.(conversation.id);
  }, [conversation?.id, isReadAnchorVisible, onMarkConversationRead]);

  /* ---------------- Helpers ---------------- */
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM dd, yyyy');
  };

  const formatMessageTime = (date: string) =>
    format(new Date(date), 'HH:mm');

  const shouldShowDateDivider = (
    current: Message,
    previous: Message | null
  ) => {
    if (!previous) return true;
    return (
      new Date(current.created_at).toDateString() !==
      new Date(previous.created_at).toDateString()
    );
  };

  const shouldGroupMessage = (
    current: Message,
    previous: Message | null
  ) => {
    if (!previous) return false;
    const diff =
      new Date(current.created_at).getTime() -
      new Date(previous.created_at).getTime();
    return (
      current.sender_id === previous.sender_id &&
      diff < 5 * 60 * 1000
    );
  };

  const getMessageReceiptDetails = (message: Message) => {
    if (!conversation?.participants || !user?.id) return null;
    if (message.sender_id !== user.id) return null;

    const others = conversation.participants.filter(
      (p) => p.user_id !== user.id
    );

    const createdAt = new Date(message.created_at).getTime();
    const readers = others.filter(
      (p) =>
        p.last_read_at &&
        new Date(p.last_read_at).getTime() >= createdAt
    );

    if (readers.length === 0) {
      return { state: 'delivered', label: '✓✓ Delivered' } as const;
    }

    if (readers.length === others.length) {
      return { state: 'read', label: '✓✓ Read' } as const;
    }

    return { state: 'partial', label: '✓✓ Read by some' } as const;
  };

  const receiptToneClasses = useMemo(
    () => ({
      read: 'text-primary-foreground/80',
      partial: 'text-primary-foreground/70',
      delivered: 'text-primary-foreground/60',
    }),
    []
  );

  const conversationName = useMemo(
    () => (conversation ? getConversationDisplayName(conversation, user?.id) : 'Conversation'),
    [conversation, user?.id]
  );

  /* ---------------- Loading / Empty ---------------- */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation to start messaging
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-3">
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="font-semibold truncate">
          {conversationName}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messageListRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="space-y-2">
          {messages.map((message, index) => {
            const prev = index > 0 ? messages[index - 1] : null;
            const isOwn = message.sender_id === user?.id;
            const receipt = getMessageReceiptDetails(message);

            return (
              <div key={message.id}>
                {shouldShowDateDivider(message, prev) && (
                  <div className="flex justify-center my-4">
                    <Badge variant="secondary">
                      {formatMessageDate(message.created_at)}
                    </Badge>
                  </div>
                )}

                <div
                  className={cn(
                    'flex gap-3',
                    isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={message.sender?.avatar_url || undefined}
                      />
                      <AvatarFallback>
                        {getInitials(
                          message.sender?.full_name || 'U'
                        )}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 max-w-[70%]',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">
                      {message.content}
                    </p>

                    <div
                      className={cn(
                        'mt-1 text-xs flex flex-col',
                        isOwn
                          ? 'items-end text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      <span>
                        {formatMessageTime(message.created_at)}
                      </span>
                      {receipt && (
                        <span
                          className={cn(
                            'leading-none',
                            isOwn &&
                              receiptToneClasses[receipt.state]
                          )}
                        >
                          {receipt.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Read anchor */}
          <div ref={readObserverRef} className="h-1 w-full" />
        </div>
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        disabled={loading}
      />
    </div>
  );
}

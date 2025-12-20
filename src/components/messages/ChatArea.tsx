import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageInput } from './MessageInput';
import type { Message, TypingIndicator, Conversation, SendMessagePayload } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, FileText, AudioLines } from 'lucide-react';
import type { UserPresence } from '@/hooks/usePresence';

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
}: ChatAreaProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMetadataName = (metadata?: Record<string, unknown> | null) => {
    if (!metadata) return undefined;

    const possibleKeys = [
      'university_name',
      'universityName',
      'organization_name',
      'organizationName',
      'name',
      'title',
      'display_name',
    ];

    for (const key of possibleKeys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    const university = (metadata as Record<string, unknown>).university;
    if (university && typeof university === 'object' && 'name' in university) {
      const uniName = (university as Record<string, unknown>).name;
      if (typeof uniName === 'string' && uniName.trim()) {
        return uniName.trim();
      }
    }

    return undefined;
  };

  const getConversationName = () => {
    if (!conversation) return '';

    const metadataName = getMetadataName(conversation.metadata);
    const namedConversation = conversation.name || metadataName;

    if (conversation.is_group) {
      return namedConversation || 'Group Message';
    }

    const otherParticipant = conversation.participants?.find(p => p.user_id !== user?.id);
    return namedConversation || otherParticipant?.profile?.full_name || 'Unknown User';
  };

  const getConversationAvatar = () => {
    if (!conversation) return null;
    if (conversation.avatar_url) {
      return conversation.avatar_url;
    }
    const otherParticipant = conversation.participants?.find(p => p.user_id !== user?.id);
    return otherParticipant?.profile?.avatar_url || null;
  };

  const getPresenceDetails = () => {
    if (!conversation || !user?.id) {
      return { label: 'Offline', indicator: 'bg-gray-400' };
    }

    const others = (conversation.participants ?? []).filter(
      (participant) => participant.user_id !== user.id
    );

    if (others.length === 0) {
      return { label: 'Offline', indicator: 'bg-gray-400' };
    }

    if (conversation.is_group) {
      const onlineCount = isUserOnline
        ? others.filter((participant) => isUserOnline(participant.user_id)).length
        : 0;

      if (onlineCount > 0) {
        return {
          label: onlineCount === 1 ? '1 person online' : `${onlineCount} people online`,
          indicator: 'bg-green-500',
        };
      }

      const recentPresence = others
        .map((participant) => getUserPresence?.(participant.user_id))
        .filter((presence): presence is UserPresence => Boolean(presence));

      if (recentPresence.length > 0) {
        const mostRecent = recentPresence.reduce<number | null>((latest, presence) => {
          const timestamp = presence.last_seen ?? presence.updated_at;
          if (!timestamp) return latest;
          const time = new Date(timestamp).getTime();
          if (Number.isNaN(time)) return latest;
          if (latest === null || time > latest) {
            return time;
          }
          return latest;
        }, null);

        if (mostRecent) {
          return {
            label: `Last activity ${formatDistanceToNow(mostRecent, { addSuffix: true })}`,
            indicator: 'bg-gray-400',
          };
        }
      }

      return { label: 'No one online', indicator: 'bg-gray-400' };
    }

    const otherParticipant = others[0];

    if (isUserOnline && isUserOnline(otherParticipant.user_id)) {
      return { label: 'Online', indicator: 'bg-green-500' };
    }

    const presence = getUserPresence?.(otherParticipant.user_id);
    if (!presence) {
      return { label: 'Offline', indicator: 'bg-gray-400' };
    }

    if (presence.status === 'online') {
      return { label: 'Online', indicator: 'bg-green-500' };
    }

    if (presence.status === 'away') {
      return { label: 'Away', indicator: 'bg-amber-500' };
    }

    const lastSeen = presence.last_seen || presence.updated_at;
    if (!lastSeen) {
      return { label: 'Offline', indicator: 'bg-gray-400' };
    }

    return {
      label: `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`,
      indicator: 'bg-gray-400',
    };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) return 'Today';
    if (isYesterday(messageDate)) return 'Yesterday';
    return format(messageDate, 'MMMM dd, yyyy');
  };

  const formatMessageTime = (date: string) => {
    return format(new Date(date), 'HH:mm');
  };


  const shouldShowDateDivider = (currentMsg: Message, previousMsg: Message | null) => {
    if (!previousMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const previousDate = new Date(previousMsg.created_at).toDateString();
    return currentDate !== previousDate;
  };

  const shouldGroupMessage = (currentMsg: Message, previousMsg: Message | null) => {
    if (!previousMsg) return false;
    const timeDiff =
      new Date(currentMsg.created_at).getTime() - new Date(previousMsg.created_at).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return currentMsg.sender_id === previousMsg.sender_id && timeDiff < fiveMinutes;
  };

  const getMessageReceiptDetails = (message: Message) => {
    if (!conversation?.participants || !user?.id) return null;
    if (message.sender_id !== user.id) return null;

    const others = conversation.participants.filter(
      (participant) => participant.user_id !== user.id
    );

    if (others.length === 0) return null;

    const createdAt = new Date(message.created_at).getTime();
    const readParticipants = others.filter((participant) => {
      if (!participant.last_read_at) return false;
      const lastRead = new Date(participant.last_read_at).getTime();
      if (Number.isNaN(lastRead)) return false;
      return lastRead >= createdAt;
    });

    if (readParticipants.length === 0) {
      return {
        state: 'delivered' as const,
        label: others.length === 1 ? 'Delivered' : 'Delivered to group',
        readers: [] as string[],
      };
    }

    const readerNames = readParticipants
      .map((participant) => participant.profile?.full_name || null)
      .filter((name): name is string => Boolean(name));
    const everyoneRead = readParticipants.length === others.length;

    if (everyoneRead) {
      return {
        state: 'read' as const,
        label: readerNames.length > 0 ? `Read by ${readerNames.join(', ')}` : 'Read',
        readers: readerNames,
      };
    }

    return {
      state: 'partial' as const,
      label:
        readerNames.length > 0
          ? `Read by ${readerNames.join(', ')}`
          : 'Read by some participants',
      readers: readerNames,
    };
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 p-4">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-sm sm:text-lg">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const conversationName = getConversationName();
  const avatarUrl = getConversationAvatar();
  const presenceDetails = getPresenceDetails();
  const conversationSubtitle =
    conversation && conversation.metadata && typeof conversation.metadata === 'object'
      ? (conversation.metadata as { subtitle?: string }).subtitle
      : undefined;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 w-full bg-gradient-to-b from-background via-background to-muted/40">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden h-9 w-9 flex-shrink-0"
            aria-label="Go back to messages"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to messages</span>
          </Button>
        )}
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={avatarUrl || undefined} alt={conversationName} />
          <AvatarFallback className="text-xs sm:text-sm">{getInitials(conversationName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm sm:text-base truncate">{conversationName}</h2>
          {conversationSubtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{conversationSubtitle}</p>
          )}
          <p
            className={cn(
              'text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1',
              conversationSubtitle && 'mt-0.5'
            )}
          >
            <span
              className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', presenceDetails.indicator)}
            />
            <span className="truncate">{presenceDetails.label}</span>
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-3 sm:px-5 py-4 sm:py-6 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1 sm:space-y-2" ref={scrollRef}>
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const showDate = shouldShowDateDivider(message, previousMessage);
              const groupWithPrevious = shouldGroupMessage(message, previousMessage);
              const isOwnMessage = message.sender_id === user?.id;
              const showAvatar = !groupWithPrevious || isOwnMessage;
              const receipt = getMessageReceiptDetails(message);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <Badge variant="secondary" className="text-xs">
                        {formatMessageDate(message.created_at)}
                      </Badge>
                    </div>
                  )}

                  <div
                    className={cn(
                      'flex gap-1.5 sm:gap-2 items-end',
                      isOwnMessage ? 'justify-end' : 'justify-start',
                      groupWithPrevious && 'mt-0.5',
                      !groupWithPrevious && 'mt-3 sm:mt-4'
                    )}
                  >
                    {!isOwnMessage && (
                      <Avatar className={cn('h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0', !showAvatar && 'invisible')}>
                        <AvatarImage
                          src={message.sender?.avatar_url || undefined}
                          alt={message.sender?.full_name || ''}
                        />
                        <AvatarFallback className="text-[10px] sm:text-xs">
                          {getInitials(message.sender?.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'max-w-[88%] sm:max-w-[72%] md:max-w-[68%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm',
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                        {!isOwnMessage && !groupWithPrevious && (
                          <p className="text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1">
                            {message.sender?.full_name}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                        {message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => {
                              if (attachment.type === 'image') {
                                return (
                                  <img
                                    key={attachment.id}
                                    src={attachment.preview_url || attachment.url}
                                    alt={attachment.name || 'Shared image'}
                                    className="max-w-[240px] rounded-lg border"
                                  />
                                );
                              }

                              if (attachment.type === 'video') {
                                return (
                                  <video
                                    key={attachment.id}
                                    controls
                                    className="w-full max-w-[320px] rounded-lg border"
                                  >
                                    <source src={attachment.url} type={attachment.mime_type || 'video/mp4'} />
                                  </video>
                                );
                              }

                              if (attachment.type === 'audio') {
                                return (
                                  <div key={attachment.id} className="flex flex-col gap-1 text-xs">
                                    <div className="flex items-center gap-2 font-medium">
                                      <AudioLines className="h-4 w-4" />
                                      <span>{attachment.name || 'Audio message'}</span>
                                      {attachment.size ? (
                                        <span className="text-muted-foreground">{formatFileSize(attachment.size)}</span>
                                      ) : null}
                                    </div>
                                    <audio controls className="w-full">
                                      <source src={attachment.url} type={attachment.mime_type || 'audio/webm'} />
                                    </audio>
                                  </div>
                                );
                              }

                              return (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-xs underline break-all"
                                  download={attachment.name ?? undefined}
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>{attachment.name || 'View attachment'}</span>
                                  {attachment.size ? (
                                    <span className="text-muted-foreground">{formatFileSize(attachment.size)}</span>
                                  ) : null}
                                </a>
                              );
                            })}
                          </div>
                        )}
                        <div
                          className={cn(
                            'mt-1 text-[10px] sm:text-xs flex flex-col gap-0.5',
                            isOwnMessage
                              ? 'items-end text-right text-primary-foreground/70'
                              : 'text-muted-foreground'
                          )}
                        >
                          <span>{formatMessageTime(message.created_at)}</span>
                          {receipt && (
                            <span
                              className={cn(
                                'leading-none text-[9px] sm:text-[10px]',
                                isOwnMessage
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground/90'
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

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex gap-1.5 sm:gap-2 items-end mt-3 sm:mt-4">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">•••</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-3 py-2 sm:px-4 sm:py-3">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">
                    {typingUsers
                      .map(indicator => indicator.profile?.full_name || 'Someone')
                      .join(', ')}{' '}
                    {typingUsers.length === 1 ? 'is' : 'are'} typing…
                  </p>
                  <div className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        disabled={loading}
      />
    </div>
  );
}

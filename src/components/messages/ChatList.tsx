import { useCallback, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, MessageSquarePlus } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/hooks/useMessages';
import type { UserPresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { getConversationContact, getConversationDisplayName, getNameFromMetadata } from '@/lib/messaging/conversationDisplay';

interface ChatListProps {
  conversations: Conversation[];
  currentConversation: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat?: () => void;
  getUserPresence?: (userId: string) => UserPresence | null;
  isUserOnline?: (userId: string) => boolean;
}

type AggregatedConversation = Conversation & {
  relatedConversationIds: string[];
};

export function ChatList({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewChat,
  getUserPresence,
  isUserOnline,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const filterConversations = useCallback((convs: AggregatedConversation[]) => {
    if (!searchQuery) return convs;

    return convs.filter(conv => {
      const otherParticipant = conv.participants?.find(p => p.user_id !== user?.id);
      const searchLower = searchQuery.toLowerCase();
      const metadataName = getNameFromMetadata(conv.metadata);

      return (
        conv.title?.toLowerCase().includes(searchLower) ||
        conv.name?.toLowerCase().includes(searchLower) ||
        metadataName?.toLowerCase().includes(searchLower) ||
        otherParticipant?.profile?.full_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [searchQuery, user?.id]);

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.avatar_url) {
      return conversation.avatar_url;
    }
    
    const otherParticipant = conversation.participants?.find(p => p.user_id !== user?.id);
    return otherParticipant?.profile?.avatar_url || null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    } else if (isYesterday(messageDate)) {
      return 'Yesterday';
    } else {
      return format(messageDate, 'dd/MM/yyyy');
    }
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const getConversationPreview = (conversation: Conversation) => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) {
      return 'No messages yet';
    }

    if (lastMessage.attachments && lastMessage.attachments.length > 0) {
      const types = new Set(lastMessage.attachments.map((attachment) => attachment.type));
      if (types.size === 1) {
        const type = types.values().next().value;
        if (type === 'image') {
          return lastMessage.attachments.length > 1 ? 'Sent multiple images' : 'Sent an image';
        }
        if (type === 'audio') {
          return lastMessage.attachments.length > 1 ? 'Sent multiple audio messages' : 'Sent an audio message';
        }
        if (type === 'video') {
          return lastMessage.attachments.length > 1 ? 'Sent multiple videos' : 'Sent a video';
        }
        if (type === 'file') {
          return lastMessage.attachments.length > 1 ? 'Sent multiple files' : 'Sent a file';
        }
      }
      return 'Sent attachments';
    }

    return truncateMessage(lastMessage.content);
  };

  const getPresenceDetails = (conversation: Conversation) => {
    if (!user?.id) return null;

    const others = (conversation.participants ?? []).filter(
      (participant) => participant.user_id !== user.id
    );

    if (others.length === 0) return null;

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
        .filter((presence): presence is UserPresence => Boolean(presence?.last_seen || presence?.updated_at));

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
            label: `Active ${formatDistanceToNow(mostRecent, { addSuffix: true })}`,
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
    if (!presence) return null;

    if (presence.status === 'away') {
      return { label: 'Away', indicator: 'bg-amber-500' };
    }

    if (presence.status === 'online') {
      return { label: 'Online', indicator: 'bg-green-500' };
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

  const getConversationIdentifier = useCallback((conversation: Conversation) => {
    if (conversation.is_group) return conversation.id;

    const otherParticipant = conversation.participants?.find(p => p.user_id !== user?.id);
    if (otherParticipant?.user_id) return otherParticipant.user_id;

    const metadata = conversation.metadata as Record<string, unknown> | null;
    if (metadata) {
      const possibleIds = [
        'student_id',
        'studentId',
        'student_profile_id',
        'studentProfileId',
        'applicant_id',
        'applicantId',
        'profile_id',
        'profileId',
      ];

      for (const key of possibleIds) {
        const value = metadata[key];
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }

      const nestedCandidates = [
        (metadata as Record<string, unknown>).student,
        (metadata as Record<string, unknown>).student_profile,
        (metadata as Record<string, unknown>).applicant,
        (metadata as Record<string, unknown>).profile,
      ];

      for (const candidate of nestedCandidates) {
        if (candidate && typeof candidate === 'object') {
          const nestedId = (candidate as Record<string, unknown>).id;
          if (typeof nestedId === 'string' && nestedId.trim()) {
            return nestedId;
          }
        }
      }
    }

    if (otherParticipant?.profile?.email) return otherParticipant.profile.email;

    return conversation.id;
  }, [user?.id]);

  const getSortTimestamp = useCallback((conversation: Conversation) => {
    const lastMessageTime = conversation.lastMessage?.created_at
      ? new Date(conversation.lastMessage.created_at).getTime()
      : null;
    const lastUpdated = conversation.updated_at ? new Date(conversation.updated_at).getTime() : null;
    const lastConversationActivity = conversation.last_message_at
      ? new Date(conversation.last_message_at).getTime()
      : null;

    return Math.max(lastMessageTime ?? 0, lastConversationActivity ?? 0, lastUpdated ?? 0);
  }, []);

  const aggregatedConversations = useMemo<AggregatedConversation[]>(() => {
    const groups = new Map<string, { primary: Conversation; related: Conversation[] }>();

    conversations.forEach((conversation) => {
      const identifier = getConversationIdentifier(conversation);
      const existing = groups.get(identifier);

      if (!existing) {
        groups.set(identifier, { primary: conversation, related: [conversation] });
        return;
      }

      existing.related.push(conversation);

      const currentTimestamp = getSortTimestamp(existing.primary);
      const candidateTimestamp = getSortTimestamp(conversation);

      if (candidateTimestamp > currentTimestamp) {
        existing.primary = conversation;
      }
    });

    const merged = Array.from(groups.values()).map(({ primary, related }) => {
      const unreadCount = related.reduce((total, item) => total + (item.unreadCount || 0), 0);

      const latestMessage = related.reduce<Conversation['lastMessage'] | undefined>((latest, item) => {
        if (!item.lastMessage) return latest;
        if (!latest) return item.lastMessage;

        const latestTime = new Date(latest.created_at).getTime();
        const candidateTime = new Date(item.lastMessage.created_at).getTime();

        return candidateTime > latestTime ? item.lastMessage : latest;
      }, primary.lastMessage);

      return {
        ...primary,
        unreadCount,
        lastMessage: latestMessage,
        relatedConversationIds: related.map((item) => item.id),
      };
    });

    return merged.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
  }, [conversations, getConversationIdentifier, getSortTimestamp]);

  const filteredConversations = useMemo(
    () => filterConversations(aggregatedConversations),
    [filterConversations, aggregatedConversations]
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold">Messages</h2>
          {onNewChat && (
            <Button
              variant="ghost"
              size="icon"
                onClick={onNewChat}
                title="New Message"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <MessageSquarePlus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

        {/* Messages List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredConversations.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-muted-foreground">
                <p className="text-sm">No messages yet</p>
              {onNewChat && (
                <Button
                  variant="link"
                  onClick={onNewChat}
                  className="mt-2 text-sm"
                >
                    Start a new message
                </Button>
              )}
            </div>
            ) : (
              filteredConversations.map((conversation) => {
                const name = getConversationDisplayName(conversation, user?.id);
                const avatarUrl = getConversationAvatar(conversation);
                const isActive = currentConversation === conversation.id;
                const metadataSubtitle =
                  conversation.metadata && typeof conversation.metadata === 'object'
                    ? (conversation.metadata as { subtitle?: string }).subtitle
                    : undefined;
                const contactInfo = getConversationContact(conversation, user?.id);
                const presenceDetails = getPresenceDetails(conversation);

                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    className={cn(
                      'w-full p-3 sm:p-4 flex items-start gap-2 sm:gap-3 hover:bg-accent transition-colors text-left',
                      isActive && 'bg-accent'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={avatarUrl || undefined} alt={name} />
                        <AvatarFallback className="text-xs sm:text-sm">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      {presenceDetails && (
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
                            presenceDetails.indicator
                          )}
                          aria-hidden
                          title={presenceDetails.label}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{name}</h3>
                        {conversation.lastMessage && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatMessageTime(conversation.lastMessage.created_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        {(metadataSubtitle || contactInfo) && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            {metadataSubtitle || contactInfo}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm text-muted-foreground truncate flex-1">
                            {getConversationPreview(conversation)}
                          </p>
                          {(conversation.unreadCount || 0) > 0 && (
                            <Badge
                              variant="default"
                              className="flex-shrink-0 rounded-full px-1.5 sm:px-2 min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs"
                            >
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {presenceDetails && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                            {presenceDetails.label}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
        </div>
      </ScrollArea>
    </div>
  );
}

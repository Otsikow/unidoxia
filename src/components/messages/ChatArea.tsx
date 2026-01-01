import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageInput } from './MessageInput';
import type {
  Message,
  TypingIndicator,
  Conversation,
  SendMessagePayload,
  MessageAttachment,
} from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, FileText, AudioLines, Download, Play, Image as ImageIcon, MoreVertical, Trash2, Ban } from 'lucide-react';
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
  onDeleteMessage?: (messageId: string, conversationId: string) => Promise<boolean>;
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
  onDeleteMessage,
}: ChatAreaProps) {
  const { user } = useAuth();

  const messageListRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const [readObserverRef, isReadAnchorVisible] =
    useIntersectionObserver<HTMLDivElement>({
      threshold: 0.35,
    });

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; conversationId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  /* ---------------- Attachment Rendering ---------------- */
  const renderAttachment = (attachment: MessageAttachment, isOwn: boolean) => {
    const baseClasses = cn(
      'rounded-lg overflow-hidden',
      isOwn ? 'bg-primary/20' : 'bg-muted/50'
    );

    if (attachment.type === 'image') {
      return (
        <div key={attachment.id} className={cn(baseClasses, 'max-w-[280px]')}>
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={attachment.preview_url || attachment.url}
              alt={attachment.name || 'Image attachment'}
              className="w-full h-auto max-h-[200px] object-cover rounded-lg hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </a>
          {attachment.name && (
            <div className={cn(
              'px-2 py-1 text-xs truncate',
              isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {attachment.name}
            </div>
          )}
        </div>
      );
    }

    if (attachment.type === 'video') {
      return (
        <div key={attachment.id} className={cn(baseClasses, 'max-w-[320px]')}>
          <video
            className="w-full max-h-[240px] rounded-lg"
            controls
            preload="metadata"
          >
            <source src={attachment.url} type={attachment.mime_type || 'video/mp4'} />
            Your browser does not support video playback.
          </video>
          {attachment.name && (
            <div className={cn(
              'px-2 py-1 text-xs truncate',
              isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {attachment.name}
            </div>
          )}
        </div>
      );
    }

    if (attachment.type === 'audio') {
      return (
        <div
          key={attachment.id}
          className={cn(
            baseClasses,
            'flex flex-col gap-2 p-3 min-w-[200px] max-w-[280px]'
          )}
        >
          <div className={cn(
            'flex items-center gap-2 text-sm font-medium',
            isOwn ? 'text-primary-foreground' : 'text-foreground'
          )}>
            <AudioLines className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{attachment.name || 'Audio message'}</span>
          </div>
          <audio controls className="w-full h-8">
            <source src={attachment.url} type={attachment.mime_type || 'audio/webm'} />
            Your browser does not support audio playback.
          </audio>
          {attachment.size && (
            <div className={cn(
              'text-xs',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {formatFileSize(attachment.size)}
            </div>
          )}
        </div>
      );
    }

    // Default: file attachment (PDF, documents, etc.)
    return (
      <a
        key={attachment.id}
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          baseClasses,
          'flex items-center gap-3 p-3 min-w-[180px] max-w-[280px] hover:opacity-80 transition-opacity cursor-pointer'
        )}
      >
        <div className={cn(
          'flex-shrink-0 p-2 rounded-lg',
          isOwn ? 'bg-primary/30' : 'bg-muted'
        )}>
          <FileText className={cn(
            'h-5 w-5',
            isOwn ? 'text-primary-foreground' : 'text-muted-foreground'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-sm font-medium truncate',
            isOwn ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {attachment.name || 'File attachment'}
          </div>
          <div className={cn(
            'text-xs flex items-center gap-2',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {attachment.size && <span>{formatFileSize(attachment.size)}</span>}
            <Download className="h-3 w-3" />
          </div>
        </div>
      </a>
    );
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

  /* ---------------- Delete Handlers ---------------- */
  const handleDeleteClick = (messageId: string) => {
    if (!conversation?.id) return;
    setMessageToDelete({ id: messageId, conversationId: conversation.id });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete || !onDeleteMessage) return;

    setIsDeleting(true);
    try {
      await onDeleteMessage(messageToDelete.id, messageToDelete.conversationId);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

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
            const isDeleted = !!message.deleted_at;

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
                    'flex gap-3 group',
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

                  {/* Delete menu for own messages (shown before bubble on right side) */}
                  {isOwn && !isDeleted && onDeleteMessage && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(message.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete for everyone
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 max-w-[70%]',
                      isDeleted
                        ? 'bg-muted/50 border border-dashed border-muted-foreground/30'
                        : isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                    )}
                  >
                    {isDeleted ? (
                      /* Deleted message placeholder */
                      <div className="flex items-center gap-2 text-muted-foreground italic">
                        <Ban className="h-4 w-4" />
                        <span>This message was deleted</span>
                      </div>
                    ) : (
                      <>
                        {/* Message Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex flex-col gap-2 mb-2">
                            {message.attachments.map((attachment) =>
                              renderAttachment(attachment, isOwn)
                            )}
                          </div>
                        )}

                        {/* Message Text Content */}
                        {message.content && message.content.trim() && (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </>
                    )}

                    <div
                      className={cn(
                        'mt-1 text-xs flex flex-col',
                        isDeleted
                          ? 'text-muted-foreground'
                          : isOwn
                            ? 'items-end text-primary-foreground/70'
                            : 'text-muted-foreground'
                      )}
                    >
                      <span>
                        {formatMessageTime(message.created_at)}
                      </span>
                      {!isDeleted && receipt && (
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

                  {/* Delete menu for other's messages (shown after bubble on left side) - not applicable, users can only delete their own */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for everyone in this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete for everyone'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

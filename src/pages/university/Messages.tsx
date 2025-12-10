import { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from "react";
import { ChatList } from "@/components/messages/ChatList";
import { ChatArea } from "@/components/messages/ChatArea";
import { MessagingUnavailable } from "@/components/messages/MessagingUnavailable";
import { useMessages, type SendMessagePayload } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  MessageCircle,
  Search,
  Loader2,
  MoreVertical,
  CheckCheck,
  Trash2,
  Sparkles,
} from "lucide-react";
import { withUniversityCardStyles } from "@/components/university/common/cardStyles";
import {
  findDirectoryProfileById,
  searchDirectoryProfiles,
  type DirectoryProfile,
} from "@/lib/messaging/directory";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import { getMessagingContactIds } from "@/lib/messaging/relationships";

const UniversityZoeAssistant = lazy(() =>
  import("@/components/university/UniversityZoeAssistant")
);

const ZoeAssistantLoadingState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
    <Sparkles className="h-6 w-6 animate-pulse text-primary" />
    <div className="space-y-1">
      <p className="text-sm font-semibold">Connecting you with Zoe…</p>
      <p className="text-xs text-muted-foreground">
        Preparing personalized insights for your university conversations.
      </p>
    </div>
  </div>
);

const ZoeAssistantErrorState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
    <Sparkles className="h-6 w-6 text-primary" />
    <div className="space-y-1">
      <p className="text-sm font-semibold text-card-foreground">
        Zoe assistant is temporarily unavailable
      </p>
      <p className="text-xs">
        Messaging and notifications remain available while we restore Zoe's insights.
      </p>
    </div>
  </div>
);

type ContactRecord = DirectoryProfile;

const CONTACT_ROLES = ["agent", "staff", "admin", "partner", "student"];

function UniversityMessagesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    typingUsers,
    loading,
    sendMessage,
    startTyping,
    stopTyping,
    getOrCreateConversation,
    fetchConversations,
    markConversationAsRead,
    removeConversation,
    error,
  } = useMessages();

  const { getUserPresence, isUserOnline } = usePresence();

  const messagingDisabled = Boolean(error);

  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isInitializingAudio, setIsInitializingAudio] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  /* ------------------------------- Audio setup ------------------------------- */
  useEffect(() => {
    if (messagingDisabled) {
      setShowNewChatDialog(false);
      setShowDeleteDialog(false);
    }
  }, [messagingDisabled]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, []);

  const playTone = useCallback(async (frequency: number, duration = 0.28) => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      let ctx = audioContextRef.current;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        setIsInitializingAudio(true);
        await ctx.resume();
        setIsInitializingAudio(false);
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration + 0.05);
    } catch (error) {
      console.warn("Unable to play notification tone", error);
      setIsInitializingAudio(false);
    }
  }, []);

  const playSendSound = useCallback(async () => {
    await playTone(720);
  }, [playTone]);

  const playIncomingSound = useCallback(async () => {
    await playTone(520);
  }, [playTone]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessageIdRef.current === lastMessage.id) return;
    lastMessageIdRef.current = lastMessage.id;
    if (lastMessage.sender_id && lastMessage.sender_id !== user?.id) void playIncomingSound();
  }, [messages, playIncomingSound, user?.id]);

  /* ------------------------------- Conversations ------------------------------- */
  const currentConversationData = useMemo(
    () => conversations.find((conversation) => conversation.id === currentConversation) ?? null,
    [conversations, currentConversation]
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0),
    [conversations]
  );

  const initialsForName = useCallback((name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .map((segment) => segment[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, []);

  /* ------------------------------- Contact search ------------------------------- */
  const messagingProfile = useMemo(() => {
    if (profile?.id) {
      return findDirectoryProfileById(profile.id) ?? null;
    }
    if (user?.id) {
      return findDirectoryProfileById(user.id) ?? null;
    }
    return null;
  }, [profile?.id, user?.id]);

  const allowedProfileIds = useMemo(() => {
    if (!messagingProfile) return undefined;
    const ids = getMessagingContactIds(messagingProfile);
    return ids.length > 0 ? new Set(ids) : undefined;
  }, [messagingProfile]);

  const searchContacts = useCallback(
    async (queryText: string) => {
      setIsSearchingContacts(true);
      try {
        const tenant = profile?.tenant_id ?? DEFAULT_TENANT_ID;
        const excludeIds = [user?.id, profile?.id].filter(Boolean) as string[];
        // Don't pass allowedProfileIds to let the database function handle permissions
        const results = await searchDirectoryProfiles(queryText, {
          tenantId: tenant,
          roles: CONTACT_ROLES as DirectoryProfile["role"][],
          excludeIds,
          limit: 40,
        });
        setContacts(results);
      } catch (error) {
        console.error("Error searching contacts", error);
        toast({
          title: "Unable to search contacts",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsSearchingContacts(false);
      }
    },
    [profile?.id, profile?.tenant_id, toast, user?.id]
  );

  useEffect(() => {
    if (showNewChatDialog) void searchContacts("");
    else {
      setSearchQuery("");
      setContacts([]);
    }
  }, [searchContacts, showNewChatDialog]);

  useEffect(() => {
    if (!showNewChatDialog) return;

    const timeout = window.setTimeout(() => {
      void searchContacts(searchQuery);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchContacts, searchQuery, showNewChatDialog]);

  /* ------------------------------- Messaging handlers ------------------------------- */
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setCurrentConversation(conversationId);
    },
    [setCurrentConversation]
  );

  const handleSendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      if (!currentConversation) return;
      await sendMessage(currentConversation, payload);
      void playSendSound();
    },
    [currentConversation, playSendSound, sendMessage]
  );

  const handleStartTyping = useCallback(() => {
    if (currentConversation) void startTyping(currentConversation);
  }, [currentConversation, startTyping]);

  const handleStopTyping = useCallback(() => {
    if (currentConversation) void stopTyping(currentConversation);
  }, [currentConversation, stopTyping]);

  const handleNewChat = useCallback(() => {
    setShowNewChatDialog(true);
  }, []);

  const handleSelectContact = useCallback(
    async (contact: ContactRecord) => {
      const conversationId = await getOrCreateConversation(contact.id);
      if (conversationId) {
        setCurrentConversation(conversationId);
        setShowNewChatDialog(false);
        setSearchQuery("");
      }
    },
    [getOrCreateConversation, setCurrentConversation]
  );

  const handleMarkAsRead = useCallback(async () => {
    if (!currentConversation) {
      toast({ title: "No conversation selected", description: "Choose a conversation first." });
      return;
    }
    try {
      await markConversationAsRead(currentConversation);
      toast({
        title: "Conversation marked as read",
        description: "All messages are now marked as read for you.",
      });
    } catch (error) {
      console.error("Error marking conversation as read", error);
      toast({
        title: "Unable to mark as read",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  }, [currentConversation, markConversationAsRead, toast]);

  const handleDeleteConversation = useCallback(async () => {
    if (!currentConversation) {
      toast({
        title: "No conversation selected",
        description: "Choose a conversation first.",
      });
      return;
    }
    try {
      await removeConversation(currentConversation);
      setCurrentConversation(null);
      toast({
        title: "Conversation removed",
        description: "The conversation has been removed from your inbox.",
      });
    } catch (error) {
      console.error("Error deleting conversation", error);
      toast({
        title: "Unable to delete conversation",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  }, [currentConversation, removeConversation, setCurrentConversation, toast]);

  /* ------------------------------- UI Layout ------------------------------- */
  const panelHeightClasses =
    "min-h-[65vh] md:min-h-[72vh] xl:h-[calc(100vh-16rem)] xl:min-h-[640px]";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6">
      <header
        className={withUniversityCardStyles(
          "flex flex-col gap-4 rounded-3xl px-6 py-6 text-card-foreground shadow-[0_28px_72px_-36px_rgba(37,99,235,0.5)] md:flex-row md:items-center md:justify-between"
        )}
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            University Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Coordinate with agents and UniDoxia staff to keep your applicants on track.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleNewChat}
            size="sm"
            className="gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg hover:bg-primary/90"
            disabled={messagingDisabled}
          >
            <MessageCircle className="h-4 w-4" />
            New Message
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-border bg-muted/50 text-primary-foreground hover:bg-muted"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("zoe:open-chat", {
                  detail: { prompt: "Help me with my university conversations." },
                })
              )
            }
          >
            <Sparkles className="h-4 w-4" />
            Ask Zoe
          </Button>

          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="rounded-full px-3 py-1 text-xs font-semibold"
            >
              {totalUnread} unread
            </Badge>
          )}

          {!messagingDisabled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full border-border">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Conversation actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => void handleMarkAsRead()}
                  disabled={!currentConversation}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark as Read
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={!currentConversation}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {messagingDisabled ? (
        <section
          className={withUniversityCardStyles(
            "flex flex-1 overflow-hidden rounded-3xl text-card-foreground"
          )}
        >
          <MessagingUnavailable
            reason={error ?? "Messaging is currently unavailable."}
            redirectHref="/university"
            redirectLabel="Return to dashboard"
          />
        </section>
      ) : (
        <>
          <div
            className="grid flex-1 grid-cols-1 gap-4 lg:gap-6 md:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_420px]"
          >
            <section
              className={withUniversityCardStyles(
                "flex w-full flex-col overflow-hidden rounded-3xl text-card-foreground md:w-full lg:w-full xl:w-auto",
                panelHeightClasses
              )}
            >
              <ChatList
                conversations={conversations}
                currentConversation={currentConversation}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                getUserPresence={getUserPresence}
                isUserOnline={isUserOnline}
              />
            </section>

            <section
              className={withUniversityCardStyles(
                "hidden min-w-0 flex-1 overflow-hidden rounded-3xl text-card-foreground md:flex",
                panelHeightClasses
              )}
            >
              <ChatArea
                conversation={currentConversationData}
                messages={messages}
                typingUsers={typingUsers}
                loading={loading}
                onSendMessage={handleSendMessage}
                onStartTyping={handleStartTyping}
                onStopTyping={handleStopTyping}
                getUserPresence={getUserPresence}
                isUserOnline={isUserOnline}
                onBack={() => setCurrentConversation(null)}
              />
            </section>

            <section
              className={withUniversityCardStyles(
                "hidden min-w-0 w-full overflow-hidden rounded-3xl text-card-foreground xl:flex",
                panelHeightClasses
              )}
            >
              <ErrorBoundary fallback={<ZoeAssistantErrorState />}>
                <Suspense fallback={<ZoeAssistantLoadingState />}>
                  <UniversityZoeAssistant />
                </Suspense>
              </ErrorBoundary>
            </section>
          </div>

          {currentConversation && (
            <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-background">
              <ChatArea
                conversation={currentConversationData}
                messages={messages}
                typingUsers={typingUsers}
                loading={loading}
                onSendMessage={handleSendMessage}
                onStartTyping={handleStartTyping}
                onStopTyping={handleStopTyping}
                getUserPresence={getUserPresence}
                isUserOnline={isUserOnline}
                onBack={() => setCurrentConversation(null)}
                showBackButton
              />
            </div>
          )}

          {/* New chat dialog */}
          <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Start a new conversation</DialogTitle>
                <DialogDescription>
                  Search for agents or UniDoxia team members to begin a new chat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email"
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchContacts(searchQuery);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => void searchContacts(searchQuery)}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    disabled={isSearchingContacts}
                  >
                    {isSearchingContacts ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>

                <ScrollArea className="h-96">
                  {contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 opacity-30" />
                      <div className="space-y-1">
                        <p className="font-medium">No contacts found</p>
                        <p className="text-xs">Try searching by name or email</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => void handleSelectContact(contact)}
                          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                        >
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={contact.avatar_url || undefined} />
                            <AvatarFallback>{initialsForName(contact.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{contact.full_name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {contact.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {contact.role}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete confirmation dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the conversation from your inbox. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleDeleteConversation()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {isInitializingAudio && (
        <div className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-lg">
          Preparing audio…
        </div>
      )}
    </div>
  );
}

export default UniversityMessagesPage;

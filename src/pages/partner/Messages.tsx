import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { PartnerHeader } from "@/components/partner/PartnerHeader";
import { ChatList } from "@/components/messages/ChatList";
import { ChatArea } from "@/components/messages/ChatArea";
import { MessagingUnavailable } from "@/components/messages/MessagingUnavailable";
import { useAgentMessages } from "@/hooks/useAgentMessages";
import { usePresence } from "@/hooks/usePresence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2, Sparkles, MessageCircle } from "lucide-react";
import PartnerZoeAssistant from "@/components/partner/PartnerZoeAssistant";
import type { SendMessagePayload } from "@/hooks/useMessages";

interface ConversationOption {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
}

export default function PartnerMessagesPage() {
  const {
    enabled,
    error,
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    typingUsers,
    loading,
    sendMessage,
    startTyping,
    stopTyping,
  } = useAgentMessages();

  const { getUserPresence, isUserOnline } = usePresence();

  const [showComposer, setShowComposer] = useState(false);
  const [composerSearch, setComposerSearch] = useState("");
  const [isInitializingAudio, setIsInitializingAudio] = useState(false);
  const messagingDisabled = Boolean(error);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (messagingDisabled) {
      setShowComposer(false);
    }
  }, [messagingDisabled]);

  const playSendSound = useCallback(async () => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      let ctx = audioContextRef.current;
      if (!ctx) {
        ctx = new AudioCtx();
        audioContextRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        setIsInitializingAudio(true);
        await ctx.resume();
        setIsInitializingAudio(false);
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(720, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.warn("Unable to play send sound", error);
      setIsInitializingAudio(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (!currentConversation || messagingDisabled) return;
      sendMessage(currentConversation, payload);
      void playSendSound();
    },
    [currentConversation, messagingDisabled, playSendSound, sendMessage]
  );

  const handleStartTyping = useCallback(() => {
    if (messagingDisabled) return;
    startTyping(currentConversation ?? undefined);
  }, [currentConversation, messagingDisabled, startTyping]);

  const handleStopTyping = useCallback(() => {
    if (messagingDisabled) return;
    stopTyping(currentConversation ?? undefined);
  }, [currentConversation, messagingDisabled, stopTyping]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0),
    [conversations]
  );

  const currentConversationData = useMemo(
    () => conversations.find((conversation) => conversation.id === currentConversation) ?? null,
    [conversations, currentConversation]
  );

  const conversationOptions = useMemo<ConversationOption[]>(() => {
    return conversations.map((conversation) => {
      let subtitle: string | undefined;
      if (conversation.metadata && typeof conversation.metadata === "object") {
        const metadataSubtitle = (conversation.metadata as { subtitle?: string }).subtitle;
        subtitle = metadataSubtitle ?? undefined;
      }
      return {
        id: conversation.id,
        name: conversation.name ?? "Conversation",
        subtitle,
        avatarUrl: conversation.avatar_url ?? null,
      };
    });
  }, [conversations]);

  const filteredOptions = useMemo(() => {
    const search = composerSearch.trim().toLowerCase();
    if (!search) return conversationOptions;
    return conversationOptions.filter((option) => {
      const haystack = `${option.name} ${option.subtitle ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [composerSearch, conversationOptions]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setCurrentConversation(conversationId);
      setShowComposer(false);
      setComposerSearch("");
    },
    [setCurrentConversation]
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

  const isMessagingEnabled =
    enabled && !messagingDisabled && (conversations.length > 0 || !loading);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <PartnerSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <PartnerHeader />
          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white/80 transition-colors dark:border-slate-900/70 dark:bg-slate-950/60">
              <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 transition-colors dark:text-slate-100 md:text-3xl">
                    Partner Messages
                  </h1>
                  <p className="text-sm text-slate-600 transition-colors dark:text-slate-400">
                    Coordinate with students and universities across your pipeline.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setShowComposer(true)}
                    size="sm"
                    className="gap-2 rounded-full bg-blue-600 px-4 py-2 text-blue-50 shadow-lg hover:bg-blue-500"
                    disabled={messagingDisabled}
                  >
                    <MessageCircle className="h-4 w-4" />
                    New Message
                  </Button>
                  {totalUnread > 0 && (
                    <Badge
                      variant="destructive"
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {totalUnread} unread
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-blue-200/70 bg-blue-50/80 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-900/60"
                    onClick={() => setShowComposer(true)}
                    disabled={messagingDisabled}
                  >
                    <Sparkles className="h-4 w-4" />
                    Quick Switch
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {messagingDisabled ? (
                <MessagingUnavailable
                  reason={error ?? "Messaging is currently unavailable."}
                  redirectHref="/partner"
                  redirectLabel="Return to partner home"
                />
              ) : (
                <>
                  {/* Chat List - hidden on mobile when a conversation is selected */}
                  <div
                    className={`w-full border-r border-slate-200/70 bg-white/80 transition-colors dark:border-slate-900/70 dark:bg-slate-950/60 md:w-[320px] lg:w-[360px] xl:w-[400px] ${
                      currentConversation ? "hidden md:block" : "block"
                    }`}
                  >
                    <ChatList
                      conversations={conversations}
                      currentConversation={currentConversation}
                      onSelectConversation={handleSelectConversation}
                      onNewChat={() => setShowComposer(true)}
                      getUserPresence={getUserPresence}
                      isUserOnline={isUserOnline}
                    />
                  </div>

                  {/* Chat Area - visible on mobile when conversation is selected, always visible on desktop */}
                  <div
                    className={`flex-1 bg-slate-100/70 transition-colors dark:bg-slate-900/50 ${
                      currentConversation ? "flex" : "hidden md:flex"
                    }`}
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
                      showBackButton={Boolean(currentConversation)}
                    />
                  </div>

                  <div className="hidden w-full max-w-xl border-l border-slate-200/70 bg-slate-100/60 transition-colors dark:border-slate-900/70 dark:bg-slate-950/40 xl:flex">
                    <PartnerZoeAssistant />
                  </div>
                </>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>

      {!messagingDisabled && (
        <Dialog
          open={showComposer}
          onOpenChange={(open) => {
            setShowComposer(open);
            if (!open) setComposerSearch("");
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Start a conversation</DialogTitle>
              <DialogDescription>
                Select a student or university thread to jump into the conversation.
              </DialogDescription>
            </DialogHeader>

            {!isMessagingEnabled ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm">Loading your messaging workspace…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={composerSearch}
                    onChange={(event) => setComposerSearch(event.target.value)}
                    placeholder="Search students, universities, or programs…"
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[420px]">
                  {filteredOptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-500 dark:text-slate-400">
                      <p className="text-sm font-medium">No matching threads found</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Try a different search query or create a new application to begin messaging.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleSelectConversation(option.id)}
                          className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-100/80 p-3 text-left transition hover:border-blue-200/70 hover:bg-white dark:bg-slate-950/80 dark:hover:border-blue-900/60 dark:hover:bg-slate-900/80"
                        >
                          <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-800/70">
                            {option.avatarUrl ? (
                              <AvatarImage src={option.avatarUrl} alt={option.name} />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                {initialsForName(option.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {option.name}
                            </p>
                            {option.subtitle && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {option.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {isInitializingAudio && (
        <div className="fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-blue-50 shadow-lg">
          Preparing audio…
        </div>
      )}
    </SidebarProvider>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { ChatList } from "./ChatList";
import { ChatArea } from "./ChatArea";
import { MessagingUnavailable } from "./MessagingUnavailable";
import {
  useMessages,
  type SendMessagePayload,
  type Conversation,
} from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { searchDirectoryProfiles, type DirectoryProfile } from "@/lib/messaging/directory";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";

interface Contact {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  headline?: string | null;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function MessagesDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { getUserPresence, isUserOnline } = usePresence();

  const {
    conversations,
    currentConversation: currentConversationId,
    setCurrentConversation,
    messages,
    typingUsers,
    loading,
    error,
    sendMessage,
    startTyping,
    stopTyping,
    getOrCreateConversation,
  } = useMessages();

  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const currentConversation = useMemo(
    () =>
      conversations.find((conv) => conv.id === currentConversationId) ?? null,
    [conversations, currentConversationId]
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
    [conversations]
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setCurrentConversation(conversationId);
    },
    [setCurrentConversation]
  );

  const handleSendMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (!currentConversationId) return;
      sendMessage(currentConversationId, payload);
    },
    [currentConversationId, sendMessage]
  );

  const handleStartTyping = useCallback(() => {
    if (!currentConversationId) return;
    startTyping(currentConversationId);
  }, [currentConversationId, startTyping]);

  const handleStopTyping = useCallback(() => {
    if (!currentConversationId) return;
    stopTyping(currentConversationId);
  }, [currentConversationId, stopTyping]);

  const handleBack = useCallback(() => {
    setCurrentConversation(null);
  }, [setCurrentConversation]);

  const fetchContacts = useCallback(
    async (query: string) => {
      setLoadingContacts(true);
      try {
        const tenant = profile?.tenant_id ?? DEFAULT_TENANT_ID;
        const results = await searchDirectoryProfiles(query, {
          tenantId: tenant,
          excludeIds: profile?.id ? [profile.id] : [],
          roles: ["agent", "staff", "admin", "partner", "counselor"] as DirectoryProfile["role"][],
          limit: 40,
        });
        const mapped: Contact[] = results.map((record) => ({
          profile_id: record.id,
          full_name: record.full_name,
          email: record.email,
          avatar_url: record.avatar_url,
          role: record.role,
          headline: record.headline,
        }));
        setContacts(mapped);
      } catch (err) {
        console.error("Error fetching contacts:", err);
        toast({
          title: "Error",
          description: "Failed to load contacts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingContacts(false);
      }
    },
    [profile?.id, profile?.tenant_id, toast]
  );

  const handleNewChatDialogChange = useCallback(
    (open: boolean) => {
      setShowNewChatDialog(open);
      if (open) {
        void fetchContacts("");
      } else {
        setSearchQuery("");
        setContacts([]);
      }
    },
    [fetchContacts]
  );

  const handleNewChat = useCallback(() => {
    handleNewChatDialogChange(true);
  }, [handleNewChatDialogChange]);

  const handleSelectContact = useCallback(
    async (contact: Contact) => {
      const conversationId = await getOrCreateConversation(contact.profile_id);
      if (conversationId) {
        setCurrentConversation(conversationId);
        setShowNewChatDialog(false);
        setSearchQuery("");
        setContacts([]);
      }
    },
    [getOrCreateConversation, setCurrentConversation]
  );

  const getContactBadge = (contact: Contact) => {
    switch (contact.role) {
      case "admin":
        return { label: "Admin", variant: "destructive" as const };
      case "staff":
        return { label: "Staff", variant: "secondary" as const };
      case "agent":
        return { label: "Agent", variant: "default" as const };
      case "partner":
        return { label: "University", variant: "outline" as const };
      case "counselor":
        return { label: "Counselor", variant: "secondary" as const };
      default:
        return { label: contact.role, variant: "outline" as const };
    }
  };

  if (error) {
    return (
      <MessagingUnavailable
        reason={error}
        redirectHref="/student/dashboard"
        redirectLabel="Return to dashboard"
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Messages
          </h2>
          <p className="text-sm text-muted-foreground">
            Chat with your agents, UniDoxia staff, or universities
          </p>
        </div>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="px-3 py-1">
            {totalUnread} unread
          </Badge>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        {/* Chat list */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
          <div className="h-full overflow-hidden rounded-lg border bg-card shadow-sm">
            <ChatList
              conversations={conversations}
              currentConversation={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              getUserPresence={getUserPresence}
              isUserOnline={isUserOnline}
            />
          </div>
        </div>

        {/* Chat area - hidden on mobile when no conversation selected */}
        <div className="hidden md:flex flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
          <ChatArea
            conversation={currentConversation}
            messages={messages}
            typingUsers={typingUsers}
            loading={loading}
            onSendMessage={handleSendMessage}
            onStartTyping={handleStartTyping}
            onStopTyping={handleStopTyping}
            getUserPresence={getUserPresence}
            isUserOnline={isUserOnline}
            onBack={handleBack}
          />
        </div>

        {/* Mobile fullscreen chat when conversation is selected */}
        {currentConversationId && (
          <div className="md:hidden fixed inset-0 z-50 bg-background">
            <ChatArea
              conversation={currentConversation}
              messages={messages}
              typingUsers={typingUsers}
              loading={loading}
              onSendMessage={handleSendMessage}
              onStartTyping={handleStartTyping}
              onStopTyping={handleStopTyping}
              getUserPresence={getUserPresence}
              isUserOnline={isUserOnline}
              onBack={handleBack}
              showBackButton
            />
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={handleNewChatDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>
              Message your agent, UniDoxia staff, or university representatives.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void fetchContacts(searchQuery);
                  }
                }}
                className="pl-9"
              />
              <Button
                onClick={() => void fetchContacts(searchQuery)}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                size="sm"
                disabled={loadingContacts}
              >
                {loadingContacts ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            <ScrollArea className="h-80">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">
                    {searchQuery
                      ? "No contacts found matching your search"
                      : "Search for agents, staff, or university contacts"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => {
                    const badge = getContactBadge(contact);
                    return (
                      <button
                        key={contact.profile_id}
                        onClick={() => void handleSelectContact(contact)}
                        className="w-full rounded-lg p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={contact.avatar_url || undefined}
                              alt={contact.full_name}
                            />
                            <AvatarFallback>
                              {getInitials(contact.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {contact.full_name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.headline || contact.email}
                            </p>
                          </div>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

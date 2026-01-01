"use client";

import { useCallback, useMemo, useState, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import BackButton from "@/components/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatList } from "@/components/messages/ChatList";
import { ChatArea } from "@/components/messages/ChatArea";
import { MessagingUnavailable } from "@/components/messages/MessagingUnavailable";
import {
  useMessages,
  type SendMessagePayload,
  type Conversation,
  type Message as ChatMessage,
  type TypingIndicator,
} from "@/hooks/useMessages";
import { useAgentMessages } from "@/hooks/useAgentMessages";
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
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AIChatbot from "@/components/ai/AIChatbot";
import { Skeleton } from "@/components/ui/skeleton";
import StaffMessagesTable from "@/components/staff/StaffMessagesTable";
import MessagesDashboard from "@/components/messages/MessagesDashboard";
import {
  findDirectoryProfileById,
  searchDirectoryProfiles,
  type DirectoryProfile,
} from "@/lib/messaging/directory";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import { getMessagingContactIds } from "@/lib/messaging/relationships";

type TabValue = "zoe" | "partners" | "staff" | "insights";

interface AgentContact {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  contact_type: "student" | "staff";
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function StaffMessages() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const partnerMessaging = useAgentMessages();
  const staffMessaging = useMessages();
  const { getUserPresence, isUserOnline } = usePresence();

  const {
    enabled: partnerEnabled,
    conversations: partnerConversations,
    currentConversation: partnerCurrentConversationId,
    setCurrentConversation: setPartnerCurrentConversation,
    messages: partnerMessages,
    typingUsers: partnerTypingUsers,
    loading: partnerLoading,
    sendMessage: sendPartnerMessage,
    startTyping: startPartnerTyping,
    stopTyping: stopPartnerTyping,
    markConversationAsRead: markPartnerConversationAsRead,
    deleteMessage: deletePartnerMessage,
    error: partnerError,
  } = partnerMessaging;

  const {
    conversations: staffConversations,
    currentConversation: staffCurrentConversationId,
    setCurrentConversation: setStaffCurrentConversation,
    messages: staffMessages,
    typingUsers: staffTypingUsers,
    loading: staffLoading,
    sendMessage: sendStaffMessage,
    startTyping: startStaffTyping,
    stopTyping: stopStaffStopTyping,
    getOrCreateConversation: getStaffConversation,
    markConversationAsRead: markStaffConversationAsRead,
    deleteMessage: deleteStaffMessage,
    error: staffError,
  } = staffMessaging;

  const messagingError = staffError ?? partnerError;

  const [activeTab, setActiveTab] = useState<TabValue>(
    partnerEnabled ? "partners" : "staff"
  );
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<AgentContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const canStartInternalChat =
    profile?.role === "staff" || profile?.role === "admin";

  const isAgent = profile?.role === "agent";

  const messagingProfile = useMemo(() => {
    if (profile?.id) {
      return findDirectoryProfileById(profile.id) ?? null;
    }
    return null;
  }, [profile?.id]);

  const allowedProfileIds = useMemo(() => {
    if (!messagingProfile) return undefined;
    const ids = getMessagingContactIds(messagingProfile);
    return ids.length > 0 ? new Set(ids) : undefined;
  }, [messagingProfile]);

  const partnerCurrentConversation = useMemo(
    () =>
      partnerConversations.find(
        (conversation) => conversation.id === partnerCurrentConversationId
      ) ?? null,
    [partnerConversations, partnerCurrentConversationId]
  );

  const staffCurrentConversation = useMemo(
    () =>
      staffConversations.find(
        (conversation) => conversation.id === staffCurrentConversationId
      ) ?? null,
    [staffConversations, staffCurrentConversationId]
  );

  const totalUnread = useMemo(
    () =>
      partnerConversations.reduce(
        (sum, conversation) => sum + (conversation.unreadCount || 0),
        0
      ) +
      staffConversations.reduce(
        (sum, conversation) => sum + (conversation.unreadCount || 0),
        0
      ),
    [partnerConversations, staffConversations]
  );

  const handlePartnerSelectConversation = useCallback(
    (conversationId: string) => {
      setPartnerCurrentConversation(conversationId);
      setActiveTab("partners");
    },
    [setActiveTab, setPartnerCurrentConversation]
  );

  const handleStaffSelectConversation = useCallback(
    (conversationId: string) => {
      setStaffCurrentConversation(conversationId);
      setActiveTab("staff");
    },
    [setActiveTab, setStaffCurrentConversation]
  );

  const handlePartnerSendMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (!partnerEnabled || !partnerCurrentConversationId) return;
      sendPartnerMessage(partnerCurrentConversationId, payload);
    },
    [partnerCurrentConversationId, partnerEnabled, sendPartnerMessage]
  );

  const handleStaffSendMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (!staffCurrentConversationId) return;
      sendStaffMessage(staffCurrentConversationId, payload);
    },
    [sendStaffMessage, staffCurrentConversationId]
  );

  const handlePartnerStartTyping = useCallback(() => {
    if (!partnerEnabled || !partnerCurrentConversationId) return;
    startPartnerTyping(partnerCurrentConversationId);
  }, [partnerCurrentConversationId, partnerEnabled, startPartnerTyping]);

  const handlePartnerStopTyping = useCallback(() => {
    if (!partnerEnabled || !partnerCurrentConversationId) return;
    stopPartnerTyping(partnerCurrentConversationId);
  }, [partnerCurrentConversationId, partnerEnabled, stopPartnerTyping]);

  const handlePartnerMarkRead = useCallback(() => {
    if (!partnerEnabled || !partnerCurrentConversationId) return;
    markPartnerConversationAsRead(partnerCurrentConversationId);
  }, [markPartnerConversationAsRead, partnerCurrentConversationId, partnerEnabled]);

  const handleStaffStartTyping = useCallback(() => {
    if (!staffCurrentConversationId) return;
    startStaffTyping(staffCurrentConversationId);
  }, [staffCurrentConversationId, startStaffTyping]);

  const handleStaffStopTyping = useCallback(() => {
    if (!staffCurrentConversationId) return;
    stopStaffStopTyping(staffCurrentConversationId);
  }, [staffCurrentConversationId, stopStaffStopTyping]);

  const handleStaffMarkRead = useCallback(() => {
    if (!staffCurrentConversationId) return;
    markStaffConversationAsRead(staffCurrentConversationId);
  }, [markStaffConversationAsRead, staffCurrentConversationId]);

  const handlePartnerBack = useCallback(() => {
    setPartnerCurrentConversation(null);
  }, [setPartnerCurrentConversation]);

  const handleStaffBack = useCallback(() => {
    setStaffCurrentConversation(null);
  }, [setStaffCurrentConversation]);

  const fetchContacts = useCallback(
    async (query: string) => {
      if (!canStartInternalChat) return;
      setLoadingContacts(true);
      try {
        const tenant = profile?.tenant_id ?? DEFAULT_TENANT_ID;
        // Don't pass allowedProfileIds to let the database function handle permissions
        const results = await searchDirectoryProfiles(query, {
          tenantId: tenant,
          excludeIds: [profile?.id].filter(Boolean) as string[],
          roles: [
            "student",
            "agent",
            "partner",
            "staff",
            "admin",
            "counselor",
            "school_rep",
          ] as DirectoryProfile["role"][],
          limit: 40,
        });
        const mapped: AgentContact[] = results.map((record) => ({
          profile_id: record.id,
          full_name: record.full_name,
          email: record.email,
          avatar_url: record.avatar_url,
          role: record.role,
          contact_type: record.role === "student" ? "student" : "staff",
        }));
        setContacts(mapped);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast({
          title: "Error",
          description: "Failed to load contacts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingContacts(false);
      }
    },
    [canStartInternalChat, profile?.id, profile?.tenant_id, toast]
  );

  const handleNewChatDialogChange = useCallback(
    (open: boolean) => {
      setShowNewChatDialog(open);
      if (open) {
        setActiveTab("staff");
        void fetchContacts("");
      } else {
        setSearchQuery("");
      }
    },
    [fetchContacts]
  );

  const handleNewChat = useCallback(() => {
    if (!canStartInternalChat) return;
    handleNewChatDialogChange(true);
  }, [canStartInternalChat, handleNewChatDialogChange]);

  const handleSelectContact = useCallback(
    async (contact: AgentContact) => {
      const conversationId = await getStaffConversation(contact.profile_id);
      if (conversationId) {
        setStaffCurrentConversation(conversationId);
        setActiveTab("staff");
        setShowNewChatDialog(false);
        setSearchQuery("");
      }
    },
    [getStaffConversation, setStaffCurrentConversation]
  );

  const getContactBadge = (contact: AgentContact) => {
    if (contact.contact_type === "student") {
      return { label: "Student", variant: "outline" as const };
    }
    if (contact.role === "admin") {
      return { label: "Admin", variant: "destructive" as const };
    }
    return { label: "Staff", variant: "secondary" as const };
  };

  const renderChatWorkspace = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onSendMessage,
    onStartTyping,
    onStopTyping,
    messages,
    typingUsers,
    loading,
    currentConversationData,
    onBack,
    enableNewChat = false,
    onNewChat,
    onMarkConversationRead,
    onDeleteMessage,
  }: {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (conversationId: string) => void;
    onSendMessage: (payload: SendMessagePayload) => void;
    onStartTyping: () => void;
    onStopTyping: () => void;
    messages: ChatMessage[];
    typingUsers: TypingIndicator[];
    loading: boolean;
    currentConversationData: Conversation | null;
    onBack: () => void;
    enableNewChat?: boolean;
    onNewChat?: () => void;
    onMarkConversationRead?: () => void;
    onDeleteMessage?: (messageId: string, conversationId: string) => Promise<boolean>;
  }) => (
    <div className="flex h-full w-full gap-4">
      <div className="w-full max-w-full md:w-80 lg:w-96 xl:w-[420px] flex-shrink-0">
        <div className="h-full overflow-hidden rounded-lg border bg-card shadow-sm">
          <ChatList
            conversations={conversations}
            currentConversation={currentConversationId}
            onSelectConversation={onSelectConversation}
            onNewChat={enableNewChat ? onNewChat : undefined}
            getUserPresence={getUserPresence}
            isUserOnline={isUserOnline}
          />
        </div>
      </div>
      <div className="hidden md:flex flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
        <ChatArea
          conversation={currentConversationData}
          messages={messages}
          typingUsers={typingUsers}
          loading={loading}
          onSendMessage={onSendMessage}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
          getUserPresence={getUserPresence}
          isUserOnline={isUserOnline}
          onBack={onBack}
          onMarkConversationRead={onMarkConversationRead}
          onDeleteMessage={onDeleteMessage}
        />
      </div>
      {currentConversationId && (
        <div className="md:hidden fixed inset-0 z-50 bg-background">
          <ChatArea
            conversation={currentConversationData}
            messages={messages}
            typingUsers={typingUsers}
            loading={loading}
            onSendMessage={onSendMessage}
            onStartTyping={onStartTyping}
            onStopTyping={onStopTyping}
            getUserPresence={getUserPresence}
            isUserOnline={isUserOnline}
            onBack={onBack}
            showBackButton
            onMarkConversationRead={onMarkConversationRead}
            onDeleteMessage={onDeleteMessage}
          />
        </div>
      )}
    </div>
  );

  if (messagingError) {
    return (
      <DashboardLayout showToolbarBackButton={false}>
        <div className="space-y-4">
          <BackButton variant="ghost" />
          <MessagingUnavailable
            reason={messagingError}
            redirectHref="/dashboard"
            redirectLabel="Return to dashboard"
          />
        </div>
      </DashboardLayout>
    );
  }

  // Agents use application-linked messaging threads (student/agent/university).
  if (isAgent) {
    return (
      <DashboardLayout showToolbarBackButton={false}>
        <div className="space-y-4">
          <BackButton variant="ghost" size="sm" fallback="/dashboard" />
          <MessagesDashboard />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
        <div className="border-b bg-background px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BackButton variant="ghost" size="sm" fallback="/dashboard" />
              <div>
                <h1 className="text-2xl font-bold">Messaging & Insights</h1>
                <p className="text-sm text-muted-foreground">
                  Chat with partners, staff, or Zoe AI — and view insights.
                </p>
              </div>
            </div>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="px-3 py-1 text-sm">
                {totalUnread} unread
              </Badge>
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          className="flex-1 overflow-hidden"
        >
          <div className="px-4 pt-3 pb-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="zoe">Zoe AI Chat</TabsTrigger>
              <TabsTrigger value="partners">Partner Chats</TabsTrigger>
              <TabsTrigger value="staff">Internal Chats</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="zoe" className="flex-1 px-4 pb-4">
            <div className="h-full overflow-hidden rounded-lg border bg-card shadow-sm">
              <AIChatbot />
            </div>
          </TabsContent>

          <TabsContent value="partners" className="flex-1 px-4 pb-4">
            {partnerEnabled ? (
              renderChatWorkspace({
                conversations: partnerConversations,
                currentConversationId: partnerCurrentConversationId,
                onSelectConversation: handlePartnerSelectConversation,
                onSendMessage: handlePartnerSendMessage,
                onStartTyping: handlePartnerStartTyping,
                onStopTyping: handlePartnerStopTyping,
                onMarkConversationRead: handlePartnerMarkRead,
                onDeleteMessage: deletePartnerMessage,
                messages: partnerMessages,
                typingUsers: partnerTypingUsers,
                loading: partnerLoading,
                currentConversationData: partnerCurrentConversation,
                onBack: handlePartnerBack,
              })
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-center">
                <div className="max-w-sm space-y-2 px-6 py-8">
                  <h3 className="text-lg font-semibold">
                    Partner messaging unavailable
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Partner chats are only available for agent or partner
                    accounts.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="staff" className="flex-1 px-4 pb-4">
            {renderChatWorkspace({
              conversations: staffConversations,
              currentConversationId: staffCurrentConversationId,
              onSelectConversation: handleStaffSelectConversation,
              onSendMessage: handleStaffSendMessage,
              onStartTyping: handleStaffStartTyping,
              onStopTyping: handleStaffStopTyping,
              onMarkConversationRead: handleStaffMarkRead,
              onDeleteMessage: deleteStaffMessage,
              messages: staffMessages,
              typingUsers: staffTypingUsers,
              loading: staffLoading,
              currentConversationData: staffCurrentConversation,
              onBack: handleStaffBack,
              enableNewChat: canStartInternalChat,
              onNewChat: canStartInternalChat ? handleNewChat : undefined,
            })}

            {canStartInternalChat && (
              <Dialog open={showNewChatDialog} onOpenChange={handleNewChatDialogChange}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Start a new chat</DialogTitle>
                    <DialogDescription>
                      Message teammates across departments.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
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

                    <ScrollArea className="h-96">
                      {contacts.length === 0 && !loadingContacts ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <p>No contacts found</p>
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
                                      {contact.email}
                                    </p>
                                  </div>
                                  <Badge variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
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
            )}
          </TabsContent>

          <TabsContent value="insights" className="flex-1 px-4 pb-4">
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
              <StaffMessagesTable />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

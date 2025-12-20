"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Search, Loader2, MessageSquare, Building2, GraduationCap, HeadphonesIcon, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { searchDirectoryProfiles, type DirectoryProfile } from "@/lib/messaging/directory";
import { fetchAppliedUniversityContacts, fetchUniversityApplicants, fetchSupportContacts, type AppliedUniversityContact, type UniversityApplicantContact, type SupportContact } from "@/lib/messaging/contactsService";
import { DEFAULT_TENANT_ID } from "@/lib/messaging/data";
import { cn } from "@/lib/utils";

// Role-based dashboard redirects
const roleRedirects: Record<string, string> = {
  admin: "/admin/dashboard",
  staff: "/dashboard/tasks",
  partner: "/university/overview",
  agent: "/dashboard/leads",
  counselor: "/dashboard/tasks",
  verifier: "/dashboard/tasks",
  finance: "/dashboard/payments",
  school_rep: "/dashboard/tasks",
  student: "/student/dashboard",
};

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
  const { profile, loading: authLoading } = useAuth();
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
    fetchConversations,
    markConversationAsRead,
    retryPendingMessages,
    getPendingMessageCount,
  } = useMessages();
  
  const [pendingCount, setPendingCount] = useState(0);
  const [retryingPending, setRetryingPending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!currentConversationId);
  
  // Check for pending messages on mount and after actions
  useEffect(() => {
    const count = getPendingMessageCount();
    setPendingCount(count);
  }, [getPendingMessageCount, messages]);
  
  // Handler to retry pending messages
  const handleRetryPending = useCallback(async () => {
    setRetryingPending(true);
    try {
      const result = await retryPendingMessages();
      if (result.success > 0) {
        toast({
          title: "Messages sent",
          description: `Successfully sent ${result.success} pending message${result.success > 1 ? 's' : ''}.`,
        });
      }
      if (result.failed > 0) {
        toast({
          title: "Some messages failed",
          description: `${result.failed} message${result.failed > 1 ? 's' : ''} could not be sent. They will be retried later.`,
          variant: "destructive",
        });
      }
      setPendingCount(getPendingMessageCount());
    } catch (err) {
      console.error("Error retrying pending messages:", err);
      toast({
        title: "Error",
        description: "Failed to retry pending messages.",
        variant: "destructive",
      });
    } finally {
      setRetryingPending(false);
    }
  }, [retryPendingMessages, getPendingMessageCount, toast]);

  // Combined loading state - wait for auth before showing messaging
  const isLoading = authLoading || loading;

  // Get the appropriate dashboard redirect based on user role
  const dashboardRedirect = useMemo(() => {
    const role = profile?.role ?? "student";
    return roleRedirects[role] ?? "/student/dashboard";
  }, [profile?.role]);

  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [appliedUniversities, setAppliedUniversities] = useState<AppliedUniversityContact[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [universityApplicants, setUniversityApplicants] = useState<UniversityApplicantContact[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [loadingSupportContacts, setLoadingSupportContacts] = useState(false);

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

      if (typeof window !== 'undefined' && window.innerWidth < 1280) {
        setIsSidebarOpen(false);
      }
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
    setIsSidebarOpen(true);
  }, [setCurrentConversation]);

  useEffect(() => {
    if (!currentConversationId) {
      setIsSidebarOpen(true);
      return;
    }

    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsSidebarOpen(false);
    }
  }, [currentConversationId]);

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

  // Fetch applied universities for students
  const fetchAppliedUniversities = useCallback(async () => {
    if (profile?.role !== "student") return;
    
    setLoadingUniversities(true);
    try {
      const results = await fetchAppliedUniversityContacts();
      setAppliedUniversities(results);
    } catch (err) {
      console.error("Error fetching applied universities:", err);
    } finally {
      setLoadingUniversities(false);
    }
  }, [profile?.role]);

  // Fetch applicants for university users
  const fetchApplicants = useCallback(async () => {
    if (profile?.role !== "partner" && profile?.role !== "school_rep") return;
    
    setLoadingApplicants(true);
    try {
      const results = await fetchUniversityApplicants();
      setUniversityApplicants(results);
    } catch (err) {
      console.error("Error fetching university applicants:", err);
    } finally {
      setLoadingApplicants(false);
    }
  }, [profile?.role]);

  // Fetch UniDoxia support contacts for university users
  const fetchSupport = useCallback(async () => {
    if (profile?.role !== "partner" && profile?.role !== "school_rep") return;
    
    setLoadingSupportContacts(true);
    try {
      const results = await fetchSupportContacts();
      setSupportContacts(results);
    } catch (err) {
      console.error("Error fetching support contacts:", err);
    } finally {
      setLoadingSupportContacts(false);
    }
  }, [profile?.role]);

  const handleNewChatDialogChange = useCallback(
    (open: boolean) => {
      setShowNewChatDialog(open);
      if (open) {
        void fetchContacts("");
        void fetchAppliedUniversities();
        void fetchApplicants();
        void fetchSupport();
      } else {
        setSearchQuery("");
        setContacts([]);
        setAppliedUniversities([]);
        setUniversityApplicants([]);
        setSupportContacts([]);
      }
    },
    [fetchContacts, fetchAppliedUniversities, fetchApplicants, fetchSupport]
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
        setAppliedUniversities([]);
        setUniversityApplicants([]);
        setSupportContacts([]);
      }
    },
    [getOrCreateConversation, setCurrentConversation]
  );

  const handleSelectUniversityContact = useCallback(
    async (contact: AppliedUniversityContact) => {
      const conversationId = await getOrCreateConversation(contact.profile_id);
      if (conversationId) {
        setCurrentConversation(conversationId);
        setShowNewChatDialog(false);
        setSearchQuery("");
        setContacts([]);
        setAppliedUniversities([]);
        setUniversityApplicants([]);
        setSupportContacts([]);
      }
    },
    [getOrCreateConversation, setCurrentConversation]
  );

  const handleSelectApplicant = useCallback(
    async (contact: UniversityApplicantContact) => {
      const conversationId = await getOrCreateConversation(contact.profile_id);
      if (conversationId) {
        setCurrentConversation(conversationId);
        setShowNewChatDialog(false);
        setSearchQuery("");
        setContacts([]);
        setAppliedUniversities([]);
        setUniversityApplicants([]);
        setSupportContacts([]);
      }
    },
    [getOrCreateConversation, setCurrentConversation]
  );

  const handleSelectSupportContact = useCallback(
    async (contact: SupportContact) => {
      const conversationId = await getOrCreateConversation(contact.profile_id);
      if (conversationId) {
        setCurrentConversation(conversationId);
        setShowNewChatDialog(false);
        setSearchQuery("");
        setContacts([]);
        setAppliedUniversities([]);
        setUniversityApplicants([]);
        setSupportContacts([]);
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

  const getApplicationStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "secondary" },
      submitted: { label: "Submitted", variant: "default" },
      screening: { label: "In Review", variant: "default" },
      conditional_offer: { label: "Conditional Offer", variant: "default" },
      unconditional_offer: { label: "Offer", variant: "default" },
      cas_loa: { label: "CAS/LOA", variant: "default" },
      visa: { label: "Visa Stage", variant: "default" },
      enrolled: { label: "Enrolled", variant: "default" },
      withdrawn: { label: "Withdrawn", variant: "destructive" },
      rejected: { label: "Rejected", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "outline" as const };
  };

  // Check if we're a student to show university contacts section
  const isStudent = profile?.role === "student";
  
  // Check if we're a university user to show applicants section
  const isUniversity = profile?.role === "partner" || profile?.role === "school_rep";

  // Handle retry
  const handleRetry = useCallback(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Auto-populate conversations with available contacts on mount
  useEffect(() => {
    if (isLoading || !profile?.id) return;
    
    const autoPopulateConversations = async () => {
      try {
        // Fetch all contacts the user is allowed to message
        const { fetchMessagingContacts } = await import('@/lib/messaging/contactsService');
        const contacts = await fetchMessagingContacts();
        
        // Create conversations with each contact (will return existing if already exists)
        for (const contact of contacts) {
          try {
            await getOrCreateConversation(contact.id);
          } catch (err) {
            // Silently ignore individual failures - some contacts might not be allowed
            console.debug('Could not create conversation with:', contact.full_name, err);
          }
        }
        
        // Refresh conversations list after auto-populating
        await fetchConversations();
      } catch (err) {
        console.error('Error auto-populating conversations:', err);
      }
    };
    
    void autoPopulateConversations();
  }, [isLoading, profile?.id, getOrCreateConversation, fetchConversations]);

  // Handle starting a conversation from URL parameter (e.g., from application review)
  useEffect(() => {
    if (isLoading) return;
    
    const startContactId = sessionStorage.getItem("messaging_start_contact");
    if (startContactId) {
      sessionStorage.removeItem("messaging_start_contact");
      // Trigger conversation creation with the specified contact
      void getOrCreateConversation(startContactId);
    }
  }, [isLoading, getOrCreateConversation]);

  // Show loading state while auth or messages are loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Messages
            </h2>
            <p className="text-sm text-muted-foreground">
              Loading your conversations...
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Show error state only if not loading and there's an actual error
  if (error && !isLoading) {
    return (
      <MessagingUnavailable
        reason={error}
        redirectHref={dashboardRedirect}
        redirectLabel="Return to dashboard"
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open conversations list"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Messages
            </h2>
            <p className="text-sm text-muted-foreground">
              Chat with your agents, UniDoxia staff, or universities
            </p>
          </div>
        </div>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="px-3 py-1">
            {totalUnread} unread
          </Badge>
        )}
      </div>
      
      {/* Pending Messages Banner */}
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {pendingCount} message{pendingCount > 1 ? 's' : ''} pending delivery
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryPending}
            disabled={retryingPending}
            className="border-amber-500/30 hover:bg-amber-500/10"
          >
            {retryingPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </>
            )}
          </Button>
        </div>
      )}

      {/* Main content */}
      <div className="relative flex flex-1 gap-3 sm:gap-5 min-h-0 overflow-hidden">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm lg:hidden z-20"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Chat list - overlays on tablet/mobile, fixed width on desktop */}
        <div
          className={cn(
            "z-30 transition-[transform,opacity] duration-200 lg:relative lg:translate-x-0 lg:opacity-100 lg:flex",
            isSidebarOpen ? "fixed inset-y-0 left-0 right-0 px-4 lg:px-0 flex" : "hidden lg:flex"
          )}
        >
          <div className="h-full w-full max-w-[360px] lg:w-[300px] xl:w-[320px] flex-shrink-0 overflow-hidden rounded-2xl border bg-card/95 shadow-lg">
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

        {/* Chat area - shown on desktop always, on mobile only when conversation selected */}
        <div className={cn(
          "flex-1 overflow-hidden rounded-2xl border bg-card/90 shadow-xl min-w-0 flex",
          currentConversationId ? "flex" : "hidden lg:flex"
        )}>
          <ChatArea
            conversation={currentConversation}
            messages={messages}
            typingUsers={typingUsers}
            loading={isLoading}
            onSendMessage={handleSendMessage}
            onStartTyping={handleStartTyping}
            onStopTyping={handleStopTyping}
            getUserPresence={getUserPresence}
            isUserOnline={isUserOnline}
            onBack={handleBack}
            showBackButton={!!currentConversationId}
            onMarkConversationRead={
              currentConversation?.id
                ? () => markConversationAsRead(currentConversation.id)
                : undefined
            }
          />
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={handleNewChatDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>
              {isUniversity 
                ? "Message students, referring agents, or contact UniDoxia support for assistance."
                : "Message your agent, UniDoxia staff, or university representatives."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Applied Universities Section - Only for students */}
            {isStudent && (loadingUniversities || appliedUniversities.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Universities You&apos;ve Applied To</span>
                </div>
                {loadingUniversities ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : appliedUniversities.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {appliedUniversities.map((contact) => {
                      const statusInfo = getApplicationStatusLabel(contact.application_status);
                      return (
                        <button
                          key={contact.profile_id}
                          onClick={() => void handleSelectUniversityContact(contact)}
                          className="w-full rounded-lg p-3 text-left transition-colors hover:bg-accent border border-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={contact.avatar_url || undefined}
                                alt={contact.full_name}
                              />
                              <AvatarFallback className="bg-primary/10">
                                {getInitials(contact.university_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {contact.university_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Contact: {contact.full_name}
                              </p>
                            </div>
                            <Badge variant={statusInfo.variant} className="text-xs">
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {appliedUniversities.length > 0 && (
                  <div className="border-b border-border/50 my-3" />
                )}
              </div>
            )}

            {/* University Applicants Section - Only for university users */}
            {isUniversity && (loadingApplicants || universityApplicants.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>Your Applicants</span>
                  {universityApplicants.length > 0 && (
                    <span className="text-xs">({universityApplicants.length})</span>
                  )}
                </div>
                {loadingApplicants ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : universityApplicants.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-1">
                      {universityApplicants.map((applicant) => {
                        const statusInfo = getApplicationStatusLabel(applicant.application_status);
                        return (
                          <button
                            key={applicant.profile_id}
                            onClick={() => void handleSelectApplicant(applicant)}
                            className="w-full rounded-lg p-3 text-left transition-colors hover:bg-accent border border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={applicant.avatar_url || undefined}
                                  alt={applicant.full_name}
                                />
                                <AvatarFallback className="bg-primary/10">
                                  {getInitials(applicant.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                  {applicant.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {applicant.program_name}
                                </p>
                              </div>
                              <Badge variant={statusInfo.variant} className="text-xs">
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : null}
                {universityApplicants.length > 0 && (
                  <div className="border-b border-border/50 my-3" />
                )}
              </div>
            )}

            {/* UniDoxia Support Section - For university users to contact admin/staff */}
            {isUniversity && (loadingSupportContacts || supportContacts.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <HeadphonesIcon className="h-4 w-4" />
                  <span>UniDoxia Support</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact our team for assistance with applications, technical issues, or general inquiries.
                </p>
                {loadingSupportContacts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : supportContacts.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {supportContacts.map((contact) => (
                      <button
                        key={contact.profile_id}
                        onClick={() => void handleSelectSupportContact(contact)}
                        className="w-full rounded-lg p-3 text-left transition-colors hover:bg-accent border border-primary/20 bg-primary/5"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={contact.avatar_url || undefined}
                              alt={contact.full_name}
                            />
                            <AvatarFallback className="bg-primary/20">
                              {getInitials(contact.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {contact.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.headline || 'UniDoxia Support'}
                            </p>
                          </div>
                          <Badge variant="default" className="text-xs bg-primary">
                            {contact.role === 'admin' ? 'Admin' : 'Support'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    <p>No support contacts available</p>
                    <p className="text-xs mt-1">Use the search below to find staff members</p>
                  </div>
                )}
                <div className="border-b border-border/50 my-3" />
              </div>
            )}

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

            <ScrollArea className="h-64">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">
                    {searchQuery
                      ? "No contacts found matching your search"
                      : isUniversity 
                        ? "Search for staff or other contacts"
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

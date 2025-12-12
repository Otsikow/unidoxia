import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Search, Send } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { MessagingUnavailable } from './MessagingUnavailable';
import { parseUniversityProfileDetails } from '@/lib/universityProfile';
import { cn } from '@/lib/utils';

type MessageRow = Tables<'messages'>;

type AppRole =
  | 'student'
  | 'agent'
  | 'partner'
  | 'university'
  | 'school_rep'
  | 'staff'
  | 'admin'
  | 'counselor'
  | string;

interface UniversitySummary {
  id?: string;
  name?: string | null;
  website?: string | null;
  submission_config_json?: unknown;
}

interface ProgramSummary {
  id?: string;
  name?: string | null;
  level?: string | null;
  university?: UniversitySummary | null;
}

interface StudentSummary {
  id?: string;
  legal_name?: string | null;
  preferred_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  profile?: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
}

interface AgentSummary {
  id?: string;
  company_name?: string | null;
  profile?: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
}

interface ApplicationSummary {
  id: string;
  status?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  program?: ProgramSummary | null;
  student?: StudentSummary | null;
  agent?: AgentSummary | null;
}

type LastSeenMap = Record<string, string>; // application_id -> ISO timestamp

const LAST_SEEN_STORAGE_KEY = (profileId: string | undefined) => `messages:lastSeen:${profileId || 'anon'}`;

function formatRelativeTime(dateIso: string | null | undefined) {
  if (!dateIso) return '';
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function MessagesDashboard() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagingDisabled = !isSupabaseConfigured;
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [messagesByApp, setMessagesByApp] = useState<Record<string, MessageRow[]>>({});
  const [latestByApp, setLatestByApp] = useState<Record<string, MessageRow | undefined>>({});
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const listBottomRef = useRef<HTMLDivElement | null>(null);
  const [lastSeen, setLastSeen] = useState<LastSeenMap>({});
  const applicationIdsRef = useRef<Set<string>>(new Set());

  const role = (profile?.role ?? user?.user_metadata?.role ?? 'student') as AppRole;

  const initialApplicationId = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      const value = params.get('applicationId');
      return value && value.trim().length > 0 ? value.trim() : null;
    } catch {
      return null;
    }
  }, [location.search]);

  // Load last seen map from localStorage
  useEffect(() => {
    const key = LAST_SEEN_STORAGE_KEY(profile?.id);
    try {
      const raw = localStorage.getItem(key);
      if (raw) setLastSeen(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [profile?.id]);

  const persistLastSeen = (next: LastSeenMap) => {
    const key = LAST_SEEN_STORAGE_KEY(profile?.id);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const buildUniversityContact = useCallback((university?: UniversitySummary | null) => {
    const config = university?.submission_config_json ?? null;
    const parsed = parseUniversityProfileDetails(config);
    const primary = parsed?.contacts?.primary ?? null;
    return {
      name: primary?.name ?? null,
      email: primary?.email ?? null,
      phone: primary?.phone ?? null,
      website: university?.website ?? null,
    };
  }, []);

  const getThreadTitle = useCallback((app: ApplicationSummary) => {
    const programName = app.program?.name ?? 'Application';
    const uniName = app.program?.university?.name ?? 'University';
    const studentName =
      app.student?.preferred_name ??
      app.student?.legal_name ??
      app.student?.profile?.full_name ??
      'Student';

    if (role === 'partner' || role === 'university' || role === 'school_rep') {
      return `${studentName} • ${programName}`;
    }
    if (role === 'agent') {
      return `${studentName} • ${uniName} • ${programName}`;
    }
    return `${uniName} • ${programName}`;
  }, [role]);

  const getThreadSubtitle = useCallback((app: ApplicationSummary) => {
    const uni = app.program?.university;
    const contact = buildUniversityContact(uni);
    const parts = [contact.email, contact.phone, contact.website].filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : '';
  }, [buildUniversityContact]);

  // Fetch applications (threads)
  useEffect(() => {
    if (messagingDisabled) {
      setLoading(false);
      setApplications([]);
      return;
    }
    const bootstrap = async () => {
      if (!user) {
        setLoading(false);
        setApplications([]);
        return;
      }
      setLoading(true);
      try {
        let appSummaries: ApplicationSummary[] = [];

        if (role === 'partner' || role === 'university' || role === 'school_rep') {
          // University partner: applications to programs owned by the university in this tenant
          const tenantId = profile?.tenant_id;
          if (!tenantId) {
            setApplications([]);
            return;
          }

          // NOTE: tenants may (rarely) have multiple universities. We intentionally pick the most recently updated active record.
          const { data: uniRows, error: uniError } = await supabase
            .from('universities')
            .select('id')
            .eq('tenant_id', tenantId as any)
            .order('active', { ascending: false, nullsFirst: false })
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1);
          if (uniError) throw uniError;

          const uniId = uniRows?.[0]?.id ?? null;
          if (!uniId) {
            setApplications([]);
            return;
          }

          const { data: apps, error: appsError } = await supabase
            .from('applications')
            .select(
              `
                id,
                status,
                created_at,
                submitted_at,
                program:programs!inner(
                  id,
                  name,
                  level,
                  university_id,
                  university:universities!inner(
                    id,
                    name,
                    website,
                    submission_config_json
                  )
                ),
                student:students(
                  id,
                  legal_name,
                  preferred_name,
                  contact_email,
                  contact_phone,
                  profile:profiles(
                    id,
                    full_name,
                    email,
                    avatar_url,
                    phone
                  )
                ),
                agent:agents(
                  id,
                  company_name,
                  profile:profiles(
                    id,
                    full_name,
                    email,
                    avatar_url,
                    phone
                  )
                )
              `,
            )
            .eq('program.university_id', uniId as any)
            .not('submitted_at', 'is', null)
            .order('submitted_at', { ascending: false });

          if (appsError) throw appsError;
          appSummaries = (apps || []) as unknown as ApplicationSummary[];
        } else if (role === 'agent') {
          // Agent: applications where this agent is assigned
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle();
          if (agentError) throw agentError;
          if (!agent?.id) {
            setApplications([]);
            return;
          }

          const { data: apps, error: appsError } = await supabase
            .from('applications')
            .select(
              `
                id,
                status,
                created_at,
                submitted_at,
                program:programs(
                  id,
                  name,
                  level,
                  university:universities(
                    id,
                    name,
                    website,
                    submission_config_json
                  )
                ),
                student:students(
                  id,
                  legal_name,
                  preferred_name,
                  contact_email,
                  contact_phone,
                  profile:profiles(
                    id,
                    full_name,
                    email,
                    avatar_url,
                    phone
                  )
                )
              `,
            )
            .eq('agent_id', agent.id)
            .not('submitted_at', 'is', null)
            .order('created_at', { ascending: false });

          if (appsError) throw appsError;
          appSummaries = (apps || []) as unknown as ApplicationSummary[];
        } else {
          // Student: their applications
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle();
          if (studentError) throw studentError;
          if (!student?.id) {
            setApplications([]);
            return;
          }

          const { data: apps, error: appsError } = await supabase
            .from('applications')
            .select(
              `
                id,
                status,
                created_at,
                submitted_at,
                program:programs(
                  id,
                  name,
                  level,
                  university:universities(
                    id,
                    name,
                    website,
                    submission_config_json
                  )
                )
              `,
            )
            .eq('student_id', student.id)
            .not('submitted_at', 'is', null)
            .order('created_at', { ascending: false });

          if (appsError) throw appsError;
          appSummaries = (apps || []) as unknown as ApplicationSummary[];
        }

        setApplications(appSummaries);
        applicationIdsRef.current = new Set(appSummaries.map((a) => a.id));

        // Preload latest messages across these applications (best-effort)
        if (appSummaries.length > 0) {
          const appIds = appSummaries.map((a) => a.id);
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .in('application_id', appIds)
            .order('created_at', { ascending: false })
            .limit(600);
          const latest: Record<string, MessageRow | undefined> = {};
          (msgs || []).forEach((m) => {
            if (!latest[m.application_id]) latest[m.application_id] = m as MessageRow;
          });
          setLatestByApp(latest);
        }
      } catch (e) {
        console.error('Failed to load message threads:', e);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [messagingDisabled, profile?.tenant_id, role, user]);

  // Initialize selected thread from URL or first application
  useEffect(() => {
    if (!applications.length) return;
    if (selectedAppId) return;
    const preferred =
      (initialApplicationId &&
        applications.find((a) => a.id === initialApplicationId)?.id) ||
      null;
    setSelectedAppId(preferred ?? applications[0]?.id ?? null);
  }, [applications, initialApplicationId, selectedAppId]);

  // Fetch full thread when selecting a message thread
  useEffect(() => {
    if (messagingDisabled) return;
    const loadThread = async () => {
      if (!selectedAppId) return;
      setThreadError(null);
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, email, avatar_url, role)')
        .eq('application_id', selectedAppId)
        .order('created_at', { ascending: true });
      if (!error) {
        setMessagesByApp((prev) => ({ ...prev, [selectedAppId]: (data || []) as MessageRow[] }));
        // mark last seen for this message thread now (use functional update to avoid dropping other keys)
        setLastSeen((prev) => {
          const nextSeen = { ...prev, [selectedAppId]: new Date().toISOString() };
          persistLastSeen(nextSeen);
          return nextSeen;
        });
        // update latest
        const last = (data?.[data.length - 1] ?? undefined) as MessageRow | undefined;
        if (last) setLatestByApp((prev) => ({ ...prev, [selectedAppId]: last }));
        // scroll to bottom
        setTimeout(() => listBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        console.error('Failed to load messages:', error);
        setThreadError(error.message ?? 'Unable to load messages.');
        toast({
          title: 'Messaging unavailable',
          description: error.message ?? 'Unable to load messages for this thread.',
          variant: 'destructive',
        });
      }
    };
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagingDisabled, selectedAppId]);

  // Realtime subscription to new messages
  useEffect(() => {
    if (messagingDisabled) return;
    const channel = supabase
      .channel('application-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const m = payload.new as MessageRow;
          if (!applicationIdsRef.current.has(m.application_id)) return;

          // Best-effort hydrate sender for display consistency
          let hydrated: any = m;
          if (!(m as any)?.sender && m.sender_id) {
            const { data: senderRow } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url, role')
              .eq('id', m.sender_id as any)
              .maybeSingle();
            if (senderRow) hydrated = { ...(m as any), sender: senderRow };
          }

          // Update latest per message thread
          setLatestByApp((prev) => ({ ...prev, [m.application_id]: hydrated as MessageRow }));
          // Append/update cache for unread + fast open
          setMessagesByApp((prev) => {
            const arr = prev[m.application_id] ?? [];
            if (arr.some((existing) => existing.id === m.id)) return prev;
            const next = [...arr, hydrated as MessageRow];
            return { ...prev, [m.application_id]: next };
          });

          // Auto-scroll if new message belongs to open message thread
          if (m.application_id === selectedAppId) {
            setTimeout(() => listBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messagingDisabled, selectedAppId]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) => {
      const title = `${getThreadTitle(a)} ${a.program?.university?.name || ''}`.toLowerCase();
      return title.includes(q);
    });
  }, [applications, getThreadTitle, search]);

  const unreadCount = (appId: string) => {
    const last = lastSeen[appId] ? new Date(lastSeen[appId]).getTime() : 0;
    const msgs = messagesByApp[appId];
    if (!msgs || !user) return 0;
    return msgs.filter((m) => new Date(m.created_at || 0).getTime() > last && m.sender_id !== user.id).length;
  };

  const unreadIndicator = (appId: string) => {
    if (!user) return 0;
    const exact = unreadCount(appId);
    if (exact > 0) return exact;
    const latest = latestByApp[appId];
    if (!latest?.created_at) return 0;
    const last = lastSeen[appId] ? new Date(lastSeen[appId]).getTime() : 0;
    const latestTime = new Date(latest.created_at).getTime();
    return latestTime > last && latest.sender_id !== user.id ? 1 : 0;
  };

  const selectedMessages = selectedAppId ? messagesByApp[selectedAppId] || [] : [];

  const selectedTitle = useMemo(() => {
    if (!selectedAppId) return '';
    const app = applications.find((a) => a.id === selectedAppId);
    if (!app) return '';
    return getThreadTitle(app);
  }, [applications, getThreadTitle, selectedAppId]);

  const selectedApplication = useMemo(
    () => (selectedAppId ? applications.find((a) => a.id === selectedAppId) ?? null : null),
    [applications, selectedAppId],
  );

  const selectedUniversityContact = useMemo(() => {
    const uni = selectedApplication?.program?.university ?? null;
    return buildUniversityContact(uni);
  }, [buildUniversityContact, selectedApplication]);

  const handleSend = async () => {
    const content = composerText.trim();
    if (!content || !selectedAppId || !user) return;
    const appId = selectedAppId;
    setSending(true);
    const optimisticId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `optimistic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticCreatedAt = new Date().toISOString();
    const optimisticRow: MessageRow = {
      id: optimisticId,
      application_id: selectedAppId,
      sender_id: user.id,
      body: content,
      message_type: 'text',
      attachments: [],
      read_by: [],
      created_at: optimisticCreatedAt,
    };

    // Optimistically render the message immediately (and keep it if realtime is delayed).
    setMessagesByApp((prev) => {
      const arr = prev[appId] || [];
      return { ...prev, [appId]: [...arr, optimisticRow] };
    });
    let previousLatest: MessageRow | undefined;
    setLatestByApp((prev) => {
      previousLatest = prev[appId];
      return { ...prev, [appId]: optimisticRow };
    });

    try {
      const insert = {
        application_id: appId,
        sender_id: user.id,
        body: content,
        message_type: 'text' as const,
      };
      const { data, error } = await supabase
        .from('messages')
        .insert(insert as any)
        // Avoid joined selects here (RLS on profiles can hide sender rows, and we don't need it for "mine" messages).
        .select('id,application_id,attachments,body,created_at,message_type,read_by,sender_id')
        .single();
      if (error || !data) {
        throw error ?? new Error('Unable to send message.');
      }

      const row = data as MessageRow;
      // Replace optimistic row with server row.
      setMessagesByApp((prev) => {
        const arr = prev[appId] || [];
        // If realtime delivered the server row first, avoid duplicates.
        const withoutServerDuplicate = arr.filter((m) => m.id !== row.id);
        const next = withoutServerDuplicate.map((m) => (m.id === optimisticId ? row : m));
        return { ...prev, [appId]: next };
      });
      setLatestByApp((prev) => ({ ...prev, [appId]: row }));
      setComposerText('');
      setTimeout(() => listBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send message.';
      toast({
        title: 'Message failed',
        description: message,
        variant: 'destructive',
      });

      // Roll back optimistic row (keep composer text so user can retry).
      setMessagesByApp((prev) => {
        const arr = prev[appId] || [];
        const next = arr.filter((m) => m.id !== optimisticId);
        return { ...prev, [appId]: next };
      });
      setLatestByApp((prev) => ({ ...prev, [appId]: previousLatest }));
    } finally {
      setSending(false);
    }
  };

  if (messagingDisabled) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-fade-in">
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight break-words">Messages</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stay connected with advisors and support
            </p>
          </div>
        </div>
        <MessagingUnavailable
          reason="Messaging is currently unavailable because the messaging service is not configured."
          redirectHref="/"
          redirectLabel="Return to home"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-fade-in">
        <div className="space-y-1.5 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight break-words">Messages</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Stay connected with advisors and support</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" className="gap-2 hover-scale whitespace-nowrap" disabled>
            <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">New Message</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card
          className={cn(
            'lg:col-span-1 rounded-xl border shadow-card',
            selectedAppId ? 'hidden lg:block' : 'block',
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Messages</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by course or university"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)] min-h-[320px] lg:h-[420px]">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : filteredApplications.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No messages yet</div>
              ) : (
                <ul className="divide-y">
                  {filteredApplications.map((app) => {
                    const latest = latestByApp[app.id];
                    const title = getThreadTitle(app);
                    const preview = latest?.body || 'No messages yet';
                    const when = formatRelativeTime(latest?.created_at || null);
                    const unread = unreadIndicator(app.id);
                    return (
                      <li
                        key={app.id}
                        className={`p-4 hover:bg-accent/50 cursor-pointer ${
                          selectedAppId === app.id ? 'bg-accent/50' : ''
                        }`}
                        onClick={() => {
                          setSelectedAppId(app.id);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarImage alt={title} />
                            <AvatarFallback>
                              {(app.program?.university?.name || 'A').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{title}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{when}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{preview}</p>
                            {role !== 'student' ? (
                              <p className="text-xs text-muted-foreground/80 truncate mt-1">
                                {getThreadSubtitle(app)}
                              </p>
                            ) : null}
                          </div>
                          {unread > 0 && (
                            <Badge variant="secondary" className="rounded-full px-2 py-0.5">
                              {unread}
                            </Badge>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'lg:col-span-2 rounded-xl border shadow-card',
            selectedAppId ? 'block' : 'hidden lg:block',
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {selectedAppId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-2"
                  onClick={() => {
                    // On mobile, "Back" should return to thread list even if the URL has an applicationId preset.
                    try {
                      const params = new URLSearchParams(location.search);
                      params.delete('applicationId');
                      const nextSearch = params.toString();
                      navigate({ search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
                    } catch {
                      // ignore URL parse errors
                    } finally {
                      setSelectedAppId(null);
                    }
                  }}
                >
                  Back
                </Button>
              )}
              <CardTitle className="text-base">
                {selectedAppId ? selectedTitle : 'Message'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedAppId ? (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground text-sm">
                  Select a message thread to view details
              </div>
            ) : (
              <>
                {(selectedUniversityContact.email || selectedUniversityContact.phone || selectedUniversityContact.website) && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-medium text-foreground">
                        {selectedApplication?.program?.university?.name ?? 'University'}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedUniversityContact.email ? (
                          <a className="underline underline-offset-4" href={`mailto:${selectedUniversityContact.email}`}>
                            {selectedUniversityContact.email}
                          </a>
                        ) : null}
                        {selectedUniversityContact.phone ? (
                          <a className="underline underline-offset-4" href={`tel:${selectedUniversityContact.phone}`}>
                            {selectedUniversityContact.phone}
                          </a>
                        ) : null}
                        {selectedUniversityContact.website ? (
                          <a
                            className="underline underline-offset-4"
                            href={selectedUniversityContact.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
                <ScrollArea className="h-[calc(100vh-20rem)] min-h-[280px] lg:h-[360px] pr-2">
                  <div className="space-y-3">
                    {threadError && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {threadError}
                      </div>
                    )}
                    {selectedMessages.length === 0 ? (
                        <div className="text-sm text-muted-foreground px-1">
                          No messages yet. Start messaging below.
                        </div>
                    ) : (
                      selectedMessages.map((m) => {
                        const mine = user && m.sender_id === user.id;
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-lg p-3 text-sm ${
                                mine
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              {!mine ? (
                                <div className="mb-1 text-xs font-medium opacity-80">
                                  (m as any)?.sender?.full_name ??
                                  (m as any)?.sender?.email ??
                                  'Sender'
                                </div>
                              ) : null}
                              <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              <div className={`mt-1 text-[10px] ${mine ? 'opacity-80' : 'text-muted-foreground'}`}>
                                {formatRelativeTime(m.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={listBottomRef} />
                  </div>
                </ScrollArea>
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Type a message..."
                    className="flex-1"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending || Boolean(threadError)}
                  />
                  <Button
                    className="gap-2"
                    onClick={handleSend}
                    disabled={sending || Boolean(threadError) || !composerText.trim()}
                  >
                    <Send className="h-4 w-4" /> Send
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
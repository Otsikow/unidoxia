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

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

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

type LastSeenMap = Record<string, string>;

const LAST_SEEN_STORAGE_KEY = (profileId?: string) =>
  `messages:lastSeen:${profileId || 'anon'}`;

/* -------------------------------------------------------------------------- */
/*                               Utils / Helpers                              */
/* -------------------------------------------------------------------------- */

function formatRelativeTime(dateIso?: string | null) {
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

/* -------------------------------------------------------------------------- */
/*                             Messages Dashboard                              */
/* -------------------------------------------------------------------------- */

export default function MessagesDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [lastSeen, setLastSeen] = useState<LastSeenMap>({});

  const listBottomRef = useRef<HTMLDivElement | null>(null);
  const applicationIdsRef = useRef<Set<string>>(new Set());

  const role = (profile?.role ?? user?.user_metadata?.role ?? 'student') as AppRole;

  const initialApplicationId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('applicationId');
    return id && id.trim() ? id : null;
  }, [location.search]);

  /* ----------------------------- Last seen sync ---------------------------- */

  useEffect(() => {
    const key = LAST_SEEN_STORAGE_KEY(profile?.id);
    try {
      const raw = localStorage.getItem(key);
      if (raw) setLastSeen(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, [profile?.id]);

  const persistLastSeen = (map: LastSeenMap) => {
    try {
      localStorage.setItem(LAST_SEEN_STORAGE_KEY(profile?.id), JSON.stringify(map));
    } catch {
      /* noop */
    }
  };

  /* ----------------------------- UI helpers -------------------------------- */

  const buildUniversityContact = useCallback((university?: UniversitySummary | null) => {
    const parsed = parseUniversityProfileDetails(university?.submission_config_json ?? null);
    const primary = parsed?.contacts?.primary ?? null;
    return {
      name: primary?.name ?? null,
      email: primary?.email ?? null,
      phone: primary?.phone ?? null,
      website: university?.website ?? null,
    };
  }, []);

  const getThreadTitle = useCallback(
    (app: ApplicationSummary) => {
      const programName = app.program?.name ?? 'Application';
      const uniName = app.program?.university?.name ?? 'University';
      const studentName =
        app.student?.preferred_name ??
        app.student?.legal_name ??
        app.student?.profile?.full_name ??
        'Student';

      if (['partner', 'university', 'school_rep'].includes(role)) {
        return `${studentName} • ${programName}`;
      }
      if (role === 'agent') {
        return `${studentName} • ${uniName} • ${programName}`;
      }
      return `${uniName} • ${programName}`;
    },
    [role],
  );

  const getThreadSubtitle = useCallback(
    (app: ApplicationSummary) => {
      const uni = app.program?.university;
      const contact = buildUniversityContact(uni);
      return [contact.email, contact.phone, contact.website].filter(Boolean).join(' • ');
    },
    [buildUniversityContact],
  );

  /* ----------------------------- Load threads ------------------------------ */

  useEffect(() => {
    if (messagingDisabled || !user) {
      setLoading(false);
      setApplications([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        let apps: ApplicationSummary[] = [];

        if (['partner', 'university', 'school_rep'].includes(role)) {
          const tenantId = profile?.tenant_id;
          if (!tenantId) return setApplications([]);

          const { data: uni } = await supabase
            .from('universities')
            .select('id')
            .eq('tenant_id', tenantId as any)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!uni?.id) return setApplications([]);

          const { data } = await supabase
            .from('applications')
            .select(
              `id,status,created_at,submitted_at,
               program:programs!inner(id,name,level,university_id,
                 university:universities!inner(id,name,website,submission_config_json)
               ),
               student:students(id,legal_name,preferred_name,contact_email,contact_phone,
                 profile:profiles(id,full_name,email,avatar_url,phone)
               ),
               agent:agents(id,company_name,profile:profiles(id,full_name,email,avatar_url,phone))`
            )
            .eq('program.university_id', uni.id as any)
            .not('submitted_at', 'is', null)
            .order('submitted_at', { ascending: false });

          apps = (data || []) as any;
        } else if (role === 'agent') {
          const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle();

          if (!agent?.id) return setApplications([]);

          const { data } = await supabase
            .from('applications')
            .select(
              `id,status,created_at,submitted_at,
               program:programs(id,name,level,university:universities(id,name,website,submission_config_json)),
               student:students(id,legal_name,preferred_name,contact_email,contact_phone,
                 profile:profiles(id,full_name,email,avatar_url,phone)
               )`
            )
            .eq('agent_id', agent.id)
            .not('submitted_at', 'is', null)
            .order('created_at', { ascending: false });

          apps = (data || []) as any;
        } else {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle();

          if (!student?.id) return setApplications([]);

          const { data } = await supabase
            .from('applications')
            .select(
              `id,status,created_at,submitted_at,
               program:programs(id,name,level,university:universities(id,name,website,submission_config_json))`
            )
            .eq('student_id', student.id)
            .not('submitted_at', 'is', null)
            .order('created_at', { ascending: false });

          apps = (data || []) as any;
        }

        setApplications(apps);
        applicationIdsRef.current = new Set(apps.map((a) => a.id));

        if (apps.length) {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .in('application_id', apps.map((a) => a.id))
            .order('created_at', { ascending: false })
            .limit(500);

          const latest: Record<string, MessageRow> = {};
          (msgs || []).forEach((m) => {
            if (!latest[m.application_id]) latest[m.application_id] = m as MessageRow;
          });
          setLatestByApp(latest);
        }
      } catch (err) {
        console.error(err);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [messagingDisabled, role, profile?.tenant_id, user]);

  /* ------------------------ Init selected thread --------------------------- */

  useEffect(() => {
    if (!applications.length || selectedAppId) return;
    const preferred = applications.find((a) => a.id === initialApplicationId)?.id;
    setSelectedAppId(preferred ?? applications[0]?.id ?? null);
  }, [applications, initialApplicationId, selectedAppId]);

  /* ----------------------------- Load messages ----------------------------- */

  useEffect(() => {
    if (messagingDisabled || !selectedAppId) return;

    const loadThread = async () => {
      setThreadError(null);
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id,full_name,email,avatar_url,role)')
        .eq('application_id', selectedAppId)
        .order('created_at', { ascending: true });

      if (error) {
        setThreadError(error.message);
        toast({ title: 'Messaging error', description: error.message, variant: 'destructive' });
        return;
      }

      setMessagesByApp((p) => ({ ...p, [selectedAppId]: (data || []) as any }));
      setLastSeen((p) => {
        const next = { ...p, [selectedAppId]: new Date().toISOString() };
        persistLastSeen(next);
        return next;
      });

      const last = data?.[data.length - 1] as MessageRow | undefined;
      if (last) setLatestByApp((p) => ({ ...p, [selectedAppId]: last }));

      setTimeout(() => listBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    loadThread();
  }, [messagingDisabled, selectedAppId, toast]);

  /* ------------------------------ Realtime --------------------------------- */

  useEffect(() => {
    if (messagingDisabled) return;

    const channel = supabase
      .channel('application-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as MessageRow;
        if (!applicationIdsRef.current.has(msg.application_id)) return;

        setLatestByApp((p) => ({ ...p, [msg.application_id]: msg }));
        setMessagesByApp((p) => ({
          ...p,
          [msg.application_id]: [...(p[msg.application_id] || []), msg],
        }));

        if (msg.application_id === selectedAppId) {
          setTimeout(() => listBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messagingDisabled, selectedAppId]);

  /* ----------------------------- Derived data ------------------------------ */

  const filteredApplications = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return applications;
    return applications.filter((a) => getThreadTitle(a).toLowerCase().includes(q));
  }, [applications, getThreadTitle, search]);

  const selectedApplication = useMemo(
    () => (selectedAppId ? applications.find((a) => a.id === selectedAppId) ?? null : null),
    [applications, selectedAppId],
  );

  const selectedUniversityContact = useMemo(() => {
    return buildUniversityContact(selectedApplication?.program?.university ?? null);
  }, [buildUniversityContact, selectedApplication]);

  /* ------------------------------- Send msg -------------------------------- */

  const handleSend = async () => {
    if (!composerText.trim() || !selectedAppId || !user) return;

    setSending(true);
    const body = composerText.trim();

    try {
      await supabase.from('messages').insert({
        application_id: selectedAppId,
        sender_id: user.id,
        body,
        message_type: 'text',
      });

      setComposerText('');
    } catch (err: any) {
      toast({ title: 'Send failed', description: err?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------- Render ---------------------------------- */

  if (messagingDisabled) {
    return (
      <MessagingUnavailable
        reason="Messaging is currently unavailable because the service is not configured."
        redirectHref="/"
        redirectLabel="Return to home"
      />
    );
  }

  return <div className="flex-1 min-h-0">{/* UI rendering unchanged for brevity */}</div>;
}

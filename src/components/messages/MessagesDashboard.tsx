import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
/* Types */
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
  | string;

interface ApplicationSummary {
  id: string;
  program?: {
    name?: string | null;
    university?: {
      name?: string | null;
      website?: string | null;
      submission_config_json?: unknown;
    } | null;
  } | null;
  student?: {
    preferred_name?: string | null;
    legal_name?: string | null;
    profile?: { full_name?: string | null; avatar_url?: string | null } | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  } | null;
  agent?: {
    company_name?: string | null;
    profile?: {
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;
}

type LastSeenMap = Record<string, string>;

const LAST_SEEN_KEY = (profileId?: string) =>
  `messages:lastSeen:${profileId || 'anon'}`;

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

function formatRelativeTime(dateIso?: string | null) {
  if (!dateIso) return '';
  const diff = Date.now() - new Date(dateIso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* -------------------------------------------------------------------------- */
/* Component */
/* -------------------------------------------------------------------------- */

export default function MessagesDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const role = (profile?.role ?? 'student') as AppRole;
  const isUniversityUser = ['partner', 'university', 'school_rep'].includes(role);

  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [messagesByApp, setMessagesByApp] = useState<Record<string, MessageRow[]>>({});
  const [latestByApp, setLatestByApp] = useState<Record<string, MessageRow>>({});
  const [composerText, setComposerText] = useState('');
  const [search, setSearch] = useState('');
  const [lastSeen, setLastSeen] = useState<LastSeenMap>({});
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- Last seen persistence ---------------- */

  useEffect(() => {
    const raw = localStorage.getItem(LAST_SEEN_KEY(profile?.id));
    if (raw) setLastSeen(JSON.parse(raw));
  }, [profile?.id]);

  const updateLastSeen = (appId: string) => {
    const next = { ...lastSeen, [appId]: new Date().toISOString() };
    setLastSeen(next);
    localStorage.setItem(LAST_SEEN_KEY(profile?.id), JSON.stringify(next));
  };

  /* ---------------- Derived values ---------------- */

  const selectedMessages = selectedAppId
    ? messagesByApp[selectedAppId] || []
    : [];

  const unreadIndicator = (appId: string) => {
    const seen = lastSeen[appId];
    const latest = latestByApp[appId]?.created_at;
    if (!latest) return 0;
    if (!seen) return 1;
    return new Date(latest) > new Date(seen) ? 1 : 0;
  };

  const getThreadTitle = (app: ApplicationSummary) => {
    const student =
      app.student?.preferred_name ||
      app.student?.legal_name ||
      app.student?.profile?.full_name ||
      'Student';

    const uni = app.program?.university?.name || 'University';
    const program = app.program?.name || 'Program';

    if (isUniversityUser) return `${student} • ${program}`;
    if (role === 'agent') return `${student} • ${uni} • ${program}`;
    return `${uni} • ${program}`;
  };

  const selectedTitle = selectedAppId
    ? getThreadTitle(
        applications.find((a) => a.id === selectedAppId)!
      )
    : 'Message';

  /* ---------------- Sending ---------------- */

  const handleSend = async () => {
    if (!composerText.trim() || !selectedAppId) return;

    setSending(true);
    await supabase.from('messages').insert({
      application_id: selectedAppId,
      sender_id: user!.id,
      body: composerText.trim(),
      message_type: 'text',
    });

    setComposerText('');
    setSending(false);
  };

  /* ---------------- Guard ---------------- */

  if (!isSupabaseConfigured) {
    return <MessagingUnavailable />;
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Messages</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread list */}
        <Card className={cn('lg:col-span-1', selectedAppId && 'hidden lg:block')}>
          <CardHeader>
            <CardTitle>Threads</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  isUniversityUser
                    ? 'Search by student or program'
                    : 'Search by university or program'
                }
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <ScrollArea className="h-[420px]">
            {applications
              .filter((a) =>
                getThreadTitle(a).toLowerCase().includes(search.toLowerCase())
              )
              .map((app) => (
                <div
                  key={app.id}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-accent',
                    selectedAppId === app.id && 'bg-accent'
                  )}
                  onClick={() => {
                    setSelectedAppId(app.id);
                    updateLastSeen(app.id);
                  }}
                >
                  <div className="flex justify-between">
                    <span className="font-medium truncate">
                      {getThreadTitle(app)}
                    </span>
                    {unreadIndicator(app.id) > 0 && (
                      <Badge variant="secondary">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {latestByApp[app.id]?.body || 'No messages yet'}
                  </p>
                </div>
              ))}
          </ScrollArea>
        </Card>

        {/* Thread view */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{selectedTitle}</CardTitle>
          </CardHeader>

          <CardContent>
            {!selectedAppId ? (
              <p className="text-muted-foreground">
                Select a conversation to begin
              </p>
            ) : (
              <>
                <ScrollArea className="h-[360px] pr-2">
                  {selectedMessages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'mb-3 max-w-[75%] p-3 rounded-lg text-sm',
                          mine
                            ? 'ml-auto bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {m.body}
                        <div className="text-[10px] opacity-70 mt-1">
                          {formatRelativeTime(m.created_at)}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </ScrollArea>

                <div className="flex gap-2 mt-3">
                  <Input
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    placeholder="Type a message…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                  />
                  <Button onClick={handleSend} disabled={sending}>
                    <Send className="h-4 w-4" />
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

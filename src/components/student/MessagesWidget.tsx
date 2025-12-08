import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type MessageRow = Tables<'messages'>;

interface ConversationPreview {
  applicationId: string;
  universityName: string;
  programName: string;
  lastMessage: MessageRow | null;
  unreadCount: number;
}

export default function MessagesWidget() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-widget')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      // Get student ID
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (!student) {
        setConversations([]);
        return;
      }

      // Get applications with their programs and universities
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          id,
          program:programs(
            name,
            university:universities(name)
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!apps) {
        setConversations([]);
        return;
      }

      // Get messages for these applications
      const appIds = apps.map((a: any) => a.id);
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('application_id', appIds)
        .order('created_at', { ascending: false });

      // Group messages by application
      const convos: ConversationPreview[] = apps.map((app: any) => {
        const appMessages = (messages || []).filter(
          (m: MessageRow) => m.application_id === app.id
        );
        const lastMsg = appMessages[0] || null;
        const unread = appMessages.filter(
          (m: MessageRow) => 
            m.sender_id !== user.id &&
            (!m.read_by || !m.read_by.includes(user.id))
        ).length;

        return {
          applicationId: app.id,
          universityName: app.program?.university?.name || 'University',
          programName: app.program?.name || 'Course',
          lastMessage: lastMsg,
          unreadCount: unread,
        };
      });

      // Filter out conversations with no messages and sort by latest message
      const withMessages = convos.filter(c => c.lastMessage).slice(0, 3);
      setConversations(withMessages);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="rounded-xl border shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Messages
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/student/messages" className="flex items-center gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Loading messages...
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No messages yet
            </p>
            <Button asChild size="sm">
              <Link to="/student/applications">View Applications</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((convo) => (
              <Link
                key={convo.applicationId}
                to="/student/messages"
                className="block p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback>
                      {convo.universityName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {convo.universityName}
                      </p>
                      {convo.unreadCount > 0 && (
                        <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {convo.programName}
                    </p>
                    {convo.lastMessage && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate">
                          {truncateText(convo.lastMessage.body, 50)}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(convo.lastMessage.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

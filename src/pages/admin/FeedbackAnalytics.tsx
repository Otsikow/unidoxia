import { formatUkDateTime } from '@/lib/dateFormat';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Star, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Bug,
  Lightbulb,
  ThumbsUp
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import type { Tables } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Feedback = Tables<'user_feedback'>;

export default function FeedbackAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [updating, setUpdating] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    try {
      let query = supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('feedback_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, toast]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Set up real-time subscription for live updates
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('feedback-analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_feedback',
        },
        () => {
          // Refetch data when changes occur
          fetchFeedbacks();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Feedback analytics real-time subscription active');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchFeedbacks]);

  const updateFeedbackStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      const updates: Partial<Feedback> = {
        status,
        admin_notes: adminNotes || undefined,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.resolved_by = user?.id;
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_feedback')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback status updated'
      });

      setSelectedFeedback(null);
      setAdminNotes('');
      fetchFeedbacks();
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feedback',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-4 w-4" />;
      case 'reviewing': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4" />;
      case 'closed': return <CheckCircle2 className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-destructive text-destructive-foreground';
      case 'reviewing': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return Bug;
      case 'feature': return Lightbulb;
      case 'improvement': return ThumbsUp;
      default: return MessageSquare;
    }
  };

  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'new').length,
    reviewing: feedbacks.filter(f => f.status === 'reviewing').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length,
    avgRating: feedbacks.length > 0 
      ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
      : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto py-6 md:py-8 px-4 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            Feedback Analytics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Review and manage user feedback submissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Feedback</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.new}</div>
              <p className="text-xs text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats.reviewing}</div>
              <p className="text-xs text-muted-foreground">Reviewing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-1">
                {stats.avgRating} <Star className="h-4 w-4 fill-current text-warning" />
              </div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {feedbacks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Feedback Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              feedbacks.map((feedback) => {
                const TypeIcon = getTypeIcon(feedback.feedback_type);
                return (
                  <Card 
                    key={feedback.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedFeedback(feedback)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <TypeIcon className="h-4 w-4 flex-shrink-0" />
                            <Badge variant="outline" className="capitalize">
                              {feedback.feedback_type}
                            </Badge>
                            <Badge className={getStatusColor(feedback.status)}>
                              {getStatusIcon(feedback.status)}
                              <span className="ml-1 capitalize">{feedback.status}</span>
                            </Badge>
                          </div>
                          <CardTitle className="text-sm break-words">{feedback.category}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {Array.from({ length: feedback.rating || 0 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                        {feedback.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatUkDateTime(feedback.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:sticky lg:top-6 h-fit">
            {selectedFeedback ? (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Feedback Details</CardTitle>
                  <CardDescription>
                    ID: {selectedFeedback.id.slice(0, 8)}...
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium capitalize">{selectedFeedback.feedback_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <p className="font-medium">{selectedFeedback.category}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rating:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: selectedFeedback.rating || 0 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={`${getStatusColor(selectedFeedback.status)} mt-1`}>
                        {selectedFeedback.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Message:</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap break-words">{selectedFeedback.message}</p>
                  </div>

                  {selectedFeedback.contact_requested && (
                    <div>
                      <span className="text-sm text-muted-foreground">Contact Email:</span>
                      <p className="mt-1 text-sm break-all">{selectedFeedback.contact_email}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm text-muted-foreground">Submitted:</span>
                    <p className="mt-1 text-sm">
                      {formatUkDateTime(selectedFeedback.created_at)}
                    </p>
                  </div>

                  {selectedFeedback.admin_notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Admin Notes:</span>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedFeedback.admin_notes}</p>
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t">
                    <label className="text-sm font-medium">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about this feedback..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFeedbackStatus(selectedFeedback.id, 'reviewing')}
                        disabled={updating || selectedFeedback.status === 'reviewing'}
                      >
                        Reviewing
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFeedbackStatus(selectedFeedback.id, 'resolved')}
                        disabled={updating || selectedFeedback.status === 'resolved'}
                      >
                        Resolved
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Feedback Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on a feedback item to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { formatUkDate } from '@/lib/dateFormat';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Users, Mail, Phone, ExternalLink } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

interface DuplicateStudent {
  student_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  duplicate_type: 'email' | 'phone';
  duplicate_match_ids: string[];
  match_count: number;
}

export function DuplicateStudentsPanel() {
  const [duplicates, setDuplicates] = useState<DuplicateStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadDuplicates = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase.rpc('find_duplicate_students', {
        p_limit: 100,
      });

      if (error) throw error;

      setDuplicates(data || []);
    } catch (error) {
      console.error('Error loading duplicate students:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load duplicates',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const handleRefresh = () => {
    loadDuplicates(true);
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/admin/students/${studentId}`);
  };

  // Group duplicates by match sets to avoid showing the same group multiple times
  const groupedDuplicates = duplicates.reduce((acc, dup) => {
    const key = [dup.student_id, ...dup.duplicate_match_ids].sort().join(',');
    if (!acc[key]) {
      acc[key] = dup;
    }
    return acc;
  }, {} as Record<string, DuplicateStudent>);

  const uniqueDuplicates = Object.values(groupedDuplicates);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Potential Duplicate Accounts
          </CardTitle>
          <CardDescription>
            Loading duplicate account detection...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Potential Duplicate Accounts
            </CardTitle>
            <CardDescription>
              Students who may have registered more than once with similar email or phone
              numbers
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {uniqueDuplicates.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No duplicates found</AlertTitle>
            <AlertDescription>
              No potential duplicate student accounts were detected. This is a good sign that
              your signup validation is working correctly.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Manual review required</AlertTitle>
              <AlertDescription>
                {uniqueDuplicates.length} potential duplicate group
                {uniqueDuplicates.length !== 1 ? 's' : ''} detected. Please review each case
                manually. Do not delete accounts without verifying with the students first.
              </AlertDescription>
            </Alert>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueDuplicates.map((dup) => (
                    <TableRow key={dup.student_id}>
                      <TableCell>
                        <div className="font-medium">{dup.full_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{dup.email}</span>
                          </div>
                          {dup.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{dup.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatUkDate(dup.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={dup.duplicate_type === 'email' ? 'default' : 'secondary'}
                        >
                          {dup.duplicate_type === 'email' ? (
                            <>
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </>
                          ) : (
                            <>
                              <Phone className="h-3 w-3 mr-1" />
                              Phone
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{dup.match_count} match{dup.match_count !== 1 ? 'es' : ''}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleViewStudent(dup.student_id)}
                          variant="ghost"
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> This detection uses normalised matching (ignoring dots in
                Gmail addresses and plus-addressing). Always verify manually before taking action.
                Students may have legitimate reasons for multiple accounts.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

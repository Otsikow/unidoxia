import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Search, ArrowUpDown, ExternalLink, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { isProfileGateClear, profileStillBlocks, requiresCompleteProfileForStatus, studentProfileLink } from '@/lib/coursefinderProfile';
import { fetchApplicationProfileGate, overrideApplicationProfileGate } from '@/lib/applicationProfileGate';
import { ProfileGateDialog } from '@/components/applications/ProfileGateDialog';

type StatusChange = {
  applicationId: string;
  studentId: string;
  oldStatus: string;
  newStatus: Database['public']['Enums']['application_status'];
  missingCount: number;
  sharingAuthorised: boolean;
};

interface Application {
  id: string;
  student_id: string;
  program_id: string;
  status: string;
  intake_month: number;
  intake_year: number;
  created_at: string;
  students?: {
    profile_id: string;
    profiles?: {
      full_name: string;
      email: string;
    };
  };
  programs?: {
    name: string;
    universities?: {
      name: string;
    };
  };
}

export default function ApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'created_at' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const { profile } = useAuth();
  const [gateBlock, setGateBlock] = useState<StatusChange | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterAndSortApplications();
  }, [searchQuery, statusFilter, sortField, sortOrder, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          student_id,
          program_id,
          status,
          intake_month,
          intake_year,
          created_at,
          students (
            profile_id,
            profiles!students_profile_id_fkey (
              full_name,
              email
            )
          ),
          programs (
            name,
            universities (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortApplications = () => {
    let filtered = [...applications];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (app) =>
          app.students?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.students?.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.programs?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.programs?.universities?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = a.status;
        bVal = b.status;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredApplications(filtered);
  };

  const handleStatusUpdate = async (
    applicationId: string,
    oldStatus: string,
    newStatus: Database['public']['Enums']['application_status'],
  ) => {
    try {
      // Moving on from draft or submitted needs a complete profile, unless the
      // application was created before go-live or an admin has overridden it.
      // The server enforces the same rule (enforce_application_profile_gate).
      if (requiresCompleteProfileForStatus(oldStatus, newStatus)) {
        const gate = await fetchApplicationProfileGate(applicationId);
        if (!isProfileGateClear(gate)) {
          const studentId = applications.find((app) => app.id === applicationId)?.student_id ?? '';
          setGateBlock({
            applicationId,
            studentId,
            oldStatus,
            newStatus,
            missingCount: profileStillBlocks(gate) ? Number(gate.missing_count ?? 0) : 0,
            sharingAuthorised: Boolean(gate.sharing_authorised),
          });
          return;
        }
      }

      const { data, error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)
        .select('id,status')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: 'Permission denied',
          description:
            `No row returned from update. This usually indicates RLS blocked the update. ` +
            `Application ID: ${applicationId}.`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Application status changed from ${oldStatus} → ${newStatus}.`,
      });

      // Refresh the applications
      fetchApplications();
    } catch (error: any) {
      console.error('Error updating application status:', {
        applicationId,
        oldStatus,
        newStatus,
        error,
      });
      toast({
        title: 'Error',
        description:
          `Failed to update application status. ` +
          `${error?.message ? `Raw: ${error.message}` : ''}`,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      draft: 'secondary',
      submitted: 'default',
      screening: 'outline',
      conditional_offer: 'default',
      unconditional_offer: 'default',
      cas_loa: 'default',
      visa: 'default',
      enrolled: 'default',
      withdrawn: 'destructive',
      deferred: 'secondary',
    };
    return colors[status] || 'outline';
  };

  const toggleSort = (field: 'created_at' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student, course, or university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="screening">Screening</SelectItem>
              <SelectItem value="conditional_offer">Conditional Offer</SelectItem>
              <SelectItem value="unconditional_offer">Unconditional Offer</SelectItem>
              <SelectItem value="cas_loa">CAS/LOA</SelectItem>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredApplications.length} of {applications.length} applications
        </div>

        {/* Applications Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>University</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('status')}
                    className="flex items-center gap-1"
                  >
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Intake</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('created_at')}
                    className="flex items-center gap-1"
                  >
                    Created
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading applications...
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {app.students?.profiles?.full_name || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {app.students?.profiles?.email || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {app.programs?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{app.programs?.universities?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Select
                        value={app.status ?? 'draft'}
                        onValueChange={(value) =>
                          handleStatusUpdate(
                            app.id,
                            app.status,
                            value as Database['public']['Enums']['application_status'],
                          )
                        }
                      >
                        <SelectTrigger className="w-[160px]">
                          <Badge variant={getStatusBadgeColor(app.status)}>
                            {app.status.replace(/_/g, ' ')}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="screening">Screening</SelectItem>
                          <SelectItem value="conditional_offer">Conditional Offer</SelectItem>
                          <SelectItem value="unconditional_offer">Unconditional Offer</SelectItem>
                          <SelectItem value="cas_loa">CAS/LOA</SelectItem>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="enrolled">Enrolled</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          <SelectItem value="deferred">Deferred</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(app.intake_year, app.intake_month - 1).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/student/applications/${app.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <ProfileGateDialog
        open={Boolean(gateBlock)}
        onOpenChange={(open) => !open && setGateBlock(null)}
        missingCount={gateBlock?.missingCount ?? 0}
        sharingAuthorised={gateBlock?.sharingAuthorised ?? false}
        profileHref={gateBlock?.studentId ? studentProfileLink(profile?.role, gateBlock.studentId) : null}
        canOverride={profile?.role === 'admin'}
        onOverride={async (reason) => {
          if (!gateBlock) return;
          const change = gateBlock;
          try {
            await overrideApplicationProfileGate(change.applicationId, reason);
          } catch (error: any) {
            toast({ title: 'Override not saved', description: error?.message ?? 'Please try again.', variant: 'destructive' });
            return;
          }
          setGateBlock(null);
          toast({ title: 'Override logged', description: 'The reason has been saved against this application.' });
          await handleStatusUpdate(change.applicationId, change.oldStatus, change.newStatus);
        }}
      />
    </Card>
  );
}

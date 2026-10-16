import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Search, Filter, UserPlus, ShieldCheck, Activity, Clock, Users as UsersIcon } from 'lucide-react';
import { differenceInDays, formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  active: boolean;
}

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  title?: string | null;
  status?: string | null;
  permissions?: string[] | null;
  created_at?: string | null;
  last_active_at?: string | null;
  total_logins?: number | null;
  tasks_completed?: number | null;
  active_sessions?: number | null;
  activity_score?: number | null;
}

type RawStaffProfile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  title?: string | null;
  position?: string | null;
  status?: string | null;
  account_status?: string | null;
  permissions?: string[] | null;
  dashboard_permissions?: string[] | null;
  created_at?: string | null;
  last_active_at?: string | null;
  activity_last_seen?: string | null;
  total_logins?: number | null;
  login_count?: number | null;
  tasks_completed?: number | null;
  completed_tasks?: number | null;
  active_sessions?: number | null;
  activity_score?: number | null;
};

const STAFF_MODULES = [
  {
    value: 'overview',
    label: 'Executive Overview',
    description: 'Summary metrics and platform health.',
  },
  {
    value: 'applications',
    label: 'Application Processing',
    description: 'Manage student applications and statuses.',
  },
  {
    value: 'payments',
    label: 'Financials & Payments',
    description: 'Access to invoices, settlements, and payouts.',
  },
  {
    value: 'reports',
    label: 'Insights & Reports',
    description: 'Download analytics and compliance exports.',
  },
  {
    value: 'messages',
    label: 'Messaging Console',
    description: 'Collaborate with agents, partners, and students.',
  },
  {
    value: 'tasks',
    label: 'Operational Tasks',
    description: 'Track staff tasks and follow-up reminders.',
  },
] as const;

const mapStaffProfile = (record: RawStaffProfile): StaffProfile => ({
  id: record.id,
  full_name: record.full_name ?? '',
  email: record.email ?? '',
  title: record.title ?? record.position ?? null,
  status: record.status ?? record.account_status ?? null,
  permissions: record.permissions ?? record.dashboard_permissions ?? [],
  created_at: record.created_at ?? null,
  last_active_at: record.last_active_at ?? record.activity_last_seen ?? null,
  total_logins: record.total_logins ?? record.login_count ?? null,
  tasks_completed: record.tasks_completed ?? record.completed_tasks ?? null,
  active_sessions: record.active_sessions ?? null,
  activity_score: record.activity_score ?? null,
});

export default function UsersTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'staff'>('all');
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    title: '',
    permissions: [] as string[],
  });
  const [savingStaff, setSavingStaff] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [permissionSelections, setPermissionSelections] = useState<string[]>([]);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaffProfiles = useCallback(async () => {
    try {
      setStaffLoading(true);
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(
          `id, full_name, email, title, position, status, account_status, permissions, dashboard_permissions, created_at, last_active_at, activity_last_seen, total_logins, login_count, tasks_completed, completed_tasks, active_sessions, activity_score`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(mapStaffProfile);
      setStaffProfiles(mapped);
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
      toast({
        variant: 'destructive',
        title: 'Unable to load staff accounts',
        description: 'Please refresh the page or try again later.',
      });
    } finally {
      setStaffLoading(false);
    }
  }, [toast]);

  const filterUsers = useCallback(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers();
    fetchStaffProfiles();
  }, [fetchUsers, fetchStaffProfiles]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-red-500',
      staff: 'bg-purple-500',
      agent: 'bg-blue-500',
      partner: 'bg-green-500',
      student: 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const handleToggleNewStaffPermission = (permission: string, checked: boolean | 'indeterminate') => {
    setNewStaff((prev) => {
      const permissions = new Set(prev.permissions);
      if (checked === true) {
        permissions.add(permission);
      } else {
        permissions.delete(permission);
      }
      return { ...prev, permissions: Array.from(permissions) };
    });
  };

  const handleOpenPermissionsDialog = (staff: StaffProfile) => {
    setSelectedStaff(staff);
    setPermissionSelections([...(staff.permissions ?? [])]);
    setPermissionsDialogOpen(true);
  };

  const handleTogglePermissionSelection = (permission: string, checked: boolean | 'indeterminate') => {
    setPermissionSelections((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(permission);
      } else {
        next.delete(permission);
      }
      return Array.from(next);
    });
  };

  const handleAddStaff = async () => {
    if (!newStaff.full_name.trim() || !newStaff.email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing required information',
        description: 'Full name and email are required to create a staff account.',
      });
      return;
    }

    try {
      setSavingStaff(true);
      const payload = {
        full_name: newStaff.full_name.trim(),
        email: newStaff.email.trim().toLowerCase(),
        title: newStaff.title.trim() || null,
        permissions: newStaff.permissions,
        status: 'invited',
      };

      // Insert into profiles table (staff_profiles is a view)
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          tenant_id: profile?.tenant_id,
          full_name: payload.full_name,
          email: payload.email,
          role: 'staff',
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setStaffProfiles((prev) => [mapStaffProfile(data), ...prev]);
      }

      toast({
        title: 'Staff account created',
        description: `${newStaff.full_name} can now access the admin dashboard.`,
      });

      setNewStaff({ full_name: '', email: '', title: '', permissions: [] });
      setIsAddStaffOpen(false);
    } catch (error) {
      console.error('Error creating staff account:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create staff account',
        description: 'Something went wrong while creating the staff profile.',
      });
    } finally {
      setSavingStaff(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;

    try {
      setUpdatingPermissions(true);
      const { error } = await supabase
        .from('profiles')
        .update({ role: permissionSelections as any } as any)
        .eq('id', selectedStaff.id);

      if (error) throw error;

      setStaffProfiles((prev) =>
        prev.map((staff) =>
          staff.id === selectedStaff.id
            ? { ...staff, permissions: permissionSelections }
            : staff
        )
      );

      toast({
        title: 'Permissions updated',
        description: `${selectedStaff.full_name}'s dashboard access has been refreshed.`,
      });
      setPermissionsDialogOpen(false);
      setSelectedStaff(null);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        variant: 'destructive',
        title: 'Unable to update permissions',
        description: 'Please try again or contact the platform administrator.',
      });
    } finally {
      setUpdatingPermissions(false);
    }
  };

  const staffMetrics = useMemo(() => {
    const total = staffProfiles.length;
    const active = staffProfiles.filter(
      (staff) => (staff.status ?? '').toLowerCase() === 'active'
        || staff.active_sessions !== null && (staff.active_sessions ?? 0) > 0
    ).length;
    const recentlyActive = staffProfiles.filter((staff) => {
      if (!staff.last_active_at) return false;
      return differenceInDays(new Date(), new Date(staff.last_active_at)) <= 7;
    }).length;
    const averagePermissions = total > 0
      ? staffProfiles.reduce((sum, staff) => sum + (staff.permissions?.length ?? 0), 0) / total
      : 0;
    const averageActivityScore = total > 0
      ? staffProfiles.reduce((sum, staff) => sum + (staff.activity_score ?? staff.tasks_completed ?? 0), 0) / total
      : 0;

    return {
      total,
      active,
      recentlyActive,
      averagePermissions,
      averageActivityScore,
    };
  }, [staffProfiles]);

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'staff')} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="all">All Users</TabsTrigger>
        <TabsTrigger value="staff">Internal Staff</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </div>

            {/* Users Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? 'default' : 'secondary'}>
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="staff">
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Internal Staff Access</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create staff accounts, assign dashboard permissions, and monitor activity trends.
              </p>
            </div>
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add Internal Staff</DialogTitle>
                  <DialogDescription>
                    Invite a staff member and configure their dashboard access before sending credentials.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="staff-name">Full name</Label>
                    <Input
                      id="staff-name"
                      value={newStaff.full_name}
                      onChange={(event) => setNewStaff((prev) => ({ ...prev, full_name: event.target.value }))}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">Work email</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      value={newStaff.email}
                      onChange={(event) => setNewStaff((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="jane.doe@bridgeglobal.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-title">Role or title</Label>
                    <Input
                      id="staff-title"
                      value={newStaff.title}
                      onChange={(event) => setNewStaff((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Admissions Specialist"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Dashboard modules</Label>
                      <p className="text-xs text-muted-foreground">
                        Select the modules this staff member can access within the admin dashboard.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {STAFF_MODULES.map((module) => (
                        <label
                          key={module.value}
                          className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={newStaff.permissions.includes(module.value)}
                            onCheckedChange={(checked) =>
                              handleToggleNewStaffPermission(module.value, checked)
                            }
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">{module.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddStaff} disabled={savingStaff}>
                    {savingStaff ? 'Creating...' : 'Create Staff Account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total staff</span>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{staffMetrics.total}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active this week</span>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{staffMetrics.recentlyActive}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average modules assigned</span>
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{staffMetrics.averagePermissions.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. activity score</span>
                  <Clock className="h-4 w-4 text-purple-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {staffMetrics.averageActivityScore.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        Loading staff accounts...
                      </TableCell>
                    </TableRow>
                  ) : staffProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No internal staff members found. Create your first staff account to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffProfiles.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{staff.full_name}</span>
                            <span className="text-xs text-muted-foreground">{staff.title || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{staff.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(staff.permissions ?? []).length === 0 ? (
                              <Badge variant="outline">No modules</Badge>
                            ) : (
                              staff.permissions!.map((permission) => (
                                <Badge key={permission} variant="secondary" className="capitalize">
                                  {permission.replace('-', ' ')}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {staff.last_active_at
                            ? formatDistanceToNow(new Date(staff.last_active_at), { addSuffix: true })
                            : 'No activity yet'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {staff.status && (
                              <Badge variant={staff.status.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                                {staff.status}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPermissionsDialog(staff)}
                            >
                              Manage Access
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust dashboard access</DialogTitle>
            <DialogDescription>
              Enable or disable modules for {selectedStaff?.full_name}. Changes apply immediately after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {STAFF_MODULES.map((module) => (
              <label
                key={module.value}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40"
              >
                <Checkbox
                  checked={permissionSelections.includes(module.value)}
                  onCheckedChange={(checked) =>
                    handleTogglePermissionSelection(module.value, checked)
                  }
                />
                <div>
                  <p className="text-sm font-medium leading-none">{module.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={updatingPermissions}>
              {updatingPermissions ? 'Saving' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

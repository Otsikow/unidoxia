import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { User, FileText, Bell, Lock, Settings, Award, Briefcase, Building2, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import ProfileInfoTab from '@/components/settings/ProfileInfoTab';
import DocumentsTab from '@/components/settings/DocumentsTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import PasswordSecurityTab from '@/components/settings/PasswordSecurityTab';
import AccountTab from '@/components/settings/AccountTab';
import { calculateProfileCompletion } from '@/lib/profileCompletion';
import { generateReferralLink } from '@/lib/referrals';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { useUniversityProfileCompletion } from '@/hooks/useUniversityProfileCompletion';
import { useAgentProfileCompletion } from '@/hooks/useAgentProfileCompletion';

const SETTINGS_TAB_VALUES = ['profile', 'documents', 'notifications', 'security', 'account'] as const;
type SettingsTab = (typeof SETTINGS_TAB_VALUES)[number];
const SETTINGS_TAB_SET = new Set<string>(SETTINGS_TAB_VALUES);

export default function ProfileSettings() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const initialTab = searchParams.get('tab');
    if (initialTab && SETTINGS_TAB_SET.has(initialTab)) {
      return initialTab as SettingsTab;
    }
    return 'profile';
  });
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const referralLink = profile ? generateReferralLink(profile.username) : '';
  const fallbackRoute = profile ? '/dashboard' : '/';
  const completionLink =
    profile?.role === 'partner'
      ? '/university/profile'
      : profile?.role === 'student'
        ? '/student/profile'
        : profile?.role === 'agent'
          ? '/agent/settings'
          : '/dashboard';

  const isAgent = profile?.role === 'agent';

  // Fetch university profile completion for partner users
  const isPartner = profile?.role === 'partner';
  const {
    completion: universityCompletion,
    isLoading: universityCompletionLoading,
    university,
  } = useUniversityProfileCompletion();

  // Fetch agent profile completion
  const {
    completion: agentCompletion,
    isLoading: agentCompletionLoading,
    checklist: agentChecklist,
    hasAgentProfile,
  } = useAgentProfileCompletion();

  // Fetch additional profile data based on role
  const { data: roleData, isLoading: roleDataLoading } = useQuery({
    queryKey: ['roleData', profile?.id, profile?.role],
    queryFn: async () => {
      if (!profile?.id) return null;

      if (profile.role === 'agent') {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('profile_id', profile.id)
          .single();
        
        if (error) throw error;
        return { type: 'agent', data };
      } else if (profile.role === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('profile_id', profile.id)
          .single();
        
        if (error) throw error;
        return { type: 'student', data };
      }

      return null;
    },
    enabled: !!profile?.id,
  });

  // Fetch applications count for students
  const { data: applicationsData } = useQuery({
    queryKey: ['studentApplications', roleData?.data?.id],
    queryFn: async () => {
      if (!roleData?.data?.id || roleData.type !== 'student') return null;

      const { data, error } = await supabase
        .from('applications')
        .select('id, status')
        .eq('student_id', roleData.data.id)
        .in('status', ['submitted', 'screening', 'enrolled']);

      if (error) throw error;
      return data;
    },
    enabled: roleData?.type === 'student' && !!roleData?.data?.id,
  });

  // Fetch referral stats for agents
  const { data: referralStats } = useQuery({
    queryKey: ['agentReferrals', profile?.id],
    queryFn: async () => {
      if (!profile?.id || profile.role !== 'agent') {
        return { direct: 0, levelTwo: 0, totalEarnings: 0 };
      }

      // @ts-expect-error - Deep type instantiation
      const { data, error } = await supabase
        .from('referral_relations')
        .select('level, amount')
        .eq('referrer_id', profile.id);

      if (error) throw error;

      const direct = data?.filter((row) => row.level === 1).length ?? 0;
      const levelTwo = data?.filter((row) => row.level === 2).length ?? 0;
      const totalEarnings = data?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;

      return { direct, levelTwo, totalEarnings };
    },
    enabled: profile?.role === 'agent' && !!profile?.id,
  });

  const referralSummary = referralStats ?? { direct: 0, levelTwo: 0, totalEarnings: 0 };
  const formattedReferralEarnings = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(referralSummary.totalEarnings),
    [referralSummary.totalEarnings]
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && SETTINGS_TAB_SET.has(tabParam)) {
      const normalized = tabParam as SettingsTab;
      if (normalized !== activeTab) {
        setActiveTab(normalized);
      }
      return;
    }
    if (!tabParam && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    if (!SETTINGS_TAB_SET.has(value)) return;
    const normalizedValue = value as SettingsTab;
    setActiveTab(normalizedValue);

    const nextParams = new URLSearchParams(searchParams);
    if (normalizedValue === 'profile') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', normalizedValue);
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Calculate profile completion percentage
  useEffect(() => {
    if (!profile) return;

    const percentage = calculateProfileCompletion(profile, roleData as any);
    setCompletionPercentage(percentage);
  }, [profile, roleData]);

  if (!profile || !user) {
    return (
      <div className="mx-auto flex w-full max-w-5xl justify-center px-4 py-16">
        <EmptyState
          icon={<User />}
          title="Not Authenticated"
          description="Please log in to access your profile settings."
        />
      </div>
    );
  }

  if (roleDataLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl justify-center px-4 py-16">
        <LoadingState message="Loading profile data..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header Section */}
        <div className="mb-8 space-y-3">
          <BackButton
            variant="ghost"
            size="sm"
            fallback={fallbackRoute}
            showHistoryMenu={false}
            wrapperClassName="inline-flex"
          />
          <div>
            <h1 className="text-3xl font-bold mb-2">Profile & Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Profile Completion Card */}
        {isPartner ? (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  University Profile
                </CardTitle>
                <CardDescription>
                  {university?.name
                    ? 'Your university profile is the single source of truth for partners and students.'
                    : 'Set up your university profile to get started.'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/university/profile')}
              >
                {university ? 'Edit profile' : 'Create profile'}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {universityCompletionLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-2 bg-muted animate-pulse rounded" />
                </div>
              ) : university ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {universityCompletion.percentage}% Complete
                      </span>
                      {universityCompletion.percentage < 100 && (
                        <span className="text-xs text-muted-foreground">
                          Missing: {universityCompletion.missingFields.slice(0, 2).join(', ')}
                          {universityCompletion.missingFields.length > 2 && '...'}
                        </span>
                      )}
                    </div>
                    <Progress value={universityCompletion.percentage} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{university.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Keep your university details complete to unlock full visibility.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    No university profile found
                  </span>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate('/university/profile')}
                  >
                    Create Profile
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : isAgent ? (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Agent Profile
                </CardTitle>
                <CardDescription>
                  Keep your agency details up to date to start submitting applications.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/agent/settings">
                  Update profile
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {agentCompletionLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-2 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {agentCompletion.percentage}% Complete
                      </span>
                      {agentCompletion.percentage < 100 && (
                        <span className="text-xs text-muted-foreground">
                          Missing: {agentCompletion.missingFields.slice(0, 2).join(', ')}
                          {agentCompletion.missingFields.length > 2 && '...'}
                        </span>
                      )}
                    </div>
                    <Progress value={agentCompletion.percentage} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{hasAgentProfile ? 'Agency details' : 'No agent profile found'}</p>
                      <p className="text-xs text-muted-foreground">
                        {hasAgentProfile
                          ? 'Complete verification and contact details to unlock full access.'
                          : 'Add your agency information to begin working with students.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Profile Completion
                </CardTitle>
                <CardDescription>
                  Complete your profile to get the most out of your account
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to={completionLink}>
                  Continue profile
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{completionPercentage}% Complete</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>

              {/* Role-specific stats */}
              {roleData?.type === 'agent' && roleData.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="font-semibold">Agent Info</span>
                  </div>
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground block">Referral Username</span>
                        <p className="font-mono font-bold">
                          {profile.username ? `@${profile.username}` : 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Referral Link</span>
                        <p className="font-mono break-all">
                          {referralLink || 'Available after username is set'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Direct Referrals</span>
                        <p className="font-bold">{referralSummary.direct}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Level 2 Referrals</span>
                        <p className="font-bold">{referralSummary.levelTwo}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground block">Referral Earnings</span>
                        <p className="font-bold">{formattedReferralEarnings}</p>
                      </div>
                    </div>
                </div>
              )}

              {roleData?.type === 'student' && applicationsData && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-semibold">Application Status</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Active Applications:</span>
                    <p className="font-bold text-lg">{applicationsData.length}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-max justify-start gap-2">
              <TabsTrigger value="profile" className="flex items-center gap-2 flex-shrink-0">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2 flex-shrink-0">
                <FileText className="h-4 w-4" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 flex-shrink-0">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 flex-shrink-0">
                <Lock className="h-4 w-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2 flex-shrink-0">
                <Settings className="h-4 w-4" />
                <span>Account</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile">
            <ProfileInfoTab profile={profile} roleData={roleData} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab profile={profile} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab profile={profile} />
          </TabsContent>

          <TabsContent value="security">
            <PasswordSecurityTab />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab profile={profile} />
          </TabsContent>
        </Tabs>
    </div>
  );
}

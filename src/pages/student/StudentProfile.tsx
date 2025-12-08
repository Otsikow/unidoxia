import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PersonalInfoTab } from '@/components/student/profile/PersonalInfoTab';
import { EducationTab } from '@/components/student/profile/EducationTab';
import { TestScoresTab } from '@/components/student/profile/TestScoresTab';
import { FinancesTab } from '@/components/student/profile/FinancesTab';
import { useToast } from '@/hooks/use-toast';
import { logError, formatErrorForToast } from '@/lib/errorUtils';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2, LogOut } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useErrorHandler, ErrorDisplay } from '@/hooks/useErrorHandler';
import { useStudentRecord, studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';

export default function StudentProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const {
    hasError,
    error,
    clearError,
    handleError,
    retry: retryWithHandler,
  } = useErrorHandler({ context: 'Student Profile' });

  const {
    data: studentRecord,
    isLoading: studentRecordLoading,
    error: studentRecordError,
    refetch: refetchStudentRecord,
    isFetching,
  } = useStudentRecord();

  const [activeTab, setActiveTab] = useState('personal');
  const [completeness, setCompleteness] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [isCalculatingCompleteness, setIsCalculatingCompleteness] = useState(false);
  const hasRedirectedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const recalcCompleteness = useCallback(async (record: Tables<'students'>) => {
    setIsCalculatingCompleteness(true);
    try {
      const personalDone = !!(
        record.legal_name &&
        record.contact_email &&
        record.passport_number
      );
      const financesDone =
        !!record.finances_json &&
        Object.keys(record.finances_json as Record<string, unknown>).length > 0;

      const [{ count: educationCount }, { count: testScoresCount }, { count: documentsCount }] =
        await Promise.all([
          supabase.from('education_records').select('*', { count: 'exact', head: true }).eq('student_id', record.id),
          supabase.from('test_scores').select('*', { count: 'exact', head: true }).eq('student_id', record.id),
          supabase.from('student_documents').select('*', { count: 'exact', head: true }).eq('student_id', record.id),
        ]);

      const educationDone = (educationCount || 0) > 0;
      const testsDone = (testScoresCount || 0) > 0;
      const documentsDone = (documentsCount || 0) >= 2;

      const items = [personalDone, educationDone, testsDone, financesDone, documentsDone];
      const done = items.filter(Boolean).length;
      const percent = Math.round((done / items.length) * 100);

      setCompletedSteps(done);
      setCompleteness(percent);

      if (record.profile_completeness !== percent) {
        await supabase
          .from('students')
          .update({ profile_completeness: percent })
          .eq('id', record.id);
      }
    } finally {
      setIsCalculatingCompleteness(false);
    }
  }, []);

  // Refresh data by invalidating the query and refetching
  const refreshStudentData = useCallback(async () => {
    try {
      clearError();
      
      // Invalidate the query to ensure fresh data
      await queryClient.invalidateQueries({
        queryKey: studentRecordQueryKey(user?.id),
      });
      
      // The refetch will happen automatically due to invalidation
      // But we can also explicitly refetch to ensure immediate update
      const { data, error } = await refetchStudentRecord();
      
      if (error) throw error;

      if (data) {
        await recalcCompleteness(data);
      }
    } catch (error) {
      logError(error, 'StudentProfile.refreshStudentData');
      handleError(error, 'Failed to refresh profile data');
      toast(formatErrorForToast(error, 'Failed to refresh profile data'));
    }
  }, [clearError, queryClient, user?.id, refetchStudentRecord, recalcCompleteness, handleError, toast]);

  const handleBackToHome = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleSignOut = useCallback(() => {
    void signOut({ redirectTo: '/' });
  }, [signOut]);

  // Handle URL hash for tab selection
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['personal', 'education', 'tests', 'finances'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Handle student record loading and initialization
  useEffect(() => {
    if (studentRecordLoading) return;

    clearError();

    if (studentRecordError) {
      logError(studentRecordError, 'StudentProfile.load');
      handleError(studentRecordError, 'Failed to load profile data');
      toast(formatErrorForToast(studentRecordError, 'Failed to load profile data'));
      return;
    }

    if (!studentRecord) {
      if (!hasRedirectedRef.current) {
        toast({
          title: 'Profile Setup Required',
          description: 'Please complete your student profile to continue',
        });
        navigate('/student/onboarding');
        hasRedirectedRef.current = true;
      }
      return;
    }

    // Calculate completeness when student record changes
    if (!hasInitializedRef.current || studentRecord) {
      hasInitializedRef.current = true;
      recalcCompleteness(studentRecord).catch((error) => {
        logError(error, 'StudentProfile.recalcCompleteness');
      });
    }
  }, [studentRecord, studentRecordLoading, studentRecordError, handleError, toast, clearError, navigate, recalcCompleteness]);

  // Update URL hash when tab changes
  useEffect(() => {
    if (['personal', 'education', 'tests', 'finances'].includes(activeTab)) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Derived loading state - only show loading on initial load, not on refetch
  const isLoading = studentRecordLoading && !studentRecord;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto py-6 md:py-8 px-4 space-y-6">
          <BackButton
            variant="ghost"
            size="sm"
            fallback="/dashboard"
            onClick={(event) => {
              event.preventDefault();
              handleBackToHome();
            }}
          />
            <ErrorDisplay
              error={error}
              onRetry={() => retryWithHandler(refreshStudentData)}
              onClear={clearError}
            />
        </div>
      </div>
    );
  }

  if (!studentRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Loader2 className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Profile Not Found</h2>
              <p className="text-muted-foreground">
                We couldn't find your student profile. You may need to complete onboarding first.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => navigate('/student/onboarding')}>
                Complete Onboarding
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto py-6 md:py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <BackButton
            variant="ghost"
            size="sm"
            fallback="/dashboard"
            onClick={(event) => {
              event.preventDefault();
              handleBackToHome();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="sm:hidden text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">My Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Keep your information up to date to ensure smooth application processing
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="hidden sm:flex text-destructive border-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

          {/* Progress Overview */}
          <Card className="hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Profile Completeness</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {completeness}% complete • {completedSteps} of 5 steps completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Progress value={completeness} className="h-3" />
                <span className="absolute right-2 -top-1 text-xs font-medium">
                  {completeness}%
                </span>
              </div>
              {completeness < 100 && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Tip: Upload documents like passport and transcripts in the{' '}
                  <Link className="underline" to="/student/documents">
                    Documents
                  </Link>{' '}
                  section to improve completeness.
                </p>
              )}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 h-auto p-1 sm:p-2">
              <TabsTrigger value="personal" className="text-sm sm:text-base">
                Personal Info
              </TabsTrigger>
              <TabsTrigger value="education" className="text-sm sm:text-base">
                Education
              </TabsTrigger>
              <TabsTrigger value="tests" className="text-sm sm:text-base">
                Test Scores
              </TabsTrigger>
              <TabsTrigger value="finances" className="text-sm sm:text-base">
                Finances
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 animate-fade-in">
                <PersonalInfoTab student={studentRecord} onUpdate={refreshStudentData} />
            </TabsContent>

            <TabsContent value="education" className="space-y-4 animate-fade-in">
                <EducationTab studentId={studentRecord.id} onUpdate={refreshStudentData} />
            </TabsContent>

            <TabsContent value="tests" className="space-y-4 animate-fade-in">
                <TestScoresTab studentId={studentRecord.id} onUpdate={refreshStudentData} />
            </TabsContent>

            <TabsContent value="finances" className="space-y-4 animate-fade-in">
                <FinancesTab student={studentRecord} onUpdate={refreshStudentData} />
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}

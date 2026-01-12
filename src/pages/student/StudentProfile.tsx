import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PersonalInfoTab } from '@/components/student/profile/PersonalInfoTab';
import { EducationTab } from '@/components/student/profile/EducationTab';
import { TestScoresTab } from '@/components/student/profile/TestScoresTab';
import { FinancesTab } from '@/components/student/profile/FinancesTab';
import { SopTab } from '@/components/student/profile/SopTab';
import { useToast } from '@/hooks/use-toast';
import { logError, formatErrorForToast } from '@/lib/errorUtils';
import {
  getMissingRequiredStudentDocuments,
  type RequiredStudentDocument,
} from '@/lib/studentDocuments';
import type { Tables } from '@/integrations/supabase/types';
import { Circle, CheckCircle, Loader2, ChevronRight, AlertTriangle } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useErrorHandler, ErrorDisplay } from '@/hooks/useErrorHandler';
import { useStudentRecord, studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { useAuth } from '@/hooks/useAuth';

export default function StudentProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
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
  const [checklist, setChecklist] = useState<
    { id: string; title: string; description: string; completed: boolean; link: string }[]
  >([]);
  const [isCalculatingCompleteness, setIsCalculatingCompleteness] = useState(false);
  const [missingDocuments, setMissingDocuments] = useState<RequiredStudentDocument[]>([]);
  const [missingDocumentsLoading, setMissingDocumentsLoading] = useState(true);
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

      const [
        { count: educationCount },
        { count: testScoresCount },
        { count: documentsCount },
        { count: sopCount },
      ] =
        await Promise.all([
          supabase.from('education_records').select('*', { count: 'exact', head: true }).eq('student_id', record.id),
          supabase.from('test_scores').select('*', { count: 'exact', head: true }).eq('student_id', record.id),
          supabase.from('student_documents').select('*', { count: 'exact', head: true }).eq('student_id', record.id),
          supabase
            .from('student_documents')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', record.id)
            .eq('document_type', 'personal_statement'),
        ]);

      const educationDone = (educationCount || 0) > 0;
      const testsDone = (testScoresCount || 0) > 0;
      const documentsDone = (documentsCount || 0) >= 2;
      const sopDone = (sopCount || 0) > 0;

      const items = [personalDone, educationDone, testsDone, financesDone, documentsDone, sopDone];
      const done = items.filter(Boolean).length;
      const percent = Math.round((done / items.length) * 100);

      setCompletedSteps(done);
      setCompleteness(percent);
      setChecklist([
        {
          id: 'personal',
          title: 'Personal Info',
          description: 'Legal name, contact email, and passport details',
          completed: personalDone,
          link: '/student/profile#personal',
        },
        {
          id: 'education',
          title: 'Education',
          description: 'Add at least one education record',
          completed: educationDone,
          link: '/student/profile#education',
        },
        {
          id: 'tests',
          title: 'Test Scores',
          description: 'Provide English test results',
          completed: testsDone,
          link: '/student/profile#tests',
        },
        {
          id: 'finances',
          title: 'Finances',
          description: 'Add your financial information',
          completed: financesDone,
          link: '/student/profile#finances',
        },
        {
          id: 'documents',
          title: 'Documents',
          description: 'Upload your passport, passport photo, transcript, SOP, CV, and English proficiency statement',
          completed: documentsDone,
          link: '/student/documents',
        },
        {
          id: 'sop',
          title: 'Statement of Purpose',
          description: 'Generate and save your SOP',
          completed: sopDone,
          link: '/student/profile#sop',
        },
      ]);

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

  const loadMissingDocuments = useCallback(
    async (studentId: string) => {
      setMissingDocumentsLoading(true);
      try {
        const { data, error } = await supabase
          .from('student_documents')
          .select('document_type')
          .eq('student_id', studentId);

        if (error) throw error;

        setMissingDocuments(getMissingRequiredStudentDocuments(data ?? []));
      } catch (error) {
        logError(error, 'StudentProfile.loadMissingDocuments');
        toast(formatErrorForToast(error, 'Failed to load missing documents'));
      } finally {
        setMissingDocumentsLoading(false);
      }
    },
    [toast],
  );

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

  const DEFAULT_TENANT_ID =
    import.meta.env.VITE_DEFAULT_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const [creatingProfile, setCreatingProfile] = useState(false);

  const createStudentProfile = useCallback(async () => {
    if (!user?.id) return;
    setCreatingProfile(true);
    try {
      const tenantId = profile?.tenant_id ?? DEFAULT_TENANT_ID;
      const { error } = await supabase.from('students').insert({
        tenant_id: tenantId,
        profile_id: user.id,
      });

      if (error) {
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: studentRecordQueryKey(user.id) });
      await refetchStudentRecord();

      toast({
        title: 'Profile created',
        description: 'Your student profile is ready. Please complete your details below.',
      });
    } catch (error) {
      logError(error, 'StudentProfile.createStudentProfile');
      toast(formatErrorForToast(error, 'Failed to create student profile'));
    } finally {
      setCreatingProfile(false);
    }
  }, [DEFAULT_TENANT_ID, profile?.tenant_id, queryClient, refetchStudentRecord, toast, user?.id]);

  // Handle URL hash for tab selection
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['personal', 'education', 'tests', 'finances', 'sop'].includes(hash)) {
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
          description: 'We need to create your student profile before you can continue.',
        });
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

  useEffect(() => {
    if (!studentRecord?.id) return;
    void loadMissingDocuments(studentRecord.id);
  }, [studentRecord?.id, loadMissingDocuments, isFetching]);

  // Update URL hash when tab changes
  useEffect(() => {
    if (['personal', 'education', 'tests', 'finances', 'sop'].includes(activeTab)) {
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
                We couldn't find your student profile yet. Create it now to continue.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={createStudentProfile} disabled={creatingProfile}>
                {creatingProfile ? 'Creating...' : 'Create profile'}
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
        <BackButton
          variant="ghost"
          size="sm"
          fallback="/dashboard"
          onClick={(event) => {
            event.preventDefault();
            handleBackToHome();
          }}
        />

        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Keep your information up to date to ensure smooth application processing
          </p>
        </div>

          {/* Progress Overview */}
          <Card className="hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Profile Completeness</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {completeness}% complete • {completedSteps} of {checklist.length || 6} steps completed
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
                  Tip: Upload your passport, passport photo, transcript, SOP, CV, and English
                  proficiency statement in the{' '}
                  <Link className="underline" to="/student/documents">
                    Documents
                  </Link>{' '}
                  section to improve completeness.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Missing Required Documents
              </CardTitle>
              <CardDescription>
                Track the core documents all universities require so you can complete your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {missingDocumentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking document status...
                </div>
              ) : missingDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All required documents are on file. You are ready for submissions.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload the remaining documents in{' '}
                    <Link className="underline" to="/student/documents">
                      Documents
                    </Link>
                    .
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingDocuments.map((doc) => (
                      <Badge key={doc.type} variant="outline" className="border-amber-500 text-amber-600">
                        {doc.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Profile Checklist</CardTitle>
              <CardDescription>
                Track what’s left to reach 100% completeness.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => {
                const handleItemClick = () => {
                  if (item.id === 'documents') {
                    navigate('/student/documents');
                  } else {
                    setActiveTab(item.id);
                    // Smooth scroll to tabs section
                    const tabsElement = document.querySelector('[role="tablist"]');
                    if (tabsElement) {
                      tabsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                };

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={handleItemClick}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all duration-200 text-left group"
                  >
                    {item.completed ? (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-tight mt-0.5">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto p-1 sm:p-2">
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
                <TabsTrigger value="sop" className="text-sm sm:text-base">
                  SOP
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

            <TabsContent value="sop" className="space-y-4 animate-fade-in">
                <SopTab studentId={studentRecord.id} onUpdate={refreshStudentData} />
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}

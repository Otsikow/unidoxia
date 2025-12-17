import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TypingAnimation } from '@/components/ui/TypingAnimation';
import {
  CheckCircle,
  FileText,
  GraduationCap,
  Award,
  DollarSign,
  FileCheck,
  IdCard,
  ScrollText,
  School,
  CreditCard,
  ShieldCheck,
  ClipboardList,
  Compass,
  PlaneTakeoff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { NextStepNavigator, type NavigatorStep } from '@/components/student/NextStepNavigator';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
}

type StudentDocumentSummary = Pick<
  Tables<'student_documents'>,
  'id' | 'document_type' | 'created_at' | 'updated_at'
>;

type ApplicationSummary = Pick<
  Tables<'applications'>,
  'id' | 'status' | 'updated_at' | 'created_at' | 'submitted_at'
>;

type PaymentSummary = Pick<
  Tables<'payments'>,
  'id' | 'status' | 'purpose' | 'application_id' | 'created_at' | 'updated_at'
>;

const DEFAULT_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'unidoxia';
const DEFAULT_TENANT_ID = import.meta.env.VITE_DEFAULT_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const getRecordTimestamp = (record?: { updated_at: string | null; created_at: string | null } | null) =>
  record?.updated_at ?? record?.created_at ?? null;

const buildNavigatorSteps = (
  documents: StudentDocumentSummary[],
  applications: ApplicationSummary[],
  payments: PaymentSummary[],
): NavigatorStep[] => {
  const findDoc = (type: string) => documents.find((doc) => doc.document_type === type);
  const passportDoc = findDoc('passport');
  const transcriptDoc = findDoc('transcript');
  const sopDoc = findDoc('personal_statement');
  const visaDoc = findDoc('financial_document');
  const hasApplications = applications.length > 0;
  
  const sortedPayments = [...payments].sort((a, b) => {
    const aTs = new Date(getRecordTimestamp(a) ?? 0).getTime();
    const bTs = new Date(getRecordTimestamp(b) ?? 0).getTime();
    return bTs - aTs;
  });
  const successfulPayment = sortedPayments.find((payment) => payment.status === 'succeeded');
  const hasPaidFee = Boolean(successfulPayment);

  // Step 1: Start your profile
  // Sub-tasks: Passport, Transcript, SOP.
  const step1Complete = Boolean(passportDoc && transcriptDoc && sopDoc);
  
  // Step 2: Get matched and supported
  // Sub-tasks: Applications, Payment.
  const step2Complete = hasApplications && hasPaidFee;

  // Step 3: Receive offers and visa guidance
  // Sub-tasks: Visa doc.
  const step3Complete = Boolean(visaDoc);

  const steps: NavigatorStep[] = [
    {
      id: 'step-1',
      title: 'Start your profile',
      description: 'Create your profile once, upload your documents, and let our AI build your perfect application package.',
      completed: step1Complete,
      status: step1Complete ? 'complete' : 'active',
      aiHint: step1Complete 
        ? 'Profile ready! AI is matching you to universities.' 
        : 'AI needs your passport, transcript, and SOP to start matching.',
      actionLabel: step1Complete ? 'View documents' : 'Complete profile',
      actionHref: '/student/documents',
      icon: ClipboardList,
      lastUpdated: getRecordTimestamp(passportDoc ?? transcriptDoc ?? sopDoc ?? null),
    },
    {
      id: 'step-2',
      title: 'Get matched and supported',
      description: 'Get matched with best-fit universities and receive personalized support from verified agents and our AI guide, Zoe.',
      completed: step2Complete,
      status: step2Complete ? 'complete' : (step1Complete ? 'active' : 'pending'),
      aiHint: step2Complete 
        ? 'Applications submitted. AI is tracking offers.' 
        : 'Select universities and pay the fee to get full support.',
      actionLabel: hasApplications ? 'View applications' : 'Find universities',
      actionHref: hasApplications ? '/student/applications' : '/student/applications/new',
      icon: Compass,
      lastUpdated: getRecordTimestamp(applications[0] ?? successfulPayment ?? null),
    },
    {
      id: 'step-3',
      title: 'Receive offers and visa guidance',
      description: 'Accept your offers, navigate the visa process with confidence, and prepare for your journey abroad.',
      completed: step3Complete,
      status: step3Complete ? 'complete' : (step2Complete ? 'active' : 'pending'),
      aiHint: step3Complete 
        ? 'Visa documents ready. Good luck!' 
        : 'Upload financial proofs to unlock visa guidance.',
      actionLabel: step3Complete ? 'View visa docs' : 'Upload visa docs',
      actionHref: '/student/documents',
      icon: PlaneTakeoff,
      lastUpdated: getRecordTimestamp(visaDoc ?? null),
    },
  ];

  return steps;
};

export default function StudentOnboarding() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fullWelcomeText = 'Welcome to UniDoxia';
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Tables<'students'> | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completeness, setCompleteness] = useState(0);
  const [navigatorSteps, setNavigatorSteps] = useState<NavigatorStep[]>([]);
  const [navigatorUpdatedAt, setNavigatorUpdatedAt] = useState<string | null>(null);
  const applicationIdsRef = useRef<string[]>([]);
  const [markingOnboarded, setMarkingOnboarded] = useState(false);

  const markOnboardingComplete = useCallback(async () => {
    if (!user?.id || profile?.role !== 'student') {
      navigate('/student/dashboard');
      return;
    }

    if (profile.onboarded) {
      navigate('/student/dashboard');
      return;
    }

    try {
      setMarkingOnboarded(true);
      const { error } = await supabase
        .from('profiles')
        .update({ onboarded: true })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast({
        title: 'Onboarding completed',
        description: 'Thanks for setting up your profile. Redirecting to your dashboard...'
      });
      navigate('/student/dashboard');
    } catch (error) {
      console.error('Error marking student onboarding complete:', error);
      toast({
        title: 'Unable to complete onboarding',
        description: 'Please try again or contact support if the issue persists.',
        variant: 'destructive'
      });
    } finally {
      setMarkingOnboarded(false);
    }
  }, [navigate, profile?.role, profile?.onboarded, refreshProfile, toast, user?.id]);

  const resolveTenantId = useCallback(async (): Promise<string | null> => {
    try {
      if (profile?.tenant_id) {
        return profile.tenant_id;
      }

      if (user?.id) {
        const { data: profileRecord, error: profileError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profileError && profileRecord?.tenant_id) {
          return profileRecord.tenant_id;
        }
      }

      const { data: tenantBySlug, error: slugError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', DEFAULT_TENANT_SLUG)
        .maybeSingle();

      if (!slugError && tenantBySlug?.id) {
        return tenantBySlug.id;
      }

      const { data: fallbackTenant, error: fallbackError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!fallbackError && fallbackTenant?.id) {
        return fallbackTenant.id;
      }
    } catch (error) {
      console.error('Error resolving tenant ID:', error);
    }

    return DEFAULT_TENANT_ID || null;
  }, [profile?.tenant_id, user?.id]);

  const fetchStudentData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get student record (if it exists)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (studentError) throw studentError;

      let currentStudent = studentData;

      if (!currentStudent) {
        const tenantId = await resolveTenantId();

        if (!tenantId) {
          console.warn('Unable to determine tenant for current student profile. Skipping student creation.');
          return;
        }

        const { data: createdStudent, error: createStudentError } = await supabase
          .from('students')
          .insert({ profile_id: user.id, tenant_id: tenantId })
          .select()
          .single();

        if (createStudentError) throw createStudentError;

        currentStudent = createdStudent;
      }

      let educationCount = 0;
      let testScoresCount = 0;
      let documentsCount = 0;
      let documentsList: StudentDocumentSummary[] = [];
      let applicationsList: ApplicationSummary[] = [];
      let paymentsList: PaymentSummary[] = [];

      if (currentStudent?.id) {
        const [
          { count: educationCountResult, error: educationError },
          { count: testScoresCountResult, error: testScoresError },
          { data: documentsData, error: documentsError },
        ] = await Promise.all([
          supabase
            .from('education_records')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', currentStudent.id),
          supabase
            .from('test_scores')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', currentStudent.id),
          supabase
            .from('student_documents')
            .select('id, document_type, created_at, updated_at')
            .eq('student_id', currentStudent.id)
            .order('created_at', { ascending: false }),
        ]);

        if (educationError) throw educationError;
        if (testScoresError) throw testScoresError;
        if (documentsError) throw documentsError;

        educationCount = educationCountResult ?? 0;
        testScoresCount = testScoresCountResult ?? 0;
        documentsList = documentsData ?? [];
        documentsCount = documentsList.length;

        const { data: applicationsData, error: applicationsError } = await supabase
          .from('applications')
          .select('id, status, updated_at, created_at, submitted_at')
          .eq('student_id', currentStudent.id)
          .order('created_at', { ascending: false });

        if (applicationsError) throw applicationsError;

        applicationsList = applicationsData ?? [];
        applicationIdsRef.current = applicationsList.map((app) => app.id);

        if (applicationIdsRef.current.length > 0) {
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('id, status, purpose, application_id, created_at, updated_at')
            .eq('purpose', 'application_fee')
            .in('application_id', applicationIdsRef.current);

          if (paymentsError) throw paymentsError;
          paymentsList = paymentsData ?? [];
        } else {
          applicationIdsRef.current = [];
        }
      }

      // Build checklist
      const items: ChecklistItem[] = [
        {
          id: 'step-1',
          title: 'Start your profile',
          description: 'Create your profile once, upload your documents, and let our AI build your perfect application package.',
          completed: !!(
            documentsList.some((d) => d.document_type === 'passport') &&
            documentsList.some((d) => d.document_type === 'transcript') &&
            documentsList.some((d) => d.document_type === 'personal_statement')
          ),
          icon: ClipboardList,
          link: '/student/documents',
        },
        {
          id: 'step-2',
          title: 'Get matched and supported',
          description: 'Get matched with best-fit universities and receive personalized support from verified agents and our AI guide, Zoe.',
          completed:
            applicationsList.length > 0 &&
            paymentsList.some((p) => p.status === 'succeeded'),
          icon: Compass,
          link: '/student/applications/new',
        },
        {
          id: 'step-3',
          title: 'Receive offers and visa guidance',
          description: 'Accept your offers, navigate the visa process with confidence, and prepare for your journey abroad.',
          completed: documentsList.some((d) => d.document_type === 'financial_document'),
          icon: PlaneTakeoff,
          link: '/student/documents',
        },
      ];

      setChecklist(items);

      // Calculate completeness
      const completedItems = items.filter((item) => item.completed).length;
      const percentage = Math.round((completedItems / items.length) * 100);
      setCompleteness(percentage);

      const navigator = buildNavigatorSteps(documentsList, applicationsList, paymentsList);
      setNavigatorSteps(navigator);
      const latestNavigatorTimestamp = navigator.reduce<number | null>((latest, step) => {
        if (!step.lastUpdated) return latest;
        const ts = new Date(step.lastUpdated).getTime();
        if (Number.isNaN(ts)) return latest;
        if (latest === null || ts > latest) {
          return ts;
        }
        return latest;
      }, null);
      setNavigatorUpdatedAt(
        latestNavigatorTimestamp ? new Date(latestNavigatorTimestamp).toISOString() : null,
      );

      // Update profile completeness in database
      if (currentStudent && currentStudent.profile_completeness !== percentage) {
        await supabase
          .from('students')
          .update({ profile_completeness: percentage })
          .eq('id', currentStudent.id);

        currentStudent = { ...currentStudent, profile_completeness: percentage };
      }

      setStudent(currentStudent ?? null);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load onboarding data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast, resolveTenantId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user) {
      fetchStudentData();
    } else {
      setLoading(false);
    }
  }, [authLoading, user, fetchStudentData]);

  useEffect(() => {
    if (!student?.id) return;

    const channel = supabase
      .channel(`student-onboarding-${student.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_documents', filter: `student_id=eq.${student.id}` },
        () => {
          fetchStudentData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `student_id=eq.${student.id}` },
        () => {
          fetchStudentData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: 'purpose=eq.application_fee' },
        (payload) => {
          const applicationId =
            ((payload as any)?.new?.application_id as string | undefined) ??
            ((payload as any)?.old?.application_id as string | undefined);

          if (applicationId && applicationIdsRef.current.includes(applicationId)) {
            fetchStudentData();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [student?.id, fetchStudentData]);

  useEffect(() => {
    if (profile?.role !== 'student' || profile.onboarded) return;
    if (completeness < 100) return;

    void markOnboardingComplete();
  }, [completeness, markOnboardingComplete, profile?.onboarded, profile?.role]);


  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-24 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto py-6 md:py-8 px-4 max-w-4xl space-y-6 md:space-y-8">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-2 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-center">
            <span className="sr-only">{fullWelcomeText}</span>
            <TypingAnimation 
              text={fullWelcomeText}
              speed={100}
              className="text-foreground"
            />
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Complete your profile to start applying to universities worldwide
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="hover:shadow-lg transition-shadow animate-fade-in">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl">Profile Completeness</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {completeness}% complete • {checklist.filter((i) => i.completed).length} of{' '}
                {checklist.length} steps completed
              </CardDescription>
            </div>
            <Button
              variant="default"
              onClick={markOnboardingComplete}
              disabled={markingOnboarded || profile?.onboarded || completeness < 60}
              className="w-full sm:w-auto"
            >
              {markingOnboarded ? 'Finalizing...' : profile?.onboarded ? 'Onboarding completed' : 'Finish onboarding'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Progress value={completeness} className="h-4" />
              <span className="absolute right-2 top-0.5 text-xs font-medium">
                {completeness}%
              </span>
            </div>
            {completeness === 100 ? (
              <div className="p-4 bg-success/10 rounded-lg border border-success/20 animate-fade-in">
                <p className="text-success font-medium flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Profile Complete! You're ready to start applying to programs.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Button asChild className="hover-scale flex-1">
                    <Link to="/courses?view=programs">Browse Courses</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/student/applications/new">Create Application</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete all steps below to unlock full access to university applications and features.
              </p>
            )}
          </CardContent>
        </Card>

        <NextStepNavigator steps={navigatorSteps} updatedAt={navigatorUpdatedAt} />

        {/* Onboarding Checklist */}
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold">Getting Started Checklist</h2>
            <Badge variant="outline" className="text-xs sm:text-sm">
              {checklist.filter((i) => i.completed).length}/{checklist.length} Complete
            </Badge>
          </div>
          <div className="space-y-3">
            {checklist.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  className={`hover:shadow-lg transition-all ${
                    item.completed ? 'border-success/50 bg-success/5' : 'hover:-translate-y-0.5'
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`rounded-full p-2.5 sm:p-3 flex-shrink-0 transition-colors ${
                          item.completed
                            ? 'bg-success text-success-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.completed ? (
                              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0 flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">{index + 1}</span>
                              </div>
                            )}
                            <h3 className="font-semibold text-base sm:text-lg break-words">
                              {item.title}
                            </h3>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {item.description}
                        </p>
                        {!item.completed ? (
                          <Link to={item.link}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="hover-scale w-full sm:w-auto"
                            >
                              Complete This Step
                            </Button>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 text-success text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Additional Resources */}
        <Card className="bg-muted/50 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our team is here to support you throughout your application journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/faq">View FAQ</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

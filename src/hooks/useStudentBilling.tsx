import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { StudentPlanType } from '@/types/billing';
import { getApplicationLimit, getPlanDisplayName } from '@/types/billing';

interface StudentWithBilling {
  id: string;
  plan_type: StudentPlanType;
  payment_confirmed_at: string | null;
  payment_date: string | null;
  assigned_agent_id: string | null;
}

export function useStudentBilling() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch student record with billing fields
  const {
    data: billingData,
    isLoading: billingLoading,
    error: billingError
  } = useQuery({
    queryKey: ['student-billing', user?.id],
    queryFn: async (): Promise<StudentWithBilling | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('students')
        .select('id, plan_type, payment_confirmed_at, payment_date, assigned_agent_id')
        .eq('profile_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }

      // Return billing data with defaults
      return {
        id: data.id,
        plan_type: (data.plan_type || 'free') as StudentPlanType,
        payment_confirmed_at: data.payment_confirmed_at,
        payment_date: data.payment_date,
        assigned_agent_id: data.assigned_agent_id,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch count of applications the student has submitted (non-draft applications)
  const {
    data: applicationCount,
    isLoading: countLoading,
  } = useQuery({
    queryKey: ['application-count', billingData?.id],
    queryFn: async (): Promise<number> => {
      if (!billingData?.id) return 0;

      // Get applications for this student (exclude drafts)
      const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('student_id', billingData.id)
        .neq('status', 'draft');

      if (error) {
        console.error('Error fetching application count:', error);
        return 0;
      }

      return data?.length ?? 0;
    },
    enabled: !!billingData?.id,
  });

  // Check if student can create new application (based on application limit for unpaid students)
  const canCreateApplication = (): boolean => {
    if (!billingData) return false;

    const planType = billingData.plan_type || 'free';
    const limit = getApplicationLimit(planType);

    // Unlimited for paid plans
    if (limit === null) return true;

    // Check against application limit for free plan (1 application max)
    return (applicationCount || 0) < limit;
  };

  // Get remaining applications for free plan
  const getRemainingApplications = (): number | null => {
    if (!billingData) return null;

    const planType = billingData.plan_type || 'free';
    const limit = getApplicationLimit(planType);

    if (limit === null) return null; // unlimited

    return Math.max(0, limit - (applicationCount || 0));
  };

  // Get plan display info
  const getPlanInfo = () => {
    if (!billingData) {
      return {
        planType: 'free' as StudentPlanType,
        displayName: getPlanDisplayName('free'),
        isPaid: false,
        hasAgent: false,
      };
    }

    const planType = (billingData.plan_type || 'free') as StudentPlanType;
    return {
      planType,
      displayName: getPlanDisplayName(planType),
      isPaid: planType !== 'free',
      hasAgent: Boolean(billingData.assigned_agent_id),
      agentId: billingData.assigned_agent_id,
      paymentDate: billingData.payment_confirmed_at || billingData.payment_date,
    };
  };

  return {
    studentId: billingData?.id || null,
    billingData,
    billingLoading,
    billingError,
    applicationCount: applicationCount || 0,
    countLoading,
    canCreateApplication,
    getRemainingApplications,
    getPlanInfo,
    refetch: () => {},
  };
}

// Hook to enforce application limits before creating
export function useApplicationLimitCheck() {
  const { toast } = useToast();
  const { canCreateApplication, getRemainingApplications, getPlanInfo } = useStudentBilling();

  const checkAndWarn = (): boolean => {
    if (!canCreateApplication()) {
      const planInfo = getPlanInfo();

      toast({
        title: 'Application Limit Reached',
        description: planInfo.planType === 'free'
          ? 'You have used your free application. Upgrade to Self-Service ($49) for unlimited applications or choose Agent-Supported ($200) for guided support.'
          : 'Unable to create new application. Please contact support.',
        variant: 'destructive',
      });

      return false;
    }
    return true;
  };

  return {
    canCreate: canCreateApplication(),
    remainingApplications: getRemainingApplications(),
    checkAndWarn,
    planInfo: getPlanInfo(),
  };
}

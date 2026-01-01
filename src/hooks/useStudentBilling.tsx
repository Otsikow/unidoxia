import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { StudentPlanType, StudentBillingRecord } from '@/types/billing';
import { getApplicationLimit, getPlanDisplayName } from '@/types/billing';

interface StudentWithBilling {
  id: string;
  plan_type: StudentPlanType;
  payment_type: string | null;
  payment_date: string | null;
  payment_amount_cents: number | null;
  payment_currency: string;
  refund_eligibility: boolean;
  payment_confirmed_at: string | null;
  assigned_agent_id: string | null;
  agent_assigned_at: string | null;
}

interface ApplicationCount {
  count: number;
}

export function useStudentBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch student billing record
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
        .select('id, plan_type, payment_type, payment_date, payment_amount_cents, payment_currency, refund_eligibility, payment_confirmed_at, assigned_agent_id, agent_assigned_at')
        .eq('profile_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }

      // Return billing data with defaults for any missing values
      return {
        id: data.id,
        plan_type: (data.plan_type as StudentPlanType) || 'free',
        payment_type: data.payment_type || null,
        payment_date: data.payment_date || null,
        payment_amount_cents: data.payment_amount_cents || null,
        payment_currency: data.payment_currency || 'USD',
        refund_eligibility: data.refund_eligibility ?? false,
        payment_confirmed_at: data.payment_confirmed_at || null,
        assigned_agent_id: data.assigned_agent_id || null,
        agent_assigned_at: data.agent_assigned_at || null,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch count of distinct universities the student has applied to (non-draft applications)
  const {
    data: universityCount,
    isLoading: countLoading,
  } = useQuery({
    queryKey: ['university-count', billingData?.id],
    queryFn: async (): Promise<number> => {
      if (!billingData?.id) return 0;

      // Get applications with their program's university to count distinct universities
      const { data, error } = await supabase
        .from('applications')
        .select('program:programs(university_id)')
        .eq('student_id', billingData.id)
        .neq('status', 'draft');

      if (error) {
        console.error('Error fetching university count:', error);
        return 0;
      }

      // Count distinct universities
      const uniqueUniversityIds = new Set(
        data
          ?.map((app) => (app.program as { university_id?: string } | null)?.university_id)
          .filter((id): id is string => !!id)
      );

      return uniqueUniversityIds.size;
    },
    enabled: !!billingData?.id,
  });

  // Check if student can create new application (based on university limit for unpaid students)
  const canCreateApplication = (): boolean => {
    if (!billingData) return false;

    const planType = billingData.plan_type || 'free';
    const limit = getApplicationLimit(planType);

    // Unlimited for paid plans
    if (limit === null) return true;

    // Check against university limit for free plan (1 university max)
    return (universityCount || 0) < limit;
  };

  // Get remaining universities for free plan
  const getRemainingApplications = (): number | null => {
    if (!billingData) return null;

    const planType = billingData.plan_type || 'free';
    const limit = getApplicationLimit(planType);

    if (limit === null) return null; // unlimited

    return Math.max(0, limit - (universityCount || 0));
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
      hasAgent: planType === 'agent_supported' && !!billingData.assigned_agent_id,
      agentId: billingData.assigned_agent_id,
      paymentDate: billingData.payment_date,
    };
  };

  return {
    studentId: billingData?.id || null,
    billingData,
    billingLoading,
    billingError,
    universityCount: universityCount || 0,
    countLoading,
    canCreateApplication,
    getRemainingApplications,
    getPlanInfo,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['student-billing', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['university-count'] });
    },
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
        title: 'University Limit Reached',
        description: planInfo.planType === 'free'
          ? 'You have reached the maximum of 1 university on the Free plan. Upgrade to apply to more universities.'
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

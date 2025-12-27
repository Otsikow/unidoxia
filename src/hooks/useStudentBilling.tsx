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

      // The students table doesn't have billing columns - return defaults
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }

      // Return default billing data since these columns don't exist yet
      return {
        id: data.id,
        plan_type: 'free' as StudentPlanType,
        payment_type: null,
        payment_date: null,
        payment_amount_cents: null,
        payment_currency: 'USD',
        refund_eligibility: false,
        payment_confirmed_at: null,
        assigned_agent_id: null,
        agent_assigned_at: null,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch application count
  const { 
    data: applicationCount,
    isLoading: countLoading,
  } = useQuery({
    queryKey: ['application-count', billingData?.id],
    queryFn: async (): Promise<number> => {
      if (!billingData?.id) return 0;

      const { count, error } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', billingData.id)
        .neq('status', 'draft');

      if (error) {
        console.error('Error fetching application count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!billingData?.id,
  });

  // Check if student can create new application
  const canCreateApplication = (): boolean => {
    if (!billingData) return false;
    
    const planType = billingData.plan_type || 'free';
    const limit = getApplicationLimit(planType);
    
    // Unlimited for paid plans
    if (limit === null) return true;
    
    // Check against limit for free plan
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
    applicationCount: applicationCount || 0,
    countLoading,
    canCreateApplication,
    getRemainingApplications,
    getPlanInfo,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['student-billing', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['application-count'] });
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
        title: 'Application Limit Reached',
        description: planInfo.planType === 'free' 
          ? 'You have reached the maximum of 1 application on the Free plan. Upgrade to apply to more universities.'
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

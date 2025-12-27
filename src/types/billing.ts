// Student Billing Types - One-time, Non-refundable Payments

export type StudentPlanType = 'free' | 'self_service' | 'agent_supported';
export type BillingPaymentType = 'one_time';

export interface StudentBillingRecord {
  plan_type: StudentPlanType;
  payment_type: BillingPaymentType | null;
  payment_date: string | null;
  payment_amount_cents: number | null;
  payment_currency: string;
  refund_eligibility: boolean;
  payment_confirmed_at: string | null;
  assigned_agent_id: string | null;
  agent_assigned_at: string | null;
}

export interface PricingPlan {
  id: StudentPlanType;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  limitations?: string[];
  isPopular?: boolean;
  paymentLabel: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Access',
    price: 0,
    currency: 'USD',
    description: 'Get started with one application',
    features: [
      'Register and apply to one university only',
      'Access to course discovery',
      'Basic profile creation',
    ],
    limitations: [
      'No agent support',
      'Maximum 1 application',
    ],
    paymentLabel: 'Free',
  },
  {
    id: 'self_service',
    name: 'Self-Service',
    price: 4900, // cents
    currency: 'USD',
    description: 'Apply to unlimited universities independently',
    features: [
      'Apply to as many universities as you want',
      'Manage applications independently',
      'Full access to all course information',
      'Document upload and management',
      'Application tracking',
    ],
    limitations: [
      'No dedicated agent support',
    ],
    isPopular: true,
    paymentLabel: 'One-Time Payment',
  },
  {
    id: 'agent_supported',
    name: 'Agent-Supported',
    price: 20000, // cents
    currency: 'USD',
    description: 'Full guidance from application to visa',
    features: [
      'Apply to multiple universities',
      'Dedicated UniDoxia Agent support',
      'Document review and verification',
      'Application guidance',
      'Offer letter support',
      'Visa preparation assistance',
      'Priority response times',
    ],
    paymentLabel: 'One-Time Payment',
  },
];

export function getPlanById(planId: StudentPlanType): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === planId);
}

export function formatPlanPrice(plan: PricingPlan): string {
  if (plan.price === 0) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency,
    minimumFractionDigits: 0,
  }).format(plan.price / 100);
}

export function getPlanDisplayName(planType: StudentPlanType): string {
  const names: Record<StudentPlanType, string> = {
    free: 'Free — 1 Application Only',
    self_service: 'Self-Service — Unlimited Applications (One-Time Payment)',
    agent_supported: 'Agent-Supported — Full Guidance (One-Time Payment)',
  };
  return names[planType];
}

export function getApplicationLimit(planType: StudentPlanType): number | null {
  if (planType === 'free') {
    return 1;
  }
  return null; // unlimited
}

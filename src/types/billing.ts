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
  stripePriceId?: string;
}

// Pricing configuration - All prices in cents (USD)
export const PRICING_CONFIG = {
  currency: 'USD',
  paymentType: 'one_time' as const,
  refundable: false,
  processingFee: 0, // No additional processing fees
  taxIncluded: true,
  supportEmail: 'payments@unidoxia.com',
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Access',
    price: 0,
    currency: 'USD',
    description: 'Get started with one application',
    features: [
      'Register and submit one application only',
      'Access to course discovery',
      'Basic profile creation',
      'AI-powered Zoe chatbot assistance',
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
    price: 4900, // $49.00 USD
    currency: 'USD',
    description: 'Apply to unlimited universities independently',
    features: [
      'Apply to unlimited universities',
      'Manage applications independently',
      'Full access to all course information',
      'Document upload and management',
      'Real-time application tracking',
      'AI-powered Zoe chatbot assistance',
      'Scholarship discovery tools',
    ],
    limitations: [
      'No dedicated agent support',
    ],
    isPopular: true,
    paymentLabel: 'One-Time Payment',
    stripePriceId: 'price_1SpAHh4wNWAbnULpZh7NqzqB',
  },
  {
    id: 'agent_supported',
    name: 'Agent-Supported',
    price: 20000, // $200.00 USD
    currency: 'USD',
    description: 'Full guidance from application to visa',
    features: [
      'Apply to unlimited universities',
      'Dedicated UniDoxia Agent support',
      'Document review and verification',
      'Personalized application guidance',
      'Offer letter negotiation support',
      'Visa preparation assistance',
      'Priority response times (24-48 hours)',
      'Direct messaging with your agent',
    ],
    paymentLabel: 'One-Time Payment',
    stripePriceId: 'price_agent_supported',
  },
];

// Payment Terms - Displayed across the platform
export const PAYMENT_TERMS = {
  title: 'Payment Terms',
  items: [
    'All payments are one-time and non-refundable',
    'No subscriptions or recurring charges',
    'No hidden fees or additional costs',
    'Secure payment processing via Stripe',
    'Instant plan activation upon payment',
  ],
};

// FAQ for pricing
export const PRICING_FAQ = [
  {
    question: 'Is this a subscription?',
    answer: 'No. All UniDoxia payments are one-time payments. You pay once and get permanent access to your plan\'s features.',
  },
  {
    question: 'Are payments refundable?',
    answer: 'No. All payments are non-refundable once completed. Please review your plan selection carefully before payment.',
  },
  {
    question: 'Will I be charged again later?',
    answer: 'No. There are no renewals or hidden charges. Your one-time payment grants you permanent access to your plan.',
  },
  {
    question: 'Can I upgrade my plan later?',
    answer: 'Yes. You can upgrade from Free to Self-Service or Agent-Supported at any time. Each upgrade is a separate one-time payment.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and select local payment methods through Stripe.',
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
    self_service: 'Self-Service — Unlimited Universities (One-Time Payment)',
    agent_supported: 'Agent-Supported — Full Guidance (One-Time Payment)',
  };
  return names[planType];
}

// Returns the maximum number of applications a student can submit based on their plan
// Free plan: 1 application, Paid plans: unlimited (null)
export function getApplicationLimit(planType: StudentPlanType): number | null {
  if (planType === 'free') {
    return 1; // Free plan can only submit 1 application
  }
  return null; // Paid plans: unlimited applications
}

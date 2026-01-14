import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Check, 
  X, 
  Shield, 
  CreditCard, 
  ArrowLeft, 
  Loader2,
  Zap,
  Users,
  FileCheck,
  MessageSquare,
  Globe,
  Clock,
} from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  PRICING_PLANS, 
  PRICING_FAQ,
  PAYMENT_TERMS,
  formatPlanPrice, 
  type StudentPlanType 
} from '@/types/billing';

export default function Pricing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<StudentPlanType | null>(null);

  const getDemoFallback = (error: unknown, data: unknown): boolean => {
    if (data && typeof data === 'object' && 'demo' in data && data.demo === true) {
      return true;
    }

    if (!error || typeof error !== 'object') return false;

    const contextBody = (error as { context?: { body?: unknown } }).context?.body;
    if (!contextBody) return false;

    if (typeof contextBody === 'string') {
      try {
        const parsed = JSON.parse(contextBody) as { demo?: boolean };
        return parsed.demo === true;
      } catch {
        return false;
      }
    }

    if (typeof contextBody === 'object' && 'demo' in contextBody) {
      return contextBody.demo === true;
    }

    return false;
  };

  // Check for payment status from URL
  const paymentStatus = searchParams.get('payment');
  const paymentNoticeHandled = useRef(false);

  useEffect(() => {
    if (paymentStatus !== 'cancelled' || paymentNoticeHandled.current) {
      return;
    }

    paymentNoticeHandled.current = true;

    toast({
      title: 'Payment Cancelled',
      description: 'Your payment was cancelled. You can try again when ready.',
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('payment');
    const nextSearch = nextParams.toString();

    navigate(
      {
        pathname: '/pricing',
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true }
    );
  }, [navigate, paymentStatus, searchParams, toast]);

  const handleSelectPlan = async (planId: StudentPlanType) => {
    if (!user) {
      navigate(`/auth/signup?plan=${planId}`);
      return;
    }
    
    if (planId === 'free') {
      navigate('/student/dashboard');
      return;
    }

    setLoadingPlan(planId);

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Please log in to continue');
      }

      // Call edge function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planCode: planId,
          successUrl: `${window.location.origin}/student/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/pricing?payment=cancelled`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // If Stripe not configured, fallback to demo checkout
        if (getDemoFallback(error, data)) {
          navigate(`/student/checkout?plan=${planId}`);
          return;
        }
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        // Fallback to internal checkout
        navigate(`/student/checkout?plan=${planId}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      if (getDemoFallback(error, null)) {
        navigate(`/student/checkout?plan=${planId}`);
        return;
      }
      // Fallback to internal checkout page
      navigate(`/student/checkout?plan=${planId}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <LandingHeader />
      
      <main className="container mx-auto px-4 pt-20 sm:pt-24 pb-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">Transparent Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Study Abroad Plan
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Simple, one-time payments with no hidden fees. Select the plan that fits your needs.
          </p>
          
          {/* Payment Terms Banner */}
          <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              One-time payment
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              No subscriptions
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-500" />
              No hidden charges
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {PRICING_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col transition-all duration-200 hover:shadow-lg ${
                plan.isPopular 
                  ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02] z-10' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {plan.isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="min-h-[48px]">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                {/* Price */}
                <div className="text-center py-4">
                  <div className="text-5xl font-bold tracking-tight">
                    {formatPlanPrice(plan)}
                  </div>
                  {plan.price > 0 ? (
                    <p className="text-sm font-medium text-primary mt-2">
                      {plan.paymentLabel} • Non-refundable
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground mt-2">
                      Forever free
                    </p>
                  )}
                </div>

                <Separator />

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation, idx) => (
                    <li key={`limit-${idx}`} className="flex items-start gap-3 text-muted-foreground">
                      <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* Non-refundable notice for paid plans */}
                {plan.price > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium text-center">
                      ⚠️ One-time, non-refundable payment
                    </p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.isPopular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : plan.price === 0 ? (
                    'Get Started Free'
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Select Plan
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* What's Included Section */}
        <section className="max-w-5xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">What's Included in All Plans</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">University Discovery</h3>
                <p className="text-sm text-muted-foreground">
                  Browse and search 500+ universities worldwide
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Zoe AI Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  24/7 AI-powered chatbot for instant answers
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Document Management</h3>
                <p className="text-sm text-muted-foreground">
                  Secure document upload and storage
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Real-time Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track your application status live
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Scholarship Finder</h3>
                <p className="text-sm text-muted-foreground">
                  Discover scholarships matching your profile
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Deadline Reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Never miss important application deadlines
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-16 py-8 border-y">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Secure Payment</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Powered by Stripe</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">No Hidden Fees</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Accepted Worldwide</span>
          </div>
        </div>

        {/* Payment Terms Section */}
        <section className="max-w-2xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {PAYMENT_TERMS.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PAYMENT_TERMS.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {PRICING_FAQ.map((faq, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of students who have successfully applied to their dream universities through UniDoxia.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => handleSelectPlan('self_service')}
              disabled={loadingPlan === 'self_service'}
            >
              {loadingPlan === 'self_service' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Get Self-Service — $49
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => handleSelectPlan('agent_supported')}
              disabled={loadingPlan === 'agent_supported'}
            >
              {loadingPlan === 'agent_supported' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Get Agent Support — $200
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            All payments are one-time and non-refundable. By purchasing, you agree to our{' '}
            <Link to="/legal/terms" className="underline hover:text-foreground">Terms of Service</Link>.
          </p>
        </section>
      </main>
    </div>
  );
}

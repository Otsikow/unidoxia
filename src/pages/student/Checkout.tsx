import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CreditCard, Shield, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  PRICING_PLANS, 
  formatPlanPrice, 
  getPlanById, 
  type StudentPlanType 
} from '@/types/billing';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const planId = searchParams.get('plan') as StudentPlanType | null;
  const plan = planId ? getPlanById(planId) : null;
  
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Fetch student ID
  useEffect(() => {
    const fetchStudentId = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .single();
      
      if (data) {
        setStudentId(data.id);
      }
    };
    
    fetchStudentId();
  }, [user?.id]);

  // Redirect if no plan selected
  useEffect(() => {
    if (!planId || !plan || plan.price === 0) {
      navigate('/pricing');
    }
  }, [planId, plan, navigate]);

  const handlePayment = async () => {
    if (!isConfirmed) {
      toast({
        title: 'Confirmation Required',
        description: 'Please confirm that you understand this is a one-time, non-refundable payment.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !studentId || !plan) {
      toast({
        title: 'Error',
        description: 'Unable to process payment. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get client IP for logging (approximate)
      const confirmationIp = 'client-ip'; // In production, get from server
      const confirmationUserAgent = navigator.userAgent;

      // Record the payment confirmation timestamp
      const { data: billingResult, error: billingError } = await supabase
        .rpc('upgrade_student_plan', {
          p_student_id: studentId,
          p_plan_type: plan.id,
          p_amount_cents: plan.price,
          p_currency: plan.currency,
          p_stripe_payment_intent: null, // Would be set after Stripe integration
          p_stripe_session_id: null,
          p_confirmation_ip: confirmationIp,
          p_confirmation_user_agent: confirmationUserAgent,
        });

      if (billingError) {
        throw billingError;
      }

      toast({
        title: 'Payment Successful!',
        description: `Your ${plan.name} plan is now active.`,
      });

      // If agent-supported, show agent assignment
      if (plan.id === 'agent_supported' && billingResult?.assigned_agent_id) {
        toast({
          title: 'Agent Assigned',
          description: 'A UniDoxia Agent has been assigned to guide you.',
        });
      }

      navigate('/student/dashboard');
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'There was an error processing your payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!plan) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => navigate('/pricing')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pricing
        </Button>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  {plan.features.slice(0, 4).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{plan.features.length - 4} more features
                    </p>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold">{formatPlanPrice(plan)}</span>
                </div>
                
                <Badge variant="secondary" className="w-full justify-center py-1">
                  One-Time Payment
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Complete Your Purchase
                </CardTitle>
                <CardDescription>
                  Secure payment powered by Stripe
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Important Notice */}
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> This is a one-time, non-refundable payment. 
                    There are no subscriptions, renewals, or hidden charges.
                  </AlertDescription>
                </Alert>

                {/* Stripe Payment Element would go here */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    Stripe payment form will be displayed here
                  </p>
                  <p className="text-xs mt-2">
                    For demo: Payment will be simulated
                  </p>
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
                  <Checkbox
                    id="payment-confirmation"
                    checked={isConfirmed}
                    onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="payment-confirmation"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    I understand that this is a <strong>one-time, non-refundable payment</strong>. 
                    I have reviewed the plan features and agree to proceed with this purchase.
                  </label>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>SSL Secured</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Stripe Payments</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!isConfirmed || isProcessing}
                  onClick={handlePayment}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay {formatPlanPrice(plan)}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  By completing this purchase, you agree to our{' '}
                  <Link to="/legal/terms" className="underline hover:text-foreground">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/legal/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

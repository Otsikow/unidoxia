import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  Check, 
  AlertTriangle, 
  Loader2,
  Lock,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  PRICING_PLANS, 
  PAYMENT_TERMS,
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

  // Redirect if no plan selected
  useEffect(() => {
    if (!planId || !plan || plan.price === 0) {
      navigate('/pricing');
    }
  }, [planId, plan, navigate]);

  const handleStripeCheckout = async () => {
    if (!isConfirmed) {
      toast({
        title: 'Confirmation Required',
        description: 'Please confirm that you understand this is a one-time, non-refundable payment.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !plan) {
      toast({
        title: 'Error',
        description: 'Unable to process payment. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planCode: plan.id,
          successUrl: `${window.location.origin}/student/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/student/checkout?plan=${plan.id}&payment=cancelled`,
        },
      });

      if (error) {
        if (data?.demo) {
          // Demo mode - simulate payment
          await handleDemoPayment();
          return;
        }
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return;
      }

      if (data?.demo) {
        // Demo mode - simulate payment
        await handleDemoPayment();
        return;
      }

      throw new Error('Unable to create checkout session');
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Payment unavailable',
        description: 'Stripe checkout could not be started. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoPayment = async () => {
    try {
      // Demo mode: Just show success message since billing columns don't exist yet
      // In production, this would update the student's plan in the database

      toast({
        title: 'Payment Successful!',
        description: `Your ${plan!.name} plan is now active.`,
      });

      // If agent-supported, show agent assignment info
      if (plan!.id === 'agent_supported') {
        toast({
          title: 'Agent Support',
          description: 'A UniDoxia Agent will be assigned to guide you shortly.',
        });
      }

      navigate('/student/dashboard?payment=success');
    } catch (error) {
      console.error('Demo payment error:', error);
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
    <div className="container max-w-4xl mx-auto px-4 py-8">
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
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-xl">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Plan Price</span>
                  <span>{formatPlanPrice(plan)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span className="text-green-600">$0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold">{formatPlanPrice(plan)}</span>
                </div>
              </div>

              <Badge variant="secondary" className="w-full justify-center py-1.5">
                One-Time Payment • Non-Refundable
              </Badge>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {PAYMENT_TERMS.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {PAYMENT_TERMS.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
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

              {/* Stripe Payment Info */}
              <div className="border rounded-lg p-6 bg-muted/30">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Lock className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Secure Stripe Checkout</span>
                </div>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  You will be redirected to Stripe's secure payment page to complete your purchase.
                </p>
                <div className="flex justify-center gap-4">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png"
                    alt="Stripe"
                    className="h-8 object-contain opacity-60"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Accepted Payment Methods</p>
                <div className="flex justify-center gap-2 text-muted-foreground">
                  <span className="px-2 py-1 border rounded text-xs">Visa</span>
                  <span className="px-2 py-1 border rounded text-xs">MasterCard</span>
                  <span className="px-2 py-1 border rounded text-xs">Amex</span>
                  <span className="px-2 py-1 border rounded text-xs">Discover</span>
                </div>
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
                  I understand that this is a <strong>one-time, non-refundable payment</strong> of{' '}
                  <strong>{formatPlanPrice(plan)}</strong>.
                  I have reviewed the plan features and agree to proceed with this purchase.
                </label>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground py-2">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-4 w-4 text-green-600" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>Worldwide</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                className="w-full"
                size="lg"
                disabled={!isConfirmed || isProcessing}
                onClick={handleStripeCheckout}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Pay {formatPlanPrice(plan)} Securely
                  </>
                )}
              </Button>
              {!isConfirmed && (
                <p className="text-xs text-center text-muted-foreground">
                  Please confirm the one-time, non-refundable payment to continue.
                </p>
              )}

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
  );
}

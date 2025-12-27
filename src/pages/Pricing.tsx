import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Shield, CreditCard, ArrowLeft } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { useAuth } from '@/hooks/useAuth';
import { PRICING_PLANS, formatPlanPrice, type StudentPlanType } from '@/types/billing';

export default function Pricing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = (planId: StudentPlanType) => {
    if (!user) {
      navigate(`/auth/signup?plan=${planId}`);
      return;
    }
    
    if (planId === 'free') {
      navigate('/student/dashboard');
      return;
    }
    
    navigate(`/student/checkout?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <LandingHeader />
      
      <div className="container mx-auto px-4 py-12">
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
          <Badge variant="secondary" className="mb-4">Simple Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Study Abroad Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            All payments are <strong>one-time</strong> and <strong>non-refundable</strong>. 
            No subscriptions. No hidden charges. No renewals.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {PRICING_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col ${
                plan.isPopular 
                  ? 'border-primary shadow-lg scale-105 z-10' 
                  : 'border-border'
              }`}
            >
              {plan.isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
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
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    {formatPlanPrice(plan)}
                  </div>
                  {plan.price > 0 && (
                    <p className="text-sm font-medium text-primary mt-1">
                      {plan.paymentLabel}
                    </p>
                  )}
                </div>

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
                      One-time, non-refundable payment
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
                >
                  {plan.price === 0 ? 'Get Started Free' : 'Select Plan'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5" />
            <span className="text-sm">Secure Payment</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">Stripe Protected</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Check className="h-5 w-5" />
            <span className="text-sm">No Hidden Fees</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Common Questions</h2>
          
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Is this a subscription?</h3>
              <p className="text-muted-foreground">
                No. All UniDoxia payments are one-time payments. You pay once and get permanent access to your plan's features.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Are payments refundable?</h3>
              <p className="text-muted-foreground">
                No. All payments are non-refundable once completed. Please review your plan selection carefully before payment.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Will I be charged again later?</h3>
              <p className="text-muted-foreground">
                No. There are no renewals or hidden charges. Your one-time payment grants you permanent access to your plan.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Can I upgrade my plan later?</h3>
              <p className="text-muted-foreground">
                Yes. You can upgrade from Free to Self-Service or Agent-Supported at any time. Each upgrade is a separate one-time payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} UniDoxia. All rights reserved.</p>
      </footer>
    </div>
  );
}

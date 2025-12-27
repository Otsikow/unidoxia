import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  ArrowUpRight,
  Shield,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { useStudentBilling } from "@/hooks/useStudentBilling";
import { 
  PRICING_PLANS, 
  PAYMENT_TERMS,
  formatPlanPrice, 
  getPlanById,
  type StudentPlanType 
} from "@/types/billing";

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  purpose: string;
  receipt_url: string | null;
  created_at: string;
  application_id: string | null;
  stripe_payment_intent: string | null;
  applications?: {
    programs: {
      name: string;
      universities: {
        name: string;
      };
    };
  };
}

export function StudentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getPlanInfo, billingData, billingLoading } = useStudentBilling();

  const planInfo = getPlanInfo();
  const currentPlan = getPlanById(planInfo.planType);

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", user?.id)
        .single();

      if (studentError || !studentData) {
        console.error("Error fetching student:", studentError);
        setLoading(false);
        return;
      }

      const { data: applicationsData } = await supabase
        .from("applications")
        .select("id")
        .eq("student_id", studentData.id);

      const applicationIds = applicationsData?.map((a) => a.id) || [];

      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          applications (
            programs (
              name,
              universities (
                name
              )
            )
          )
        `
        )
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
        toast({
          title: "Error",
          description: "Failed to load payments",
          variant: "destructive",
        });
      } else {
        setPayments(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      succeeded: "default",
      pending: "secondary",
      failed: "destructive",
      refunded: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPurposeLabel = (purpose: string) => {
    const labels: Record<string, string> = {
      application_fee: "Application Fee",
      service_fee: "Service Fee",
      deposit: "Deposit",
      tuition: "Tuition",
      plan_upgrade: "Plan Upgrade",
      other: "Other",
    };
    return labels[purpose] || purpose;
  };

  const totalPaid = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const nextDueDate = payments.find((p) => p.status === "pending");

  if (loading || billingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="Loading payment history..." />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8 max-w-6xl mx-auto px-3 sm:px-6">
      {/* HEADER */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
            Billing Center
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Payments & Billing
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage your plan, view invoices, and download receipts.
          </p>
        </div>
      </div>

      {/* CURRENT PLAN */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription className="mt-1">
                Your active subscription plan
              </CardDescription>
            </div>
            {currentPlan && (
              <Badge 
                variant={planInfo.isPaid ? "default" : "secondary"} 
                className="text-sm px-3 py-1"
              >
                {currentPlan.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Plan Details */}
            <div className="space-y-4">
              {currentPlan && (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatPlanPrice(currentPlan)}</span>
                    <span className="text-sm text-muted-foreground">
                      {currentPlan.price > 0 ? "one-time payment" : "forever free"}
                    </span>
                  </div>
                  
                  {planInfo.paymentDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Purchased on {formatDate(planInfo.paymentDate)}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {currentPlan.features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Upgrade Options */}
            {planInfo.planType !== 'agent_supported' && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold">Upgrade Your Plan</h4>
                <p className="text-sm text-muted-foreground">
                  Get more features and unlimited applications.
                </p>
                
                <div className="space-y-3">
                  {PRICING_PLANS.filter(p => {
                    if (planInfo.planType === 'free') return p.id !== 'free';
                    if (planInfo.planType === 'self_service') return p.id === 'agent_supported';
                    return false;
                  }).map((plan) => (
                    <div 
                      key={plan.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-background"
                    >
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">{formatPlanPrice(plan)}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/student/checkout?plan=${plan.id}`)}
                      >
                        Upgrade
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Link 
                  to="/pricing" 
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View all plans
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PRICING OVERVIEW */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pricing Overview
          </CardTitle>
          <CardDescription>
            All UniDoxia plans and their features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div 
                key={plan.id}
                className={`p-4 rounded-lg border ${
                  plan.id === planInfo.planType 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{plan.name}</h4>
                  {plan.id === planInfo.planType && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold mb-1">{formatPlanPrice(plan)}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {plan.price > 0 ? 'One-time payment' : 'Free forever'}
                </p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs">
                      <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Payment Terms */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {PAYMENT_TERMS.items.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-2xl border border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatAmount(totalPending, payments[0]?.currency || "USD")}
            </p>
            <p className="text-sm text-muted-foreground">
              {payments.filter((p) => p.status === "pending").length} pending
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {formatAmount(totalPaid, payments[0]?.currency || "USD")}
            </p>
            <p className="text-sm text-muted-foreground">
              {payments.filter((p) => p.status === "succeeded").length} invoices paid
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Next Due Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextDueDate ? (
              <div>
                <p className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-success" />
                  {formatDate(nextDueDate.created_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getPurposeLabel(nextDueDate.purpose)}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  No pending payments
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PAYMENT HISTORY */}
      <Card className="rounded-2xl border border-border/60 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Payment History
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No transactions yet</p>
              <Link to="/pricing">
                <Button variant="outline">View Pricing Plans</Button>
              </Link>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>

                      <TableCell className="min-w-[240px]">
                        <div>
                          <div className="font-medium">
                            {getPurposeLabel(payment.purpose)}
                          </div>
                          {payment.applications?.programs && (
                            <div className="text-sm text-muted-foreground">
                              {payment.applications.programs.name} —{" "}
                              {payment.applications.programs.universities?.name}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-medium">
                        {formatAmount(payment.amount_cents, payment.currency)}
                      </TableCell>

                      <TableCell>{getStatusBadge(payment.status)}</TableCell>

                      <TableCell className="text-right">
                        {payment.receipt_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              window.open(payment.receipt_url!, "_blank")
                            }
                          >
                            Receipt <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HELP SECTION */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Need help with payments?</h3>
              <p className="text-sm text-muted-foreground">
                Contact our support team for assistance with billing or payment issues.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/help">
                <Button variant="outline">Help Center</Button>
              </Link>
              <Link to="/contact">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

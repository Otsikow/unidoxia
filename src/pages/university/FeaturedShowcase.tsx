import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseEdgeFunctions";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";
import type { Database } from "@/integrations/supabase/types";

const FEATURED_PLANS = [
  {
    id: "spotlight_30" as const,
    label: "30-Day Spotlight",
    description: "Perfect for new campaigns or rapid course launches.",
    amountCents: 120_000,
    currency: "USD",
    durationDays: 30,
    defaultPriority: 8,
    features: [
      "Prominent homepage placement for 30 days",
      "Weekly inclusion in our student discovery newsletter",
      "Performance summary at the end of the campaign",
    ],
  },
  {
    id: "spotlight_90" as const,
    label: "90-Day Spotlight",
    description: "Sustain visibility across a full recruitment quarter.",
    amountCents: 300_000,
    currency: "USD",
    durationDays: 90,
    defaultPriority: 5,
    features: [
      "Quarter-long homepage hero rotation",
      "Newsletter feature and social amplification",
      "Bi-weekly insights with optimisation tips",
    ],
  },
  {
    id: "spotlight_180" as const,
    label: "180-Day Spotlight",
    description: "Lock-in premium visibility for strategic flagship courses.",
    amountCents: 540_000,
    currency: "USD",
    durationDays: 180,
    defaultPriority: 2,
    features: [
      "Six-month priority placement with campaign refresh",
      "Dedicated Partner Success review every month",
      "Conversion copy and creative optimisation included",
    ],
  },
];

type FeaturedPlan = (typeof FEATURED_PLANS)[number];

const ORDER_STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  inactive: { label: "Inactive", variant: "secondary" },
  pending: { label: "Pending review", variant: "outline" },
  active: { label: "Active", variant: "default" },
  expired: { label: "Expired", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

interface FeaturedListingOrder {
  id: string;
  plan_code: FeaturedPlan["id"];
  status: Database["public"]["Enums"]["featured_listing_status"];
  amount_cents: number;
  currency: string;
  created_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  summary: string | null;
  highlight: string | null;
  image_url: string | null;
  priority: number | null;
}

const formatCurrency = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const calculateDaysRemaining = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return null;
  const diffMs = expiryDate.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getStatusBadge = (
  status: Database["public"]["Enums"]["featured_listing_status"] | null | undefined,
) => {
  if (!status) {
    return { label: "Not subscribed", variant: "secondary" as const };
  }
  return ORDER_STATUS_LABELS[status];
};

const FeaturedShowcase = () => {
  const { data, refetch } = useUniversityDashboard();
  const { toast } = useToast();
  const { session, profile } = useAuth();

  const university = data?.university;
  const [orders, setOrders] = useState<FeaturedListingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<FeaturedPlan["id"]>("spotlight_90");
  const [summary, setSummary] = useState("");
  const [highlight, setHighlight] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priority, setPriority] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const activeOrder = useMemo(
    () => orders.find((order) => order.status === "active"),
    [orders],
  );

  const activePlan = useMemo(
    () => FEATURED_PLANS.find((plan) => plan.id === activeOrder?.plan_code) ?? null,
    [activeOrder],
  );

  const daysRemaining = useMemo(
    () => calculateDaysRemaining(university?.featured_listing_expires_at ?? null),
    [university?.featured_listing_expires_at],
  );

  const syncFormWithUniversity = useCallback(() => {
    if (!university) return;
    setSummary(university.featured_summary ?? "");
    setHighlight(university.featured_highlight ?? "");
    setImageUrl(university.featured_image_url ?? "");
    setPriority(
      typeof university.featured_priority === "number"
        ? String(university.featured_priority)
        : "",
    );
  }, [university]);

  const loadOrders = useCallback(async () => {
    if (!university?.id) return;
    setLoadingOrders(true);
    try {
      // Mock featured orders since table doesn't exist yet
      const orderRows: FeaturedListingOrder[] = [];

      setOrders(orderRows);
    } catch (error) {
      console.error("Failed to load featured orders", error);
      toast({
        title: "Unable to load spotlight history",
        description: "Please refresh the page or try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [toast, university?.id]);

  useEffect(() => {
    syncFormWithUniversity();
  }, [syncFormWithUniversity]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!university) return;
    const planFromPriority = FEATURED_PLANS.find(
      (plan) => plan.defaultPriority === (university.featured_priority ?? plan.defaultPriority),
    );
    if (planFromPriority) {
      setSelectedPlanId(planFromPriority.id);
    }
  }, [university]);

  const selectedPlan = useMemo(
    () => FEATURED_PLANS.find((plan) => plan.id === selectedPlanId) ?? FEATURED_PLANS[1],
    [selectedPlanId],
  );

  const handleGenerateImage = async () => {
    if (!university?.id) return;
    setIsGeneratingImage(true);
    try {
      const { data: response, error } = await invokeEdgeFunction<{ imageUrl?: string }>(
        "generate-university-image",
        {
          accessToken: session?.access_token,
          body: {
            universityId: university.id,
            name: university.name,
            city: university.city,
            country: university.country,
          },
        },
      );

      if (error) {
        throw new Error(error.message ?? "Unable to generate image");
      }

      if (!response?.imageUrl) {
        throw new Error("Image generator did not return a preview");
      }

      setImageUrl(response.imageUrl);
      toast({
        title: "Spotlight image generated",
        description: "A new hero image has been prepared. Remember to save your showcase.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate image";
      toast({
        title: "Image generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePurchase = async () => {
    if (!university?.id) return;
    if (!summary.trim()) {
      toast({
        title: "Add a spotlight summary",
        description: "A sharp headline helps our team feature your university effectively.",
        variant: "destructive",
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const { error } = await invokeEdgeFunction(
        "create-featured-listing-order",
        {
          accessToken: session?.access_token,
          body: {
            universityId: university.id,
            planCode: selectedPlan.id,
            summary: summary.trim(),
            highlight: highlight.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            priority:
              priority.trim() !== "" && Number.isFinite(Number(priority))
                ? Number(priority)
                : undefined,
          },
        },
      );

      if (error) {
        throw new Error(error.message ?? "Unable to activate spotlight");
      }

      toast({
        title: "Spotlight activated",
        description: selectedPlan.label + " is now live on the UniDoxia homepage.",
      });

      await loadOrders();
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process payment";
      toast({
        title: "Unable to activate spotlight",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!university) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Connect your university
          </CardTitle>
          <CardDescription>
            You need an active university profile before requesting a featured spotlight.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusBadge = getStatusBadge(university.featured_listing_status);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Spotlight your institution
          </div>
          <h1 className="text-3xl font-semibold">Featured Showcase</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Invest in premium placement across the UniDoxia. Spotlight plans include homepage hero rotation,
            newsletter features, and campaign insights tailored to your recruitment goals.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            {daysRemaining !== null && daysRemaining >= 0 ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" /> {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
              </Badge>
            ) : null}
            {activePlan ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> {activePlan.label}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" className="self-start gap-2" onClick={() => void loadOrders()} disabled={loadingOrders}>
            {loadingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh spotlight data
          </Button>
          <p className="text-xs text-muted-foreground">
            Tenant: {profile?.tenant_id?.slice(0, 8) ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Choose your spotlight plan
            </CardTitle>
            <CardDescription>
              Pricing shown in {selectedPlan.currency}. Each plan activates immediately upon payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {FEATURED_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isActivePlan = activePlan?.id === plan.id;
                const planClassName =
                  "w-full rounded-xl border bg-background p-4 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
                  (isSelected ? "border-primary shadow-sm shadow-primary/30" : "border-border");
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={planClassName}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{plan.label}</h3>
                          {isActivePlan ? (
                            <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700">
                              Current plan
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-primary">
                          {formatCurrency(plan.amountCents, plan.currency)}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.durationDays}-day cycle</p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="summary">Spotlight headline</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Global internships and accelerated admissions pathways for postgraduate talent."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highlight">Homepage highlight (optional)</Label>
                <Input
                  id="highlight"
                  value={highlight}
                  onChange={(event) => setHighlight(event.target.value)}
                  placeholder="Scholarships up to 40% | Fast CAS turnaround"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Display priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={99}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={String(selectedPlan.defaultPriority)}
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first on the homepage carousel. Leave blank to accept the recommended priority.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Hero image URL</Label>
                <Input
                  id="image"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://public.storage/featured-universities/example.jpg"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="gap-2"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate spotlight image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={syncFormWithUniversity}
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" /> Use saved content
                  </Button>
                </div>
              </div>
            </div>
            <Button className="w-full gap-2" size="lg" disabled={isPurchasing} onClick={handlePurchase}>
              {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {isPurchasing ? "Processing payment" : "Purchase " + selectedPlan.label}
            </Button>
            <p className="text-xs text-muted-foreground">
              Submitting payment instantly updates your featured placement. Our team reviews listings that are flagged for
              moderation.
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Spotlight performance
            </CardTitle>
            <CardDescription>
              Track active plans, renewal dates, and the messaging currently shown on the public site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">Current plan</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{activePlan?.label ?? "Not active"}</p>
                <p className="text-xs text-muted-foreground">
                  {activePlan
                    ? formatCurrency(activePlan.amountCents, activePlan.currency) +
                      " • " +
                      activePlan.durationDays +
                      "-day cycle"
                    : "Select a plan to activate your spotlight."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">Expires</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {university.featured_listing_expires_at ? formatDateTime(university.featured_listing_expires_at) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {daysRemaining !== null && daysRemaining >= 0
                    ? daysRemaining + " day" + (daysRemaining === 1 ? "" : "s") + " remaining"
                    : "Renew anytime to maintain visibility."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Live headline</p>
              <p className="text-base font-medium text-foreground">
                {university.featured_summary || "Add a compelling headline to stand out."}
              </p>
              <p className="text-sm text-muted-foreground">
                {university.featured_highlight ||
                  "Use highlights to communicate scholarships, turnaround times, or signature courses."}
              </p>
              {university.featured_image_url ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={university.featured_image_url}
                    alt="Featured university showcase"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Spotlight history</p>
                <Badge variant="outline">{orders.length} orders</Badge>
              </div>
              <div className="rounded-xl border border-dashed border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activated</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Investment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          No spotlight orders yet. Select a plan to be featured on the homepage.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => {
                        const plan = FEATURED_PLANS.find((item) => item.id === order.plan_code);
                        const status = ORDER_STATUS_LABELS[order.status];
                        const priorityLabel = (order.priority ?? plan?.defaultPriority ?? 99) + 1;
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {plan?.label ?? order.plan_code.replace(/_/g, " " )}
                              <p className="text-xs text-muted-foreground">Priority #{priorityLabel}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>{formatDateTime(order.activated_at)}</TableCell>
                            <TableCell>{formatDateTime(order.expires_at)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(order.amount_cents, order.currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeaturedShowcase;

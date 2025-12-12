import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/LoadingState";

interface Commission {
  id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "clawback";
  created_at: string;
  paid_at: string | null;
}

export default function CommissionTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);

      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("profile_id", user?.id)
        .single();

      if (agentError || !agentData) {
        throw agentError || new Error("Agent not found");
      }

      const { data, error } = await supabase
        .from("commissions")
        .select("id, amount_cents, currency, status, created_at, paid_at")
        .eq("agent_id", agentData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCommissions(data || []);
    } catch (err) {
      console.error("Error loading commissions", err);
      toast({
        title: "Unable to load commissions",
        description: "Real-time commission data could not be retrieved.",
        variant: "destructive",
      });
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setCommissions([]);
      return;
    }
    void fetchCommissions();
  }, [fetchCommissions, user]);

  const { totalAmount, pendingAmount, paidAmount } = useMemo(() => {
    const totals = commissions.reduce(
      (acc, commission) => {
        acc.totalAmount += commission.amount_cents;
        if (commission.status === "paid") acc.paidAmount += commission.amount_cents;
        if (commission.status === "pending" || commission.status === "approved") {
          acc.pendingAmount += commission.amount_cents;
        }
        return acc;
      },
      { totalAmount: 0, pendingAmount: 0, paidAmount: 0 },
    );

    return totals;
  }, [commissions]);

  if (loading) {
    return <LoadingState title="Loading commissions" description="Fetching your latest earnings" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Tracker</CardTitle>
        <CardDescription>Track your earnings and commissions</CardDescription>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No commissions yet</AlertTitle>
            <AlertDescription>
              Once you start enrolling students, real-time commission activity will appear here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="shadow-none border-border/60">
              <CardContent className="pt-6 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">
                    ${(totalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="shadow-none border-border/60">
              <CardContent className="pt-6 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">
                    ${(pendingAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="shadow-none border-border/60">
              <CardContent className="pt-6 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">
                    ${(paidAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

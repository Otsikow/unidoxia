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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentNotFound, setAgentNotFound] = useState(false);

  const fetchCommissions = useCallback(async () => {
    // Reset state
    setAgentNotFound(false);
    
    try {
      setLoading(true);

      // First try to get the agent record
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("profile_id", user?.id)
        .maybeSingle();

      // Handle case where user is not an agent (no error, just no data)
      if (!agentData) {
        // Check if it's a "no rows" situation vs an actual error
        if (agentError && agentError.code !== "PGRST116") {
          // This is an actual database error, not just "no rows found"
          console.error("Error fetching agent record:", agentError);
          toast({
            title: "Unable to load commissions",
            description: "There was an error accessing your agent profile.",
            variant: "destructive",
          });
        }
        // User is not an agent - this is expected for non-agent users
        setAgentNotFound(true);
        setCommissions([]);
        return;
      }

      // Fetch commissions for this agent
      const { data, error } = await supabase
        .from("commissions")
        .select("id, amount_cents, currency, status, created_at, paid_at")
        .eq("agent_id", agentData.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching commissions:", error);
        toast({
          title: "Unable to load commissions",
          description: "Real-time commission data could not be retrieved.",
          variant: "destructive",
        });
        setCommissions([]);
        return;
      }

      setCommissions(data || []);
    } catch (err) {
      console.error("Error loading commissions", err);
      toast({
        title: "Unable to load commissions",
        description: "An unexpected error occurred while loading commission data.",
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
    return <LoadingState message="Fetching your latest earnings" />;
  }

  // If user is not an agent, show appropriate message
  if (agentNotFound) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission Tracker</CardTitle>
          <CardDescription>Track your earnings and commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Agent profile required</AlertTitle>
            <AlertDescription>
              Commission tracking is available for registered agents. If you believe this is an error, please contact support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
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

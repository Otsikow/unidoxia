import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sparkles, User, ArrowRight } from 'lucide-react';
import { useStudentBilling } from '@/hooks/useStudentBilling';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StudentPlanType } from '@/types/billing';

const planIcons: Record<StudentPlanType, typeof User> = {
  free: User,
  self_service: Sparkles,
  agent_supported: Crown,
};

const planColors: Record<StudentPlanType, string> = {
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  self_service: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  agent_supported: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

const planBadgeColors: Record<StudentPlanType, string> = {
  free: 'bg-slate-500',
  self_service: 'bg-blue-500',
  agent_supported: 'bg-amber-500',
};

interface PlanStatusCardProps {
  compact?: boolean;
}

export function PlanStatusCard({ compact = false }: PlanStatusCardProps) {
  const { billingLoading, billingError, billingData, countLoading, countError, getPlanInfo, getRemainingApplications, applicationCount, refetch } = useStudentBilling();
  const planInfo = getPlanInfo();
  const remaining = getRemainingApplications();

  if (billingLoading) {
    return (
      <div className={compact ? 'flex items-center gap-2' : ''}>
        <Skeleton className={compact ? 'h-6 w-32' : 'h-24 w-full'} />
      </div>
    );
  }

  if (billingError || !billingData) return <Alert><AlertDescription className="flex flex-wrap items-center justify-between gap-2"><span>Your plan could not be confirmed.</span><Button size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button></AlertDescription></Alert>;
  const countConfirmed = !countLoading && !countError && typeof applicationCount === 'number';

  const Icon = planIcons[planInfo.planType];

  // Compact version for sidebar/header
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${planBadgeColors[planInfo.planType]} text-white text-xs px-2 py-0.5`}>
          {planInfo.planType === 'free' ? 'Free' :
           planInfo.planType === 'self_service' ? 'Legacy Self-Service' :
           'Agent-Supported'}
        </Badge>
        {planInfo.planType === 'free' && countConfirmed && remaining !== null && (
          <span className="text-xs text-muted-foreground">
            ({remaining} application{remaining !== 1 ? 's' : ''} left)
          </span>
        )}
        {!countConfirmed && <span className="text-xs text-muted-foreground">{countLoading ? 'Checking application count…' : 'Application count unavailable'}</span>}
        {countError && <Button size="sm" variant="ghost" onClick={() => void refetch()}>Retry</Button>}
      </div>
    );
  }

  // Full card version for dashboard
  return (
    <Card className={`${planColors[planInfo.planType]} border-0`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/50 dark:bg-white/10">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                Your Plan
              </p>
              <p className="font-semibold">
                {planInfo.displayName}
              </p>
              {countConfirmed && planInfo.planType === 'free' && (
                <p className="text-xs mt-0.5 opacity-80">
                  {applicationCount} of 1 application used
                </p>
              )}
              {countConfirmed && planInfo.planType !== 'free' && (
                <p className="text-xs mt-0.5 opacity-80">
                  {applicationCount} application{applicationCount !== 1 ? 's' : ''} submitted
                </p>
              )}
              {!countConfirmed && <p className="text-xs mt-0.5">{countLoading ? 'Checking application count…' : 'Application count unavailable'}</p>}
              {countError && <Button size="sm" variant="ghost" onClick={() => void refetch()}>Retry</Button>}
            </div>
          </div>

          {countConfirmed && planInfo.planType === 'free' && (
            <Button asChild size="sm" variant="secondary" className="shrink-0">
              <Link to="/pricing" className="flex items-center gap-1">
                Upgrade
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}

          {planInfo.hasAgent && (
            <Badge variant="outline" className="bg-white/50 dark:bg-white/10">
              Agent Assigned
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Inline badge version for minimal display
export function PlanBadge() {
  const { billingLoading, billingError, billingData, getPlanInfo } = useStudentBilling();
  const planInfo = getPlanInfo();

  if (billingLoading) {
    return <Skeleton className="h-5 w-20" />;
  }

  if (billingError || !billingData) return <Badge variant="outline">Plan unavailable</Badge>;

  return (
    <Badge className={`${planBadgeColors[planInfo.planType]} text-white`}>
      {planInfo.planType === 'free' ? 'Free' :
       planInfo.planType === 'self_service' ? 'Legacy Self-Service' :
       'Agent-Supported'}
    </Badge>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { Search, AlertCircle, CheckCircle, Wrench, Loader2 } from 'lucide-react';

interface DiagnosisResult {
  success: boolean;
  error?: string;
  email?: string;
  auth_user?: {
    id: string;
    email: string;
    created_at: string;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    metadata_role: string | null;
    metadata_full_name: string | null;
  };
  profile?: {
    id: string;
    tenant_id: string;
    email: string;
    full_name: string;
    role: string;
    onboarded: boolean;
    active: boolean;
    created_at: string;
  } | null;
  user_roles?: Array<{ role: string; created_at: string }>;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    is_shared: boolean;
  } | null;
  university?: {
    id: string;
    name: string;
    tenant_id: string;
  } | null;
  issues?: string[];
  issue_count?: number;
  can_repair?: boolean;
}

interface RepairResult {
  success: boolean;
  before?: DiagnosisResult;
  repair_result?: {
    success: boolean;
    error?: string;
    repairs_applied?: string[];
    profile_created?: boolean;
  };
  after?: DiagnosisResult;
}

/**
 * Admin component for diagnosing and repairing user account issues.
 * Uses the server-side diagnose_user_account and repair_user_account RPCs.
 */
export const AccountInspector = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setDiagnosis(null);
    setRepairResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('diagnose_user_account', {
        p_email: email.trim(),
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setDiagnosis(data as DiagnosisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to diagnose account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepair = async () => {
    if (!email.trim()) return;

    setIsRepairing(true);
    setError(null);
    setRepairResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('repair_user_account', {
        p_email: email.trim(),
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setRepairResult(data as RepairResult);
      // Update diagnosis with the "after" state
      if (data?.after) {
        setDiagnosis(data.after as DiagnosisResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repair account');
    } finally {
      setIsRepairing(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Account Inspector
        </CardTitle>
        <CardDescription>
          Diagnose and repair malformed user accounts. Enter an email to inspect the account health.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="email" className="sr-only">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
            />
          </div>
          <Button onClick={handleDiagnose} disabled={isLoading || !email.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Diagnose'
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Repair Result */}
        {repairResult && (
          <Alert variant={repairResult.success ? 'default' : 'destructive'}>
            {repairResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{repairResult.success ? 'Repair Complete' : 'Repair Failed'}</AlertTitle>
            <AlertDescription>
              {repairResult.repair_result?.repairs_applied?.length ? (
                <ul className="list-disc list-inside mt-1">
                  {repairResult.repair_result.repairs_applied.map((repair, i) => (
                    <li key={i}>{repair.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              ) : (
                <span>No repairs were needed or repair failed.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Diagnosis Results */}
        {diagnosis && (
          <div className="space-y-4">
            {/* Issues Summary */}
            {diagnosis.issues && diagnosis.issues.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{diagnosis.issue_count} Issue(s) Found</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-1">
                    {diagnosis.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                  {diagnosis.can_repair && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={handleRepair}
                      disabled={isRepairing}
                    >
                      {isRepairing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Repairing...
                        </>
                      ) : (
                        <>
                          <Wrench className="mr-2 h-4 w-4" />
                          Repair Account
                        </>
                      )}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Account Healthy</AlertTitle>
                <AlertDescription>No issues found with this account.</AlertDescription>
              </Alert>
            )}

            {/* Detailed Information */}
            <Accordion type="multiple" defaultValue={['auth', 'profile']}>
              {/* Auth User */}
              {diagnosis.auth_user && (
                <AccordionItem value="auth">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span>Auth User</span>
                      <Badge variant="outline" className="ml-2">
                        {diagnosis.auth_user.email_confirmed_at ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-muted-foreground">ID:</dt>
                      <dd className="font-mono text-xs truncate">{diagnosis.auth_user.id}</dd>
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd>{diagnosis.auth_user.email}</dd>
                      <dt className="text-muted-foreground">Created:</dt>
                      <dd>{formatDate(diagnosis.auth_user.created_at)}</dd>
                      <dt className="text-muted-foreground">Last Sign In:</dt>
                      <dd>{formatDate(diagnosis.auth_user.last_sign_in_at)}</dd>
                      <dt className="text-muted-foreground">Metadata Role:</dt>
                      <dd>{diagnosis.auth_user.metadata_role || '—'}</dd>
                      <dt className="text-muted-foreground">Metadata Name:</dt>
                      <dd>{diagnosis.auth_user.metadata_full_name || '—'}</dd>
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Profile */}
              <AccordionItem value="profile">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Profile</span>
                    {diagnosis.profile ? (
                      <Badge variant="outline" className="ml-2">{diagnosis.profile.role}</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2">Missing</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {diagnosis.profile ? (
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-muted-foreground">ID:</dt>
                      <dd className="font-mono text-xs truncate">{diagnosis.profile.id}</dd>
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd>{diagnosis.profile.email}</dd>
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd>{diagnosis.profile.full_name}</dd>
                      <dt className="text-muted-foreground">Role:</dt>
                      <dd><Badge variant="secondary">{diagnosis.profile.role}</Badge></dd>
                      <dt className="text-muted-foreground">Tenant ID:</dt>
                      <dd className="font-mono text-xs truncate">{diagnosis.profile.tenant_id}</dd>
                      <dt className="text-muted-foreground">Onboarded:</dt>
                      <dd>{diagnosis.profile.onboarded ? 'Yes' : 'No'}</dd>
                      <dt className="text-muted-foreground">Active:</dt>
                      <dd>{diagnosis.profile.active ? 'Yes' : 'No'}</dd>
                      <dt className="text-muted-foreground">Created:</dt>
                      <dd>{formatDate(diagnosis.profile.created_at)}</dd>
                    </dl>
                  ) : (
                    <p className="text-sm text-destructive">Profile record is missing!</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* User Roles */}
              <AccordionItem value="roles">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>User Roles</span>
                    <Badge variant="outline" className="ml-2">
                      {diagnosis.user_roles?.length || 0} role(s)
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {diagnosis.user_roles && diagnosis.user_roles.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {diagnosis.user_roles.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Badge variant="secondary">{r.role}</Badge>
                          <span className="text-muted-foreground text-xs">
                            Added: {formatDate(r.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-destructive">No user_roles entries found!</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Tenant */}
              <AccordionItem value="tenant">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Tenant</span>
                    {diagnosis.tenant ? (
                      <Badge variant={diagnosis.tenant.is_shared ? 'destructive' : 'outline'} className="ml-2">
                        {diagnosis.tenant.is_shared ? 'Shared' : 'Isolated'}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2">Missing</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {diagnosis.tenant ? (
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-muted-foreground">ID:</dt>
                      <dd className="font-mono text-xs truncate">{diagnosis.tenant.id}</dd>
                      <dt className="text-muted-foreground">Name:</dt>
                      <dd>{diagnosis.tenant.name}</dd>
                      <dt className="text-muted-foreground">Slug:</dt>
                      <dd className="font-mono">{diagnosis.tenant.slug}</dd>
                      <dt className="text-muted-foreground">Shared Tenant:</dt>
                      <dd>
                        {diagnosis.tenant.is_shared ? (
                          <span className="text-destructive">Yes (needs isolation for partners)</span>
                        ) : (
                          'No'
                        )}
                      </dd>
                    </dl>
                  ) : (
                    <p className="text-sm text-destructive">Tenant record is missing!</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* University (for partners) */}
              {(diagnosis.profile?.role === 'partner' || diagnosis.profile?.role === 'university') && (
                <AccordionItem value="university">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span>University</span>
                      {diagnosis.university ? (
                        <Badge variant="outline" className="ml-2">Found</Badge>
                      ) : (
                        <Badge variant="destructive" className="ml-2">Missing</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {diagnosis.university ? (
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <dt className="text-muted-foreground">ID:</dt>
                        <dd className="font-mono text-xs truncate">{diagnosis.university.id}</dd>
                        <dt className="text-muted-foreground">Name:</dt>
                        <dd>{diagnosis.university.name}</dd>
                        <dt className="text-muted-foreground">Tenant ID:</dt>
                        <dd className="font-mono text-xs truncate">{diagnosis.university.tenant_id}</dd>
                      </dl>
                    ) : (
                      <p className="text-sm text-destructive">
                        University record is missing for this partner!
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountInspector;

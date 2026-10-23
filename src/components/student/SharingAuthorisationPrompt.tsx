import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentRecord } from '@/hooks/useStudentRecord';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SharingAuthorisationConsent } from '@/components/student/SharingAuthorisationConsent';
import {
  SHARING_PROMPT_IGNORED_STATUSES,
  fetchOwnSharingAuthorisation,
  recordSharingAuthorisation,
  shouldShowSharingAuthorisationPrompt,
} from '@/lib/sharingAuthorisation';

interface ViewProps {
  onSave: () => Promise<void>;
}

/** The prompt itself. It cannot be dismissed; it goes once the authorisation is saved. */
export function SharingAuthorisationPromptView({ onSave }: ViewProps) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Alert className="border-primary/40" role="region" aria-label="Sharing authorisation">
      <ShieldCheck className="h-4 w-4" />
      <AlertDescription className="space-y-4">
        <p className="text-sm">
          You have an application with UniDoxia. Before we can send it on, we need your authorisation below.
        </p>
        <SharingAuthorisationConsent id="sharing-authorisation-prompt" checked={checked} onCheckedChange={setChecked} disabled={saving} />
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button
          type="button"
          size="sm"
          disabled={!checked || saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              await onSave();
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : 'Your authorisation was not saved. Please try again.');
            } finally {
              setSaving(false);
            }
          }}
        >
          Save my authorisation
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Shown in the student area when the student has a live application (for
 * example one created by staff or an agent, or one that was already under way
 * at go-live) but has not given their sharing authorisation.
 */
export function SharingAuthorisationPrompt() {
  const { user, profile } = useAuth();
  const isStudent = profile?.role === 'student';
  const queryClient = useQueryClient();
  const { data: student, isLoading: studentLoading } = useStudentRecord({ enabled: isStudent });

  const { data: authorised, isLoading: authorisedLoading } = useQuery({
    queryKey: ['sharing-authorisation', user?.id],
    enabled: isStudent && Boolean(user?.id),
    staleTime: 60_000,
    queryFn: () => fetchOwnSharingAuthorisation(user!.id),
  });

  const { data: hasLiveApplication, isLoading: applicationsLoading } = useQuery({
    queryKey: ['sharing-authorisation-live-applications', student?.id],
    enabled: Boolean(student?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student!.id)
        .not('status', 'in', `(${SHARING_PROMPT_IGNORED_STATUSES.join(',')})`);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  const show = shouldShowSharingAuthorisationPrompt({
    isStudent: isStudent && Boolean(student),
    isLoading: studentLoading || authorisedLoading || applicationsLoading,
    hasLiveApplication: Boolean(hasLiveApplication),
    authorised: Boolean(authorised),
  });
  if (!show) return null;

  return (
    <SharingAuthorisationPromptView
      onSave={async () => {
        await recordSharingAuthorisation();
        await queryClient.invalidateQueries({ queryKey: ['sharing-authorisation', user?.id] });
      }}
    />
  );
}

export default SharingAuthorisationPrompt;

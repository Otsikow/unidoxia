import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useStudentRecord } from '@/hooks/useStudentRecord';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getCourseFinderProfileSections, getMissingProfileFields } from '@/lib/coursefinderProfile';
import {
  IN_PROGRESS_APPLICATION_STATUSES,
  canDismissPrompt,
  dismissPrompt,
  isPromptDismissed,
  shouldShowCompleteProfilePrompt,
  summariseMissingFields,
} from '@/lib/completeProfilePrompt';

type ApplicationStatus = Database['public']['Enums']['application_status'];

/**
 * A gentle reminder for students whose profile is missing any field
 * CourseFinder needs. It never blocks navigation. It can be dismissed until
 * the next login (browser session), unless the student has an application in
 * progress, in which case it stays up until the profile is complete.
 */
export function CompleteProfilePrompt() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const isStudent = profile?.role === 'student';
  const { data: student, isLoading: studentLoading } = useStudentRecord({ enabled: isStudent });
  const [dismissed, setDismissed] = useState(() => isPromptDismissed(user?.id));
  useEffect(() => setDismissed(isPromptDismissed(user?.id)), [user?.id]);

  const { data: degrees, isLoading: degreesLoading } = useQuery({
    queryKey: ['complete-profile-prompt-degrees', student?.id],
    enabled: Boolean(student?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('education_records').select('*').eq('student_id', student!.id);
      if (error) throw error;
      return (data ?? []).filter((record) => record.level !== 'high_school');
    },
  });

  const { data: hasApplicationInProgress, isLoading: applicationsLoading } = useQuery({
    queryKey: ['complete-profile-prompt-applications', student?.id],
    enabled: Boolean(student?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student!.id)
        // The generated enum type predates under_review, pending_documents and the
        // interview statuses, which exist in the database.
        .in('status', [...IN_PROGRESS_APPLICATION_STATUSES] as unknown as ApplicationStatus[]);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
  const dismissible = canDismissPrompt(Boolean(hasApplicationInProgress));

  const missingFields = useMemo(
    () => (student ? getMissingProfileFields(getCourseFinderProfileSections(student as unknown as Record<string, unknown>, degrees ?? [])) : []),
    [student, degrees],
  );

  const show = shouldShowCompleteProfilePrompt({
    isStudent: isStudent && Boolean(student),
    isLoading: studentLoading || degreesLoading || applicationsLoading,
    missingFields,
    dismissed,
    hasApplicationInProgress: Boolean(hasApplicationInProgress),
  });
  if (!show) return null;

  const onProfilePage = location.pathname === '/student/profile' || location.pathname === '/student/dashboard';

  return (
    <Alert className="border-amber-500/60 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" role="status">
      <ClipboardList className="h-4 w-4 !text-amber-600" />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <AlertTitle>Please complete your profile</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Universities now ask for a few more details before we can submit your application. Still needed:{' '}
              {summariseMissingFields(missingFields)}.
              {!dismissible && ' You have an application in progress, so please finish these soon to avoid delays.'}
            </p>
            {!onProfilePage && (
              <Button asChild size="sm" variant="outline" className="border-amber-600 bg-transparent">
                <Link to="/student/profile#personal">Complete my profile</Link>
              </Button>
            )}
          </AlertDescription>
        </div>
        {dismissible && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          aria-label="Dismiss for now"
          onClick={() => {
            dismissPrompt(user?.id);
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        )}
      </div>
    </Alert>
  );
}

export default CompleteProfilePrompt;

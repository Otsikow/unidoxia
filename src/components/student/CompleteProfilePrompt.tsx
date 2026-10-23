import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentRecord } from '@/hooks/useStudentRecord';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getCourseFinderProfileSections, getMissingProfileFields } from '@/lib/coursefinderProfile';
import {
  dismissPrompt,
  isPromptDismissed,
  shouldShowCompleteProfilePrompt,
  summariseMissingFields,
} from '@/lib/completeProfilePrompt';

/**
 * A gentle reminder for students whose profile is missing any field
 * CourseFinder needs. It never blocks navigation and can be dismissed until
 * the next login (browser session).
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

  const missingFields = useMemo(
    () => (student ? getMissingProfileFields(getCourseFinderProfileSections(student as unknown as Record<string, unknown>, degrees ?? [])) : []),
    [student, degrees],
  );

  const show = shouldShowCompleteProfilePrompt({
    isStudent: isStudent && Boolean(student),
    isLoading: studentLoading || degreesLoading,
    missingFields,
    dismissed,
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
            </p>
            {!onProfilePage && (
              <Button asChild size="sm" variant="outline" className="border-amber-600 bg-transparent">
                <Link to="/student/profile#personal">Complete my profile</Link>
              </Button>
            )}
          </AlertDescription>
        </div>
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
      </div>
    </Alert>
  );
}

export default CompleteProfilePrompt;

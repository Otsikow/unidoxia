import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/LoadingState';
import { EducationTab } from '@/components/student/profile/EducationTab';
import { PersonalInfoTab } from '@/components/student/profile/PersonalInfoTab';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useStudentRecord } from '@/hooks/useStudentRecord';
import { supabase } from '@/integrations/supabase/client';
import { getStudentRegistrationDestination } from '@/lib/authRedirect';
import { getCourseFinderProfileSections, getMissingProfileFields, sectionTab } from '@/lib/coursefinderProfile';
import { isStrictStudent, PRIVACY_NOTICE_PATH } from '@/lib/studentRegistrationSchema';

export default function StudentRegistration() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isStudent = profile?.role === 'student';
  const checkRegistration = isStudent && profile.onboarded !== true;
  const student = useStudentRecord({ enabled: checkRegistration });
  const studentId = student.data?.id;
  const needsRegistration = checkRegistration && isStrictStudent(student.data);
  const degrees = useQuery({
    queryKey: ['student-registration-degrees', studentId],
    enabled: needsRegistration && Boolean(studentId),
    queryFn: async () => {
      const { data, error } = await supabase.from('education_records').select('*').eq('student_id', studentId!);
      if (error) throw error;
      return (data ?? []).filter((record) => record.level !== 'high_school');
    },
  });
  const [step, setStep] = useState<'personal' | 'education'>('personal');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const stepsRef = useRef<HTMLElement>(null);
  const next = params.get('next');
  const destination = getStudentRegistrationDestination(next);

  if (!checkRegistration) {
    return <Navigate to={getStudentRegistrationDestination(next, isStudent ? '/student/profile' : '/dashboard')} replace />;
  }
  if (student.isPending) return <LoadingState message="Loading your student profile…" />;
  if (student.data && !needsRegistration) {
    return <Navigate to={getStudentRegistrationDestination(next, '/student/profile')} replace />;
  }

  const createProfile = async () => {
    if (!profile || !user) return;
    setSaveError('');
    setSaving(true);
    try {
      const { error } = await supabase.from('students').insert({
        profile_id: user.id,
        tenant_id: profile.tenant_id,
        contact_email: user.email ?? profile.email,
        contact_phone: profile.phone ?? null,
        legal_name: profile.full_name,
      });
      if (error && error.code !== '23505') throw error;
      const { data, error: reloadError } = await student.refetch();
      if (reloadError || !data) throw reloadError ?? new Error('Student profile not found');
    } catch {
      setSaveError('We couldn’t create your student profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!user) return;
    setSaveError('');
    setSaving(true);
    try {
      const [savedStudent, savedDegrees] = await Promise.all([student.refetch(), degrees.refetch()]);
      if (savedStudent.error || savedDegrees.error || !savedStudent.data || !savedDegrees.data) {
        throw new Error('Could not check saved details');
      }
      if (getMissingProfileFields(getCourseFinderProfileSections(savedStudent.data, savedDegrees.data)).length) {
        setSaveError('Some required details are still missing. Check both sections and save your changes.');
        return;
      }
      // This flag records the one-time registration journey. Application submission
      // still runs the independent server-side profile and sharing checks.
      const { error } = await supabase.from('profiles').update({ onboarded: true })
        .eq('id', user.id).eq('role', 'student').select('id').single();
      if (error) throw error;
      await refreshProfile();
      navigate(destination, { replace: true });
    } catch {
      setSaveError('We couldn’t finish your registration. Your saved details are still on file. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sections = student.data ? getCourseFinderProfileSections(student.data, degrees.data ?? []) : [];
  const personalComplete = sections.length > 0 && sections.filter((section) => sectionTab(section.id) === 'personal').every((section) => section.completed);
  const ready = Boolean(student.data && degrees.data) && !student.isError && !degrees.isError && getMissingProfileFields(sections).length === 0;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Complete your student registration</h1>
        <p className="text-muted-foreground">
          Add the details UniDoxia needs to prepare your university applications.
          Save each page as you go. You can upload supporting documents later.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-primary underline" to={PRIVACY_NOTICE_PATH}>Privacy notice</Link>
          <button type="button" className="text-primary underline" onClick={() => void signOut()}>Sign out and finish later</button>
        </div>
      </header>

      {student.isError ? (
        <div role="alert" className="space-y-3">
          <p>We couldn’t load your student profile.</p>
          <Button onClick={() => void student.refetch()}>Try again</Button>
        </div>
      ) : !student.data ? (
        <div className="space-y-3">
          <p>We couldn’t find your student profile yet. Create it to continue.</p>
          <Button disabled={saving} onClick={() => void createProfile()}>Create student profile</Button>
        </div>
      ) : (
        <>
          <nav ref={stepsRef} tabIndex={-1} aria-label="Registration steps" className="flex flex-wrap gap-2">
            <Button variant={step === 'personal' ? 'default' : 'outline'} aria-current={step === 'personal' ? 'step' : undefined} disabled={saving} onClick={() => setStep('personal')}>Personal details</Button>
            <Button variant={step === 'education' ? 'default' : 'outline'} aria-current={step === 'education' ? 'step' : undefined} disabled={!personalComplete || saving} onClick={() => setStep('education')}>Education and history</Button>
          </nav>
          {step === 'personal' ? (
            <>
              <PersonalInfoTab student={student.data} onUpdate={() => setSaveError('')} onComplete={() => setStep('education')} />
              <Button disabled={!personalComplete} onClick={() => {
                setStep('education');
                stepsRef.current?.focus();
              }}>Continue to education</Button>
            </>
          ) : (
            <>
              <div className="space-y-2"><div className="flex justify-between text-sm"><span>Education and history</span><span>Step 3 of 3</span></div><progress className="w-full accent-primary" value={3} max={3} aria-label="Registration progress" /></div>
              <EducationTab student={student.data} onUpdate={() => void degrees.refetch()} />
              {degrees.isError && <div role="alert" className="space-y-3">
                <p>We couldn’t check your saved education records.</p>
                <Button variant="outline" onClick={() => void degrees.refetch()}>Check again</Button>
              </div>}
              <p role="status" className="text-sm text-muted-foreground">
                {degrees.isPending ? 'Checking your saved education records…' : ready ? 'Your required profile details are saved.' : 'Save your education and gap or work history to finish registration.'}
              </p>
              <Button disabled={!ready || saving || degrees.isFetching || student.isFetching} onClick={() => void finish()}>
                {saving ? 'Finishing registration…' : 'Finish registration'}
              </Button>
            </>
          )}
        </>
      )}
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
    </main>
  );
}

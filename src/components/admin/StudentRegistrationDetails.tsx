import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fields = [
  ['Personal details', [
    ['First name', 'first_name'], ['Middle name', 'middle_name'], ['Last name', 'last_name'],
    ['Email', 'contact_email'], ['Mobile', 'contact_phone'], ['WhatsApp', 'whatsapp_number'],
    ['Date of birth', 'date_of_birth'], ['Gender', 'gender'], ['Marital status', 'marital_status'],
    ['Dependants travelling', 'dependants_travelling'], ['Nationality', 'nationality'],
    ['Citizenship', 'citizenship'], ['City of birth', 'city_of_birth'], ['Country of birth', 'country_of_birth'],
  ]],
  ['Passport', [
    ['Number', 'passport_number'], ['Issue date', 'passport_issue_date'],
    ['Expiry date', 'passport_expiry'], ['Issue country', 'passport_issue_country'],
  ]],
  ['Home address', [
    ['Street', 'address_line_1'], ['Country', 'country_of_residence'], ['State or region', 'state_region'],
    ['City', 'city'], ['Postcode', 'postal_code'],
  ]],
  ['Permanent address', [
    ['Same as home address', 'permanent_same_as_mailing'], ['Street', 'permanent_address_line_1'],
    ['Country', 'permanent_country'], ['State or region', 'permanent_state_region'],
    ['City', 'permanent_city'], ['Postcode', 'permanent_postal_code'],
  ]],
  ['Emergency contact', [
    ['Name', 'emergency_contact_name'], ['Relationship', 'emergency_contact_relationship'],
    ['Phone', 'emergency_contact_phone'], ['Email', 'emergency_contact_email'],
  ]],
  ['Background', [
    ['Other citizenship', 'has_other_citizenship'], ['Which citizenship', 'other_citizenship'],
    ['Lived or studied abroad', 'lived_or_studied_abroad'], ['Previous immigration applications', 'previous_immigration_applications'],
    ['Visa refusals', 'has_visa_refusals'], ['Refusal country', 'visa_refusal_country'],
    ['Refusal year', 'visa_refusal_year'], ['Visa type', 'visa_refusal_type'], ['Refusal reason', 'visa_refusal_reason'],
  ]],
  ['Secondary education', [
    ['Country of education', 'country_of_education'], ['Highest level', 'highest_education_level'],
    ['Board', 'secondary_board'], ['Qualification', 'secondary_qualification'], ['School', 'secondary_school_name'],
    ['Country', 'secondary_school_country'], ['State or region', 'secondary_school_state'], ['City', 'secondary_school_city'],
    ['Start month', 'secondary_start_month'], ['Start year', 'secondary_start_year'],
    ['End month', 'secondary_end_month'], ['End year', 'secondary_end_year'],
    ['Language of instruction', 'secondary_language_of_instruction'], ['Grades band', 'secondary_grades_band'],
    ['Final grade', 'secondary_final_grade'], ['WAEC scratch-card PIN', 'waec_scratch_card_pin'],
    ['WAEC scratch-card serial', 'waec_scratch_card_serial'],
  ]],
  ['Course preferences', [
    ['Preferred course', 'preferred_course'], ['Preferred university', 'preferred_university'],
    ['Intake month', 'preferred_intake_month'], ['Intake year', 'preferred_intake_year'],
  ]],
] as const;

const studentColumns = [...new Set(fields.flatMap(([, entries]) => entries.map(([, key]) => key))), 'no_gap_since_study', 'work_experience'].join(',');

function display(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

function Details({ title, entries }: { title: string; entries: ReadonlyArray<readonly [string, unknown]> }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent><dl className="grid gap-4 sm:grid-cols-2">{entries.map(([label, value]) =>
      <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{display(value)}</dd></div>
    )}</dl></CardContent>
  </Card>;
}

export function StudentRegistrationDetails({ studentId }: { studentId: string }) {
  const query = useQuery({
    queryKey: ['admin-student-registration-details', studentId],
    queryFn: async () => {
      const [student, degrees, tests] = await Promise.all([
        supabase.from('students').select(studentColumns).eq('id', studentId).single(),
        supabase.from('education_records').select('id,level,institution_name,country,state_region,city,degree_title,final_grade,grade_scale,gpa,language_of_instruction,start_date,end_date').eq('student_id', studentId).order('start_date'),
        supabase.from('test_scores').select('id,test_type,total_score,test_date').eq('student_id', studentId).order('test_date'),
      ]);
      if (student.error) throw student.error;
      if (degrees.error) throw degrees.error;
      if (tests.error) throw tests.error;
      return { student: student.data as unknown as Record<string, unknown>, degrees: degrees.data ?? [], tests: tests.data ?? [] };
    },
  });

  if (query.isPending) return <p role="status">Loading registration details…</p>;
  if (query.isError) return <div role="alert" className="space-y-3">
    <p>Registration details could not be loaded. Please try again.</p>
    <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
  </div>;

  const { student, degrees, tests } = query.data;
  const history = Array.isArray(student.work_experience) ? student.work_experience : [];
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Information saved by the student. Empty fields may still need to be completed.</p>
    {fields.map(([title, entries]) => <Details key={title} title={title} entries={entries.map(([label, key]) => [label, student[key]] as const)} />)}
    <Details title="Study gap" entries={[[ 'No gap since last study', student.no_gap_since_study ]]} />
    {history.length === 0 && <p className="text-sm text-muted-foreground">No gap or work history entries provided.</p>}
    {history.map((item, index) => {
      const entry = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
      return <Details key={index} title={`History entry ${index + 1}`} entries={[
        ['Activity or employer', entry.employer], ['Role', entry.job_title], ['From', entry.start_date],
        ['To', entry.is_current === true ? 'Present' : entry.end_date], ['City', entry.city],
        ['Country', entry.country], ['Description', entry.description],
      ]} />;
    })}
    {degrees.filter((degree) => degree.level !== 'high_school').length === 0 && <p className="text-sm text-muted-foreground">No college or university entries provided.</p>}
    {degrees.filter((degree) => degree.level !== 'high_school').map((degree, index) =>
      <Details key={degree.id} title={`College or university entry ${index + 1}`} entries={[
        ['Institution', degree.institution_name], ['Country', degree.country], ['State or region', degree.state_region],
        ['City', degree.city], ['Qualification', degree.degree_title], ['Final grade', degree.final_grade],
        ['Grading scale', degree.grade_scale], ['Score', degree.gpa], ['Language', degree.language_of_instruction],
        ['Start date', degree.start_date], ['End date', degree.end_date],
      ]} />
    )}
    {tests.length === 0 && <p className="text-sm text-muted-foreground">No English tests provided.</p>}
    {tests.map((test, index) => <Details key={test.id} title={`English test ${index + 1}`} entries={[
      ['Test', test.test_type], ['Score', test.total_score], ['Date', test.test_date],
    ]} />)}
  </div>;
}

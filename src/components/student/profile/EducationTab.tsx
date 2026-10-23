import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { validateCourseFinderDegree } from '@/lib/coursefinderProfile';
import {
  FINAL_GRADE_HELPER,
  NO_GAP_MESSAGES,
  NEW_COURSEFINDER_FIELDS,
  NO_GAP_THRESHOLD_MONTHS,
  getNoGapStatus,
  isStrictStudent,
  isWaecApplicable,
  gapHistoryEntrySchema,
  getLastStudyEndMonthIndex,
  issueMessages,
  secondaryEducationSchema,
} from '@/lib/studentRegistrationSchema';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Props { student: Tables<'students'>; onUpdate?: () => void }
type Degree = Tables<'education_records'>;
type Work = { employer: string; job_title: string; city: string; country: string; start_date: string; end_date: string; is_current?: boolean; description: string };
const emptyDegree = { institution_name: '', country: '', state_region: '', city: '', degree_title: '', final_grade: '', grade_scale: '', gpa: '', language_of_instruction: '', start_date: '', end_date: '' };
const emptyWork: Work = { employer: '', job_title: '', city: '', country: '', start_date: '', end_date: '', is_current: false, description: '' };
const text = (value: unknown) => typeof value === 'string' ? value : '';

export function EducationTab({ student, onUpdate }: Props) {
  const strict = isStrictStudent(student);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Degree | null>(null);
  const [degree, setDegree] = useState(emptyDegree);
  const [work, setWork] = useState<Work[]>(Array.isArray(student.work_experience) ? student.work_experience as unknown as Work[] : []);
  const [workDraft, setWorkDraft] = useState(emptyWork);
  const [noGap, setNoGap] = useState(student.no_gap_since_study === true);
  const [secondary, setSecondary] = useState({
    country_of_education: text(student.country_of_education), highest_education_level: text(student.highest_education_level), secondary_board: text(student.secondary_board), secondary_qualification: text(student.secondary_qualification), secondary_school_name: text(student.secondary_school_name), secondary_school_country: text(student.secondary_school_country), secondary_school_state: text(student.secondary_school_state), secondary_school_city: text(student.secondary_school_city), secondary_start_month: student.secondary_start_month?.toString() || '', secondary_start_year: student.secondary_start_year?.toString() || '', secondary_end_month: student.secondary_end_month?.toString() || '', secondary_end_year: student.secondary_end_year?.toString() || '', secondary_language_of_instruction: text(student.secondary_language_of_instruction), secondary_grades_band: text(student.secondary_grades_band), secondary_final_grade: text(student.secondary_final_grade), waec_scratch_card_pin: text(student.waec_scratch_card_pin), waec_scratch_card_serial: text(student.waec_scratch_card_serial),
  });

  const loadDegrees = useCallback(async () => {
    const { data, error } = await supabase.from('education_records').select('*').eq('student_id', student.id).order('start_date');
    if (error) toast({ title: 'Unable to load degrees', description: error.message, variant: 'destructive' });
    else setDegrees((data || []).filter((record) => record.level !== 'high_school'));
  }, [student.id, toast]);
  useEffect(() => { void loadDegrees(); }, [loadDegrees]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: studentRecordQueryKey(user?.id) });
    onUpdate?.();
  };

  const saveSecondary = async (event: React.FormEvent) => {
    event.preventDefault();
    // Existing students are only held to the fields they had before October 2026.
    const problems = issueMessages(secondaryEducationSchema.safeParse(secondary), strict);
    if (problems.length) { toast({ title: 'Check your education details', description: `Still needed: ${problems.join(', ')}.`, variant: 'destructive' }); return; }
    setLoading(true);
    const waec = isWaecApplicable(secondary);
    // If the new dates mean "no gap" no longer applies, clear the tick rather than keep a stale answer.
    const clearNoGap = noGap && getNoGapStatus(getLastStudyEndMonthIndex(secondary, degrees)) !== 'allowed';
    const payload = { ...secondary, secondary_start_month: Number(secondary.secondary_start_month), secondary_start_year: Number(secondary.secondary_start_year), secondary_end_month: Number(secondary.secondary_end_month), secondary_end_year: Number(secondary.secondary_end_year), waec_scratch_card_pin: waec ? secondary.waec_scratch_card_pin : null, waec_scratch_card_serial: waec ? secondary.waec_scratch_card_serial : null, ...(clearNoGap ? { no_gap_since_study: false } : {}) };
    const { error } = await supabase.from('students').update(payload).eq('id', student.id);
    setLoading(false);
    if (error) toast({ title: 'Unable to save academic details', description: error.message, variant: 'destructive' });
    else {
      if (clearNoGap) setNoGap(false);
      toast({ title: 'Academic details saved', description: clearNoGap ? 'Your dates mean "no gap" no longer applies, so please add your gap or work history.' : undefined });
      await refresh();
    }
  };

  const openDegree = (record?: Degree) => {
    setEditing(record || null);
    setDegree(record ? { institution_name: record.institution_name, country: record.country, state_region: text(record.state_region), city: text(record.city), degree_title: text(record.degree_title), final_grade: text(record.final_grade), grade_scale: text(record.grade_scale), gpa: record.gpa?.toString() || '', language_of_instruction: text(record.language_of_instruction), start_date: record.start_date, end_date: text(record.end_date) } : emptyDegree);
    setDialogOpen(true);
  };

  const saveDegree = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...degree, level: 'degree', gpa: Number(degree.gpa), student_id: student.id };
    const missing = validateCourseFinderDegree(payload, strict);
    if (missing.length) { toast({ title: 'Check this education entry', description: `Still needed: ${missing.join(', ')}.`, variant: 'destructive' }); return; }
    setLoading(true);
    const result = editing ? await supabase.from('education_records').update(payload).eq('id', editing.id) : await supabase.from('education_records').insert(payload);
    setLoading(false);
    if (result.error) toast({ title: 'Unable to save degree', description: result.error.message, variant: 'destructive' });
    else { setDialogOpen(false); await loadDegrees(); await refresh(); }
  };

  const removeDegree = async (record: Degree) => {
    if (!window.confirm(`Remove ${record.degree_title || 'this degree'}?`)) return;
    const { error } = await supabase.from('education_records').delete().eq('id', record.id);
    if (error) toast({ title: 'Unable to remove degree', description: error.message, variant: 'destructive' });
    else { await loadDegrees(); await refresh(); }
  };

  const saveWork = async (next: Work[]) => {
    const previous = work;
    setWork(next);
    const { error } = await supabase.from('students').update({ work_experience: next as unknown as Json }).eq('id', student.id);
    if (error) { setWork(previous); toast({ title: 'Unable to save your history', description: error.message, variant: 'destructive' }); return false; }
    await refresh();
    return true;
  };

  const addWork = async () => {
    const entry = { ...workDraft, end_date: workDraft.is_current ? '' : workDraft.end_date };
    const problems = issueMessages(gapHistoryEntrySchema.safeParse(entry));
    if (problems.length) { toast({ title: 'Check this history entry', description: `Still needed: ${problems.join(', ')}.`, variant: 'destructive' }); return; }
    if (await saveWork([...work, entry])) setWorkDraft(emptyWork);
  };

  const lastStudyEnd = useMemo(() => getLastStudyEndMonthIndex(secondary, degrees), [secondary, degrees]);
  const noGapStatus = getNoGapStatus(lastStudyEnd);
  const noGapAllowed = noGapStatus === 'allowed';
  // Ticked earlier, but later date changes mean it no longer applies.
  const noGapStale = noGap && !noGapAllowed;

  const saveNoGap = async (checked: boolean) => {
    if (checked && !noGapAllowed) {
      toast({ title: 'You cannot choose "no gap" yet', description: noGapStatus === 'no-dates' ? NO_GAP_MESSAGES['no-dates'] : NO_GAP_MESSAGES['too-long-ago'], variant: 'destructive' });
      return;
    }
    setNoGap(checked);
    const { error } = await supabase.from('students').update({ no_gap_since_study: checked }).eq('id', student.id);
    if (error) { setNoGap(!checked); toast({ title: 'Unable to save your answer', description: error.message, variant: 'destructive' }); }
    else await refresh();
  };

  const field = (name: keyof typeof secondary, label: string, type = 'text', helper?: string, range?: { min: number; max: number }) => <div className="space-y-2"><Label htmlFor={name}>{label}{!strict && NEW_COURSEFINDER_FIELDS.has(name) ? ' (optional)' : ' *'}</Label><Input id={name} type={type} inputMode={type === 'number' ? 'numeric' : undefined} min={range?.min} max={range?.max} value={secondary[name]} onChange={(event) => setSecondary((current) => ({ ...current, [name]: event.target.value }))} required={strict || !NEW_COURSEFINDER_FIELDS.has(name)} />{helper && <p className="text-xs text-muted-foreground">{helper}</p>}</div>;
  const month = { min: 1, max: 12 };
  const year = { min: 1950, max: 2100 };
  const degreeField = (name: keyof typeof emptyDegree, label: string, type = 'text', helper?: string) => <div className="space-y-2"><Label htmlFor={`degree-${name}`}>{label}{!strict && NEW_COURSEFINDER_FIELDS.has(name) ? ' (optional)' : ' *'}</Label><Input id={`degree-${name}`} type={type} step={name === 'gpa' ? '0.01' : undefined} value={degree[name]} onChange={(event) => setDegree((current) => ({ ...current, [name]: event.target.value }))} required={strict || !NEW_COURSEFINDER_FIELDS.has(name)} />{helper && <p className="text-xs text-muted-foreground">{helper}</p>}</div>;
  const grid = 'grid grid-cols-1 gap-4 md:grid-cols-2';
  return <div className="space-y-6">
    <form onSubmit={saveSecondary} noValidate><Card><CardHeader><CardTitle>Education history: secondary school</CardTitle><CardDescription>Complete the applicable fields marked *. Add any college or university below.</CardDescription></CardHeader><CardContent className="space-y-4"><div className={grid}>
      {field('country_of_education', 'Country of education')}{field('highest_education_level', 'Highest level of education')}{field('secondary_board', 'Board', 'text')}{field('secondary_qualification', 'Qualification')}{field('secondary_school_name', 'School name')}{field('secondary_school_country', 'School country')}{field('secondary_school_state', 'School state or region')}{field('secondary_school_city', 'School city')}{field('secondary_start_month', 'Start month', 'number', 'Month as a number, for example 9 for September.', month)}{field('secondary_start_year', 'Start year', 'number', undefined, year)}{field('secondary_end_month', 'End month', 'number', 'Must not be before your start date.', month)}{field('secondary_end_year', 'End year', 'number', undefined, year)}{field('secondary_language_of_instruction', 'Language of instruction')}
      <div className="space-y-2"><Label>Grades band *</Label><Select value={secondary.secondary_grades_band} onValueChange={(value) => setSecondary((current) => ({ ...current, secondary_grades_band: value }))}><SelectTrigger><SelectValue placeholder="Select percentage band" /></SelectTrigger><SelectContent>{['90-100%', '80-89%', '70-79%', '60-69%', '50-59%', 'Below 50%'].map((band) => <SelectItem key={band} value={band}>{band}</SelectItem>)}</SelectContent></Select></div>
      <div className="md:col-span-2">{field('secondary_final_grade', 'Final grade', 'text', FINAL_GRADE_HELPER)}</div>
      {isWaecApplicable(secondary) && <>{field('waec_scratch_card_pin', 'WAEC results scratch-card PIN')}{field('waec_scratch_card_serial', 'WAEC results scratch-card serial number')}</>}
    </div><Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save secondary school details</Button></CardContent></Card></form>

    <Card><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>Education history: college and university</CardTitle><CardDescription>Add each diploma or degree you have studied for. Complete the fields marked * for each entry.</CardDescription></div><Button type="button" onClick={() => openDegree()}><Plus className="mr-2 h-4 w-4" />Add entry</Button></div></CardHeader><CardContent className="space-y-3">{degrees.length === 0 ? <p className="text-sm text-muted-foreground">No college or university entries added yet.</p> : degrees.map((record) => <div key={record.id} className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-medium">{record.degree_title}</p><p className="text-sm text-muted-foreground">{record.institution_name}, {record.city}, {record.country}</p><p className="text-sm text-muted-foreground">{record.start_date?.slice(0, 7)} to {record.end_date?.slice(0, 7) || 'present'}{record.final_grade ? `, ${record.final_grade}` : ''}</p></div><div className="flex gap-2"><Button type="button" size="icon" variant="outline" onClick={() => openDegree(record)} aria-label="Edit degree"><Pencil className="h-4 w-4" /></Button><Button type="button" size="icon" variant="outline" onClick={() => void removeDegree(record)} aria-label="Remove degree"><Trash2 className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>

    <Card><CardHeader><CardTitle>Gap or work history since your last study *</CardTitle><CardDescription>Tell us what you have done since you finished studying, for example jobs, national service, volunteering, caring for family or time out. Add one entry for each period.</CardDescription></CardHeader><CardContent className="space-y-4">
      {work.map((role, index) => <div key={`${role.employer}-${index}`} className="flex items-start justify-between rounded-lg border p-3"><div><p className="font-medium">{role.job_title ? `${role.job_title}, ${role.employer}` : role.employer}</p><p className="text-sm text-muted-foreground">{role.start_date} to {role.end_date || 'present'}</p></div><Button type="button" size="icon" variant="ghost" aria-label="Remove entry" onClick={() => void saveWork(work.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
      {!noGap && <><div className={grid}>
        <div className="space-y-2"><Label htmlFor="work-employer">Activity or employer *</Label><Input id="work-employer" value={workDraft.employer} placeholder="For example National Service" onChange={(event) => setWorkDraft((current) => ({ ...current, employer: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="work-job_title">Role or what you did (optional)</Label><Input id="work-job_title" value={workDraft.job_title} onChange={(event) => setWorkDraft((current) => ({ ...current, job_title: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="work-start_date">From *</Label><Input id="work-start_date" type="date" value={workDraft.start_date} onChange={(event) => setWorkDraft((current) => ({ ...current, start_date: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="work-end_date">To *</Label><Input id="work-end_date" type="date" disabled={workDraft.is_current} min={workDraft.start_date || undefined} value={workDraft.is_current ? '' : workDraft.end_date} onChange={(event) => setWorkDraft((current) => ({ ...current, end_date: event.target.value }))} /><div className="flex items-center gap-2"><Checkbox id="work-is_current" checked={workDraft.is_current === true} onCheckedChange={(checked) => setWorkDraft((current) => ({ ...current, is_current: checked === true }))} /><Label htmlFor="work-is_current" className="font-normal">I am still doing this</Label></div></div>
        <div className="space-y-2"><Label htmlFor="work-city">City (optional)</Label><Input id="work-city" value={workDraft.city} onChange={(event) => setWorkDraft((current) => ({ ...current, city: event.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="work-country">Country (optional)</Label><Input id="work-country" value={workDraft.country} onChange={(event) => setWorkDraft((current) => ({ ...current, country: event.target.value }))} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="work-description">Description (optional)</Label><Textarea id="work-description" value={workDraft.description} onChange={(event) => setWorkDraft((current) => ({ ...current, description: event.target.value }))} /></div>
      </div><Button type="button" variant="outline" onClick={() => void addWork()}><Plus className="mr-2 h-4 w-4" />Add to history</Button></>}
      <div className="space-y-1 rounded-lg border border-dashed p-3">
        <div className="flex items-center gap-2"><Checkbox id="no-gap" checked={noGap} disabled={!noGap && !noGapAllowed} onCheckedChange={(checked) => void saveNoGap(checked === true)} /><Label htmlFor="no-gap" className="font-normal">I have had no gap since my last study</Label></div>
        {noGapStale
          ? <p className="text-xs font-medium text-destructive" role="alert">{noGapStatus === 'no-dates' ? NO_GAP_MESSAGES['no-dates'] : NO_GAP_MESSAGES['too-long-ago']} Untick this box and add your history instead.</p>
          : <p className="text-xs text-muted-foreground">{noGapAllowed ? `Only tick this if you finished studying in the past ${NO_GAP_THRESHOLD_MONTHS} months or are still studying.` : NO_GAP_MESSAGES[noGapStatus]}</p>}
      </div>
    </CardContent></Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Edit education entry' : 'Add education entry'}</DialogTitle></DialogHeader><form onSubmit={saveDegree} noValidate className="space-y-4"><div className={grid}>{degreeField('institution_name', 'Institution')}{degreeField('country', 'Country')}{degreeField('state_region', 'State or region')}{degreeField('city', 'City')}{degreeField('degree_title', 'Qualification or degree title')}{degreeField('final_grade', 'Final grade', 'text', 'Degree class or result, for example Second Class Upper, First Class or Distinction.')}{degreeField('grade_scale', 'Grading scale', 'text', 'For example CGPA out of 4.0 or percentage.')}{degreeField('gpa', 'Final CGPA or score', 'number', 'For example 3.45.')}{degreeField('language_of_instruction', 'Language of instruction')}{degreeField('start_date', 'Start date', 'date')}{degreeField('end_date', 'End date', 'date', 'Must not be before the start date. Use your expected end date if you are still studying.')}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={loading}>Save entry</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

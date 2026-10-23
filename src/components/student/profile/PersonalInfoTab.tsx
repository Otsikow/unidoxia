import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';
import { Link } from 'react-router-dom';
import { gateOptions, getCourseFinderProfileSections } from '@/lib/coursefinderProfile';
import {
  BACKGROUND_PRIVACY_LINE,
  EMERGENCY_EMAIL_HINT,
  PRIVACY_NOTICE_PATH,
  VISA_REFUSAL_REASONS,
  VISA_TYPES,
  isStrictStudent,
  PASSPORT_NOTE,
  PROFILE_FORM_SCHEMAS,
  fieldErrors,
  getPostcodeHelper,
  getPostcodeLabel,
} from '@/lib/studentRegistrationSchema';
import { RESIDENCE_COUNTRIES } from '@/lib/residenceCountries';
import { getWhatsAppFieldState, resolveWhatsAppNumber } from '@/lib/whatsappNumber';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props { student: Tables<'students'>; onUpdate: () => void }
type Form = ReturnType<typeof extractForm>;

const text = (value: unknown) => typeof value === 'string' ? value : '';
const answer = (value: boolean | null) => value === true ? 'yes' : value === false ? 'no' : '';

const extractForm = (student: Tables<'students'>) => {
  const legacyNames = text(student.legal_name).trim().split(/\s+/);
  return {
    first_name: text(student.first_name) || legacyNames[0] || '', middle_name: text(student.middle_name), last_name: text(student.last_name) || legacyNames.slice(1).join(' '),
    contact_phone: text(student.contact_phone), whatsapp_number: text(student.whatsapp_number), contact_email: text(student.contact_email), date_of_birth: text(student.date_of_birth), gender: text(student.gender), marital_status: text(student.marital_status), dependants_travelling: student.dependants_travelling?.toString() ?? '', nationality: text(student.nationality), citizenship: text(student.citizenship), city_of_birth: text(student.city_of_birth), country_of_birth: text(student.country_of_birth),
    passport_number: text(student.passport_number), passport_issue_date: text(student.passport_issue_date), passport_expiry: text(student.passport_expiry), passport_issue_country: text(student.passport_issue_country),
    address_line_1: text(student.address_line_1), country_of_residence: text(student.country_of_residence), state_region: text(student.state_region), city: text(student.city), postal_code: text(student.postal_code),
    permanent_address_line_1: text(student.permanent_address_line_1), permanent_country: text(student.permanent_country), permanent_state_region: text(student.permanent_state_region), permanent_city: text(student.permanent_city), permanent_postal_code: text(student.permanent_postal_code), permanent_same_as_mailing: student.permanent_same_as_mailing,
    emergency_contact_name: text(student.emergency_contact_name), emergency_contact_relationship: text(student.emergency_contact_relationship), emergency_contact_phone: text(student.emergency_contact_phone), emergency_contact_email: text(student.emergency_contact_email),
    has_other_citizenship: answer(student.has_other_citizenship), other_citizenship: text(student.other_citizenship), lived_or_studied_abroad: answer(student.lived_or_studied_abroad), previous_immigration_applications: answer(student.previous_immigration_applications), has_visa_refusals: answer(student.has_visa_refusals), visa_refusal_country: text(student.visa_refusal_country), visa_refusal_year: student.visa_refusal_year?.toString() || '', visa_refusal_type: text(student.visa_refusal_type), visa_refusal_reason: text(student.visa_refusal_reason),
    preferred_course: text(student.preferred_course), preferred_university: text(student.preferred_university), preferred_intake_month: student.preferred_intake_month?.toString() || '', preferred_intake_year: student.preferred_intake_year?.toString() || '',
  };
};

const ErrorsContext = createContext<Record<string, string>>({});

const FieldError = ({ name }: { name: string }) => {
  const message = useContext(ErrorsContext)[name];
  if (!message) return null;
  const text = / must /.test(message) ? `${message.charAt(0).toUpperCase()}${message.slice(1)}.` : `Please enter: ${message}.`;
  return <p id={`${name}-error`} className="text-xs font-medium text-destructive">{text}</p>;
};

const Field = ({ form, setForm, name, label, type = 'text', optional = false, helper, min }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; name: keyof Form; label: string; type?: string; optional?: boolean; helper?: string; min?: number }) => {
  const invalid = Boolean(useContext(ErrorsContext)[String(name)]);
  return (
    <div className="space-y-2">
      <Label htmlFor={String(name)}>{label}{optional ? ' (optional)' : ' *'}</Label>
      <Input id={String(name)} type={type} min={min} value={String(form[name] ?? '')} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} required={!optional} aria-invalid={invalid} aria-describedby={invalid ? `${String(name)}-error` : undefined} />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <FieldError name={String(name)} />
    </div>
  );
};

const Choice = ({ form, setForm, name, label, options, optional = false }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; name: keyof Form; label: string; options: string[]; optional?: boolean }) => (
  <div className="space-y-2">
    <Label>{label}{optional ? ' (optional)' : ' *'}</Label>
    <Select value={String(form[name] || '')} onValueChange={(value) => setForm((current) => ({ ...current, [name]: value }))}>
      <SelectTrigger aria-label={label}><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option === 'yes' ? 'Yes' : option === 'no' ? 'No' : option}</SelectItem>)}</SelectContent>
    </Select>
    <FieldError name={String(name)} />
  </div>
);

const Country = ({ form, setForm, name, label }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; name: keyof Form; label: string }) => (
  <Choice form={form} setForm={setForm} name={name} label={label} options={RESIDENCE_COUNTRIES as unknown as string[]} />
);

export function PersonalInfoTab({ student, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(() => extractForm(student));
  const [whatsappSameAsMobile, setWhatsappSameAsMobile] = useState(
    () => getWhatsAppFieldState(text(student.contact_phone), student.whatsapp_number).sameAsMobile,
  );
  useEffect(() => {
    setForm(extractForm(student));
    setWhatsappSameAsMobile(
      getWhatsAppFieldState(text(student.contact_phone), student.whatsapp_number).sameAsMobile,
    );
  }, [student]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      has_other_citizenship: form.has_other_citizenship === 'yes' ? true : form.has_other_citizenship === 'no' ? false : null,
      lived_or_studied_abroad: form.lived_or_studied_abroad === 'yes' ? true : form.lived_or_studied_abroad === 'no' ? false : null,
      previous_immigration_applications: form.previous_immigration_applications === 'yes' ? true : form.previous_immigration_applications === 'no' ? false : null,
      has_visa_refusals: form.has_visa_refusals === 'yes' ? true : form.has_visa_refusals === 'no' ? false : null,
      dependants_travelling: form.dependants_travelling.trim() === '' ? null : Number(form.dependants_travelling),
      other_citizenship: form.has_other_citizenship === 'yes' ? form.other_citizenship.trim() || null : null,
      visa_refusal_country: form.has_visa_refusals === 'yes' ? form.visa_refusal_country.trim() || null : null,
      visa_refusal_year: form.has_visa_refusals === 'yes' && form.visa_refusal_year.trim() ? Number(form.visa_refusal_year) : null,
      visa_refusal_type: form.has_visa_refusals === 'yes' ? form.visa_refusal_type || null : null,
      visa_refusal_reason: form.has_visa_refusals === 'yes' ? form.visa_refusal_reason || null : null,
      preferred_intake_month: form.preferred_intake_month ? Number(form.preferred_intake_month) : null,
      preferred_intake_year: form.preferred_intake_year ? Number(form.preferred_intake_year) : null,
      whatsapp_number: resolveWhatsAppNumber(form.contact_phone, form.whatsapp_number, whatsappSameAsMobile),
      legal_name: [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' '),
    };
    // Existing students (flag false) are only held to the fields they had before October 2026.
    const strict = isStrictStudent(student);
    const relevant = getCourseFinderProfileSections(payload, [], [], false, new Date(), gateOptions(student)).filter((section) => ['personal', 'passport', 'addresses', 'emergency', 'background'].includes(section.id));
    const missing = relevant.flatMap((section) => section.missing);
    const nextErrors = Object.values(PROFILE_FORM_SCHEMAS).reduce<Record<string, string>>(
      (all, schema) => ({ ...fieldErrors(schema.safeParse(payload), strict), ...all }),
      {},
    );
    setErrors(nextErrors);
    if (missing.length || !/^\+[1-9]\d{7,14}$/.test(form.contact_phone.replace(/[\s()-]/g, ''))) {
      toast({ title: 'Please complete the required fields', description: missing.length ? `Still needed: ${missing.join(', ')}.` : 'Enter a mobile number with country code, for example +447123456789.', variant: 'destructive' });
      return;
    }
    if (!whatsappSameAsMobile && form.whatsapp_number.trim() && !/^\+[1-9]\d{7,14}$/.test(form.whatsapp_number.replace(/[\s()-]/g, ''))) {
      toast({ title: 'Check your WhatsApp number', description: 'Include the country code, for example +447123456789, or leave it blank.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('students').update(payload).eq('id', student.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: studentRecordQueryKey(user?.id) });
      toast({ title: 'Details saved', description: 'Your CourseFinder profile details are up to date.' });
      onUpdate();
    } catch (error) {
      console.error(error);
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : '';
      toast({ title: 'Unable to save details', description: message || 'Please try again.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const grid = 'grid grid-cols-1 gap-4 md:grid-cols-2';
  return <ErrorsContext.Provider value={errors}><form onSubmit={submit} className="space-y-6" noValidate>
    <Card><CardHeader><CardTitle>Registration and personal details</CardTitle><CardDescription>Use your details exactly as they appear on official documents.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Field form={form} setForm={setForm} name="first_name" label="First name" /><Field form={form} setForm={setForm} name="middle_name" label="Middle name" optional /><Field form={form} setForm={setForm} name="last_name" label="Last name" /></div>
      <div className={grid}>
        <Field form={form} setForm={setForm} name="contact_phone" label="Mobile number (with country code)" type="tel" helper="For example +447123456789." />
        <div className="space-y-3">
          {!whatsappSameAsMobile && <Field form={form} setForm={setForm} name="whatsapp_number" label="WhatsApp number (with country code)" type="tel" optional />}
          <div className="flex items-center gap-2">
            <Checkbox id="whatsapp-same-as-mobile" checked={whatsappSameAsMobile} onCheckedChange={(checked) => setWhatsappSameAsMobile(checked === true)} />
            <Label htmlFor="whatsapp-same-as-mobile">Same as mobile</Label>
          </div>
        </div>
        <Field form={form} setForm={setForm} name="contact_email" label="Email" type="email" /><Field form={form} setForm={setForm} name="date_of_birth" label="Date of birth" type="date" helper={PASSPORT_NOTE} /><Choice form={form} setForm={setForm} name="gender" label="Gender" options={['Female', 'Male', 'Non-binary', 'Prefer not to say']} /><Choice form={form} setForm={setForm} name="marital_status" label="Marital status" options={['Single', 'Married', 'Divorced', 'Widowed', 'Separated']} /><Field form={form} setForm={setForm} name="dependants_travelling" label="Number of dependant children travelling with you" type="number" min={0} helper="Enter 0 if no children will travel with you." /><Field form={form} setForm={setForm} name="nationality" label="Nationality" helper={PASSPORT_NOTE} /><Field form={form} setForm={setForm} name="citizenship" label="Citizenship" /><Field form={form} setForm={setForm} name="city_of_birth" label="City of birth" /><Country form={form} setForm={setForm} name="country_of_birth" label="Country of birth" />
      </div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Passport</CardTitle></CardHeader><CardContent className={grid}><Field form={form} setForm={setForm} name="passport_number" label="Passport number" /><Field form={form} setForm={setForm} name="passport_issue_date" label="Issue date" type="date" /><Field form={form} setForm={setForm} name="passport_expiry" label="Expiry date" type="date" /><Country form={form} setForm={setForm} name="passport_issue_country" label="Issue country" /></CardContent></Card>
    <Card><CardHeader><CardTitle>Home address</CardTitle><CardDescription>Your full current home address, where we can send letters.</CardDescription></CardHeader><CardContent className={grid}><Field form={form} setForm={setForm} name="address_line_1" label="House number and street" /><Country form={form} setForm={setForm} name="country_of_residence" label="Country" /><Field form={form} setForm={setForm} name="state_region" label="State or region" /><Field form={form} setForm={setForm} name="city" label="City or town" /><Field form={form} setForm={setForm} name="postal_code" label={getPostcodeLabel(form.country_of_residence)} helper={getPostcodeHelper(form.country_of_residence)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Permanent address</CardTitle><CardDescription>Only needed if your permanent address is different from your home address.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2"><Checkbox id="same" checked={form.permanent_same_as_mailing} onCheckedChange={(checked) => setForm((current) => ({ ...current, permanent_same_as_mailing: checked === true }))} /><Label htmlFor="same">My permanent address is the same as my home address</Label></div>{!form.permanent_same_as_mailing && <div className={grid}><Field form={form} setForm={setForm} name="permanent_address_line_1" label="House number and street" /><Country form={form} setForm={setForm} name="permanent_country" label="Country" /><Field form={form} setForm={setForm} name="permanent_state_region" label="State or region" /><Field form={form} setForm={setForm} name="permanent_city" label="City or town" /><Field form={form} setForm={setForm} name="permanent_postal_code" label={getPostcodeLabel(form.permanent_country)} helper={getPostcodeHelper(form.permanent_country)} /></div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Emergency contact</CardTitle><CardDescription>Add one person we can contact in an emergency, usually a parent or guardian.</CardDescription></CardHeader><CardContent className={grid}><Field form={form} setForm={setForm} name="emergency_contact_name" label="Full name" /><Field form={form} setForm={setForm} name="emergency_contact_relationship" label="Relationship" /><Field form={form} setForm={setForm} name="emergency_contact_phone" label="Phone (with country code)" type="tel" /><Field form={form} setForm={setForm} name="emergency_contact_email" label="Email" type="email" helper={EMERGENCY_EMAIL_HINT} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Background</CardTitle><CardDescription>Please answer every question. {BACKGROUND_PRIVACY_LINE} See our <Link to={PRIVACY_NOTICE_PATH} className="underline underline-offset-2">Privacy Notice</Link>.</CardDescription></CardHeader><CardContent className={grid}><div className="space-y-4"><Choice form={form} setForm={setForm} name="has_other_citizenship" label="Do you have another citizenship?" options={['yes', 'no']} />{form.has_other_citizenship === 'yes' && <Field form={form} setForm={setForm} name="other_citizenship" label="Which other citizenship?" helper="For example British. List all if more than one." />}</div><Choice form={form} setForm={setForm} name="lived_or_studied_abroad" label="Have you lived or studied in another country?" options={['yes', 'no']} /><Choice form={form} setForm={setForm} name="previous_immigration_applications" label="Have you made previous immigration applications?" options={['yes', 'no']} /><div className="space-y-4"><Choice form={form} setForm={setForm} name="has_visa_refusals" label="Have you ever been refused a visa for any country?" options={['yes', 'no']} />{form.has_visa_refusals === 'yes' && <div className="space-y-4"><p className="text-xs text-muted-foreground">Tell us about your most recent refusal. Our team will ask for anything else they need.</p><Country form={form} setForm={setForm} name="visa_refusal_country" label="Country that refused the visa" /><Field form={form} setForm={setForm} name="visa_refusal_year" label="Year of refusal" type="number" min={1950} /><Choice form={form} setForm={setForm} name="visa_refusal_type" label="Type of visa" options={[...VISA_TYPES]} /><Choice form={form} setForm={setForm} name="visa_refusal_reason" label="Main reason given" options={[...VISA_REFUSAL_REASONS]} optional /></div>}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Course preferences</CardTitle><CardDescription>Optional preferences only. UniDoxia staff will confirm your final course, university and intake.</CardDescription></CardHeader><CardContent className={grid}><Field form={form} setForm={setForm} name="preferred_course" label="Preferred course" optional /><Field form={form} setForm={setForm} name="preferred_university" label="Preferred university" optional /><Field form={form} setForm={setForm} name="preferred_intake_month" label="Preferred intake month" type="number" optional /><Field form={form} setForm={setForm} name="preferred_intake_year" label="Preferred intake year" type="number" optional /></CardContent></Card>
    <Button type="submit" disabled={loading} className="w-full">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save profile details</Button>
  </form></ErrorsContext.Provider>;
}

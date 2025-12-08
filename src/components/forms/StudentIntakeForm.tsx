import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Loader2,
  MailCheck,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud
} from 'lucide-react';

type ExtractedDocumentFields = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  grades?: string;
  schoolName?: string;
};

const MONTH_MAP: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
};

const normalizeWhitespace = (value?: string | null) =>
  value ? value.replace(/\s+/g, ' ').trim() : undefined;

const toIsoDate = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const dmyMatch = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const monthNameMatch = trimmed.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (monthNameMatch) {
    const [, monthName, day, year] = monthNameMatch;
    const month = MONTH_MAP[monthName.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }
  return undefined;
};

const splitName = (value?: string | null) => {
  if (!value) return {};
  const sanitized = value.replace(/[^A-Za-z\s'.-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) return {};
  const parts = sanitized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') };
};

const extractDocumentFields = (content: string): ExtractedDocumentFields => {
  const normalized = content.replace(/\r/g, '');
  const nameMatch = normalized.match(/(?:Student\s+Name|Full\s+Name|Name)\s*[:-]\s*([^\n]+)/i);
  const dobMatch = normalized.match(/(?:Date\s+of\s+Birth|DOB)\s*[:-]\s*([^\n]+)/i);
  const addressMatch = normalized.match(/(?:Address|Residence)\s*[:-]\s*([^\n]+)/i);
  const gradeMatch = normalized.match(/(?:GPA|Grade(?:s)?|Average)\s*[:-]\s*([^\n]+)/i);
  const schoolMatch = normalized.match(/(?:School\s+Name|High\s+School|Institution)\s*[:-]\s*([^\n]+)/i);

  const nameParts = splitName(nameMatch?.[1]);

  return {
    ...nameParts,
    dateOfBirth: toIsoDate(dobMatch?.[1]),
    address: normalizeWhitespace(addressMatch?.[1]),
    grades: normalizeWhitespace(gradeMatch?.[1]),
    schoolName: normalizeWhitespace(schoolMatch?.[1])
  };
};

const studentIntakeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().min(6, 'Please provide a phone number we can reach you at'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  citizenship: z.string().min(1, 'Citizenship is required'),
  currentLocation: z.string().min(1, 'Where are you currently located?'),
  preferredContact: z.enum(['email', 'phone', 'whatsapp']),
  highestEducation: z.string().min(1, 'Select your highest completed education'),
  fieldOfStudy: z.string().min(1, 'Tell us your most recent field of study'),
  schoolName: z.string().max(120, 'Please keep the school name under 120 characters').optional(),
  gradeAverage: z.string().max(60, 'Please shorten the grade details').optional(),
  graduationYear: z
    .string()
    .regex(/^\d{4}$/, 'Enter the year you graduated (YYYY)'),
  gpaScale: z.string().min(1, 'Let us know your grading scale'),
  englishProficiency: z.enum(['beginner', 'intermediate', 'advanced', 'native', 'official']),
  englishTest: z.string().optional(),
  testScore: z.string().optional(),
  preferredDestinations: z.array(z.string()).min(1, 'Choose at least one destination'),
  preferredIntakeYear: z.string().min(1, 'Select your preferred intake year'),
  preferredIntakeSeason: z.string().min(1, 'Select the term you would like to start'),
  programLevel: z.string().min(1, 'Select the program level you are interested in'),
  studyArea: z.string().min(1, 'Select your area of interest'),
  studyMode: z.string().min(1, 'Choose a study mode'),
  budgetRange: z.string().min(1, 'Let us know your estimated budget'),
  supportServices: z.array(z.string()).optional(),
  housingPreference: z.enum(['on-campus', 'off-campus', 'undecided']).optional(),
  scholarshipInterest: z.boolean(),
  additionalNotes: z.string().max(1000, 'Please keep your note under 1000 characters').optional(),
  consent: z.boolean().refine((value) => value === true, {
    message: 'You need to agree before we can process your information'
  })
});

type StudentIntakeFormValues = z.infer<typeof studentIntakeSchema>;

const educationLevels = [
  'High School Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate or PhD',
  'Vocational or Diploma',
  'Currently in High School'
];

const studyAreas = [
  'Business & Management',
  'Engineering & Technology',
  'Health & Medicine',
  'Arts & Design',
  'Computer Science & IT',
  'Humanities & Social Sciences',
  'Science & Mathematics'
];

const destinations = ['Canada', 'United Kingdom', 'United States', 'Australia', 'New Zealand', 'Ireland'];

const intakeSeasons = ['January', 'May', 'September', 'Rolling Intake'];

const studyModes = ['On-campus', 'Hybrid', 'Online'];

const budgetRanges = ['Below $15,000', '$15,000 - $25,000', '$25,000 - $35,000', 'Above $35,000'];

const contactMethods = [
  { label: 'Email', value: 'email' },
  { label: 'Phone Call', value: 'phone' },
  { label: 'WhatsApp', value: 'whatsapp' }
];

const supportOptions = [
  { label: 'Visa Application Guidance', value: 'visa' },
  { label: 'Scholarship & Funding Advice', value: 'scholarship' },
  { label: 'Accommodation Support', value: 'accommodation' },
  { label: 'Application Review', value: 'application' },
  { label: 'Career & Internship Planning', value: 'career' }
];

export default function StudentIntakeForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<StudentIntakeFormValues | null>(null);
  const [autofillStatus, setAutofillStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [autofillResult, setAutofillResult] = useState<ExtractedDocumentFields | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => (currentYear + idx).toString()),
    [currentYear]
  );
  const graduationYears = useMemo(
    () => Array.from({ length: 20 }, (_, idx) => (currentYear - idx).toString()),
    [currentYear]
  );

  const defaultValues = useMemo<StudentIntakeFormValues>(
    () => ({
      firstName: '',
      lastName: '',
      email: user?.email ?? '',
      phone: '',
      dateOfBirth: '',
      citizenship: '',
      currentLocation: '',
      preferredContact: 'email',
      highestEducation: '',
      fieldOfStudy: '',
      schoolName: '',
      gradeAverage: '',
      graduationYear: graduationYears[0] ?? currentYear.toString(),
      gpaScale: '4.0',
      englishProficiency: 'advanced',
      englishTest: '',
      testScore: '',
      preferredDestinations: [],
      preferredIntakeYear: yearOptions[0] ?? currentYear.toString(),
      preferredIntakeSeason: 'September',
      programLevel: '',
      studyArea: '',
      studyMode: 'On-campus',
      budgetRange: '',
      supportServices: [],
      housingPreference: 'undecided',
      scholarshipInterest: true,
      additionalNotes: '',
      consent: false
    }),
    [graduationYears, yearOptions, user?.email, currentYear]
  );

  const form = useForm<StudentIntakeFormValues>({
    resolver: zodResolver(studentIntakeSchema),
    defaultValues
  });

  const watchAllFields = form.watch();

  const completion = useMemo(() => {
    const requiredKeys: (keyof StudentIntakeFormValues)[] = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dateOfBirth',
      'citizenship',
      'currentLocation',
      'preferredContact',
      'highestEducation',
      'fieldOfStudy',
      'graduationYear',
      'gpaScale',
      'englishProficiency',
      'preferredDestinations',
      'preferredIntakeYear',
      'preferredIntakeSeason',
      'programLevel',
      'studyArea',
      'studyMode',
      'budgetRange',
      'consent'
    ];

    const filled = requiredKeys.reduce((count, key) => {
      const value = watchAllFields[key];
      if (Array.isArray(value)) {
        return value.length > 0 ? count + 1 : count;
      }
      if (typeof value === 'boolean') {
        return value ? count + 1 : count;
      }
      return value && String(value).trim().length > 0 ? count + 1 : count;
    }, 0);

    return Math.round((filled / requiredKeys.length) * 100);
  }, [watchAllFields]);

  const onSubmit = async (values: StudentIntakeFormValues) => {
    setIsSubmitting(true);
    try {
      let tenantId = '00000000-0000-0000-0000-000000000001';

      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData?.tenant_id) {
          tenantId = profileData.tenant_id;
        }
      }

      const payload = {
        tenant_id: tenantId,
        student_id: user?.id ?? null,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone,
        citizenship: values.citizenship,
        current_location: values.currentLocation,
        preferred_contact: values.preferredContact,
        highest_education: values.highestEducation,
        field_of_study: values.fieldOfStudy,
        graduation_year: values.graduationYear,
        gpa_scale: values.gpaScale,
        english_proficiency: values.englishProficiency,
        english_test: values.englishTest || null,
        english_test_score: values.testScore || null,
        preferred_destinations: values.preferredDestinations,
        preferred_intake_year: values.preferredIntakeYear,
        preferred_intake_season: values.preferredIntakeSeason,
        program_level: values.programLevel,
        study_area: values.studyArea,
        study_mode: values.studyMode,
        budget_range: values.budgetRange,
        support_services: values.supportServices ?? [],
        housing_preference: values.housingPreference ?? 'undecided',
        scholarship_interest: values.scholarshipInterest,
        additional_notes: values.additionalNotes || null,
        consent_granted: values.consent
      };

      const studentIntakeTable = (supabase as unknown as {
        from: (table: string) => {
          insert: (values: typeof payload) => Promise<{ error: PostgrestError | null }>;
        };
      }).from('student_intake_forms');

      const { error } = await studentIntakeTable.insert(payload);

      if (error) {
        throw error;
      }

      setSubmittedData(values);
      toast({
        title: 'Thanks! Your intake form has been submitted.',
        description: 'Our advisors will review your profile and reach out with tailored program options shortly.'
      });

      form.reset({ ...defaultValues });
    } catch (error) {
      console.error('Failed to submit intake form', error);
      toast({
        title: 'We could not sync your form just yet',
        description: 'Please try again in a moment or reach out to our support team for assistance.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDestinations = watchAllFields.preferredDestinations ?? [];
  const requestedServices = watchAllFields.supportServices ?? [];

  const handleAutofillUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAutofillStatus('processing');
    setAutofillError(null);
    try {
      const text = await file.text();
      const extracted = extractDocumentFields(text);

      if (extracted.firstName) {
        form.setValue('firstName', extracted.firstName, { shouldDirty: true, shouldTouch: true });
      }
      if (extracted.lastName) {
        form.setValue('lastName', extracted.lastName, { shouldDirty: true, shouldTouch: true });
      }
      if (extracted.dateOfBirth) {
        form.setValue('dateOfBirth', extracted.dateOfBirth, { shouldDirty: true, shouldTouch: true });
      }
      if (extracted.address) {
        form.setValue('currentLocation', extracted.address, { shouldDirty: true, shouldTouch: true });
      }
      if (extracted.schoolName) {
        form.setValue('schoolName', extracted.schoolName, { shouldDirty: true });
      }
      if (extracted.grades) {
        form.setValue('gradeAverage', extracted.grades, { shouldDirty: true });
      }

      setAutofillResult(extracted);
      setAutofillStatus('success');
      toast({
        title: 'Document scanned',
        description: 'We filled in the details we could extract. Please confirm they look correct.'
      });
    } catch (error) {
      console.error('Failed to process document for autofill', error);
      setAutofillStatus('error');
      setAutofillError('We could not read that file. Please upload a clear PDF, DOCX, or text document.');
      toast({
        title: 'Autofill unavailable',
        description: 'We ran into an issue processing your document.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr] items-start">
      <Card className="order-2 lg:order-1">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-xl sm:text-2xl">
              <ClipboardList className="h-6 w-6 text-primary" />
              Tell us about your study goals
            </CardTitle>
            <CardDescription>
              Share a few details so we can match you with the best universities, programs, and support services.
            </CardDescription>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Profile completion</span>
              <span>{completion}%</span>
            </div>
            <Progress value={completion} className="h-2" />
          </div>
          {submittedData && (
            <Alert className="border-success/50 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle>Submission received</AlertTitle>
              <AlertDescription>
                Thank you, {submittedData.firstName}! Our admissions team will contact you using your preferred method.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <section className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI document autofill
                      <Badge variant="secondary" className="text-xs">
                        Beta
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload a transcript, government ID, or proof of enrollment and we will pre-fill the matching fields
                      for you.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={documentInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.rtf,.json,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleAutofillUpload}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={autofillStatus === 'processing'}
                    >
                      {autofillStatus === 'processing' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UploadCloud className="mr-2 h-4 w-4" />
                      )}
                      {autofillStatus === 'processing' ? 'Analyzing...' : 'Upload document'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAutofillResult(null);
                        setAutofillStatus('idle');
                        setAutofillError(null);
                      }}
                      disabled={!autofillResult && autofillStatus !== 'error'}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                {autofillStatus === 'error' && autofillError && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {autofillError}
                  </div>
                )}
                <div className="rounded-md border border-dashed bg-background/80 p-4 text-sm">
                  {autofillResult ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">We captured:</p>
                      <ul className="grid gap-2 text-muted-foreground sm:grid-cols-2">
                        <li>
                          <span className="font-medium text-foreground">Name:</span>{' '}
                          {autofillResult.firstName || autofillResult.lastName
                            ? [autofillResult.firstName, autofillResult.lastName].filter(Boolean).join(' ')
                            : 'Not detected'}
                        </li>
                        <li>
                          <span className="font-medium text-foreground">Date of birth:</span>{' '}
                          {autofillResult.dateOfBirth ?? 'Not detected'}
                        </li>
                        <li>
                          <span className="font-medium text-foreground">Address:</span>{' '}
                          {autofillResult.address ?? 'Not detected'}
                        </li>
                        <li>
                          <span className="font-medium text-foreground">Grades:</span>{' '}
                          {autofillResult.grades ?? 'Not detected'}
                        </li>
                        <li>
                          <span className="font-medium text-foreground">School:</span>{' '}
                          {autofillResult.schoolName ?? 'Not detected'}
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No document uploaded yet. We never store your files—everything stays on this device until you submit
                      the form.
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Personal information</h3>
                    <p className="text-sm text-muted-foreground">
                      Help us understand who you are and how to reach you for next steps.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Include country code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth *</FormLabel>
                        <FormControl>
                          <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="citizenship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Citizenship *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current city *</FormLabel>
                        <FormControl>
                          <Input placeholder="City, Country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="preferredContact"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Preferred contact method *</FormLabel>
                      <FormDescription>We will reach out using the method that works best for you.</FormDescription>
                      <FormControl>
                        <RadioGroup
                          className="grid gap-3 sm:grid-cols-3"
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          {contactMethods.map((method) => (
                            <FormItem key={method.value} className="flex items-center space-x-3 space-y-0 rounded-lg border p-3">
                              <FormControl>
                                <RadioGroupItem value={method.value} />
                              </FormControl>
                              <FormLabel className="font-normal">{method.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Academic background</h3>
                    <p className="text-sm text-muted-foreground">Tell us about your most recent studies and language readiness.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="highestEducation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highest education completed *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {educationLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fieldOfStudy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary field of study *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mechanical Engineering" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Most recent school</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sunrise International School" {...field} />
                        </FormControl>
                        <FormDescription>Optional—help us understand where you studied last.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Graduation year *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {graduationYears.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gpaScale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grading scale *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="e.g., 4.0" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['4.0', '5.0', '7.0', '10.0', 'Percentage'].map((scale) => (
                              <SelectItem key={scale} value={scale}>
                                {scale}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="englishProficiency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>English proficiency *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="native">Native / Fluent</SelectItem>
                            <SelectItem value="official">Official test taken</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="gradeAverage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recent grades or GPA</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 3.8 GPA / 92%" {...field} />
                      </FormControl>
                      <FormDescription>We will only use this to match scholarships and academic programs.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="englishTest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>English test (if any)</FormLabel>
                        <FormControl>
                          <Input placeholder="IELTS, TOEFL, PTE..." {...field} />
                        </FormControl>
                        <FormDescription>Optional – include the test name if you have completed one.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="testScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test score</FormLabel>
                        <FormControl>
                          <Input placeholder="Overall band / score" {...field} />
                        </FormControl>
                        <FormDescription>Provide your most recent score to help us evaluate eligibility.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Study preferences</h3>
                    <p className="text-sm text-muted-foreground">Help us tailor program recommendations to your goals.</p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="preferredDestinations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred study destinations *</FormLabel>
                      <FormDescription>Select at least one country you are considering.</FormDescription>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {destinations.map((country) => {
                          const checked = field.value?.includes(country);
                          return (
                            <FormItem
                              key={country}
                              className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 transition hover:border-primary"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(selected) => {
                                    const newValue = selected
                                      ? [...(field.value ?? []), country]
                                      : (field.value ?? []).filter((item) => item !== country);
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{country}</FormLabel>
                            </FormItem>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="preferredIntakeYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred intake year *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {yearOptions.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferredIntakeSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred term *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select term" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {intakeSeasons.map((term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="programLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course level *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['Undergraduate', 'Postgraduate', 'PhD / Research', 'Diploma / Certificate'].map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="studyArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area of interest *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an area" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {studyAreas.map((area) => (
                              <SelectItem key={area} value={area}>
                                {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studyMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study mode *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Preferred mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {studyModes.map((mode) => (
                              <SelectItem key={mode} value={mode}>
                                {mode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="budgetRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated annual budget (USD) *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {budgetRanges.map((range) => (
                              <SelectItem key={range} value={range}>
                                {range}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="housingPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Housing preference</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'undecided'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="on-campus">On-campus housing</SelectItem>
                            <SelectItem value="off-campus">Off-campus housing</SelectItem>
                            <SelectItem value="undecided">Undecided</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Support needs</h3>
                    <p className="text-sm text-muted-foreground">Let us know how else we can assist during your journey.</p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="supportServices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support services</FormLabel>
                      <FormDescription>Select all the areas where you would like dedicated help.</FormDescription>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {supportOptions.map((option) => {
                          const checked = field.value?.includes(option.value);
                          return (
                            <FormItem
                              key={option.value}
                              className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 transition hover:border-primary"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(selected) => {
                                    const newValue = selected
                                      ? [...(field.value ?? []), option.value]
                                      : (field.value ?? []).filter((item) => item !== option.value);
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{option.label}</FormLabel>
                            </FormItem>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scholarshipInterest"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-base">Interested in scholarships?</FormLabel>
                        <FormDescription>
                          Enable this if you would like us to prioritise programs with funding options.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anything else we should know?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your goals, preferred universities, questions, or special circumstances."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Optional – this helps us tailor guidance to your situation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Consent</h3>
                    <p className="text-sm text-muted-foreground">We value your privacy and keep your data secure.</p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-tight">
                        <FormLabel className="text-base">I agree to the data usage policy *</FormLabel>
                        <FormDescription>
                          I consent to UniDoxia storing my details to provide personalized study
                          recommendations and support services.
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  We respond within 24 hours. Submitting this form won’t create any obligation and you can update details
                  later.
                </p>
                <Button type="submit" size="lg" className="min-w-[180px]" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving your profile
                    </>
                  ) : (
                    <>
                      <MailCheck className="mr-2 h-4 w-4" /> Submit intake form
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="order-1 lg:order-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Your submission snapshot
            </CardTitle>
            <CardDescription>
              Review highlights from the details you have shared so far. Updates appear in real time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Preferred destinations</h4>
              {selectedDestinations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedDestinations.map((country) => (
                    <Badge key={country} variant="secondary" className="px-3 py-1">
                      {country}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select at least one country to get tailored matches.</p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Course focus</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-medium">Intake:</span>
                  {watchAllFields.preferredIntakeSeason} {watchAllFields.preferredIntakeYear}
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium">Level:</span>
                  {watchAllFields.programLevel || 'Not selected'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium">Area:</span>
                  {watchAllFields.studyArea || 'Not selected'}
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-medium">Budget:</span>
                  {watchAllFields.budgetRange || 'Not set'}
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Support requested</h4>
              {requestedServices.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {supportOptions
                    .filter((option) => requestedServices.includes(option.value))
                    .map((option) => (
                      <li key={option.value} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {option.label}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Select the services you would like help with.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5 text-primary" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">1</span>
                <div>
                  <p className="font-medium">Personalized program shortlist</p>
                  <p className="text-muted-foreground">Our advisors curate options that align with your goals and budget.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">2</span>
                <div>
                  <p className="font-medium">Expert consultation</p>
                  <p className="text-muted-foreground">Discuss application timelines, visa steps, and required documents.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">3</span>
                <div>
                  <p className="font-medium">Application support</p>
                  <p className="text-muted-foreground">We help you assemble a compelling application and prepare for arrival.</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

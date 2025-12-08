import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const programOptions = [
  "Undergraduate Degrees",
  "Postgraduate Degrees",
  "Short Courses",
  "Online & Hybrid",
  "Professional Certificates",
  "Pathway/Foundation",
  "Language Preparation",
];

const annualIntakeOptions = [
  "Up to 100 students",
  "100 - 250 students",
  "250 - 500 students",
  "500 - 1,000 students",
  "More than 1,000 students",
];

const partnershipSchema = z
  .object({
    universityName: z
      .string()
      .trim()
      .min(2, "University name is required")
      .max(200, "University name is too long"),
    website: z
      .string()
      .trim()
      .url("Enter a valid website URL")
      .optional()
      .or(z.literal("")),
    contactName: z
      .string()
      .trim()
      .min(2, "Contact name is required")
      .max(150, "Contact name is too long"),
    contactTitle: z
      .string()
      .trim()
      .max(150, "Job title is too long")
      .optional()
      .or(z.literal("")),
    contactEmail: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(255, "Email is too long"),
    contactPhone: z
      .string()
      .trim()
      .max(50, "Phone number is too long")
      .optional()
      .or(z.literal("")),
    address: z
      .string()
      .trim()
      .min(5, "Address is required")
      .max(255, "Address is too long"),
    city: z
      .string()
      .trim()
      .min(2, "City is required")
      .max(120, "City name is too long"),
    country: z
      .string()
      .trim()
      .min(2, "Country is required")
      .max(120, "Country name is too long"),
    programs: z
      .array(z.string())
      .min(1, "Select at least one academic offering"),
    otherPrograms: z
      .string()
      .trim()
      .max(255, "Course description is too long")
      .optional()
      .or(z.literal("")),
    annualIntake: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
    studentDemographics: z
      .string()
      .trim()
      .min(10, "Tell us about your target students")
      .max(600, "Student demographic summary is too long"),
    partnershipGoals: z
      .string()
      .trim()
      .min(20, "Share the goals you want to achieve")
      .max(800, "Goal summary is too long"),
    supportNeeds: z
      .string()
      .trim()
      .min(10, "Describe the support you expect")
      .max(600, "Support summary is too long"),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the collaboration terms",
    }),
  })
  .refine(
    (values) =>
      values.otherPrograms === "" ||
      !values.programs.includes("Other") ||
      values.otherPrograms.length > 3,
    {
      message: "Provide details for the selected 'Other' programs",
      path: ["otherPrograms"],
    }
  );

type PartnershipFormValues = z.infer<typeof partnershipSchema>;

export const UniversityPartnershipForm = () => {
  const { toast } = useToast();
  const { profile, user, loading } = useAuth();

  const form = useForm<PartnershipFormValues>({
    resolver: zodResolver(partnershipSchema),
    defaultValues: {
      universityName: "",
      website: "",
      contactName: "",
      contactTitle: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      country: "",
      programs: [],
      otherPrograms: "",
      annualIntake: "",
      studentDemographics: "",
      partnershipGoals: "",
      supportNeeds: "",
      termsAccepted: false,
    },
  });

  const tenantId = useMemo(
    () => profile?.tenant_id ?? DEFAULT_TENANT_ID,
    [profile?.tenant_id]
  );

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const programsData = {
        selected: values.programs,
        other: values.otherPrograms || null,
        annualIntake: values.annualIntake || null,
      };

      const { error } = await supabase.from("partnership_applications").insert({
        university_name: values.universityName,
        website: values.website || null,
        primary_contact_name: values.contactName,
        primary_contact_position: values.contactTitle || null,
        primary_contact_email: values.contactEmail,
        primary_contact_phone: values.contactPhone || null,
        address: values.address,
        city: values.city,
        country: values.country,
        programs_offered: programsData,
        target_student_demographics: values.studentDemographics,
        partnership_terms: values.partnershipGoals,
        additional_documents: {
          supportExpectations: values.supportNeeds,
        },
        status: "pending",
        tenant_id: tenantId,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Application received",
        description:
          "Thank you for reaching out. Our partnerships team will follow up within two business days.",
      });

      form.reset({
        universityName: "",
        website: "",
        contactName: "",
        contactTitle: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        city: "",
        country: "",
        programs: [],
        otherPrograms: "",
        annualIntake: "",
        studentDemographics: "",
        partnershipGoals: "",
        supportNeeds: "",
        termsAccepted: false,
      });
    } catch (error) {
      console.error("Failed to submit partnership application", error);
      toast({
        title: "Submission failed",
        description: "We couldn't submit your application. Please try again or email partnerships@unidoxia.com.",
        variant: "destructive",
      });
    }
  });

  const selectedPrograms = form.watch("programs") ?? [];

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Create a partner account</AlertTitle>
          <AlertDescription>
            Sign up as a partner university to submit your onboarding request and access collaboration tools.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth/signup?role=partner">Create partner account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/auth/login">Log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Finish setting up your profile</AlertTitle>
          <AlertDescription>
            We couldn't load your account details. Refresh the page or contact our partnerships team for support.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link to="/contact">Contact support</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (profile.role !== "partner") {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Partner access required</AlertTitle>
          <AlertDescription>
            You're signed in as a {profile.role}. Please create or switch to a partner university account before completing this
            form.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth/signup?role=partner">Create partner account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/contact">Talk to partnerships</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="universityName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>University name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Horizon International University" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://" {...field} />
                </FormControl>
                <FormDescription>Include https:// for the best results.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary contact</FormLabel>
                <FormControl>
                  <Input placeholder="Full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job title</FormLabel>
                <FormControl>
                  <Input placeholder="Director of International Recruitment" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="name@university.edu" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input placeholder="Include country code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campus address</FormLabel>
                <FormControl>
                  <Input placeholder="123 Global Ave" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <FormLabel>Academic offerings</FormLabel>
          <FormDescription>Select all program types you welcome international students into.</FormDescription>
          <FormField
            control={form.control}
            name="programs"
            render={({ field }) => (
              <FormItem>
                <div className="grid gap-3 sm:grid-cols-2">
                  {programOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm transition hover:border-primary"
                    >
                      <Checkbox
                        checked={field.value?.includes(option)}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          if (isChecked) {
                            field.onChange([...field.value, option]);
                          } else {
                            field.onChange(
                              field.value.filter((value) => value !== option)
                            );
                          }
                        }}
                      />
                      <span className="leading-snug">{option}</span>
                    </label>
                  ))}
                  <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm transition hover:border-primary">
                    <Checkbox
                      checked={field.value?.includes("Other")}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        if (isChecked) {
                          field.onChange([...field.value, "Other"]);
                        } else {
                          field.onChange(
                            field.value.filter((value) => value !== "Other")
                          );
                        }
                      }}
                    />
                    <span className="leading-snug">Other (describe below)</span>
                  </label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="otherPrograms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Other programs</FormLabel>
                <FormControl>
                  <Input
                    placeholder="If you selected Other, describe the programs here"
                    {...field}
                    disabled={!selectedPrograms.includes("Other")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="annualIntake"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated annual international intake</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an intake range" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {annualIntakeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
          name="studentDemographics"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target student demographics</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Share key markets, academic backgrounds, or strategic priorities."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="partnershipGoals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Partnership goals</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Tell us what success looks like for your university and students."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supportNeeds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Support expectations</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Admissions support, marketing reach, recruitment regions, student services, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border bg-muted/40 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="space-y-1 text-sm">
                <FormLabel className="font-medium">I confirm the information shared is accurate.</FormLabel>
                <FormDescription>
                  By submitting this form you agree to be contacted by the UniDoxia partnerships team and to our
                  standard collaboration terms.
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting
            </span>
          ) : (
            "Submit partnership request"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default UniversityPartnershipForm;

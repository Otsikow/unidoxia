import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Circle, Globe, Image as ImageIcon, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Sparkles, Trash2, Upload, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { COUNTRIES } from "@/lib/countries";
import { computeUniversityProfileCompletion, emptyUniversityProfileDetails, getUniversityProfileChecklist, mergeUniversityProfileDetails, parseUniversityProfileDetails, isNewUniversityProfile, type UniversityProfileDetails, type UniversityProfileChecklistItem } from "@/lib/universityProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { LoadingState } from "@/components/LoadingState";
import type { UniversityRecord } from "@/lib/universityProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScoringConfig } from "@/types/review";

interface UniversityProfileQueryResult {
  university: UniversityRecord | null;
  details: UniversityProfileDetails;
  scoringConfig: ScoringConfig;
}

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_HERO_SIZE = 10 * 1024 * 1024; // 10MB
const UNIVERSITY_MEDIA_BUCKET = "university-media";
const optionalUrlSchema = z.string().trim().optional().or(z.literal("")).transform(value => {
  if (!value) return "";
  // Auto-prepend https:// if no protocol specified
  if (value && !value.match(/^https?:\/\//i)) {
    return `https://${value}`;
  }
  return value;
}).refine(value => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch (error) {
    return false;
  }
}, {
  message: "Enter a valid URL"
});
const optionalText = z.string().trim().optional().or(z.literal("")).transform(value => value ?? "");
const profileSchema = z.object({
  name: z.string().min(3, "Enter your university name"),
  tagline: optionalText,
  country: z.string().min(2, "Select your country"),
  city: optionalText,
  website: optionalUrlSchema,
  description: z.string().min(30, "Share at least a couple of sentences about your university").max(2000, "Keep your description concise"),
  contactName: z.string().min(3, "Provide a contact name"),
  contactTitle: optionalText,
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: optionalText,
  highlights: z.array(
    z.string().trim()
      .refine(val => val === "" || val.length >= 3, "Highlight must be at least 3 characters")
      .refine(val => val === "" || val.length <= 160, "Keep highlights short and impactful")
  ).refine(
    arr => arr.filter(h => h.length > 0).length >= 1,
    "Add at least one highlight"
  ),
  social: z.object({
    facebook: optionalUrlSchema,
    instagram: optionalUrlSchema,
    linkedin: optionalUrlSchema,
    youtube: optionalUrlSchema
  }),
  scoringConfig: z.object({
    academics: z.number().min(0).max(100),
    english_proficiency: z.number().min(0).max(100),
    statement_quality: z.number().min(0).max(100),
    visa_risk: z.number().min(0).max(100),
  })
});
type UniversityProfileFormValues = z.infer<typeof profileSchema>;
const normalizeEmptyToNull = (value: string | undefined | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const extractStorageObject = (url: string | null | undefined) => {
  if (!url) return null;
  const match = url.match(/storage\/v1\/object\/public\/([^?]+)/);
  if (!match) return null;
  const [bucket, ...pathParts] = match[1].split("/");
  if (!bucket || pathParts.length === 0) return null;
  return {
    bucket,
    path: pathParts.join("/")
  };
};
const UniversityProfilePage = () => {
  const queryClient = useQueryClient();
  const {
    toast
  } = useToast();
  const {
    profile,
    refreshProfile,
    loading: authLoading,
    profileLoading
  } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [logoPreviewObjectUrl, setLogoPreviewObjectUrl] = useState<string | null>(null);
  const [heroPreviewObjectUrl, setHeroPreviewObjectUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<UniversityProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      tagline: "",
      country: "",
      city: "",
      website: "",
      description: "",
      contactName: profile?.full_name ?? "",
      contactTitle: "",
      contactEmail: profile?.email ?? "",
      contactPhone: profile?.phone ?? "",
      highlights: [""],
      social: {
        facebook: "",
        instagram: "",
        linkedin: "",
        youtube: ""
      },
      scoringConfig: {
        academics: 25,
        english_proficiency: 25,
        statement_quality: 25,
        visa_risk: 25
      }
    }
  });

  // Note: useFieldArray requires object arrays, using workaround for string array
  const highlightsFieldArray = useFieldArray({
    control: form.control as any,
    name: "highlights" as const
  });
  const profileQuery = useQuery<UniversityProfileQueryResult>({
    // CRITICAL: Include profile.id AND email in query key to ensure user-specific caching
    // This prevents stale data from being served after profile/tenant changes
    queryKey: ["university-profile", tenantId, profile?.id, profile?.email],
    // Only enable when we have both tenant and user context
    enabled: Boolean(tenantId) && Boolean(profile?.id),
    staleTime: 1000 * 30, // 30 seconds - refresh more frequently to catch changes
    gcTime: 1000 * 60 * 5, // 5 minutes - garbage collect old cache
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch when component mounts
    queryFn: async () => {
      // SECURITY: Require both tenant and user context
      if (!tenantId || !profile?.id) {
        console.warn("Missing context for university profile fetch", { tenantId, profileId: profile?.id });
        return {
          university: null,
          details: {
            ...emptyUniversityProfileDetails
          },
          scoringConfig: {
            academics: { weight: 25 },
            english_proficiency: { weight: 25 },
            statement_quality: { weight: 25 },
            visa_risk: { weight: 25 }
          }
        };
      }

      // SECURITY: Verify user's tenant matches the requested tenant
      if (profile.tenant_id !== tenantId) {
        console.error("SECURITY: Tenant mismatch in query!", {
          profileTenant: profile.tenant_id,
          requestedTenant: tenantId,
          userId: profile.id,
        });
        throw new Error("Profile isolation error: Your account tenant does not match the requested tenant");
      }

      console.log("Fetching university profile for tenant:", tenantId, "user:", profile.id, "email:", profile?.email);

      // CRITICAL: Always filter by tenant_id to ensure data isolation
      const {
        data,
        error
      } = await supabase.from("universities").select("*").eq("tenant_id", tenantId).order("updated_at", {
        ascending: false,
        nullsFirst: false
      }).limit(1).maybeSingle();

      if (error) {
        console.error("Error fetching university profile:", error);
        throw error;
      }

      // SECURITY CHECK: Verify the returned data matches the expected tenant
      if (data && data.tenant_id !== tenantId) {
        console.error("SECURITY: University tenant mismatch!", {
          expected: tenantId,
          actual: data.tenant_id,
          universityId: data.id,
          universityName: data.name,
          userId: profile.id,
        });
        throw new Error("Data isolation error: University does not belong to your organization");
      }

      console.log("University profile loaded:", data?.name ?? "No university found", "for user:", profile.id, "tenant:", tenantId);

      const details = parseUniversityProfileDetails(data?.submission_config_json ?? null);

      // Parse scoring config (mocking since types aren't updated yet)
      const scoringConfig: ScoringConfig = (data as any)?.scoring_config ? (data as any).scoring_config : {
        academics: { weight: 25 },
        english_proficiency: { weight: 25 },
        statement_quality: { weight: 25 },
        visa_risk: { weight: 25 }
      };

      return {
        university: data ?? null,
        details,
        scoringConfig
      };
    }
  });
  const queryData = profileQuery.data;
  useEffect(() => {
    if (!queryData) return;
    const {
      university,
      details,
      scoringConfig
    } = queryData;
    form.reset({
      name: university?.name ?? "",
      tagline: details.tagline ?? "",
      country: university?.country ?? "",
      city: university?.city ?? "",
      website: university?.website ?? "",
      description: university?.description ?? "",
      contactName: details.contacts.primary?.name ?? profile?.full_name ?? "",
      contactTitle: details.contacts.primary?.title ?? "",
      contactEmail: details.contacts.primary?.email ?? profile?.email ?? "",
      contactPhone: details.contacts.primary?.phone ?? profile?.phone ?? "",
      highlights: details.highlights.length > 0 ? details.highlights : [""],
      social: {
        facebook: details.social.facebook ?? "",
        instagram: details.social.instagram ?? "",
        linkedin: details.social.linkedin ?? "",
        youtube: details.social.youtube ?? ""
      },
      scoringConfig: {
        academics: scoringConfig.academics.weight,
        english_proficiency: scoringConfig.english_proficiency.weight,
        statement_quality: scoringConfig.statement_quality.weight,
        visa_risk: scoringConfig.visa_risk.weight
      }
    });
    if (logoPreviewObjectUrl) {
      URL.revokeObjectURL(logoPreviewObjectUrl);
      setLogoPreviewObjectUrl(null);
    }
    setLogoPreview(university?.logo_url ?? null);
    const hero = details.media.heroImageUrl ?? university?.featured_image_url ?? null;
    if (heroPreviewObjectUrl) {
      URL.revokeObjectURL(heroPreviewObjectUrl);
      setHeroPreviewObjectUrl(null);
    }
    setHeroPreview(hero);
    setLogoFile(null);
    setHeroFile(null);
  }, [form, profile?.email, profile?.full_name, profile?.phone, queryData]);
  useEffect(() => () => {
    if (logoPreviewObjectUrl) {
      URL.revokeObjectURL(logoPreviewObjectUrl);
    }
    if (heroPreviewObjectUrl) {
      URL.revokeObjectURL(heroPreviewObjectUrl);
    }
  }, [heroPreviewObjectUrl, logoPreviewObjectUrl]);
  // Watch form values for real-time checklist updates
  const formValues = form.watch();

  // Compute live checklist based on current form state
  // NOTE: This logic must stay in sync with COMPLETION_FIELDS in universityProfile.ts
  // to ensure consistent profile completeness calculations across the app
  const liveChecklist: UniversityProfileChecklistItem[] = useMemo(() => {
    const hasLogo = Boolean(logoPreview || logoFile);
    const hasHero = Boolean(heroPreview || heroFile);

    const items: UniversityProfileChecklistItem[] = [
      {
        key: "name",
        label: "University name",
        description: "Let partners know exactly who you are.",
        // Matches: Boolean(university?.name?.trim())
        isComplete: Boolean(formValues.name?.trim()),
      },
      {
        key: "location",
        label: "City and country",
        description: "Pinpoint your campus location for discovery tools.",
        // Matches: Boolean(university?.country && university?.city)
        isComplete: Boolean(formValues.country && formValues.city),
      },
      {
        key: "website",
        label: "Website",
        description: "Share the official site so students can learn more.",
        // Matches: Boolean(university?.website)
        isComplete: Boolean(formValues.website),
      },
      {
        key: "description",
        label: "About section",
        description: "Tell your story in a concise overview (30+ characters).",
        // Matches: Boolean(university?.description && university.description.length > 30)
        isComplete: Boolean(formValues.description && formValues.description.length > 30),
      },
      {
        key: "logo",
        label: "Logo",
        description: "Upload a clear logo for instant recognition.",
        // Matches: Boolean(university?.logo_url) - uses preview/file for live updates
        isComplete: hasLogo,
      },
      {
        key: "heroImage",
        label: "Hero image",
        description: "Add a hero banner to showcase your campus atmosphere.",
        // Matches: Boolean(details.media.heroImageUrl) - uses preview/file for live updates
        isComplete: hasHero,
      },
      {
        key: "contact",
        label: "Primary contact",
        description: "Provide a name and email for partnership outreach.",
        // Matches: Boolean(details.contacts.primary?.email && details.contacts.primary?.name)
        isComplete: Boolean(formValues.contactEmail && formValues.contactName),
      },
      {
        key: "highlights",
        label: "Highlights",
        description: "List at least two standout achievements or facts.",
        // Matches: details.highlights.length >= 2
        // Filter out empty strings to count only non-empty highlights
        isComplete: Array.isArray(formValues.highlights) && formValues.highlights.filter(h => h && h.trim()).length >= 2,
      },
      {
        key: "tagline",
        label: "Tagline",
        description: "Capture your promise in a single inspiring line.",
        // Matches: Boolean(details.tagline)
        isComplete: Boolean(formValues.tagline),
      },
    ];
    return items;
  }, [formValues, logoPreview, logoFile, heroPreview, heroFile]);

  const completion = useMemo(() => {
    const completed = liveChecklist.filter(item => item.isComplete);
    const percentage = Math.round((completed.length / liveChecklist.length) * 100);
    const missingFields = liveChecklist.filter(item => !item.isComplete).map(item => item.label);

    return {
      percentage: Math.min(100, Math.max(0, percentage)),
      missingFields,
    };
  }, [liveChecklist]);

  const checklist = liveChecklist;
  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Upload an image for your logo",
        variant: "destructive"
      });
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast({
        title: "File too large",
        description: "Logos should be smaller than 5MB",
        variant: "destructive"
      });
      event.target.value = "";
      return;
    }
    if (logoPreviewObjectUrl) {
      URL.revokeObjectURL(logoPreviewObjectUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setLogoPreviewObjectUrl(objectUrl);
    setLogoFile(file);
    event.target.value = "";
  };
  const handleHeroChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      event.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Upload an image for your hero banner",
        variant: "destructive"
      });
      event.target.value = "";
      return;
    }
    if (file.size > MAX_HERO_SIZE) {
      toast({
        title: "File too large",
        description: "Hero images should be smaller than 10MB",
        variant: "destructive"
      });
      event.target.value = "";
      return;
    }
    if (heroPreviewObjectUrl) {
      URL.revokeObjectURL(heroPreviewObjectUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setHeroPreview(objectUrl);
    setHeroPreviewObjectUrl(objectUrl);
    setHeroFile(file);
    event.target.value = "";
  };
  const triggerLogoFileDialog = () => {
    logoInputRef.current?.click();
  };
  const triggerHeroFileDialog = () => {
    heroInputRef.current?.click();
  };
  const handleHeroKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerHeroFileDialog();
    }
  };
  const uploadAsset = async (file: File, type: "logo" | "hero"): Promise<string> => {
    if (!tenantId) throw new Error("Missing tenant context");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const objectPath = `${tenantId}/${type}-${Date.now()}.${extension}`;
    const {
      error: uploadError
    } = await supabase.storage.from(UNIVERSITY_MEDIA_BUCKET).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: true
    });
    if (uploadError) {
      throw uploadError;
    }
    const {
      data: publicUrlData
    } = supabase.storage.from(UNIVERSITY_MEDIA_BUCKET).getPublicUrl(objectPath);
    if (!publicUrlData?.publicUrl) {
      throw new Error("Unable to resolve uploaded asset URL");
    }
    return publicUrlData.publicUrl;
  };
  const fetchLatestUniversity = async () => {
    const { data, error } = await supabase
      .from("universities")
      .select("*")
      .eq("tenant_id", tenantId!)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("We could not load the saved university profile. Please try again.");
    }

    return data;
  };
  const removeAsset = async (url: string | null | undefined) => {
    const target = extractStorageObject(url ?? undefined);
    if (!target) return;
    const {
      error
    } = await supabase.storage.from(target.bucket).remove([target.path]);
    if (error) {
      console.warn("Unable to remove previous asset", error);
    }
  };
  const onSubmit = async (values: UniversityProfileFormValues) => {
    // CRITICAL SECURITY CHECK: Verify all required context is present
    if (!tenantId || !profile?.id) {
      toast({
        title: "Unable to save profile",
        description: "We could not determine your tenant. Contact support.",
        variant: "destructive"
      });
      return;
    }

    // CRITICAL SECURITY CHECK: Verify profile tenant matches the tenant we're saving to
    if (profile.tenant_id !== tenantId) {
      console.error("SECURITY: Profile tenant mismatch during save!", {
        profileTenant: profile.tenant_id,
        savingToTenant: tenantId,
        userId: profile.id,
      });
      toast({
        title: "Security Error",
        description: "Account isolation error detected. Your profile is not associated with this tenant. Please log out and log back in, or contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // DEBUG: Log current state for troubleshooting
      console.log("=== UNIVERSITY PROFILE SAVE DEBUG ===");
      console.log("User profile ID:", profile.id);
      console.log("User tenant ID:", tenantId);
      console.log("Profile tenant ID (should match):", profile.tenant_id);
      console.log("User role:", profile.role);
      console.log("Existing university ID:", queryData?.university?.id);
      console.log("Existing university tenant:", queryData?.university?.tenant_id);

      // CRITICAL VALIDATION: Ensure no tenant mismatch before saving
      // This prevents the mirroring issue where one university's data overwrites another
      if (queryData?.university && queryData.university.tenant_id !== tenantId) {
        console.error("SECURITY: Tenant mismatch detected during save!", {
          expectedTenant: tenantId,
          universityTenant: queryData.university.tenant_id,
          universityId: queryData.university.id,
          universityName: queryData.university.name,
          userId: profile.id,
        });
        toast({
          title: "Security Error",
          description: "Your account is not authorized to update this university profile. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      let logoUrl = queryData?.university?.logo_url ?? null;
      if (logoFile) {
        const uploadedUrl = await uploadAsset(logoFile, "logo");
        await removeAsset(logoUrl);
        logoUrl = uploadedUrl;
        setLogoFile(null);
      }
      let heroUrl = queryData?.details.media.heroImageUrl ?? queryData?.university?.featured_image_url ?? null;
      if (heroFile) {
        const uploadedHero = await uploadAsset(heroFile, "hero");
        await removeAsset(heroUrl);
        heroUrl = uploadedHero;
        setHeroFile(null);
      }
      const currentDetails = queryData?.details ?? {
        ...emptyUniversityProfileDetails
      };
      const highlights = values.highlights.map(entry => entry.trim()).filter(entry => entry.length > 0);
      const updatedDetails = mergeUniversityProfileDetails(currentDetails, {
        tagline: normalizeEmptyToNull(values.tagline ?? ""),
        highlights,
        contacts: {
          primary: {
            name: values.contactName.trim(),
            email: values.contactEmail.trim(),
            phone: normalizeEmptyToNull(values.contactPhone),
            title: normalizeEmptyToNull(values.contactTitle)
          }
        },
        social: {
          website: normalizeEmptyToNull(values.website),
          facebook: normalizeEmptyToNull(values.social.facebook),
          instagram: normalizeEmptyToNull(values.social.instagram),
          linkedin: normalizeEmptyToNull(values.social.linkedin),
          youtube: normalizeEmptyToNull(values.social.youtube)
        },
        media: {
          heroImageUrl: heroUrl
        }
      });

      // Prepare scoring config to save
      const scoringConfigToSave = {
        academics: { weight: values.scoringConfig.academics },
        english_proficiency: { weight: values.scoringConfig.english_proficiency },
        statement_quality: { weight: values.scoringConfig.statement_quality },
        visa_risk: { weight: values.scoringConfig.visa_risk }
      };

      const payload = {
        name: values.name.trim(),
        country: values.country,
        city: normalizeEmptyToNull(values.city),
        website: normalizeEmptyToNull(values.website),
        description: values.description.trim(),
        logo_url: logoUrl,
        featured_image_url: heroUrl,
        submission_config_json: updatedDetails as unknown as Json,
        active: true,
        // @ts-ignore - scoring_config not yet in generated types
        scoring_config: scoringConfigToSave as Json
      };

      // Check if there's an existing university for this tenant
      const { data: existingUniForTenant, error: existingCheckError } = await supabase
        .from("universities")
        .select("id, name, tenant_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existingCheckError) {
        console.error("Error checking existing university:", existingCheckError);
        // Don't throw - this might fail if RLS is blocking, but update might still work
      }

      console.log("Existing university for tenant:", existingUniForTenant);

      // Determine if we're updating an existing university or creating a new one
      const existingUniversityId = queryData?.university?.id ?? existingUniForTenant?.id ?? null;

      let universityError: Error | null = null;
      let updateSucceeded = false;

      if (existingUniversityId) {
        // UPDATE existing university
        console.log("Attempting UPDATE for university ID:", existingUniversityId);
        
        const updatePayload = {
          ...payload,
          updated_at: new Date().toISOString(),
        };

        // CRITICAL: Always filter by BOTH id AND tenant_id to prevent cross-tenant updates
        // This double-filter ensures we can ONLY update universities belonging to our tenant
        const { data: updateData, error: updateError } = await supabase
          .from("universities")
          .update(updatePayload)
          .eq("id", existingUniversityId)
          .eq("tenant_id", tenantId)
          .select();

        console.log("Update result:", { data: updateData, error: updateError });

        if (updateError) {
          console.error("University update error:", updateError);
          // Provide more helpful error message
          if (updateError.code === "42501" || updateError.message?.toLowerCase().includes("permission") || updateError.message?.toLowerCase().includes("policy")) {
            universityError = new Error(
              `Permission denied: Your account (role: ${profile.role}) doesn't have access to update this university profile. ` +
              `This may be due to a role configuration issue. Please contact support with this info: tenant=${tenantId}, university=${existingUniversityId}`
            );
          } else {
            universityError = updateError as Error;
          }
        } else if (!updateData || updateData.length === 0) {
          // Update returned no data - could mean RLS blocked it or row doesn't exist
          console.warn("Update returned no data - possible RLS block");
          
          // Try to verify if the university exists and we can read it
          const { data: verifyData, error: verifyError } = await supabase
            .from("universities")
            .select("id, name, tenant_id")
            .eq("id", existingUniversityId)
            .maybeSingle();
          
          console.log("Verification result:", { data: verifyData, error: verifyError });
          
          if (verifyError || !verifyData) {
            universityError = new Error(
              `Cannot access university profile. This may be a permissions issue. ` +
              `Your role: ${profile.role}, Tenant: ${tenantId}. Please contact support.`
            );
          } else if (verifyData.tenant_id !== tenantId) {
            universityError = new Error(
              `Tenant mismatch: University belongs to tenant ${verifyData.tenant_id} but your account is on tenant ${tenantId}. ` +
              `Please contact support to resolve this.`
            );
          } else {
            // University exists and tenant matches, but update still failed
            // This is a permissions issue with the UPDATE RLS policy
            universityError = new Error(
              `Unable to save changes. Your account may not have update permissions. ` +
              `Role: ${profile.role}, Tenant: ${tenantId}. Please contact support.`
            );
          }
        } else {
          console.log("University profile updated successfully:", updateData[0]?.name);
          updateSucceeded = true;
        }
      } else {
        // INSERT new university for this tenant
        console.log("Attempting INSERT for new university");
        
        const insertPayload = {
          ...payload,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: insertData, error: insertError } = await supabase
          .from("universities")
          .insert(insertPayload)
          .select();

        console.log("Insert result:", { data: insertData, error: insertError });

        if (insertError) {
          // Check if this is a unique constraint violation (university already exists)
          if (insertError.code === "23505" || insertError.message?.includes("duplicate") || insertError.message?.includes("unique")) {
            // University already exists for this tenant - try to update instead
            console.log("University already exists for tenant, attempting update instead");
            
            const { data: existingUni } = await supabase
              .from("universities")
              .select("id")
              .eq("tenant_id", tenantId)
              .maybeSingle();
            
            if (existingUni?.id) {
              const updatePayload = {
                ...payload,
                updated_at: new Date().toISOString(),
              };
              
              // CRITICAL: Always filter by tenant_id to prevent cross-tenant updates
              const { data: fallbackData, error: fallbackUpdateError } = await supabase
                .from("universities")
                .update(updatePayload)
                .eq("id", existingUni.id)
                .eq("tenant_id", tenantId)
                .select();
              
              if (fallbackUpdateError) {
                universityError = fallbackUpdateError as Error;
              } else if (fallbackData && fallbackData.length > 0) {
                console.log("Fallback update succeeded:", fallbackData[0]?.name);
                updateSucceeded = true;
              } else {
                universityError = new Error("Update failed after duplicate key conflict. Please contact support.");
              }
            } else {
              universityError = insertError as Error;
            }
          } else if (insertError.code === "42501" || insertError.message?.toLowerCase().includes("permission") || insertError.message?.toLowerCase().includes("policy")) {
            universityError = new Error(
              `Permission denied: Your account (role: ${profile.role}) doesn't have permission to create a university profile. ` +
              `Please contact support with this info: tenant=${tenantId}`
            );
          } else {
            universityError = insertError as Error;
          }
        } else if (!insertData || insertData.length === 0) {
          universityError = new Error(
            "Unable to create university profile. Your account may not have the required permissions. " +
            `Role: ${profile.role}, Tenant: ${tenantId}. Please contact support.`
          );
        } else {
          console.log("University profile created successfully:", insertData[0]?.name);
          updateSucceeded = true;
        }
      }
      
      if (universityError) {
        throw universityError;
      }
      // Update the user's profile with contact info
      // Note: RLS policy "Users can update their own profile" only requires id = auth.uid()
      // so we don't need to filter by tenant_id here
      const {
        error: profileError
      } = await supabase.from("profiles").update({
        full_name: values.contactName.trim(),
        phone: normalizeEmptyToNull(values.contactPhone),
        email: values.contactEmail.trim()
      }).eq("id", profile.id);
      if (profileError) {
        throw profileError;
      }
      const savedUniversity = await fetchLatestUniversity();
      const savedDetails = parseUniversityProfileDetails(savedUniversity.submission_config_json);

      // Parse scoring config for cache update
      const savedScoringConfig: ScoringConfig = (savedUniversity as any).scoring_config ? (savedUniversity as any).scoring_config : {
        academics: { weight: 25 },
        english_proficiency: { weight: 25 },
        statement_quality: { weight: 25 },
        visa_risk: { weight: 25 }
      };

      // Update local cache with saved data
      // CRITICAL: Include profile.id in query key for user-specific caching
      queryClient.setQueryData<UniversityProfileQueryResult>(["university-profile", tenantId, profile.id], {
        university: savedUniversity,
        details: savedDetails,
        scoringConfig: savedScoringConfig
      });
      
      // Invalidate ALL related queries to ensure profile completion is consistent across the app.
      // This includes all queries that fetch or display university profile data.
      // Note: We use setQueryData above for immediate local update, but also invalidate
      // to ensure other mounted components and future navigations see fresh data.
      // CRITICAL: Include profile.id in query keys for user-specific cache invalidation
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["university-profile-completion", tenantId, profile.id]
        }),
        queryClient.invalidateQueries({
          queryKey: ["university-dashboard", tenantId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["university-partner-profile", profile.id, tenantId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["partner-dashboard-overview", tenantId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["university-dashboard-overview", tenantId]
        }),
        // Also invalidate the university-profile query for other components
        // (this page already has fresh data via setQueryData, but this ensures
        // any other mounted components using this query will refetch)
        queryClient.invalidateQueries({
          queryKey: ["university-profile", tenantId, profile.id]
        }),
      ]);
      await refreshProfile().catch(error => {
        console.warn("Unable to refresh profile after update", error);
      });
      form.reset({
        name: payload.name,
        tagline: savedDetails.tagline ?? "",
        country: savedUniversity.country ?? "",
        city: savedUniversity.city ?? "",
        website: savedUniversity.website ?? "",
        description: savedUniversity.description ?? "",
        contactName: savedDetails.contacts.primary?.name ?? "",
        contactTitle: savedDetails.contacts.primary?.title ?? "",
        contactEmail: savedDetails.contacts.primary?.email ?? "",
        contactPhone: savedDetails.contacts.primary?.phone ?? "",
        highlights: savedDetails.highlights.length > 0 ? savedDetails.highlights : [""],
        social: {
          facebook: savedDetails.social.facebook ?? "",
          instagram: savedDetails.social.instagram ?? "",
          linkedin: savedDetails.social.linkedin ?? "",
          youtube: savedDetails.social.youtube ?? ""
        },
        scoringConfig: {
          academics: savedScoringConfig.academics.weight,
          english_proficiency: savedScoringConfig.english_proficiency.weight,
          statement_quality: savedScoringConfig.statement_quality.weight,
          visa_risk: savedScoringConfig.visa_risk.weight
        }
      });
      setLogoPreview(savedUniversity.logo_url ?? null);
      const heroFromDetails = savedDetails.media.heroImageUrl ?? savedUniversity.featured_image_url ?? null;
      setHeroPreview(heroFromDetails);
      toast({
        title: "Profile saved",
        description: "Your university profile has been saved successfully and is live across the platform."
      });
      // Note: We intentionally do NOT call profileQuery.refetch() here.
      // The setQueryData above already updated the cache with the saved data.
      // Calling refetch() could overwrite our update with stale data from the database
      // (e.g., due to replication lag) and trigger the useEffect to reset the form.
    } catch (error) {
      console.error(error);
      toast({
        title: "We could not save your profile",
        description: (error as Error)?.message ?? "Please try again or contact your partnership manager.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Include profileLoading to prevent "Partner profile incomplete" flash during auth
  if (authLoading || profileLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState message="Loading your university profile" size="lg" />
      </div>;
  }
  if (!tenantId) {
    return <div className="flex min-h-[60vh] items-center justify-center">
        <Alert className="max-w-xl border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTitle>Partner profile incomplete</AlertTitle>
          <AlertDescription>
            We could not link your user profile to a university tenant. Contact
            support to finish setting up your institution.
          </AlertDescription>
        </Alert>
      </div>;
  }
  if (profileQuery.isLoading && !profileQuery.data) {
    return <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState message="Loading your university profile" size="lg" />
      </div>;
  }
  if (profileQuery.isError) {
    return <div className="flex min-h-[60vh] items-center justify-center">
        <Alert className="max-w-xl border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTitle>Unable to load university profile</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {(profileQuery.error as Error)?.message ?? "Something went wrong while fetching your profile."}
            </p>
            <Button onClick={() => void profileQuery.refetch()} size="sm" variant="outline" className="gap-2">
              {profileQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>;
  }
  const heroBackground = heroPreview ?? undefined;
  const showCompletionReminder = completion.percentage < 100;
  // Determine if this is a new/blank profile that needs setup
  const isNewProfile = isNewUniversityProfile(
    queryData?.university ?? null,
    queryData?.details ?? emptyUniversityProfileDetails
  );

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {isNewProfile ? "Set up your university profile" : "University profile"}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {isNewProfile 
                ? "You're starting fresh! Build your profile from scratch to showcase your institution to students and agents worldwide."
                : "Craft a compelling profile that appears across the UniDoxia for agents and students."
              }
            </p>
          </div>
        </div>
        <Card className="max-w-sm border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Profile completeness
              </p>
              <div className="flex items-center gap-2">
                <Progress value={completion.percentage} className="h-2 flex-1" />
                <span className="text-sm font-semibold text-foreground">
                  {completion.percentage}%
                </span>
              </div>
              {showCompletionReminder ? <p className="text-xs text-muted-foreground">
                  Finish your branding to unlock full visibility in the public
                  directory.
                </p> : <p className="text-xs text-muted-foreground">
                  Outstanding! Your profile is ready to impress partners and
                  students.
                </p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {showCompletionReminder ? <Alert className="border-primary/40 bg-primary/5">
          <AlertTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            {isNewProfile ? "Welcome! Let's build your profile" : "Make your profile shine"}
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {isNewProfile ? (
              <span>
                Your dashboard is ready and waiting. Fill in your details below to 
                start attracting students. Only the basic info from your signup has 
                been pre-filled — everything else is yours to customize.
              </span>
            ) : completion.missingFields.length > 0 ? (
              <span>
                Add {completion.missingFields.slice(0, 3).join(", ")} and more to
                reach 100% completion.
              </span>
            ) : (
              <span>
                Provide rich details so agents can showcase your university with
                confidence.
              </span>
            )}
          </AlertDescription>
        </Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle>Profile builder</CardTitle>
            <CardDescription>
              Work through each step to publish a polished university listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
                <section className="space-y-6" id="profile-step-1">
                  <div className="space-y-2">
                    <Badge className="w-fit bg-primary/10 text-xs font-medium text-primary" variant="outline">
                      Step 1 · Institution basics
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Confirm your university identity and the essentials students see first.
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <FormField control={form.control} name="name" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>University name</FormLabel>
                          <FormControl>
                            <Input placeholder="Harvard University" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="tagline" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Tagline</FormLabel>
                          <FormControl>
                            <Input placeholder="Ivy League excellence across every discipline" {...field} />
                          </FormControl>
                          <FormDescription>
                            A short statement that captures your university’s
                            promise.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                        <FormLabel>About your university</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Share your mission, standout faculties, research focus and student community." className="min-h-[120px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <FormField control={form.control} name="country" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COUNTRIES.map(country => <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="city" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Cambridge" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <FormField control={form.control} name="website" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.harvard.edu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </section>

                <Separator />

                <section className="space-y-6" id="profile-step-2">
                  <div className="space-y-2">
                    <Badge className="w-fit bg-primary/10 text-xs font-medium text-primary" variant="outline">
                      Step 2 · Showcase highlights
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">
                      Highlights
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      These appear as quick facts on your dashboard and public
                      pages.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {highlightsFieldArray.fields.map((highlight, index) => <div key={highlight.id} className="flex items-start gap-3">
                        <FormField control={form.control} name={`highlights.${index}`} render={({
                      field
                    }) => <FormItem className="flex-1">
                              <FormLabel className="sr-only">Highlight {index + 1}</FormLabel>
                              <FormControl>
                                <Input placeholder="Top 5 globally for graduate employability" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={() => {
                      if (highlightsFieldArray.fields.length === 1) {
                        form.setValue(`highlights.${index}`, "");
                        return;
                      }
                      highlightsFieldArray.remove(index);
                    }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>)}
                    {form.formState.errors.highlights?.root?.message && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.highlights.root.message}
                      </p>
                    )}
                    {highlightsFieldArray.fields.length < 5 ? <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => highlightsFieldArray.append("")}>
                        <Plus className="h-4 w-4" /> Add highlight
                      </Button> : null}
                  </div>
                </section>

                <Separator />

                <section className="space-y-6" id="profile-step-3">
                  <div className="space-y-2">
                    <Badge className="w-fit bg-primary/10 text-xs font-medium text-primary" variant="outline">
                      Step 3 · Scoring Rubric
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">
                      Application Scoring
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure the weightage for automated application scoring. Total should ideally encompass your priority areas.
                    </p>
                  </div>
                  <div className="space-y-6">
                    <FormField control={form.control} name="scoringConfig.academics" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Academics Weight (%)</FormLabel>
                          <span className="text-sm font-medium">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scoringConfig.english_proficiency" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>English Proficiency Weight (%)</FormLabel>
                          <span className="text-sm font-medium">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scoringConfig.statement_quality" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Statement Quality Weight (%)</FormLabel>
                          <span className="text-sm font-medium">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scoringConfig.visa_risk" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Visa Risk Weight (%)</FormLabel>
                          <span className="text-sm font-medium">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center gap-2">
                         <Scale className="h-4 w-4 text-muted-foreground" />
                         <span className="text-sm font-medium">Total Weight: {
                           (form.watch("scoringConfig.academics") || 0) +
                           (form.watch("scoringConfig.english_proficiency") || 0) +
                           (form.watch("scoringConfig.statement_quality") || 0) +
                           (form.watch("scoringConfig.visa_risk") || 0)
                         }%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ensure weights align with your admission priorities.
                      </p>
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="space-y-6" id="profile-step-4">
                  <div className="space-y-2">
                    <Badge className="w-fit bg-primary/10 text-xs font-medium text-primary" variant="outline">
                      Step 4 · Primary contact
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">
                      Primary contact
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      We use these details when agents reach out or request
                      clarification on courses.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="contactName" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Kols" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="contactTitle" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Role / Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Director of International Recruitment" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="contactEmail" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="partner@harvard.edu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="contactPhone" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 617-495-1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </section>

                <Separator />

                <section className="space-y-6" id="profile-step-5">
                  <div className="space-y-2">
                    <Badge className="w-fit bg-primary/10 text-xs font-medium text-primary" variant="outline">
                      Step 5 · Social & media
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">
                      Social & media
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Connect your website and social channels so students can
                      engage directly.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="social.facebook" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Facebook</FormLabel>
                          <FormControl>
                            <Input placeholder="https://facebook.com/harvard" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="social.instagram" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <Input placeholder="https://instagram.com/harvard" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="social.linkedin" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>LinkedIn</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/school/harvard-university" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={form.control} name="social.youtube" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>YouTube</FormLabel>
                          <FormControl>
                            <Input placeholder="https://youtube.com/@harvard" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </section>

                <Separator />

                <section className="space-y-6" id="profile-step-6">
                  <div className="space-y-2">
                    <Badge className="w-fit bg-primary/10 text-xs font-medium text-primary" variant="outline">
                      Step 6 · Branding assets
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground">
                      Branding assets
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Upload a crisp logo and an inspiring hero image. We’ll use
                      them across your dashboards and public pages.
                    </p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="university-logo">Logo</Label>
                      <input id="university-logo" ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border border-dashed border-muted-foreground/40 bg-muted">
                          {logoPreview ? <AvatarImage src={logoPreview} alt="University logo preview" /> : <AvatarFallback>
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            </AvatarFallback>}
                        </Avatar>
                        <div className="flex flex-col gap-2">
                          <div className="space-y-1">
                            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={triggerLogoFileDialog}>
                              <Upload className="h-4 w-4" />
                              {logoPreview ? "Change logo" : "Upload logo"}
                            </Button>
                            {logoFile ? <p className="text-xs text-foreground">
                                Selected: <span className="font-medium">{logoFile.name}</span>
                              </p> : logoPreview ? <p className="text-xs text-muted-foreground">
                                Using saved logo
                              </p> : null}
                            <p className="text-xs text-muted-foreground">
                              PNG or SVG, up to 5MB.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="university-hero">Hero image</Label>
                      <input id="university-hero" ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroChange} />
                      <div role="button" tabIndex={0} onClick={triggerHeroFileDialog} onKeyDown={handleHeroKeyDown} className="group relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-muted-foreground/40 bg-muted transition hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" aria-describedby="hero-image-guidelines">
                        {heroBackground ? <img src={heroBackground} alt="Hero preview" className="h-full w-full object-cover" /> : <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                            <p className="text-xs font-medium">Click to add a hero image</p>
                            <p className="text-[11px]">16:9 ratio works best</p>
                          </div>}
                        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                          <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60">
                            <Upload className="h-3.5 w-3.5" />
                            {heroBackground ? "Change hero image" : "Select hero image"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground" id="hero-image-guidelines">
                        <p>Recommended size 1600×900px. JPG or PNG up to 10MB.</p>
                        {heroFile ? <p className="text-foreground">
                            Selected: <span className="font-medium">{heroFile.name}</span>
                          </p> : heroBackground ? <p>Using saved hero image</p> : null}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="sticky bottom-0 left-0 right-0 -mx-4 -mb-4 flex flex-col gap-3 border-t border-border bg-card/95 px-4 pb-4 pt-6 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="text-sm text-muted-foreground">
                    Changes go live immediately across your dashboards, public
                    directory and course catalogue.
                  </div>
                  <Button type="submit" size="lg" className="gap-2" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save profile
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="space-y-1">
              <CardTitle>Profile checklist</CardTitle>
              <CardDescription>
                Track your progress and know exactly what’s left to complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {checklist.map(item => <li key={item.key}>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 sm:p-4">
                      <div className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full ${item.isComplete ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" : "bg-muted text-muted-foreground"}`}>
                        {item.isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {item.label}
                          </p>
                          <span className={`text-xs font-medium ${item.isComplete ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {item.isComplete ? "Complete" : "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </li>)}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/40">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Live preview
              </CardTitle>
              <CardDescription>
                How agents and students will see your university profile card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                <div className="relative h-44 w-full overflow-hidden">
                  {heroBackground ? <img src={heroBackground} alt="Hero preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-background/20 bg-background/80">
                      {logoPreview ? <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain" /> : <Building2 className="h-7 w-7 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {form.watch("name") || "Your university name"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {form.watch("tagline") || "Add a tagline to inspire students"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 bg-background p-5">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      {form.watch("country") || "Country"}
                    </Badge>
                    {form.watch("city") ? <Badge variant="outline" className="border-border text-muted-foreground">
                        <MapPin className="mr-1 h-3 w-3" />
                        {form.watch("city")}
                      </Badge> : null}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {form.watch("description") ? `${form.watch("description").slice(0, 180)}${form.watch("description").length > 180 ? "…" : ""}` : "Use the description field to tell your story, spotlight your faculties and share what makes your campus unforgettable."}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      {form.watch("website") || "https://youruniversity.edu"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {form.watch("contactEmail") || "admissions@youruniversity.edu"}
                    </div>
                    {form.watch("contactPhone") ? <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {form.watch("contactPhone")}
                      </div> : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Highlights
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {form.watch("highlights").map((highlight, index) => <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                          <span>
                            {highlight || "Share something remarkable about your institution"}
                          </span>
                        </li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-primary">
                  Tip: Rich profiles rank higher in student discovery
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add vivid descriptions, authentic imagery and clear contact
                  details so agents can promote you confidently.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default UniversityProfilePage;
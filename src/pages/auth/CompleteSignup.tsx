import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AtSign, Check, Phone, UserCircle, Mail } from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { LoadingState } from "@/components/LoadingState";
import { SEO } from "@/components/SEO";

/**
 * Post-OAuth completion page.
 * Shown to users missing required onboarding fields after sign-up.
 * Required fields: referral source and WhatsApp number.
 */
const CompleteSignup = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [referralSource, setReferralSource] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const STUDENT_WHATSAPP_REGEX = /^\+[1-9]\d{7,14}$/;
  const normalizePhoneNumber = (value: string) => value.replace(/[\s\-()]/g, "");

  const fullNameFromAuth = (profile?.full_name || (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") || "").trim();
  const emailFromAuth = (profile?.email || user?.email || "").trim();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && user && profile) {
      const fallbackReferral = typeof user.user_metadata?.referral_source === "string"
        ? user.user_metadata.referral_source
        : "";
      const fallbackWhatsapp = profile.phone || (typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "");

      setReferralSource((current) => current || fallbackReferral || "");
      setWhatsappNumber((current) => current || fallbackWhatsapp || "");
    }
  }, [authLoading, user, profile]);

  // Redirect if already completed
  useEffect(() => {
    if (!authLoading && profile && user) {
      const metadataReferral =
        typeof user.user_metadata?.referral_source === "string"
          ? user.user_metadata.referral_source.trim()
          : "";
      const profileWhatsapp = (profile.phone || "").trim();
      const metadataWhatsapp =
        typeof user.user_metadata?.phone === "string"
          ? user.user_metadata.phone.trim()
          : "";
      const hasReferralSource = metadataReferral.length > 0;
      const hasWhatsapp = profileWhatsapp.length > 0 || metadataWhatsapp.length > 0;

      if (hasReferralSource && hasWhatsapp) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [authLoading, profile, user, navigate]);

  if (authLoading || !profile || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." size="lg" />
      </div>
    );
  }

  const metadataReferral =
    typeof user.user_metadata?.referral_source === "string"
      ? user.user_metadata.referral_source.trim()
      : "";
  const profileWhatsapp = (profile.phone || "").trim();
  const metadataWhatsapp =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone.trim()
      : "";

  const needsReferralSource = metadataReferral.length === 0;
  const needsWhatsapp = profileWhatsapp.length === 0 && metadataWhatsapp.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (needsReferralSource && !referralSource.trim()) {
      toast({
        variant: "destructive",
        title: "Required field",
        description: "Please tell us how you heard about UniDoxia.",
      });
      return;
    }

    if (referralSource.trim().length > 200) {
      toast({
        variant: "destructive",
        title: "Too long",
        description: "Please keep your answer under 200 characters.",
      });
      return;
    }

    const normalizedWhatsapp = normalizePhoneNumber(whatsappNumber.trim());
    if (needsWhatsapp && !normalizedWhatsapp) {
      toast({
        variant: "destructive",
        title: "WhatsApp number required",
        description: "Please enter your WhatsApp number with country code.",
      });
      return;
    }

    if (needsWhatsapp && !STUDENT_WHATSAPP_REGEX.test(normalizedWhatsapp)) {
      toast({
        variant: "destructive",
        title: "Invalid WhatsApp number",
        description: "Include the country code (for example: +2348012345678, +447123456789).",
      });
      return;
    }

    setSaving(true);
    try {
      if (needsWhatsapp) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ phone: normalizedWhatsapp })
          .eq("id", user.id);

        if (profileUpdateError) throw profileUpdateError;
      }

      const finalReferralSource = needsReferralSource ? referralSource.trim() : metadataReferral;
      const finalWhatsapp = needsWhatsapp ? normalizedWhatsapp : (profileWhatsapp || metadataWhatsapp);

      if (profile.role === "student" && needsReferralSource) {
        const { data: studentRecord } = await supabase
          .from("students")
          .select("id, tenant_id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (studentRecord) {
          const { error: studentUpdateError } = await supabase
            .from("students")
            .update({
              referral_source: finalReferralSource,
              contact_phone: finalWhatsapp || null,
            })
            .eq("id", studentRecord.id);

          if (studentUpdateError) throw studentUpdateError;

          await supabase.from("attributions").insert({
            tenant_id: studentRecord.tenant_id,
            student_id: studentRecord.id,
            source: finalReferralSource,
            touch: "signup",
            medium: "self-reported",
          });
        }
      }

      await supabase.auth.updateUser({
        data: {
          referral_source: finalReferralSource,
          phone: finalWhatsapp,
        },
      });

      toast({ title: "Thank you!", description: "Your information has been saved." });
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Error saving referral source:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <SEO
        title="Complete Your Signup | UniDoxia"
        description="Complete your UniDoxia registration."
      />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img
            src={unidoxiaLogo}
            alt="UniDoxia"
            className="mx-auto h-10 w-auto"
          />
          <CardTitle className="text-xl">One More Step</CardTitle>
          <CardDescription>
            We pre-filled what we already know. Please provide any missing required details to finish your account setup.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Name
              </Label>
              <Input value={fullNameFromAuth} disabled />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input value={emailFromAuth} disabled />
            </div>

            {needsWhatsapp && (
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp Number
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="whatsappNumber"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +2348012345678"
                  autoFocus={!needsReferralSource}
                />
              </div>
            )}

            {needsReferralSource && (
            <div className="space-y-2">
              <Label htmlFor="referralSource" className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                Who referred you, or how did you hear about UniDoxia?
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="referralSource"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                placeholder="e.g. John Doe, Instagram, school counselor, Google search"
                maxLength={200}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Share a person's name or the source so we can properly track referrals and reward commission.
              </p>
            </div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Continue to Dashboard
                </>
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default CompleteSignup;

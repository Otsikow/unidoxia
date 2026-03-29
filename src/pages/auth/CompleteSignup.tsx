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
import { Loader2, AtSign, Check, Phone } from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { LoadingState } from "@/components/LoadingState";
import { SEO } from "@/components/SEO";

const WHATSAPP_REGEX = /^\+[1-9]\d{7,14}$/;
const normalizePhoneNumber = (value: string) => value.replace(/[\s\-()]/g, "");

/**
 * Post-OAuth completion page.
 * Shown after sign-up when mandatory onboarding details
 * (referral source + WhatsApp number) are missing.
 */
const CompleteSignup = () => {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [referralSource, setReferralSource] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Pre-fill from existing metadata and redirect when already complete.
  useEffect(() => {
    if (user?.user_metadata?.referral_source && !referralSource) {
      setReferralSource(String(user.user_metadata.referral_source));
    }
    if (user?.user_metadata?.phone && !whatsappNumber) {
      setWhatsappNumber(String(user.user_metadata.phone));
    }
  }, [user, referralSource, whatsappNumber]);

  useEffect(() => {
    if (!authLoading && user) {
      const referral = user.user_metadata?.referral_source;
      const whatsapp = user.user_metadata?.phone;
      const hasReferral = typeof referral === "string" && referral.trim().length > 0;
      const hasWhatsapp = typeof whatsapp === "string" && WHATSAPP_REGEX.test(normalizePhoneNumber(whatsapp.trim()));
      if (hasReferral && hasWhatsapp) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." size="lg" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!referralSource.trim()) {
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
    if (!normalizedWhatsapp) {
      toast({
        variant: "destructive",
        title: "WhatsApp number required",
        description: "Please provide your WhatsApp number with country code.",
      });
      return;
    }

    if (!WHATSAPP_REGEX.test(normalizedWhatsapp)) {
      toast({
        variant: "destructive",
        title: "Invalid WhatsApp number",
        description: "Include country code, for example +2348012345678 or +447123456789.",
      });
      return;
    }

    setSaving(true);
    try {
      // Get student record
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id, tenant_id")
        .eq("profile_id", user!.id)
        .maybeSingle();

      if (studentRecord) {
        // Save referral_source to student record
        const { error } = await supabase
          .from("students")
          .update({ referral_source: referralSource.trim() })
          .eq("id", studentRecord.id);

        if (error) throw error;

        // Also create attribution record
        await supabase.from("attributions").insert({
          tenant_id: studentRecord.tenant_id,
          student_id: studentRecord.id,
          source: referralSource.trim(),
          touch: "signup",
          medium: "self-reported",
        });
      }

      await supabase
        .from("profiles")
        .update({ phone: normalizedWhatsapp })
        .eq("id", user!.id);

      // Update user metadata
      await supabase.auth.updateUser({
        data: { referral_source: referralSource.trim(), phone: normalizedWhatsapp },
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
            Before you get started, tell us who referred you and confirm your WhatsApp number.
            This keeps onboarding complete and lets our team support you quickly.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
                maxLength={20}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g. +1, +44, +234).
              </p>
            </div>

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
              />
              <p className="text-xs text-muted-foreground">
                Share a person's name or the source so we can properly track referrals and reward commission.
              </p>
            </div>

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

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
import { Loader2, AtSign, Check } from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { LoadingState } from "@/components/LoadingState";
import { SEO } from "@/components/SEO";

/**
 * Post-OAuth completion page.
 * Shown to students who signed up via Google OAuth and haven't
 * provided their referral source yet.
 */
const CompleteSignup = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [referralSource, setReferralSource] = useState("");
  const [saving, setSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Redirect if already completed (has referral_source)
  useEffect(() => {
    if (!authLoading && profile && profile.role !== "student") {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, profile, navigate]);

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

      // Update user metadata
      await supabase.auth.updateUser({
        data: { referral_source: referralSource.trim() },
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
            Before you get started, please tell us how you heard about UniDoxia.
            This helps us reward the people who refer students to our platform.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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

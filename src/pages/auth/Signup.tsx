"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/supabaseClientConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Check,
  UserCircle,
  Mail,
  Lock,
  Phone,
  Globe,
  AtSign,
} from "lucide-react";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";
import { cn } from "@/lib/utils";
import { formatReferralUsername } from "@/lib/referrals";
import { LoadingState } from "@/components/LoadingState";
import BackButton from "@/components/BackButton";
import { passwordSchema } from "@/lib/validation";
import { SEO } from "@/components/SEO";

type UserRole = "student" | "agent" | "partner";

const ROLE_OPTIONS: UserRole[] = ["student", "agent", "partner"];

const isUsernameCheckUnsupported = (error: PostgrestError | null) => {
  if (!error) return false;
  const unsupportedCodes = new Set(["PGRST202", "PGRST204", "42P01", "42703"]);
  if (error.code && unsupportedCodes.has(error.code)) {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("could not find the function public.is_username_available") ||
    message.includes("column profiles.username does not exist")
  );
};

const BASE_COUNTRY_OPTIONS = [
  "United Kingdom",
  "Germany",
  "Australia",
  "United States",
  "Canada",
  "Netherlands",
  "Ireland",
];

const buildCountryOptions = () => BASE_COUNTRY_OPTIONS;

const Signup = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameCheckAvailable, setUsernameCheckAvailable] = useState(true);
  const [usernameInfo, setUsernameInfo] = useState<string | null>(null);

  const [refParam, setRefParam] = useState<string | null>(null);
  const [referrerInfo, setReferrerInfo] = useState<{ id: string; username: string; full_name?: string } | null>(null);
  const [referrerError, setReferrerError] = useState<string | null>(null);
  const [referrerLoading, setReferrerLoading] = useState(false);

  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const hasRedirectedRef = useRef(false);

  const { signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const countryOptions = useMemo(() => buildCountryOptions(), []);

  // Redirect logged-in user
  useEffect(() => {
    if (!authLoading && user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      setRedirecting(true);
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Parse query params (role + ref)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");
    const refQuery = params.get("ref");

    if (roleParam) {
      const normalizedRole = roleParam.toLowerCase() as UserRole;
      if (ROLE_OPTIONS.includes(normalizedRole)) {
        setRole((r) => (r === normalizedRole ? r : normalizedRole));
        setStep(1);
      }
    }

    if (refQuery) {
      const normalizedRef = formatReferralUsername(refQuery);
      setRefParam((prev) => (prev === normalizedRef ? prev : normalizedRef));
    } else {
      setRefParam(null);
      setReferrerInfo(null);
      setReferrerError(null);
    }
  }, [location.search]);

  // Lookup referral info
  useEffect(() => {
    if (!refParam) {
      setReferrerInfo(null);
      setReferrerError(null);
      setReferrerLoading(false);
      return;
    }

    let active = true;
    setReferrerLoading(true);
    supabase
      .from("profiles")
      .select("id, username, full_name")
      .eq("username", refParam)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setReferrerError("We could not find a matching referrer for this link.");
          setReferrerInfo(null);
        } else {
          setReferrerInfo(data);
          setReferrerError(null);
        }
        if (active) setReferrerLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refParam]);

  // Check username availability
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setUsernameInfo(null);
      setCheckingUsername(false);
      return;
    }

    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      setUsernameInfo(null);
      setCheckingUsername(false);
      return;
    }

    if (!usernameCheckAvailable) {
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    let cancel = false;
    const handler = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", {
        candidate: username,
      });

      if (cancel) return;

      if (error) {
        if (isUsernameCheckUnsupported(error)) {
          if (usernameCheckAvailable) {
            console.warn(
              "Username availability check is not supported by the current backend schema.",
              error,
            );
          }
          setUsernameCheckAvailable(false);
          setUsernameError(null);
          setUsernameInfo(
            "Username availability can't be verified automatically right now. We'll confirm it when creating your account.",
          );
        } else {
          console.error("Failed to check username availability", error);
          setUsernameError("Unable to verify username availability. Please try again.");
          setUsernameInfo(null);
        }
      } else if (data === false) {
        setUsernameError("This username is already taken. Try another one.");
        setUsernameInfo(null);
      } else {
        setUsernameError(null);
        setUsernameInfo(null);
      }

      setCheckingUsername(false);
    }, 500);

    return () => {
      cancel = true;
      clearTimeout(handler);
    };
  }, [username, usernameCheckAvailable]);

  // OAuth (Google)
  const handleGoogleSignUp = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteUrl()}/dashboard`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
  };

  // Validation functions
  const validateStep1 = () => !!role || toast({ variant: "destructive", title: "Role required", description: "Select your account type." });
  const validateStep2 = () => {
    if (!fullName.trim()) return toast({ variant: "destructive", title: "Name required" }), false;
    if (!phone.trim()) return toast({ variant: "destructive", title: "Phone required" }), false;
    if (!country) return toast({ variant: "destructive", title: "Country required" }), false;
    return true;
  };
  const validateStep3 = () => {
    if (!username.trim()) return toast({ variant: "destructive", title: "Username required" }), false;
    if (username.length < 3) return toast({ variant: "destructive", title: "Username too short" }), false;
    if (usernameError && usernameCheckAvailable) {
      return toast({ variant: "destructive", title: "Username unavailable", description: usernameError }), false;
    }
    if (!email.includes("@")) return toast({ variant: "destructive", title: "Invalid email" }), false;
    
    // Validate password strength using passwordSchema
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      return toast({ 
        variant: "destructive", 
        title: "Weak password", 
        description: passwordResult.error.issues[0].message 
      }), false;
    }
    
    if (password !== confirmPassword) return toast({ variant: "destructive", title: "Passwords do not match" }), false;
    return true;
  };

  // Navigation
  const handleNext = () => {
    if ((step === 1 && validateStep1()) || (step === 2 && validateStep2())) setStep(step + 1);
  };
  const handleBack = () => step > 1 && setStep(step - 1);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3 && ((step === 1 && validateStep1()) || (step === 2 && validateStep2()))) {
      setStep(step + 1);
      return;
    }
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const { error } = await signUp({
        email,
        password,
        fullName,
        role,
        phone,
        country,
        username,
        referrerId: referrerInfo?.id,
        referrerUsername: referrerInfo?.username,
      });

      if (error) {
        toast({ variant: "destructive", title: "Signup failed", description: (error as Error).message || "An error occurred" });
      } else {
        toast({
          title: "Account created!",
          description: "Check your email to verify your account before logging in.",
        });
        navigate("/verify-email", { state: { email } });
      }
    } catch {
      toast({ variant: "destructive", title: "Signup failed", description: "Unexpected error." });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (r: UserRole) =>
    r === "student" ? "🎓" : r === "agent" ? "💼" : "🏛️";

  const getRoleLabel = (r: UserRole) =>
    r === "student" ? "Student" : r === "agent" ? "Agent" : "University/Partner";

  const getRoleDescription = (r: UserRole) =>
    r === "student"
      ? "Apply to universities and track applications"
      : r === "agent"
      ? "Help students and earn commissions"
      : "Showcase programmes and scholarships";

  if (authLoading || redirecting)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingState
          message={authLoading ? "Checking your session..." : "Redirecting to your dashboard..."}
          size="lg"
        />
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 px-4 py-8">
      <SEO
        title="Sign Up - UniDoxia"
        description="Create an account with UniDoxia to begin your study abroad journey. Join as a student, agent, or university partner."
        keywords="sign up, create account, student registration, agent registration, university registration, student recruitment platform"
      />
      <Card className="w-full max-w-3xl shadow-2xl border-2 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-in-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <CardHeader className="space-y-1 text-center pt-8">
          <div className="flex justify-center mb-4">
            <BackButton
              variant="ghost"
              size="sm"
              fallback="/auth/login"
              label="Back to login"
              className="px-0 text-muted-foreground hover:text-foreground"
            />
          </div>
          <img
            src={unidoxiaLogo}
            alt="UniDoxia Logo"
            className="mx-auto mb-4 h-20 w-20 rounded-lg object-contain dark:brightness-0 dark:invert"
          />
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Join UniDoxia
          </CardTitle>
          <CardDescription className="text-base">
            Step {step} of {totalSteps}:{" "}
            {step === 1
              ? "Choose Your Role"
              : step === 2
              ? "Personal Information"
              : "Account Credentials"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 px-4 sm:px-8">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Select Account Type
                </Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "w-full rounded-2xl border-2 px-5 py-4 sm:px-6 sm:py-6 text-left transition-all hover:shadow-lg focus-visible:ring-2",
                        role === r
                          ? "border-primary bg-primary/5 shadow-md ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <span className="text-3xl sm:text-4xl">{getRoleIcon(r)}</span>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-lg sm:text-xl">{getRoleLabel(r)}</h3>
                            {role === r && <Check className="h-5 w-5 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{getRoleDescription(r)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {step === 2 && (
              <div className="space-y-5">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" /> Full Name
                </Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />

                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone Number
                </Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

                <Label htmlFor="country" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Country
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Credentials */}
            {step === 3 && (
              <div className="space-y-5">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <AtSign className="h-4 w-4" /> Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(formatReferralUsername(e.target.value))}
                  placeholder="choose-a-username"
                />
                {checkingUsername && usernameCheckAvailable && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                  </p>
                )}
                {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                {usernameInfo && !usernameError && (
                  <p className="text-xs text-muted-foreground">{usernameInfo}</p>
                )}

                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Address
                </Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                {refParam && (
                  <div className="rounded-lg border border-dashed border-muted p-3 text-sm">
                    {referrerLoading ? (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating referral link...
                      </span>
                    ) : referrerInfo ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Referral from <b>@{referrerInfo.username}</b>{" "}
                        {referrerInfo.full_name && `(${referrerInfo.full_name})`}
                      </span>
                    ) : (
                      <span className="text-destructive">
                        {referrerError || "Invalid referral link."}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 px-4 pb-8 sm:px-8">
            <div className="flex gap-3 w-full">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              {step < totalSteps ? (
                <Button type="button" onClick={handleNext}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Create Account
                    </>
                  )}
                </Button>
              )}
            </div>

            {step === 1 && (
              <>
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button variant="outline" onClick={handleGoogleSignUp} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92..."
                    />
                  </svg>
                  Google
                </Button>
              </>
            )}

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Signup;

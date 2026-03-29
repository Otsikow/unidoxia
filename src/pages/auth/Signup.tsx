"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/supabaseClientConfig";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  type OnboardingRole,
} from "@/lib/onboardingStorage";
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

const ALL_COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Democratic Republic)",
  "Congo (Republic)",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea (North)",
  "Korea (South)",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "São Tomé and Príncipe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const buildCountryOptions = () => ALL_COUNTRIES;

const STUDENT_WHATSAPP_REGEX = /^\+[1-9]\d{7,14}$/;
const normalizePhoneNumber = (value: string) => value.replace(/[\s\-()]/g, "");

const Signup = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [username, setUsername] = useState("");

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameCheckAvailable, setUsernameCheckAvailable] = useState(true);
  const [usernameInfo, setUsernameInfo] = useState<string | null>(null);

  const [refParam, setRefParam] = useState<string | null>(null);
  const [referralLookup, setReferralLookup] = useState<{
    inviteCode: string | null;
    username: string | null;
  }>({
    inviteCode: null,
    username: null,
  });
  const [referrerInfo, setReferrerInfo] = useState<{
    id: string;
    username: string;
    full_name?: string;
  } | null>(null);
  const [referrerError, setReferrerError] = useState<string | null>(null);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [referralSource, setReferralSource] = useState("");

  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const hasRedirectedRef = useRef(false);

  const { signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const countryOptions = useMemo(() => buildCountryOptions(), []);

  const parseReferralParam = (value: string | null) => {
    if (!value) return { inviteCode: null, username: null } as const;

    const trimmed = value.trim();
    if (!trimmed) return { inviteCode: null, username: null } as const;

    const inviteCandidate = trimmed.replace(/[^A-Za-z0-9]/g, "");
    const inviteCode = inviteCandidate.length === 8 ? inviteCandidate.toUpperCase() : null;
    const username = formatReferralUsername(trimmed) || null;

    return { inviteCode, username } as const;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");

    const onboardingRole = roleParam === "agent" ? roleParam : null;

    if (onboardingRole && !authLoading && !user && typeof window !== "undefined") {
      const hasSeen = hasSeenOnboarding(onboardingRole as OnboardingRole);
      if (!hasSeen) {
        markOnboardingSeen(onboardingRole as OnboardingRole);
        navigate(
          `/agents/onboarding?next=${encodeURIComponent(
            `${location.pathname}${location.search}`,
          )}`,
        );
        return;
      }
    }
  }, [authLoading, location.pathname, location.search, navigate, user]);

  useEffect(() => {
    if (!authLoading && user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      setRedirecting(true);
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");
    const refQuery =
      params.get("ref") ||
      params.get("invite") ||
      params.get("invite_code") ||
      params.get("inviteCode") ||
      params.get("code");

    if (roleParam) {
      const normalizedRole = roleParam.toLowerCase() as UserRole;
      if (ROLE_OPTIONS.includes(normalizedRole)) {
        setRole((r) => (r === normalizedRole ? r : normalizedRole));
        setStep(1);
      }
    }

    if (refQuery) {
      const parsedRef = parseReferralParam(refQuery);

      setReferralLookup((current) =>
        current.inviteCode === parsedRef.inviteCode && current.username === parsedRef.username
          ? current
          : parsedRef,
      );

      const refDisplay = parsedRef.inviteCode ?? parsedRef.username;
      setRefParam((prev) => (prev === refDisplay ? prev : refDisplay));
    } else {
      setReferralLookup({ inviteCode: null, username: null });
      setRefParam(null);
      setReferrerInfo(null);
      setReferrerError(null);
    }
  }, [location.search]);

  useEffect(() => {
    if (!referralLookup.inviteCode && !referralLookup.username) {
      setReferrerInfo(null);
      setReferrerError(null);
      setReferrerLoading(false);
      return;
    }

    let active = true;
    setReferrerLoading(true);

    const lookupReferrer = async () => {
      try {
        if (referralLookup.inviteCode) {
          const { data, error } = await supabase
            .from("referrals")
            .select(
              "code, agent:agents!referrals_agent_id_fkey (profile:profiles!agents_profile_id_fkey (id, username, full_name))",
            )
            .eq("code", referralLookup.inviteCode)
            .eq("active", true)
            .maybeSingle();

          if (error) throw error;

          const agentProfile = data?.agent?.profile;
          if (agentProfile && active) {
            setReferrerInfo(agentProfile as { id: string; username: string; full_name?: string });
            setReferrerError(null);
            return;
          }
        }

        if (referralLookup.username) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, full_name")
            .eq("username", referralLookup.username)
            .maybeSingle();

          if (error) throw error;

          if (data && active) {
            setReferrerInfo(data);
            setReferrerError(null);
            return;
          }
        }

        if (active) {
          setReferrerInfo(null);
          setReferrerError("We could not find a matching referrer for this link or invite code.");
        }
      } catch (error) {
        console.error("Error looking up referrer", error);
        if (active) {
          setReferrerInfo(null);
          setReferrerError("We could not find a matching referrer for this link or invite code.");
        }
      } finally {
        if (active) setReferrerLoading(false);
      }
    };

    void lookupReferrer();

    return () => {
      active = false;
    };
  }, [referralLookup]);

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

  const handleGoogleSignUp = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteUrl()}/dashboard`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const validateStep1 = () => {
    if (!role) {
      toast({
        variant: "destructive",
        title: "Role required",
        description: "Select your account type.",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!firstName.trim()) {
      toast({ variant: "destructive", title: "First name required" });
      return false;
    }

    if (!lastName.trim()) {
      toast({ variant: "destructive", title: "Last name required" });
      return false;
    }

    if (!phone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone / WhatsApp number required",
        description: "Please enter your phone number with country code.",
      });
      return false;
    }

    const normalizedPhone = normalizePhoneNumber(phone.trim());
    if (!STUDENT_WHATSAPP_REGEX.test(normalizedPhone)) {
      toast({
        variant: "destructive",
        title: "Valid WhatsApp number required",
        description: "Include the country code (for example: +2348012345678, +447123456789).",
      });
      return false;
    }

    if (!country) {
      toast({
        variant: "destructive",
        title: "Country of residence required",
      });
      return false;
    }

    if (!referralSource.trim()) {
      toast({
        variant: "destructive",
        title: "Referral source required",
        description: "Please tell us who referred you or how you heard about UniDoxia.",
      });
      return false;
    }

    if (referralSource.trim().length > 200) {
      toast({
        variant: "destructive",
        title: "Referral note is too long",
        description: "Please keep it under 200 characters.",
      });
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if (!username.trim()) {
      toast({ variant: "destructive", title: "Username required" });
      return false;
    }

    if (username.length < 3) {
      toast({ variant: "destructive", title: "Username too short" });
      return false;
    }

    if (usernameError && usernameCheckAvailable) {
      toast({
        variant: "destructive",
        title: "Username unavailable",
        description: usernameError,
      });
      return false;
    }

    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email address required",
        description: "Please enter a valid email address.",
      });
      return false;
    }

    if (!email.includes("@") || !email.includes(".")) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address (e.g. name@example.com).",
      });
      return false;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: passwordResult.error.issues[0].message,
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if ((step === 1 && validateStep1()) || (step === 2 && validateStep2())) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 3) {
      if ((step === 1 && validateStep1()) || (step === 2 && validateStep2())) {
        setStep(step + 1);
      }
      return;
    }

    if (!validateStep3()) return;

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const { error } = await signUp({
        email,
        password,
        fullName,
        role,
        phone: normalizePhoneNumber(phone.trim()),
        country,
        username,
        referrerId: referrerInfo?.id,
        referrerUsername: referrerInfo?.username,
        referralSource: referralSource.trim() || undefined,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: (error as Error).message || "An error occurred",
        });
      } else {
        if (role === "agent") {
          markOnboardingSeen("agent");
        }

        toast({
          title: "Account created!",
          description: "Check your email to verify your account before logging in.",
        });

        navigate("/verify-email", { state: { email } });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: "Unexpected error.",
      });
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
      : "Showcase courses and scholarships";

  if (authLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingState
          message={authLoading ? "Checking your session..." : "Redirecting to your dashboard..."}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 px-4 py-8">
      <SEO
        title="Sign Up - UniDoxia"
        description="Create an account with UniDoxia to begin your study abroad journey. Join as a student, agent, or university partner."
        keywords="sign up, create account, student registration, agent registration, university registration, student recruitment platform"
      />

      <Card className="w-full max-w-3xl shadow-2xl border-2 relative overflow-hidden">
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
                          : "border-border hover:border-primary/50",
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

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" /> First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" /> Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> WhatsApp Number
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +2348012345678"
                />
                <p className="text-sm text-muted-foreground">
                  Required with country code (e.g. +1, +44, +234). We use this as your primary
                  WhatsApp contact.
                </p>

                <Label htmlFor="country" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Country of Residence
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select your country of residence" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This should be the country where you currently live, not your preferred study
                  destination.
                </p>

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
                    placeholder="e.g. John Doe, Instagram, school counselor"
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Share a person's name or the source so we can properly track referrals and
                    reward commission.
                  </p>
                </div>
              </div>
            )}

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
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />

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

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07Zm-10.56 11c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.85 0-5.26-1.92-6.12-4.5H2.18v2.84A10.99 10.99 0 0 0 12 23.25Zm-6.12-8.85A6.6 6.6 0 0 1 5.56 12c0-.83.14-1.64.32-2.4V6.76H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 5.24l3.7-2.84Zm6.12-6.9c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 4.09 14.97 3 12 3 7.69 3 3.96 5.48 2.18 8.76l3.7 2.84c.86-2.58 3.27-4.5 6.12-4.5Z"
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
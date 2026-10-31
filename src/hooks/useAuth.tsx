import { ensurePartnerWorkspace } from "@/lib/partnerWorkspace";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logFailedAuthentication } from '@/lib/securityLogger';
import { formatReferralUsername } from '@/lib/referrals';
import { buildEmailRedirectUrl, getSiteUrl } from '@/lib/supabaseClientConfig';

type SignupRole = 'student' | 'agent' | 'partner' | 'admin' | 'staff';

interface Profile {
  id: string;
  tenant_id: string;
  role:
    | 'student'
    | 'agent'
    | 'university'
    | 'partner'
    | 'staff'
    | 'admin'
    | 'counselor'
    | 'verifier'
    | 'finance'
    | 'school_rep';
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  avatar_url?: string;
  onboarded: boolean;
  username: string;
  referrer_id?: string | null;
  referred_by?: string | null;
  partner_email_verified?: boolean | null;
  active: boolean | null;
  _isolationFailed?: boolean;
}

const isProfileLike = (value: unknown): value is Profile => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.email === 'string' && typeof v.tenant_id === 'string';
};

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role?: SignupRole;
  phone?: string;
  country?: string;
  username: string;
  referrerId?: string;
  referrerUsername?: string;
  referralSource?: string;
  redirectTo?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state_region?: string;
    postal_code?: string;
    country_of_residence?: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True while profile is being fetched/repaired after auth state changes */
  profileLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: unknown;
    requiresEmailVerification?: boolean;
    email?: string;
    verificationEmailSent?: boolean;
    verificationError?: string;
  }>;
  signUp: (params: SignUpParams) => Promise<{ error: unknown }>;
  signOut: (options?: { redirectTo?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


const LEGACY_LOGIN_EMAIL_ALIASES: Record<string, string[]> = {
  // Legacy admin alias so existing credentials continue to work.
  'j777wmb@gmail.com': ['j777wmb@yahoo.com'],
};

const getLoginEmailCandidates = (email: string): string[] => {
  const normalizedEmail = email.trim().toLowerCase();
  const aliases = LEGACY_LOGIN_EMAIL_ALIASES[normalizedEmail] ?? [];
  return [normalizedEmail, ...aliases.filter((alias) => alias !== normalizedEmail)];
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /** Tracks when profile is being fetched/repaired after auth state changes */
  const [profileLoading, setProfileLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const ensurePartnerEmailVerification = async (
    profileData: Profile,
    currentUser: User | null,
  ): Promise<Profile> => {
    // Handle both 'partner' and legacy 'university' roles
    const isPartnerRole = profileData.role === 'partner' || profileData.role === 'university';
    if (!isPartnerRole) return profileData;

    const isVerified = Boolean(profileData.partner_email_verified);
    if (isVerified) return profileData;

    if (!currentUser?.email_confirmed_at) return profileData;

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ onboarded: true })
      .eq('id', profileData.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to persist partner email verification status:', updateError);
      return profileData;
    }

    return {
      ...updatedProfile,
      partner_email_verified: true,
    } as Profile;
  };

  const ensurePartnerTenantIsolation = async (profileData: Profile): Promise<Profile> =>
    ensurePartnerWorkspace(profileData, {
      ensure: async (profileId) => {
        const { data, error } = await supabase.rpc('ensure_partner_workspace', { p_profile_id: profileId });
        return { tenantId: typeof data === 'string' ? data : null, error: Boolean(error) };
      },
      reload: async (profileId) => {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();
        return error ? null : data as Profile;
      },
    });

  /**
   * Calls the server-side ensure_user_profile RPC to self-heal malformed accounts.
   * This handles cases where:
   * - Profile exists in auth.users but not in profiles table
   * - User roles entry is missing
   * - Partner is on shared tenant (needs isolation)
   * - Partner's university record is missing
   */
  const ensureUserProfileRPC = async (
    userId: string,
    metadata?: {
      role?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      country?: string;
    },
  ) => {
    try {
      const { data, error } = await supabase.rpc('ensure_user_profile' as any, {
        p_user_id: userId,
        ...(metadata?.role ? { p_role: metadata.role } : {}),
        ...(metadata?.fullName ? { p_full_name: metadata.fullName } : {}),
        ...(metadata?.email ? { p_email: metadata.email } : {}),
        ...(metadata?.phone ? { p_phone: metadata.phone } : {}),
        ...(metadata?.country ? { p_country: metadata.country } : {}),
      });
      
      if (error) {
        console.error('ensure_user_profile RPC failed:', error);
        return { success: false, error };
      }
      
      const result = data as { success?: boolean } | null;
      console.log('ensure_user_profile result:', result);
      return { success: result?.success === true, data: result };
    } catch (err) {
      console.error('ensure_user_profile exception:', err);
      return { success: false, error: err };
    }
  };

  const fetchProfile = async (userId: string, currentUser: User | null = user) => {
    try {
      const profileMetadata = {
        role:
          typeof currentUser?.user_metadata?.role === 'string'
            ? currentUser.user_metadata.role
            : undefined,
        fullName:
          typeof currentUser?.user_metadata?.full_name === 'string'
            ? currentUser.user_metadata.full_name
            : undefined,
        email: currentUser?.email ?? undefined,
        phone:
          typeof currentUser?.user_metadata?.phone === 'string'
            ? currentUser.user_metadata.phone
            : undefined,
        country:
          typeof currentUser?.user_metadata?.country === 'string'
            ? currentUser.user_metadata.country
            : undefined,
      };

      // CRITICAL: Always fetch profile by user_id (auth.uid()) to ensure isolation
      // The profiles table uses auth.users.id as the primary key, so this guarantees
      // we only get the profile belonging to the authenticated user
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Standard profile fetch failed, attempting fallback...', {
          code: error.code,
          message: error.message
        });

        // Fallback strategy:
        // 1. Try get_my_profile RPC (bypasses RLS)
        // 2. If that fails/returns empty, try repair (ensure_user_profile)
        // 3. Try get_my_profile again

        // Attempt 1: Secure RPC fallback (bypasses RLS)
        const { data: rpcProfile, error: rpcError } = await supabase
          .rpc('get_my_profile' as any)
          .maybeSingle();

        if (isProfileLike(rpcProfile) && !rpcError) {
          console.log('Profile retrieved via RPC fallback (RLS bypass successful)');

          // Verify ownership just in case (though RPC enforces auth.uid())
          if (rpcProfile.id !== userId) {
            console.error('CRITICAL SECURITY ERROR: RPC Profile ID mismatch!', {
              requested: userId,
              returned: rpcProfile.id,
            });
            setProfile(null);
            return;
          }

          const normalizedProfile: Profile = { ...(rpcProfile as Profile) };
          await processAndSetProfile(normalizedProfile, userId, currentUser);
          return;
        }

        // If RPC also failed to find a profile, then it truly doesn't exist (or repair needed)
        const recoverableCodes = ['PGRST116', 'PGRST301', 'PGRST403', '42501'];
        // PGRST116 is "JSON object requested, multiple (or no) rows returned"

        const shouldAttemptRepair = recoverableCodes.includes(error.code ?? '') || !profile;

        if (shouldAttemptRepair) {
          console.log('Profile missing or inaccessible, attempting server-side self-healing...');

          // Try the server-side RPC first (more robust)
          const rpcResult = await ensureUserProfileRPC(userId, profileMetadata);

          if (!rpcResult.success) {
            // A failed server repair must not fall back to browser tenant/profile creation.
            setProfile(null);
            return;
          }

          // Retry fetching the profile using the robust RPC method
          const { data: retryData, error: retryError } = await supabase
            .rpc('get_my_profile' as any)
            .maybeSingle();

          if (retryError || !retryData) {
            console.error('Retry failed after profile repair attempt:', retryError);
            setProfile(null);
          } else {
            // SECURITY CHECK: Verify the returned profile ID matches the requested user ID
            if (!isProfileLike(retryData) || retryData.id !== userId) {
              console.error('CRITICAL SECURITY ERROR: Profile ID mismatch!', {
                requested: userId,
                returned: isProfileLike(retryData) ? retryData.id : 'invalid_profile_payload',
              });
              setProfile(null);
              return;
            }
            console.log('Profile successfully repaired/created:', retryData.email);

            const normalizedProfile: Profile = { ...(retryData as Profile) };
            await processAndSetProfile(normalizedProfile, userId, currentUser);
          }
        } else {
          console.error('Unrecoverable profile error:', error);
          setProfile(null);
        }
      } else {
        // SECURITY CHECK: Verify the returned profile ID matches the requested user ID
        // This should always be true due to the primary key constraint, but we check anyway
        if (data.id !== userId) {
          console.error('CRITICAL SECURITY ERROR: Profile ID mismatch!', {
            requested: userId,
            returned: data.id,
          });
          setProfile(null);
          return;
        }

        const normalizedProfile: Profile = {
          ...data,
        };

        await processAndSetProfile(normalizedProfile, userId, currentUser);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  const processAndSetProfile = async (
    normalizedProfile: Profile,
    userId: string,
    currentUser: User | null
  ) => {

        const countryFromMetadata =
          typeof currentUser?.user_metadata?.country === 'string'
            ? currentUser.user_metadata.country.trim()
            : '';

        if (!normalizedProfile.country && countryFromMetadata) {
          const { data: countryUpdatedProfile, error: countryUpdateError } = await supabase
            .from('profiles')
            .update({ country: countryFromMetadata })
            .eq('id', userId)
            .select('*')
            .single();

          if (countryUpdateError) {
            console.error('Failed to backfill profile country from signup metadata:', countryUpdateError);
          } else if (countryUpdatedProfile) {
            normalizedProfile.country = countryUpdatedProfile.country;
          }
        }

        // Post-process the profile (verification and isolation)
        // Wrap in try-catch to preserve profile even if post-processing fails
        let finalProfile = normalizedProfile;

        try {
          const profileWithVerification = await ensurePartnerEmailVerification(
            normalizedProfile,
            currentUser,
          );
          finalProfile = profileWithVerification;

          const profileWithIsolation = await ensurePartnerTenantIsolation(profileWithVerification);
          finalProfile = profileWithIsolation;
        } catch (postProcessError) {
          console.error('Error preparing account workspace:', postProcessError);
          if (['partner', 'university'].includes(finalProfile.role))
            finalProfile = { ...finalProfile, _isolationFailed: true };
        }

        // Final security check: ensure the profile we're setting belongs to this user
        if (finalProfile.id !== userId) {
          console.error('CRITICAL SECURITY ERROR: Post-processing profile ID mismatch!', {
            requested: userId,
            returned: finalProfile.id,
          });
          setProfile(null);
          return;
        }

        setProfile(finalProfile);
  };

  useEffect(() => {
    let isMounted = true;
    let lastUserId: string | undefined = undefined;

    const handleAuthChange = async (session: Session | null) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      const currentUserId = currentUser?.id;

      setUser(currentUser);
      setSession(session);

      // Note: We don't block on email_confirmed_at here because:
      // 1. The signIn function already handles unverified emails by signing out
      // 2. Cached/stale sessions may have outdated email_confirmed_at values
      // 3. The profile fetch will fail naturally if there's a real issue
      // If email verification is required, redirect the user to verification page
      if (currentUser && !currentUser.email_confirmed_at) {
        console.info('User email address is not verified yet.');
        // Don't block profile fetching - let the flow continue and handle
        // verification status through the profile or specific UI checks
      }

      // Fetch profile only if user has changed
      if (currentUserId && currentUserId !== lastUserId) {
        // Signal that profile fetching is in progress to prevent "Profile not found" flash
        // This is critical for universities and other roles during login
        if (isMounted) setProfileLoading(true);
        try {
          await fetchProfile(currentUserId, currentUser);
        } finally {
          if (isMounted) setProfileLoading(false);
        }
        lastUserId = currentUserId;
      } else if (!currentUserId) {
        setProfile(null);
        lastUserId = undefined;
      }
    };

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleAuthChange(session);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Initial check
    init();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // The event SIGNED_IN is already handled by the initial check.
        // TOKEN_REFRESHED should not re-trigger profile fetching unless needed.
        // The event SIGNED_IN is already handled by the initial check.
        // TOKEN_REFRESHED should not re-trigger profile fetching unless needed.
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          handleAuthChange(session);
        } else if (event === 'SIGNED_IN') {
          // Only handle SIGNED_IN if the user is different, to prevent double-fetch on load
          if (session?.user?.id !== lastUserId) {
            handleAuthChange(session);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh, which could be for a different user
          if (session?.user?.id !== lastUserId) {
            handleAuthChange(session);
          } else if (isMounted) {
            // If same user, just update the session
            setSession(session);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const loginEmailCandidates = getLoginEmailCandidates(email);
      let data = null;
      let error = null;

      for (const candidateEmail of loginEmailCandidates) {
        const attempt = await supabase.auth.signInWithPassword({
          email: candidateEmail,
          password,
        });

        data = attempt.data;
        error = attempt.error;

        if (!error) break;

        const invalidCredentials =
          (error as { status?: number }).status === 400 ||
          /invalid login credentials/i.test(error.message ?? '');

        if (!invalidCredentials || candidateEmail === loginEmailCandidates[loginEmailCandidates.length - 1]) {
          break;
        }
      }

      if (error) {
        console.error('Sign-in error:', error);
        void logFailedAuthentication(email, error.message ?? 'Unknown sign-in error', {
          code: (error as any)?.code,
          status: (error as any)?.status,
          name: error.name,
        });
        return { error };
      }

      if (data?.user && !data.user.email_confirmed_at) {
        console.warn('Sign-in blocked: email address is not verified yet.');
        const emailRedirectTo =
          buildEmailRedirectUrl('/auth/callback') ?? `${getSiteUrl()}/auth/callback`;

        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: data.user.email ?? email,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        });

        if (resendError) {
          console.error('Failed to resend verification email during sign-in:', resendError);
        } else {
          console.log('Verification email re-sent during sign-in flow.');
        }

        await supabase.auth.signOut();

        const role = data.user.user_metadata?.role;
        const isPartnerSignup = role === 'partner' || role === 'university';
        const verifyMessage = isPartnerSignup
          ? 'Verify your email to proceed.'
          : 'Please verify your email before signing in.';

        return {
          error: new Error(verifyMessage),
          requiresEmailVerification: true,
          email: data.user.email,
          verificationEmailSent: !resendError,
          verificationError: resendError?.message,
        };
      }

      // Handle both 'partner' and legacy 'university' roles
      const isPartnerRole = data?.user?.user_metadata?.role === 'partner' || 
                            data?.user?.user_metadata?.role === 'university';
      if (isPartnerRole) {
        // Partner email verification - rely on Supabase auth email_confirmed_at
        const partnerEmailVerified = Boolean(data.user.email_confirmed_at);

        if (!partnerEmailVerified) {
          console.warn('Sign-in blocked: partner email address is not verified yet.');
          await supabase.auth.signOut();

          return {
            error: new Error('Verify your email to proceed.'),
            requiresEmailVerification: true,
            email: data.user.email,
          };
        }
      }

      console.log('Sign-in successful:', data);
      return { error: null };
    } catch (err) {
      console.error('Sign-in exception:', err);
      const reason = err instanceof Error ? err.message : 'Unexpected sign-in error';
      void logFailedAuthentication(email, reason, {
        isException: true,
      });
      return { error: err };
    }
  };

  const signUp = async ({
    email,
    password,
    fullName,
    firstName,
    middleName,
    lastName,
    role = 'student',
    phone,
    country,
    username,
    referrerId,
    referrerUsername,
    referralSource,
    redirectTo,
    address,
  }: SignUpParams) => {
    try {
      const callbackPath = redirectTo
        ? `/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : '/auth/callback';
      const redirectUrl = buildEmailRedirectUrl(callbackPath);

      const sanitizedUsername = formatReferralUsername(username);

      const metadata: Record<string, string> = {
        full_name: fullName,
        first_name: firstName || '',
        middle_name: middleName || '',
        last_name: lastName || '',
        role,
        phone: phone || '',
        country: country || '',
        username: sanitizedUsername || `user_${crypto.randomUUID().slice(0, 12)}`,
      };

      if (referrerUsername) {
        metadata.referrer_username = referrerUsername;
      }

      if (referrerId) {
        metadata.referrer_id = referrerId;
      }

      if (referralSource) {
        metadata.referral_source = referralSource;
      }

      if (address) {
        Object.entries(address).forEach(([key, value]) => {
          if (value && value.trim()) {
            metadata[key] = value.trim();
          }
        });
      }

      const authOptions = {
        data: metadata,
        ...(redirectUrl ? { emailRedirectTo: redirectUrl } : {}),
      } satisfies Parameters<typeof supabase.auth.signUp>[0]['options'];

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: authOptions,
      });

      if (error) {
        console.error('Sign-up error:', error);
        return { error };
      }

      console.log('Sign-up successful. Verification email sent:', data);
      return { error: null };
    } catch (err) {
      console.error('Sign-up exception:', err);
      return { error: err };
    }
  };

  const signOut = async (options?: { redirectTo?: string }) => {
    // Clear auth state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // CRITICAL: Clear all React Query cache to prevent data leakage between sessions
    // This ensures the next user won't see cached data from the previous user
    queryClient.clear();
    
    // CRITICAL: Clear all cached profile/tenant data from storage
    // This prevents stale data from persisting across user sessions
    try {
      // Clear any app-specific cached data (not auth tokens - Supabase handles those)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('profile') || key.includes('tenant') || key.includes('university'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage completely for fresh session on next login
      sessionStorage.clear();
    } catch (err) {
      console.warn('Error clearing cached data on logout:', err);
    }
    
    // Sign out from Supabase (this clears auth tokens)
    await supabase.auth.signOut();
    
    // Navigate to login
    const redirectTarget = options?.redirectTo ?? '/auth/login';
    navigate(redirectTarget);
  };

  const refreshProfile = async () => {
    if (user) {
      setProfileLoading(true);
      try {
        await fetchProfile(user.id);
      } finally {
        setProfileLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

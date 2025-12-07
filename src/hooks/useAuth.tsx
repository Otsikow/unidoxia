import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { logFailedAuthentication } from '@/lib/securityLogger';
import { formatReferralUsername } from '@/lib/referrals';
import { buildEmailRedirectUrl, getSiteUrl } from '@/lib/supabaseClientConfig';

type SignupRole = 'student' | 'agent' | 'partner' | 'admin' | 'staff';

// Helper to generate initial university profile details from user metadata
// This ensures signup info (name, email, phone) is pre-populated in the university profile
const generateInitialUniversityProfileDetails = (
  fullName: string | undefined,
  email: string | undefined,
  phone: string | undefined,
  country: string | undefined,
) => {
  return {
    tagline: null,
    highlights: [],
    contacts: {
      primary: {
        name: fullName || null,
        email: email || null,
        phone: phone || null,
        title: null,
      },
    },
    social: {
      website: null,
      facebook: null,
      instagram: null,
      linkedin: null,
      youtube: null,
    },
    media: {
      heroImageUrl: null,
      gallery: [],
    },
  };
};

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
}

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role?: SignupRole;
  phone?: string;
  country?: string;
  username: string;
  referrerId?: string;
  referrerUsername?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
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

const DEFAULT_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'unidoxia';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const ensurePartnerEmailVerification = async (
    profileData: Profile,
    currentUser: User | null,
  ): Promise<Profile> => {
    if (profileData.role !== 'partner') return profileData;

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

  const ensurePartnerTenantIsolation = async (
    profileData: Profile,
    currentUser: User | null,
  ): Promise<Profile> => {
    if (profileData.role !== 'partner' || !profileData.tenant_id) {
      return profileData;
    }

    const { data: tenant, error: tenantLookupError } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('id', profileData.tenant_id)
      .maybeSingle();

    if (tenantLookupError) {
      console.error('Error verifying partner tenant isolation:', tenantLookupError);
      // Do NOT return profileData here - we need to fix the isolation issue
    }

    const isSharedTenant = tenant?.slug === DEFAULT_TENANT_SLUG;

    // CRITICAL: Check if this tenant already has a university that was created by someone else
    // This can happen if multiple partners share the same tenant_id
    const { data: existingUniversity, error: existingUniError } = await supabase
      .from('universities')
      .select('id, name, tenant_id')
      .eq('tenant_id', profileData.tenant_id)
      .maybeSingle();

    // If there's an existing university in this tenant, check if it was created by this partner
    // by comparing against the partner's email/name. If it doesn't match, we need to isolate.
    const needsIsolation = isSharedTenant || (
      existingUniversity && 
      existingUniversity.name !== `${profileData.full_name}'s University` &&
      !existingUniversity.name?.toLowerCase().includes(profileData.full_name?.toLowerCase().split(' ')[0] || '')
    );

    if (!needsIsolation) {
      // Verify partner has their own university, create one if missing
      if (!existingUniversity) {
        console.warn('Partner has isolated tenant but no university - creating one now');
        const universityName =
          typeof currentUser?.user_metadata?.university_name === 'string'
            ? currentUser.user_metadata.university_name
            : `${profileData.full_name}'s University`;

        // Generate initial profile details with contact info from profile
        const initialProfileDetails = generateInitialUniversityProfileDetails(
          profileData.full_name,
          profileData.email || currentUser?.email,
          profileData.phone || currentUser?.user_metadata?.phone,
          profileData.country || currentUser?.user_metadata?.country,
        );

        const { error: createUniError } = await supabase
          .from('universities')
          .insert({
            name: universityName,
            country: currentUser?.user_metadata?.country || 'Unknown',
            city: null,
            website: currentUser?.user_metadata?.website || null,
            logo_url: null,
            description: `Welcome to ${universityName}. Please update your profile to showcase your institution.`,
            tenant_id: profileData.tenant_id,
            active: true,
            submission_config_json: initialProfileDetails,
          })
          .select('id')
          .single();

        if (createUniError) {
          console.error('Failed to create university for existing tenant:', createUniError);
        } else {
          console.log('Created missing university for partner tenant:', profileData.tenant_id);
        }
      }
      return profileData;
    }

    console.warn(
      'Partner profile requires isolation. Creating an isolated tenant to prevent data leakage.',
      { 
        profileId: profileData.id, 
        tenantId: profileData.tenant_id, 
        tenantSlug: tenant?.slug,
        isSharedTenant,
        existingUniversity: existingUniversity?.name,
      },
    );

    // Generate a unique tenant slug with UUID to prevent collisions
    const newTenantSlug = `university-${crypto.randomUUID()}`;
    const tenantName =
      (typeof currentUser?.user_metadata?.university_name === 'string'
        ? currentUser.user_metadata.university_name
        : profileData.full_name) ?? 'University Partner';

    const { data: newTenant, error: tenantCreationError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug: newTenantSlug,
        email_from: currentUser?.email || profileData.email || 'noreply@example.com',
        active: true,
      })
      .select('id, slug, name')
      .single();

    if (tenantCreationError || !newTenant?.id) {
      console.error('CRITICAL: Failed to create isolated tenant for partner profile:', tenantCreationError);
      // Instead of returning the old profile (which would keep shared data), 
      // we need to retry with a different approach or fail explicitly
      
      // Try one more time with a fully unique slug
      const retrySlug = `uni-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const { data: retryTenant, error: retryError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          slug: retrySlug,
          email_from: currentUser?.email || profileData.email || 'noreply@example.com',
          active: true,
        })
        .select('id, slug, name')
        .single();

      if (retryError || !retryTenant?.id) {
        console.error('CRITICAL: Retry tenant creation also failed:', retryError);
        // As a last resort, return profile but flag it for attention
        // The UI should detect this and show an error
        return {
          ...profileData,
          // Mark that isolation failed so UI can handle it
          _isolationFailed: true,
        } as Profile;
      }

      // Use the retry tenant
      Object.assign(newTenant || {}, retryTenant);
    }

    const universityName =
      typeof currentUser?.user_metadata?.university_name === 'string'
        ? currentUser.user_metadata.university_name
        : `${profileData.full_name}'s University`;

    // Generate initial profile details with contact info from signup/profile
    const initialProfileDetails = generateInitialUniversityProfileDetails(
      profileData.full_name,
      profileData.email || currentUser?.email,
      profileData.phone || currentUser?.user_metadata?.phone,
      profileData.country || currentUser?.user_metadata?.country,
    );

    // Create a fresh university for this new isolated tenant
    const { data: newUniversity, error: universityCreationError } = await supabase
      .from('universities')
      .insert({
        name: universityName,
        country: currentUser?.user_metadata?.country || 'Unknown',
        city: null,
        website: currentUser?.user_metadata?.website || null,
        logo_url: null,
        description: `Welcome to ${universityName}. Please update your profile to showcase your institution.`,
        tenant_id: newTenant!.id,
        active: true,
        submission_config_json: initialProfileDetails,
      })
      .select('id, name')
      .single();

    if (universityCreationError) {
      console.error('Failed to create isolated university for partner profile:', universityCreationError);
      // Don't continue without a university - the partner won't have data to manage
      // But still update tenant to prevent shared data access
    } else {
      console.log(`Created new isolated university "${newUniversity?.name}" for partner`);
    }

    // Update the profile to use the new isolated tenant
    const { data: updatedProfile, error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ tenant_id: newTenant!.id })
      .eq('id', profileData.id)
      .select('*')
      .single();

    if (profileUpdateError || !updatedProfile) {
      console.error('CRITICAL: Failed to migrate partner profile to isolated tenant:', profileUpdateError);
      // This is a critical failure - the partner might still see shared data
      // Return profile but flag it
      return {
        ...profileData,
        _isolationFailed: true,
      } as Profile;
    }

    console.log('Partner profile successfully migrated to isolated tenant:', {
      profileId: profileData.id,
      newTenantId: newTenant!.id,
      newTenantSlug: newTenant!.slug,
      universityCreated: !universityCreationError,
    });

    return {
      ...updatedProfile,
      tenant_id: newTenant!.id,
    } as Profile;
  };

  const fetchProfile = async (userId: string, currentUser: User | null = user) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);

        // If profile not found, create and retry
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new one...');
          await createProfileForUser(userId);

          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (retryError) {
            console.error('Retry failed creating profile:', retryError);
            setProfile(null);
          } else {
            setProfile(retryData);
          }
        } else {
          setProfile(null);
        }
      } else {
        const normalizedProfile: Profile = {
          ...data,
        };

        const profileWithVerification = await ensurePartnerEmailVerification(
          normalizedProfile,
          currentUser,
        );

        const profileWithIsolation = await ensurePartnerTenantIsolation(
          profileWithVerification,
          currentUser,
        );

        setProfile(profileWithIsolation);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  const createProfileForUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rawUsername = typeof user.user_metadata?.username === 'string'
        ? user.user_metadata.username
        : undefined;
      let username = rawUsername ? formatReferralUsername(rawUsername) : '';
      if (!username) {
        username = `user_${userId.slice(0, 12)}`;
      }

      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      if (existingUsername) {
        username = `${username}_${userId.slice(0, 6)}`;
      }

      let referrerProfileId: string | null = null;
      let referrerUsername: string | null = null;

      if (typeof user.user_metadata?.referrer_id === 'string') {
        referrerProfileId = user.user_metadata.referrer_id;
      }

      if (referrerProfileId) {
        const { data: refProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', referrerProfileId)
          .maybeSingle();
        referrerUsername = refProfile?.username ?? null;
      } else if (typeof user.user_metadata?.referrer_username === 'string') {
        const normalizedReferrer = user.user_metadata.referrer_username.trim().toLowerCase();
        if (normalizedReferrer) {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('username', normalizedReferrer)
            .maybeSingle();
          referrerProfileId = referrerProfile?.id ?? null;
          referrerUsername = referrerProfile?.username ?? normalizedReferrer;
        }
      }

      const metadataTenantId = typeof user.user_metadata?.tenant_id === 'string'
        ? user.user_metadata.tenant_id
        : null;
      const metadataTenantSlug = typeof user.user_metadata?.tenant_slug === 'string'
        ? user.user_metadata.tenant_slug
        : null;

      const role = user.user_metadata?.role || 'student';

      const shouldIsolateTenant = ['partner', 'school_rep', 'admin', 'staff'].includes(role);

      const generateTenantSlug = (base: string) => {
        const normalizedBase = base
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
          .slice(0, 40);

        const seed = normalizedBase || 'tenant';
        return `${seed}-${crypto.randomUUID().slice(0, 8)}`;
      };

      const createIsolatedTenant = async () => {
        const nameSeed =
          typeof user.user_metadata?.university_name === 'string'
            ? user.user_metadata.university_name
            : typeof user.user_metadata?.company === 'string'
              ? user.user_metadata.company
              : user.user_metadata?.full_name || 'University Partner';

        const slugSeed =
          typeof user.user_metadata?.university_slug === 'string'
            ? user.user_metadata.university_slug
            : user.email?.split('@')[1]?.split('.')[0] || nameSeed;

        const tenantSlug = generateTenantSlug(slugSeed || 'tenant');

        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: nameSeed,
            slug: tenantSlug,
            email_from: user.email || 'noreply@example.com',
            active: true,
          })
          .select()
          .single();

        if (tenantError) {
          console.error('Error creating isolated tenant:', tenantError);
          return null;
        }

        return newTenant;
      };

      const resolveTenantById = async (tenantId: string) => {
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('id', tenantId)
          .maybeSingle();

        if (error) {
          console.error('Error resolving tenant by id:', error);
          return null;
        }

        return data;
      };

      const resolveTenantBySlug = async (slug: string) => {
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          console.error('Error resolving tenant by slug:', error);
          return null;
        }

        return data;
      };

      let tenant = null;

      // CRITICAL: For partner roles, we MUST create an isolated tenant
      // Do not fall back to shared tenants for partners - this prevents data leakage
      if (shouldIsolateTenant) {
        // First, try user-specified tenant from metadata
        if (metadataTenantId) {
          tenant = await resolveTenantById(metadataTenantId);
        }
        
        if (!tenant && metadataTenantSlug) {
          tenant = await resolveTenantBySlug(metadataTenantSlug);
        }
        
        // If no pre-existing tenant, create an isolated one
        if (!tenant) {
          tenant = await createIsolatedTenant();
          
          // If isolated tenant creation failed, retry with a more unique slug
          if (!tenant) {
            console.warn('First tenant creation attempt failed, retrying with unique ID...');
            const retrySlug = `university-${crypto.randomUUID()}`;
            const { data: retryTenant, error: retryError } = await supabase
              .from('tenants')
              .insert({
                name: user.user_metadata?.full_name || 'University Partner',
                slug: retrySlug,
                email_from: user.email || 'noreply@example.com',
                active: true,
              })
              .select()
              .single();
            
            if (retryError) {
              console.error('CRITICAL: Failed to create isolated tenant for partner after retry:', retryError);
              // For partners, we MUST NOT proceed without an isolated tenant
              // This prevents the mirroring issue where all partners share the same data
              throw new Error('Failed to create isolated tenant for university partner. Please contact support.');
            }
            
            tenant = retryTenant;
          }
        }
        
        if (!tenant) {
          console.error('CRITICAL: Partner account could not be assigned an isolated tenant');
          throw new Error('Failed to set up university partner account. Please try again or contact support.');
        }
        
        console.log('Isolated tenant created/resolved for partner:', tenant.id, tenant.slug);
      } else {
        // For non-partner roles (students, agents), use standard tenant resolution
        if (metadataTenantId) {
          tenant = await resolveTenantById(metadataTenantId);
        }

        if (!tenant && metadataTenantSlug) {
          tenant = await resolveTenantBySlug(metadataTenantSlug);
        }

        if (!tenant && DEFAULT_TENANT_SLUG) {
          tenant = await resolveTenantBySlug(DEFAULT_TENANT_SLUG);
        }

        if (!tenant) {
          console.log('No tenant found for non-partner role, creating default tenant...');
          const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
              name: 'Default Tenant',
              slug: generateTenantSlug(DEFAULT_TENANT_SLUG || 'default'),
              email_from: 'noreply@example.com',
              active: true,
            })
            .select()
            .single();

          if (tenantError) {
            console.error('Error creating tenant:', tenantError);
            return;
          }

          tenant = newTenant;
        }
      }

      if (shouldIsolateTenant) {
        // CRITICAL: Verify this tenant doesn't already have a university from another account
        // This is a safety check to prevent data leakage
        const { data: existingUniversity, error: existingUniError } = await supabase
          .from('universities')
          .select('id, tenant_id, name')
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        if (existingUniError) {
          console.error('Error checking existing university for tenant:', existingUniError);
        }

        if (existingUniversity) {
          // A university already exists for this tenant - this should NOT happen for new partner signups
          // This indicates the tenant was reused (which is a bug) or user is re-registering
          console.warn(
            `University already exists for tenant ${tenant.id}: ${existingUniversity.name}. ` +
            `This may indicate tenant reuse. University ID: ${existingUniversity.id}`
          );
        } else {
          // Create a new isolated university for this partner
          const universityName =
            typeof user.user_metadata?.university_name === 'string' &&
            user.user_metadata.university_name.trim()
              ? user.user_metadata.university_name.trim()
              : user.user_metadata?.full_name
                ? `${user.user_metadata.full_name}'s University`
                : `University Partner ${new Date().toISOString().slice(0, 10)}`;

          const country =
            typeof user.user_metadata?.country === 'string' && user.user_metadata.country.trim()
              ? user.user_metadata.country
              : 'Unknown';

          console.log(`Creating new university "${universityName}" for tenant ${tenant.id}`);

          // Generate initial profile details with contact info from signup
          const initialProfileDetails = generateInitialUniversityProfileDetails(
            user.user_metadata?.full_name,
            user.email,
            user.user_metadata?.phone,
            user.user_metadata?.country,
          );

          const { data: newUniversity, error: universityError } = await supabase
            .from('universities')
            .insert({
              name: universityName,
              country,
              city: null,
              website: user.user_metadata?.website || null,
              logo_url: null,
              description: `Welcome to ${universityName}. Please update your profile to showcase your institution.`,
              tenant_id: tenant.id,
              active: true,
              submission_config_json: initialProfileDetails,
            })
            .select('id, name')
            .single();

          if (universityError) {
            console.error('CRITICAL: Error creating isolated university profile:', universityError);
            // This is a critical error - the partner won't have a university to manage
            // Log details for debugging
            console.error('University creation details:', {
              tenantId: tenant.id,
              universityName,
              country,
              error: universityError.message,
              code: universityError.code,
            });
          } else {
            console.log(`Successfully created university "${newUniversity.name}" (ID: ${newUniversity.id}) for tenant ${tenant.id}`);
          }
        }
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        tenant_id: tenant.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'User',
        role: user.user_metadata?.role || 'student',
        phone: user.user_metadata?.phone || '',
        country: user.user_metadata?.country || '',
        username,
        referrer_id: referrerProfileId,
        referred_by: referrerUsername,
        onboarded: false,
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return;
      }

      if (role === 'student') {
        await supabase.from('students').insert({
          tenant_id: tenant.id,
          profile_id: userId,
        });
      } else if (role === 'agent') {
        await supabase.from('agents').insert({
          tenant_id: tenant.id,
          profile_id: userId,
          username,
        });
      }

      console.log('Profile created successfully for user:', userId);
    } catch (err) {
      console.error('Error creating profile for user:', err);
    }
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

      if (currentUser && !currentUser.email_confirmed_at) {
        console.info('User email address is not verified yet. Redirecting to verification gate.');
        setProfile(null);
        return;
      }

      // Fetch profile only if user has changed
      if (currentUserId && currentUserId !== lastUserId) {
        await fetchProfile(currentUserId, currentUser);
      } else if (!currentUserId) {
        setProfile(null);
      }

      lastUserId = currentUserId;
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
        const verifyMessage = role === 'partner'
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

      if (data?.user?.user_metadata?.role === 'partner') {
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
    role = 'student',
    phone,
    country,
    username,
    referrerId,
    referrerUsername,
  }: SignUpParams) => {
    try {
      const redirectUrl = buildEmailRedirectUrl('/auth/callback');

      const sanitizedUsername = formatReferralUsername(username);

      const metadata: Record<string, string> = {
        full_name: fullName,
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    const redirectTarget = options?.redirectTo ?? '/auth/login';
    navigate(redirectTarget);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
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

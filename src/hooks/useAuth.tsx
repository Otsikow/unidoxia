import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logFailedAuthentication } from '@/lib/securityLogger';
import { formatReferralUsername } from '@/lib/referrals';
import { buildEmailRedirectUrl, getSiteUrl } from '@/lib/supabaseClientConfig';

type SignupRole = 'student' | 'agent' | 'partner' | 'admin' | 'staff';

/**
 * Generates a clean, empty university profile with only basic signup contact info.
 * 
 * IMPORTANT: This function creates a BLANK SLATE for new universities.
 * Only the primary contact information from signup is pre-populated.
 * All other fields (tagline, highlights, social, media) are left empty
 * so universities can fill them in from scratch.
 * 
 * This prevents any data leakage or pre-populated placeholder content
 * that might confuse new university partners during onboarding.
 */
const generateInitialUniversityProfileDetails = (
  fullName: string | undefined,
  email: string | undefined,
  phone: string | undefined,
  _country: string | undefined, // Country is stored separately on the university record
) => {
  return {
    // BLANK: No tagline - university should create their own
    tagline: null,
    // BLANK: No highlights - university should add their own achievements
    highlights: [],
    // PRE-POPULATED: Only contact info from signup for communication purposes
    contacts: {
      primary: {
        name: fullName || null,
        email: email || null,
        phone: phone || null,
        title: null,
      },
    },
    // BLANK: No social links - university should add their own
    social: {
      website: null,
      facebook: null,
      instagram: null,
      linkedin: null,
      youtube: null,
    },
    // BLANK: No media - university should upload their own images
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

const DEFAULT_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG ?? 'unidoxia';

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

  const ensurePartnerTenantIsolation = async (
    profileData: Profile,
    currentUser: User | null,
  ): Promise<Profile> => {
    // Handle both 'partner' and legacy 'university' roles
    const isPartnerRole = profileData.role === 'partner' || profileData.role === 'university';
    if (!isPartnerRole || !profileData.tenant_id) {
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

    // Consider these as shared tenants that require isolation:
    // - 'unidoxia' (default tenant)
    // - 'geg-global' (legacy shared tenant)
    // - 'default' (fallback)
    // All other tenants are considered isolated (even if university name changed)
    const SHARED_TENANT_SLUGS = ['unidoxia', 'geg-global', 'default', DEFAULT_TENANT_SLUG].filter(Boolean);
    const isSharedTenant = tenant?.slug ? SHARED_TENANT_SLUGS.includes(tenant.slug) : true;

    // Check if this tenant has a university
    const { data: existingUniversity, error: existingUniError } = await supabase
      .from('universities')
      .select('id, name, tenant_id')
      .eq('tenant_id', profileData.tenant_id)
      .maybeSingle();

    // CRITICAL FIX: Also check if OTHER partners are using this same tenant
    // This prevents the mirroring issue where multiple universities share data
    const { data: otherPartners, error: otherPartnersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('tenant_id', profileData.tenant_id)
      .eq('role', 'partner')
      .neq('id', profileData.id)
      .limit(1);

    if (otherPartnersError) {
      console.error('Error checking for other partners on tenant:', otherPartnersError);
    }

    // Need isolation if:
    // 1. On a shared tenant (unidoxia/default), OR
    // 2. Another partner user is already using this tenant (data would be mirrored)
    const hasOtherPartners = otherPartners && otherPartners.length > 0;
    const needsIsolation = isSharedTenant || hasOtherPartners;

    if (hasOtherPartners && !isSharedTenant) {
      console.warn('CRITICAL: Multiple partners sharing tenant detected!', {
        currentUser: profileData.email,
        otherPartner: otherPartners[0]?.email,
        tenantId: profileData.tenant_id,
        tenantSlug: tenant?.slug,
        universityName: existingUniversity?.name,
      });
    }

    if (!needsIsolation) {
      // Verify partner has their own university, create one if missing
      // Using the safe get_or_create_university function to prevent duplicates
      if (!existingUniversity) {
        console.warn('Partner has isolated tenant but no university - creating one now via RPC');
        const universityName =
          typeof currentUser?.user_metadata?.university_name === 'string'
            ? currentUser.user_metadata.university_name
            : `${profileData.full_name}'s University`;

        // Use the database function that handles race conditions safely
        const { error: createUniError } = await supabase.rpc('get_or_create_university', {
          p_tenant_id: profileData.tenant_id,
          p_name: universityName,
          p_country: currentUser?.user_metadata?.country || 'Unknown',
          p_contact_name: profileData.full_name,
          p_contact_email: profileData.email || currentUser?.email,
        });

        if (createUniError) {
          console.error('Failed to create university for existing tenant:', createUniError);
        } else {
          console.log('Created/verified university for partner tenant:', profileData.tenant_id);
        }
      }
      return profileData;
    }

    console.warn(
      'Partner profile requires isolation. Creating an isolated tenant to prevent data leakage.',
      { 
        profileId: profileData.id,
        profileEmail: profileData.email,
        tenantId: profileData.tenant_id, 
        tenantSlug: tenant?.slug,
        isSharedTenant,
        hasOtherPartners,
        otherPartnerEmail: otherPartners?.[0]?.email,
        existingUniversity: existingUniversity?.name,
        reason: isSharedTenant ? 'shared_tenant' : 'multiple_partners_on_tenant',
      },
    );

    // Generate a unique tenant slug with UUID to prevent collisions
    const newTenantSlug = `university-${crypto.randomUUID()}`;
    const tenantName =
      (typeof currentUser?.user_metadata?.university_name === 'string'
        ? currentUser.user_metadata.university_name
        : profileData.full_name) ?? 'University Partner';

    // Create isolated tenant - using let so we can reassign on retry
    let isolatedTenant: { id: string; slug: string; name: string } | null = null;

    const { data: firstAttemptTenant, error: tenantCreationError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug: newTenantSlug,
        email_from: currentUser?.email || profileData.email || 'noreply@example.com',
        active: true,
      })
      .select('id, slug, name')
      .single();

    if (tenantCreationError || !firstAttemptTenant?.id) {
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
      isolatedTenant = retryTenant;
    } else {
      isolatedTenant = firstAttemptTenant;
    }

    // At this point, isolatedTenant is guaranteed to be non-null (we return early if both attempts fail)
    if (!isolatedTenant) {
      console.error('CRITICAL: No isolated tenant available after creation attempts');
      return {
        ...profileData,
        _isolationFailed: true,
      } as Profile;
    }

    const universityName =
      typeof currentUser?.user_metadata?.university_name === 'string'
        ? currentUser.user_metadata.university_name
        : `${profileData.full_name}'s University`;

    // Create a fresh university for this new isolated tenant using the safe RPC function
    const { data: newUniversityId, error: universityCreationError } = await supabase.rpc('get_or_create_university', {
      p_tenant_id: isolatedTenant.id,
      p_name: universityName,
      p_country: currentUser?.user_metadata?.country || 'Unknown',
      p_contact_name: profileData.full_name,
      p_contact_email: profileData.email || currentUser?.email,
    });

    if (universityCreationError) {
      console.error('Failed to create isolated university for partner profile:', universityCreationError);
      // Don't continue without a university - the partner won't have data to manage
      // But still update tenant to prevent shared data access
    } else {
      console.log(`Created new isolated university (ID: ${newUniversityId}) for partner`);
    }

    // Update the profile to use the new isolated tenant
    const { data: updatedProfile, error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ tenant_id: isolatedTenant.id })
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
      newTenantId: isolatedTenant.id,
      newTenantSlug: isolatedTenant.slug,
      universityCreated: !universityCreationError,
    });

    return {
      ...updatedProfile,
      tenant_id: isolatedTenant.id,
    } as Profile;
  };

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
        console.error('Error fetching profile:', error);

        const recoverableCodes = ['PGRST116', 'PGRST301', 'PGRST403', '42501'];
        const shouldAttemptRepair = recoverableCodes.includes(error.code ?? '') || !profile;

        if (shouldAttemptRepair) {
          console.log('Profile not accessible, attempting server-side self-healing...');

          // Try the server-side RPC first (more robust)
          const rpcResult = await ensureUserProfileRPC(userId, profileMetadata);

          if (!rpcResult.success) {
            console.log('Server-side repair failed, trying client-side creation...');
            await createProfileForUser(userId);
          }

          // Retry fetching the profile
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (retryError) {
            console.error('Retry failed after profile repair attempt:', retryError);
            setProfile(null);
          } else {
            // SECURITY CHECK: Verify the returned profile ID matches the requested user ID
            if (retryData && retryData.id !== userId) {
              console.error('CRITICAL SECURITY ERROR: Profile ID mismatch!', {
                requested: userId,
                returned: retryData.id,
              });
              setProfile(null);
              return;
            }
            console.log('Profile successfully repaired/created:', retryData.email);
            setProfile(retryData);
          }
        } else {
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

          const profileWithIsolation = await ensurePartnerTenantIsolation(
            profileWithVerification,
            currentUser,
          );
          finalProfile = profileWithIsolation;
        } catch (postProcessError) {
          // Post-processing failed, but we still have a valid profile
          // Log the error and continue with what we have
          console.error('Error in profile post-processing (using base profile):', postProcessError);
          // Continue with the last successfully processed profile
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
          
          // CRITICAL: If existing university is from a shared tenant or has stale data,
          // we should verify it belongs to this user and reset if needed
          // For now, we log this scenario for debugging purposes
        } else {
          // ============================================================================
          // CREATING A FRESH, EMPTY UNIVERSITY FOR NEW PARTNER
          // ============================================================================
          // This creates a BLANK SLATE with ONLY the information provided during signup:
          // - University name (from signup or generated)
          // - Country (from signup)
          // - Primary contact info (name, email, phone from signup)
          // 
          // All other fields are intentionally left EMPTY so the university can:
          // - Enter their own description
          // - Add their own programs
          // - Upload their own logo and images
          // - Fill in their profile from scratch
          // ============================================================================
          
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

          console.log(`Creating NEW BLANK university "${universityName}" for tenant ${tenant.id}`);

          // Generate initial profile details with ONLY contact info from signup
          // All other fields (tagline, highlights, social, media) are NULL/empty
          const initialProfileDetails = generateInitialUniversityProfileDetails(
            user.user_metadata?.full_name,
            user.email,
            user.user_metadata?.phone,
            user.user_metadata?.country,
          );

          // Create the university with MINIMAL pre-populated data
          // Only signup info is included - everything else is blank
          const { data: newUniversity, error: universityError } = await supabase
            .from('universities')
            .insert({
              // FROM SIGNUP: Basic identity
              name: universityName,
              country,
              tenant_id: tenant.id,
              active: true,
              
              // INTENTIONALLY BLANK: User will fill these in
              city: null,
              website: null,
              logo_url: null,
              featured_image_url: null,
              description: null, // Left blank - user enters their own description
              
              // FROM SIGNUP: Contact info only
              submission_config_json: initialProfileDetails,
            })
            .select('id, name')
            .single();

          if (universityError) {
            console.error('CRITICAL: Error creating isolated university profile:', universityError);
            console.error('University creation details:', {
              tenantId: tenant.id,
              universityName,
              country,
              error: universityError.message,
              code: universityError.code,
            });
          } else {
            console.log(
              `SUCCESS: Created BLANK university "${newUniversity.name}" (ID: ${newUniversity.id}) ` +
              `for tenant ${tenant.id}. User can now fill in their profile from scratch.`
            );
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
          verification_status: 'pending',
          active: true,
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

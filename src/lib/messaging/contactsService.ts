import { supabase } from "@/integrations/supabase/client";

export interface DirectoryProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'student' | 'agent' | 'partner' | 'staff' | 'admin' | 'counselor' | 'verifier' | 'finance' | 'school_rep';
  tenant_id: string;
  headline?: string;
  contact_type?: 'student' | 'agent' | 'staff' | 'university' | 'support';
}

export interface StudentContact {
  student_id: string;
  application_count: number;
  student: {
    profile_id: string;
    profile: DirectoryProfile;
  };
}

export async function fetchMessagingContacts(
  query?: string,
  limit?: number
): Promise<DirectoryProfile[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    // First try using the database function (more accurate and efficient)
    try {
      const { data: contacts, error: rpcError } = await supabase.rpc(
        'get_messaging_contacts' as any,
        {
          p_search: query || null,
          p_limit: limit || 50,
        }
      );

      if (!rpcError && contacts && Array.isArray(contacts)) {
        // Transform RPC result to DirectoryProfile format
        const seenIds = new Set<string>();
        return contacts
          .map((contact: any) => ({
            id: contact.profile_id,
            full_name: contact.full_name,
            email: contact.email,
            avatar_url: contact.avatar_url,
            role: contact.role,
            tenant_id: '', // Not returned by RPC, but not usually needed
            headline: contact.headline || undefined,
          }))
          .filter((profile: DirectoryProfile) => {
            if (seenIds.has(profile.id)) return false;
            seenIds.add(profile.id);
            return true;
          });
      }
    } catch (rpcErr) {
      // RPC failed, fall back to client-side logic
      console.warn('get_messaging_contacts RPC failed, using fallback:', rpcErr);
    }

    // Fallback: client-side logic
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!profileData) return [];

    const results: DirectoryProfile[] = [];
    const seenIds = new Set<string>();

    const addProfile = (profile: DirectoryProfile) => {
      if (!seenIds.has(profile.id) && profile.id !== userData.user.id) {
        seenIds.add(profile.id);
        results.push(profile);
      }
    };

    // Role-specific contact fetching
    if (profileData.role === 'agent') {
      // Agents can message their linked students
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      if (agentData) {
        const { data: links } = await supabase
          .from('agent_student_links')
          .select(`
            student_id,
            students!inner(
              id,
              profile_id,
              profiles!inner(id, full_name, email, avatar_url, role, tenant_id)
            )
          `)
          .eq('agent_id', agentData.id);

        if (links) {
          links.forEach((link: any) => {
            const student = link.students;
            if (student?.profiles) {
              addProfile({
                id: student.profiles.id,
                full_name: student.profiles.full_name,
                email: student.profiles.email,
                avatar_url: student.profiles.avatar_url,
                role: student.profiles.role,
                tenant_id: student.profiles.tenant_id,
              });
            }
          });
        }
      }

      // Agents can also message staff/admin
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, tenant_id')
        .in('role', ['admin', 'staff'])
        .eq('tenant_id', profileData.tenant_id);

      if (staffProfiles) {
        staffProfiles.forEach((p: any) => addProfile(p as DirectoryProfile));
      }
    } else if (profileData.role === 'partner' || profileData.role === 'school_rep') {
      // University users can message agents and students with applications to their programs
      // Get applications to programs at universities in their tenant
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          id,
          student:students!inner(
            profile_id,
            profiles!inner(id, full_name, email, avatar_url, role, tenant_id)
          ),
          agent:agents(
            profile_id,
            profiles!inner(id, full_name, email, avatar_url, role, tenant_id)
          ),
          program:programs!inner(
            university:universities!inner(tenant_id)
          )
        `)
        .eq('program.university.tenant_id', profileData.tenant_id)
        .not('submitted_at', 'is', null);

      if (applications) {
        applications.forEach((app: any) => {
          // Add students
          if (app.student?.profiles) {
            addProfile({
              id: app.student.profiles.id,
              full_name: app.student.profiles.full_name,
              email: app.student.profiles.email,
              avatar_url: app.student.profiles.avatar_url,
              role: app.student.profiles.role,
              tenant_id: app.student.profiles.tenant_id,
            });
          }
          // Add agents
          if (app.agent?.profiles) {
            addProfile({
              id: app.agent.profiles.id,
              full_name: app.agent.profiles.full_name,
              email: app.agent.profiles.email,
              avatar_url: app.agent.profiles.avatar_url,
              role: app.agent.profiles.role,
              tenant_id: app.agent.profiles.tenant_id,
            });
          }
        });
      }

      // University users can also message staff
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, tenant_id')
        .in('role', ['admin', 'staff'])
        .eq('tenant_id', profileData.tenant_id);

      if (staffProfiles) {
        staffProfiles.forEach((p: any) => addProfile(p as DirectoryProfile));
      }
    } else if (profileData.role === 'student') {
      // Students can message their assigned agents
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      if (studentData) {
        const { data: links } = await supabase
          .from('agent_student_links')
          .select(`
            agent:agents!inner(
              profile_id,
              profiles!inner(id, full_name, email, avatar_url, role, tenant_id)
            )
          `)
          .eq('student_id', studentData.id);

        if (links) {
          links.forEach((link: any) => {
            if (link.agent?.profiles) {
              addProfile({
                id: link.agent.profiles.id,
                full_name: link.agent.profiles.full_name,
                email: link.agent.profiles.email,
                avatar_url: link.agent.profiles.avatar_url,
                role: link.agent.profiles.role,
                tenant_id: link.agent.profiles.tenant_id,
              });
            }
          });
        }

        // Students can also message universities they have applied to
        const { data: applications } = await supabase
          .from('applications')
          .select(`
            id,
            program:programs!inner(
              university:universities!inner(
                id,
                name,
                tenant_id
              )
            )
          `)
          .eq('student_id', studentData.id);

        if (applications && applications.length > 0) {
          // Get unique university tenant IDs
          const universityTenantIds = new Set<string>();
          applications.forEach((app: any) => {
            if (app.program?.university?.tenant_id) {
              universityTenantIds.add(app.program.university.tenant_id);
            }
          });

          if (universityTenantIds.size > 0) {
            // Fetch university representatives (partner/school_rep) for these universities
            const { data: universityProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url, role, tenant_id')
              .in('role', ['partner', 'school_rep'])
              .in('tenant_id', Array.from(universityTenantIds));

            if (universityProfiles) {
              universityProfiles.forEach((p: any) => addProfile(p as DirectoryProfile));
            }
          }
        }
      }

      // Students can also message staff/admin
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, tenant_id')
        .in('role', ['admin', 'staff'])
        .eq('tenant_id', profileData.tenant_id);

      if (staffProfiles) {
        staffProfiles.forEach((p: any) => addProfile(p as DirectoryProfile));
      }
    } else {
      // For admin/staff and other roles, return all staff/admin profiles
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, tenant_id')
        .in('role', ['admin', 'staff', 'agent', 'partner'])
        .eq('tenant_id', profileData.tenant_id);

      if (staffProfiles) {
        staffProfiles.forEach((p: any) => addProfile(p as DirectoryProfile));
      }
    }

    // Apply search filter if provided
    let filteredResults = results;
    if (query) {
      const searchLower = query.toLowerCase();
      filteredResults = results.filter((p) =>
        p.full_name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit if provided
    if (limit && filteredResults.length > limit) {
      return filteredResults.slice(0, limit);
    }

    return filteredResults;
  } catch (error) {
    console.error('Error fetching messaging contacts:', error);
    return [];
  }
}

export async function fetchMessagingContactIds(): Promise<string[]> {
  try {
    const contacts = await fetchMessagingContacts();
    return contacts.map((contact) => contact.id);
  } catch (error) {
    console.error("Error fetching messaging contact IDs:", error);
    return [];
  }
}

export interface SupportContact {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  headline?: string;
}

/**
 * Fetches UniDoxia admin/staff contacts that can be messaged for support.
 * This is primarily used by university partners who need to contact UniDoxia for issues.
 * The function returns admin/staff from the platform tenant (Bridge Global / UniDoxia).
 */
export async function fetchSupportContacts(): Promise<SupportContact[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    // Get current user's profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', userData.user.id)
      .single();

    if (!profileData) return [];

    // Try using the RPC function which handles cross-tenant logic
    try {
      const { data: contacts, error: rpcError } = await supabase.rpc(
        'get_messaging_contacts' as any,
        {
          p_search: null,
          p_limit: 50,
        }
      );

      if (!rpcError && contacts && Array.isArray(contacts)) {
        // Filter to only support contacts (admin/staff with contact_type = 'support')
        const supportContacts = contacts
          .filter((contact: any) => contact.contact_type === 'support')
          .map((contact: any) => ({
            profile_id: contact.profile_id,
            full_name: contact.full_name,
            email: contact.email,
            avatar_url: contact.avatar_url,
            role: contact.role,
            headline: contact.headline || 'UniDoxia Support',
          }));

        if (supportContacts.length > 0) {
          return supportContacts;
        }
      }
    } catch (rpcErr) {
      console.warn('get_messaging_contacts RPC failed for support contacts:', rpcErr);
    }

    // Fallback: For university users (partner/school_rep), fetch admin/staff from a different approach
    // This queries profiles with admin/staff roles that are not in the user's tenant
    if (['partner', 'school_rep'].includes(profileData.role)) {
      // Get all admin/staff profiles that might be support contacts
      // We look for profiles with admin/staff roles that have email domains suggesting they're platform staff
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, tenant_id')
        .in('role', ['admin', 'staff', 'counselor'])
        .neq('tenant_id', profileData.tenant_id)
        .limit(20);

      if (staffProfiles && staffProfiles.length > 0) {
        return staffProfiles.map((p: any) => ({
          profile_id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role: p.role,
          headline: 'UniDoxia Support',
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('Error fetching support contacts:', error);
    return [];
  }
}

export interface AppliedUniversityContact {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  university_name: string;
  university_id: string;
  application_id: string;
  application_status: string;
}

/**
 * Fetches university contacts for universities where the current student has applications.
 * Returns contacts grouped with their university and application information.
 */
export interface UniversityApplicantContact {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  application_id: string;
  application_status: string;
  program_name: string;
  submitted_at: string | null;
}

/**
 * Fetches all applicants (students) who have applied to programs at the current university user's institution.
 * This is used by university users (partner/school_rep) to see all their applicants in the messaging dialog.
 */
export async function fetchUniversityApplicants(): Promise<UniversityApplicantContact[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    // Get current user's profile to get their tenant_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', userData.user.id)
      .single();

    if (!profileData || !['partner', 'school_rep'].includes(profileData.role)) {
      return [];
    }

    // Get applications to programs at universities in this tenant
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        submitted_at,
        student:students!inner(
          profile_id,
          profiles!inner(id, full_name, email, avatar_url, role)
        ),
        program:programs!inner(
          name,
          university:universities!inner(tenant_id)
        )
      `)
      .eq('program.university.tenant_id', profileData.tenant_id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });

    if (!applications || applications.length === 0) return [];

    // Map applications to contacts, keeping one entry per student with their most recent application
    const contacts: UniversityApplicantContact[] = [];
    const seenStudentIds = new Set<string>();

    applications.forEach((app: any) => {
      const profileId = app.student?.profiles?.id;
      if (!profileId || seenStudentIds.has(profileId)) return;
      seenStudentIds.add(profileId);

      contacts.push({
        profile_id: profileId,
        full_name: app.student.profiles.full_name,
        email: app.student.profiles.email,
        avatar_url: app.student.profiles.avatar_url,
        role: app.student.profiles.role,
        application_id: app.id,
        application_status: app.status,
        program_name: app.program?.name || 'Unknown Program',
        submitted_at: app.submitted_at,
      });
    });

    return contacts;
  } catch (error) {
    console.error('Error fetching university applicants:', error);
    return [];
  }
}

export async function fetchAppliedUniversityContacts(): Promise<AppliedUniversityContact[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    // Get student record
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', userData.user.id)
      .single();

    if (!studentData) return [];

    // Get applications with university info
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        program:programs!inner(
          university:universities!inner(
            id,
            name,
            tenant_id
          )
        )
      `)
      .eq('student_id', studentData.id);

    if (!applications || applications.length === 0) return [];

    // Build a map of tenant_id -> university info + application info
    const universityMap = new Map<string, { 
      university_id: string; 
      university_name: string; 
      application_id: string;
      application_status: string;
    }>();
    
    applications.forEach((app: any) => {
      if (app.program?.university?.tenant_id) {
        const tenantId = app.program.university.tenant_id;
        // Keep the first/most recent application per university
        if (!universityMap.has(tenantId)) {
          universityMap.set(tenantId, {
            university_id: app.program.university.id,
            university_name: app.program.university.name,
            application_id: app.id,
            application_status: app.status,
          });
        }
      }
    });

    if (universityMap.size === 0) return [];

    // Fetch university representatives
    const { data: universityProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, tenant_id')
      .in('role', ['partner', 'school_rep'])
      .in('tenant_id', Array.from(universityMap.keys()));

    if (!universityProfiles || universityProfiles.length === 0) return [];

    // Map profiles to applied university contacts
    const contacts: AppliedUniversityContact[] = [];
    const seenIds = new Set<string>();

    universityProfiles.forEach((profile: any) => {
      if (seenIds.has(profile.id)) return;
      seenIds.add(profile.id);

      const uniInfo = universityMap.get(profile.tenant_id);
      if (uniInfo) {
        contacts.push({
          profile_id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          role: profile.role,
          university_name: uniInfo.university_name,
          university_id: uniInfo.university_id,
          application_id: uniInfo.application_id,
          application_status: uniInfo.application_status,
        });
      }
    });

    return contacts;
  } catch (error) {
    console.error('Error fetching applied university contacts:', error);
    return [];
  }
}

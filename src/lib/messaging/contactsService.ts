import { supabase } from "@/integrations/supabase/client";

export interface DirectoryProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'student' | 'agent' | 'partner' | 'staff' | 'admin' | 'counselor' | 'verifier' | 'finance' | 'school_rep';
  tenant_id: string;
  headline?: string;
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
        'get_messaging_contacts',
        {
          p_search: query || null,
          p_limit: limit || 50,
        } as any
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
      .single();

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

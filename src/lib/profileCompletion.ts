interface Profile {
  full_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  avatar_url?: string;
  role?: string;
}

interface RoleData {
  type: 'student' | 'agent' | null;
  data?: any;
}

export const calculateProfileCompletion = (
  profile: Profile,
  roleData?: RoleData | null
): number => {
  let totalFields = 0;
  let completedFields = 0;

  // Basic profile fields (40% weight)
  const basicFields = [
    profile.full_name,
    profile.email,
    profile.phone,
    profile.country,
    profile.avatar_url,
  ];

  totalFields += basicFields.length;
  completedFields += basicFields.filter((field) => field && field.trim() !== '').length;

  // Role-specific fields (60% weight)
  if (roleData?.type === 'student' && roleData.data) {
    const studentFields = [
      roleData.data.date_of_birth,
      roleData.data.nationality,
      roleData.data.passport_number,
      roleData.data.address,
      roleData.data.education_history,
    ];

    totalFields += studentFields.length;
    completedFields += studentFields.filter((field) => {
      if (typeof field === 'string') return field.trim() !== '';
      if (typeof field === 'object' && field !== null) {
        return Object.keys(field).length > 0;
      }
      return !!field;
    }).length;
  } else if (roleData?.type === 'agent' && roleData.data) {
    const agentFields = [
      roleData.data.company_name,
      roleData.data.verification_document_url,
      profile.phone,
      profile.country,
    ];

    totalFields += agentFields.length;
    completedFields += agentFields.filter((field) => !!field).length;
  }

  if (totalFields === 0) return 0;

  return Math.round((completedFields / totalFields) * 100);
};

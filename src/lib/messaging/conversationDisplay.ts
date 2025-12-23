import type { Conversation } from '@/hooks/useMessages';

type Metadata = Record<string, unknown> | null | undefined;

const getString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const buildFullName = (first?: unknown, last?: unknown) => {
  const firstName = getString(first);
  const lastName = getString(last);

  if (firstName && lastName) return `${firstName} ${lastName}`;
  return firstName ?? lastName ?? undefined;
};

export const getNameFromMetadata = (metadata: Metadata): string | undefined => {
  if (!metadata || typeof metadata !== 'object') return undefined;

  const possibleKeys = [
    'university_name',
    'universityName',
    'organization_name',
    'organizationName',
    'student_name',
    'studentName',
    'student_full_name',
    'studentFullName',
    'contact_name',
    'contactName',
    'applicant_name',
    'applicantName',
    'full_name',
    'fullName',
    'name',
    'title',
    'display_name',
  ];

  for (const key of possibleKeys) {
    const value = (metadata as Record<string, unknown>)[key];
    const cleaned = getString(value);
    if (cleaned) return cleaned;
  }

  const directNameFromParts = buildFullName(
    (metadata as Record<string, unknown>).first_name,
    (metadata as Record<string, unknown>).last_name,
  );

  if (directNameFromParts) return directNameFromParts;

  const nestedKeys = [
    (metadata as Record<string, unknown>).student,
    (metadata as Record<string, unknown>).applicant,
    (metadata as Record<string, unknown>).contact,
    (metadata as Record<string, unknown>).profile,
    (metadata as Record<string, unknown>).student_profile,
  ];

  for (const nested of nestedKeys) {
    if (nested && typeof nested === 'object') {
      const nestedObj = nested as Record<string, unknown>;
      const nestedName = getString(nestedObj.full_name) || getString(nestedObj.name);
      if (nestedName) return nestedName;

      const nestedFromParts = buildFullName(nestedObj.first_name, nestedObj.last_name);
      if (nestedFromParts) return nestedFromParts;
    }
  }

  const university = (metadata as Record<string, unknown>).university;
  if (university && typeof university === 'object' && 'name' in university) {
    const uniName = getString((university as Record<string, unknown>).name);
    if (uniName) return uniName;
  }

  return undefined;
};

const getContactFromMetadata = (metadata: Metadata): string | undefined => {
  if (!metadata || typeof metadata !== 'object') return undefined;

  const emailKeys = [
    'contact_email',
    'contactEmail',
    'student_email',
    'studentEmail',
    'applicant_email',
    'applicantEmail',
    'email',
  ];

  for (const key of emailKeys) {
    const value = (metadata as Record<string, unknown>)[key];
    const cleaned = getString(value);
    if (cleaned) return cleaned;
  }

  const phoneKeys = [
    'phone',
    'phone_number',
    'phoneNumber',
    'contact_phone',
    'contactPhone',
    'student_phone',
    'studentPhone',
    'applicant_phone',
    'applicantPhone',
  ];

  for (const key of phoneKeys) {
    const value = (metadata as Record<string, unknown>)[key];
    const cleaned = getString(value);
    if (cleaned) return cleaned;
  }

  const nestedKeys = [
    (metadata as Record<string, unknown>).student,
    (metadata as Record<string, unknown>).applicant,
    (metadata as Record<string, unknown>).contact,
    (metadata as Record<string, unknown>).profile,
    (metadata as Record<string, unknown>).student_profile,
  ];

  for (const nested of nestedKeys) {
    if (nested && typeof nested === 'object') {
      const nestedObj = nested as Record<string, unknown>;
      const nestedContact =
        getString(nestedObj.email) ||
        getString(nestedObj.phone) ||
        getString(nestedObj.phone_number) ||
        getString(nestedObj.phoneNumber);

      if (nestedContact) return nestedContact;
    }
  }

  return undefined;
};

const getOtherParticipant = (conversation: Conversation, currentUserId?: string | null) =>
  conversation.participants?.find((p) => p.user_id !== currentUserId);

export const getConversationDisplayName = (
  conversation: Conversation,
  currentUserId?: string | null,
): string => {
  const metadataName = getNameFromMetadata(conversation.metadata);
  const baseName = conversation.title || conversation.name || metadataName;

  if (conversation.is_group) {
    return baseName || 'Group Message';
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId);
  const participantProfile = otherParticipant?.profile;

  if (participantProfile?.full_name) return baseName || participantProfile.full_name;
  if (participantProfile?.email) return baseName || participantProfile.email;
  if (metadataName) return baseName || metadataName;

  return baseName || 'Student Contact';
};

export const getConversationContact = (
  conversation: Conversation,
  currentUserId?: string | null,
): string | undefined => {
  const metadataContact = getContactFromMetadata(conversation.metadata);
  if (metadataContact) return metadataContact;

  const otherParticipant = getOtherParticipant(conversation, currentUserId);
  return otherParticipant?.profile?.email || undefined;
};

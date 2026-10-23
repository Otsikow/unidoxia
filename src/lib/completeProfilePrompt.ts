/**
 * Existing students registered before the CourseFinder fields became
 * mandatory are prompted, never blocked. The prompt can be dismissed for the
 * rest of the browser session and comes back on the next login, except when
 * the student has an application in progress: then it stays up until the
 * profile is complete.
 */

/** Application statuses that count as in progress for the prompt. */
export const IN_PROGRESS_APPLICATION_STATUSES = [
  'draft', 'submitted', 'screening', 'conditional_offer', 'unconditional_offer', 'cas_loa', 'visa',
] as const;

export const canDismissPrompt = (hasApplicationInProgress: boolean) => !hasApplicationInProgress;

export const COMPLETE_PROFILE_PROMPT_KEY = 'unidoxia:complete-profile-prompt-dismissed';

export type CompleteProfilePromptInput = {
  isStudent: boolean;
  isLoading: boolean;
  missingFields: string[];
  dismissed: boolean;
  hasApplicationInProgress?: boolean;
};

export const shouldShowCompleteProfilePrompt = ({
  isStudent,
  isLoading,
  missingFields,
  dismissed,
  hasApplicationInProgress = false,
}: CompleteProfilePromptInput) =>
  isStudent && !isLoading && (hasApplicationInProgress || !dismissed) && missingFields.length > 0;

/** A short, readable summary such as "emergency contact email, marital status and 3 more". */
export const summariseMissingFields = (missingFields: string[], max = 3) => {
  const unique = Array.from(new Set(missingFields));
  if (unique.length === 0) return '';
  if (unique.length <= max) {
    return unique.length === 1 ? unique[0] : `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
  }
  const rest = unique.length - max;
  return `${unique.slice(0, max).join(', ')} and ${rest} more`;
};

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>;

const sessionStore = (): SessionStore | null => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export const isPromptDismissed = (userId: string | undefined, store: SessionStore | null = sessionStore()) => {
  if (!userId || !store) return false;
  try {
    return store.getItem(`${COMPLETE_PROFILE_PROMPT_KEY}:${userId}`) === '1';
  } catch {
    return false;
  }
};

export const dismissPrompt = (userId: string | undefined, store: SessionStore | null = sessionStore()) => {
  if (!userId || !store) return;
  try {
    store.setItem(`${COMPLETE_PROFILE_PROMPT_KEY}:${userId}`, '1');
  } catch {
    // Storage can be unavailable in private browsing. The prompt simply shows again.
  }
};

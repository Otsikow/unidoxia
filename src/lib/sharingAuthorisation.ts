import { supabase } from '@/integrations/supabase/client';

/**
 * Wording approved by Kojo on 23 October 2026. If any of this text changes,
 * bump the version here and in record_sharing_authorisation() in the
 * CourseFinder migration, so each saved authorisation points at the words the
 * student saw.
 */
export const SHARING_AUTHORISATION_VERSION = 'kc-share-v1-2026-10-23';

export const SHARING_AUTHORISATION_HEADING = 'Sharing your application with our partner';

export const SHARING_AUTHORISATION_TEXT =
  'To apply to universities for you, UniDoxia (Global Talent Gateway Ltd) shares your application details with the universities you choose and with our application partner KC Overseas Education Private Limited in India, which runs the CourseFinder portal. KC Overseas uses your details as a separate controller to process your applications. The UK does not treat India as having equivalent data protection laws, so your details may have less legal protection there.';

/** The checkbox label, split so the words 'Privacy Notice' can be a link. */
export const SHARING_AUTHORISATION_CHECKBOX_BEFORE_LINK =
  'I authorise UniDoxia to share my application details with KC Overseas Education (India) and the universities I apply to, so they can process my applications. I have read the ';
export const SHARING_AUTHORISATION_CHECKBOX_LINK_TEXT = 'Privacy Notice';
export const SHARING_AUTHORISATION_CHECKBOX_AFTER_LINK = '.';

export const SHARING_AUTHORISATION_SMALL_PRINT =
  'You can withdraw this at any time by emailing info@unidoxia.com. Applications already sent cannot be recalled, and we may not be able to continue them.';

/** The message staff and agents see: only whether it has been given. */
export const sharingAuthorisationStatusText = (given: boolean) =>
  given
    ? 'The student has given their sharing authorisation.'
    : 'The student has not given their sharing authorisation yet. Only the student can give it, in their own UniDoxia account.';

/**
 * Saves the signed-in student's own authorisation. The server records the
 * time, the wording version and the student's account ID, and refuses anyone
 * who is not the student.
 */
export const recordSharingAuthorisation = async () => {
  const { data, error } = await supabase.rpc('record_sharing_authorisation', {
    p_wording_version: SHARING_AUTHORISATION_VERSION,
  });
  if (error) throw error;
  return data as string;
};

/** Whether the signed-in student has a current (not withdrawn) authorisation. */
export const fetchOwnSharingAuthorisation = async (profileId: string) => {
  const { data, error } = await supabase
    .from('application_sharing_authorisations')
    .select('id')
    .eq('authorised_by', profileId)
    .is('withdrawn_at', null)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
};

/** The student prompt shows while they have a live application and no current authorisation. */
export const shouldShowSharingAuthorisationPrompt = ({
  isStudent,
  isLoading,
  hasLiveApplication,
  authorised,
}: {
  isStudent: boolean;
  isLoading: boolean;
  hasLiveApplication: boolean;
  authorised: boolean;
}) => isStudent && !isLoading && hasLiveApplication && !authorised;

/** Applications in these statuses no longer need the prompt. Drafts get the box at submit. */
export const SHARING_PROMPT_IGNORED_STATUSES = ['draft', 'withdrawn', 'rejected'] as const;

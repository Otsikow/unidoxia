import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PRIVACY_NOTICE_PATH } from '@/lib/studentRegistrationSchema';
import {
  SHARING_AUTHORISATION_CHECKBOX_AFTER_LINK,
  SHARING_AUTHORISATION_CHECKBOX_BEFORE_LINK,
  SHARING_AUTHORISATION_CHECKBOX_LINK_TEXT,
  SHARING_AUTHORISATION_HEADING,
  SHARING_AUTHORISATION_SMALL_PRINT,
  SHARING_AUTHORISATION_TEXT,
} from '@/lib/sharingAuthorisation';

interface Props {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * The sharing authorisation: its own checkbox, never pre-ticked and separate
 * from the terms and conditions.
 */
export function SharingAuthorisationConsent({ id, checked, onCheckedChange, disabled }: Props) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h3 id={`${id}-heading`} className="text-base font-semibold">
        {SHARING_AUTHORISATION_HEADING}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{SHARING_AUTHORISATION_TEXT}</p>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <Label htmlFor={id} className="text-sm font-medium leading-relaxed cursor-pointer">
          {SHARING_AUTHORISATION_CHECKBOX_BEFORE_LINK}
          <Link to={PRIVACY_NOTICE_PATH} target="_blank" rel="noreferrer" className="underline text-primary">
            {SHARING_AUTHORISATION_CHECKBOX_LINK_TEXT}
          </Link>
          {SHARING_AUTHORISATION_CHECKBOX_AFTER_LINK}
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">{SHARING_AUTHORISATION_SMALL_PRINT}</p>
    </section>
  );
}

export default SharingAuthorisationConsent;

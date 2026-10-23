import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OVERRIDE_REASON_MIN_LENGTH, isValidOverrideReason, profileGateMessage } from '@/lib/coursefinderProfile';
import { sharingAuthorisationStatusText } from '@/lib/sharingAuthorisation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Missing profile items still blocking (0 when complete or overridden). */
  missingCount: number;
  /** Whether the student has given their sharing authorisation. */
  sharingAuthorised: boolean;
  /** Where staff can open the student's profile, or null when there is no page for this role. */
  profileHref: string | null;
  /** Admins can override the profile check (never the authorisation) with a logged reason. */
  canOverride: boolean;
  onOverride?: (reason: string) => Promise<void>;
}

/** Shown when an application cannot move on: profile not complete, or no sharing authorisation. */
export function ProfileGateDialog({ open, onOpenChange, missingCount, sharingAuthorised, profileHref, canOverride, onOverride }: Props) {
  const showOverride = canOverride && Boolean(onOverride) && missingCount > 0;
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{missingCount > 0 ? 'Profile not complete for CourseFinder' : 'Sharing authorisation needed'}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              {missingCount > 0 && (
                <p>
                  {profileGateMessage(missingCount)}{' '}
                  {profileHref ? (
                    <Link to={profileHref} className="font-medium underline">Open profile</Link>
                  ) : (
                    'Please contact UniDoxia to complete it.'
                  )}
                </p>
              )}
              <p>{sharingAuthorisationStatusText(sharingAuthorised)}</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {showOverride && (
          <div className="space-y-2">
            <Label htmlFor="profile-gate-override-reason">Override reason (admins only, logged)</Label>
            <Textarea
              id="profile-gate-override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why this application should move on now"
            />
            <p className="text-xs text-muted-foreground">At least {OVERRIDE_REASON_MIN_LENGTH} characters.</p>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {showOverride && onOverride && (
            <Button
              type="button"
              variant="destructive"
              disabled={!isValidOverrideReason(reason) || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onOverride(reason);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Override and move on
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileGateDialog;

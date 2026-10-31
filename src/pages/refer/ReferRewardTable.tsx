import { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REFERRAL_REWARD_BANDS } from "@/config/referralFigures";

/**
 * The v2.2 £ reward table for the blocked '£500' mode. Build time only: Refer.tsx renders it behind
 * REFERRAL_FIGURES_IN_BUILD, so a default no-figure build drops this file and its £ bands (Akosua QC N6).
 */
export const ReferRewardTable = ({ reviewNote }: { reviewNote?: ReactNode }) => (
  <div id="reward-table" data-testid="reward-table">
    <h2 className="mb-3 text-2xl font-semibold">Reward table</h2>
    {reviewNote && <p className="mb-3 text-sm">{reviewNote}</p>}
    <p className="mb-4 text-muted-foreground">
      Your reward is 25% of the net commission UniDoxia actually receives for your friend's enrolment,
      rounded to these bands and capped at £500.
    </p>
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commission UniDoxia receives for the student</TableHead>
            <TableHead className="text-right">Your reward</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {REFERRAL_REWARD_BANDS.map((band) => (
            <TableRow key={band.commission}>
              <TableCell>{band.commission}</TableCell>
              <TableCell className="text-right font-semibold">{band.reward}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">
      Based on what we receive; confirmed in writing before your friend applies. Some courses earn no reward.
    </p>
  </div>
);

import { useMemo, useState } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { useAgentInviteCode } from "@/hooks/useAgentInviteCode";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateAgentInviteLink } from "@/lib/referrals";

interface AgentInviteCodeManagerProps {
  agentProfileId: string;
}

export default function AgentInviteCodeManager({
  agentProfileId,
}: AgentInviteCodeManagerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const {
    data: inviteCode,
    isLoading,
    isError,
    regenerate,
    isRegenerating,
  } = useAgentInviteCode(agentProfileId);

  const inviteLink = useMemo(
    () => generateAgentInviteLink(inviteCode),
    [inviteCode],
  );

  const handleCopy = (value?: string | null) => {
    if (!value) return;

    navigator.clipboard.writeText(value);
    setCopied(value);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied((current) => (current === value ? null : current)), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Invite Code</CardTitle>
        <CardDescription>
          Share this code or invite link with students to connect them directly to your team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Could not load invite code.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <Label htmlFor="invite-code" className="sr-only">
                  Invite Code
                </Label>
                <Input id="invite-code" value={inviteCode} readOnly className="w-full" />
              </div>
              <div className="flex items-center gap-2 sm:self-stretch">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(inviteCode)}
                  className="shrink-0"
                >
                  {copied === inviteCode ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => regenerate()}
                  disabled={isRegenerating}
                  className="shrink-0"
                  title="Regenerate invite code"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <Label htmlFor="invite-link" className="sr-only">
                  Invite link
                </Label>
                <Input
                  id="invite-link"
                  value={inviteLink}
                  readOnly
                  className="w-full"
                  placeholder="Invite link will appear once a code is available"
                />
              </div>
              <div className="flex items-center gap-2 sm:self-stretch">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(inviteLink)}
                  disabled={!inviteLink}
                  className="shrink-0"
                >
                  {copied === inviteLink ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Students signing up with this link will be automatically attributed to your team.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

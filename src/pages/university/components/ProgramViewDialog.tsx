import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

const formatCurrency = (currency: string | null, amount: number | null) => {
  if (amount === null || amount === undefined) return "—";

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "—";

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  });

  try {
    return formatter.format(numeric);
  } catch {
    return `${currency ?? "USD"} ${numeric}`;
  }
};

interface ProgramViewDialogProps {
  program: any | null;
  open: boolean;
  onClose: () => void;
}

export default function ProgramViewDialog({
  program,
  open,
  onClose,
}: ProgramViewDialogProps) {
  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden border border-border bg-background text-card-foreground sm:max-w-2xl">
        {/* HEADER */}
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl text-foreground">
            {program.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {program.discipline ?? "Discipline not specified"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            {/* IMAGE */}
            {program.image_url && (
              <div className="overflow-hidden rounded-lg border border-border bg-muted/60 shadow-sm">
                <AspectRatio ratio={16 / 9}>
                  <img
                    src={program.image_url}
                    alt={program.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </AspectRatio>
              </div>
            )}

            {/* DETAILS GRID */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Level</span>
                <p className="font-medium">{program.level}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Duration</span>
                <p className="font-medium">{program.duration_months} months</p>
              </div>

              <div>
                <span className="text-muted-foreground">Tuition</span>
                <p className="font-medium">
                  {formatCurrency(program.tuition_currency, program.tuition_amount)}
                </p>
              </div>

              {program.app_fee !== null && program.app_fee !== undefined && (
                <div>
                  <span className="text-muted-foreground">Application Fee</span>
                  <p className="font-medium">
                    {formatCurrency(program.tuition_currency, program.app_fee)}
                  </p>
                </div>
              )}

              {program.seats_available !== null && (
                <div>
                  <span className="text-muted-foreground">Seats</span>
                  <p className="font-medium">{program.seats_available}</p>
                </div>
              )}

              {program.ielts_overall !== null && (
                <div>
                  <span className="text-muted-foreground">IELTS</span>
                  <p className="font-medium">{program.ielts_overall}</p>
                </div>
              )}

              {program.toefl_overall !== null && (
                <div>
                  <span className="text-muted-foreground">TOEFL</span>
                  <p className="font-medium">{program.toefl_overall}</p>
                </div>
              )}
            </div>

            {/* INTAKES */}
            {(program.intake_months ?? []).length > 0 && (
              <div>
                <span className="text-muted-foreground">Intake Months</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {program.intake_months.map((m: number) => (
                    <Badge key={m} variant="secondary">
                      {monthFormatter.format(new Date(2000, m - 1, 1))}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* ENTRY REQUIREMENTS */}
            {program.entry_requirements && (
              <div>
                <span className="text-muted-foreground">Entry Requirements</span>
                <p className="whitespace-pre-wrap">{program.entry_requirements}</p>
              </div>
            )}

            {/* DESCRIPTION */}
            {program.description && (
              <div>
                <span className="text-muted-foreground">Description</span>
                <p className="whitespace-pre-wrap">{program.description}</p>
              </div>
            )}

            {/* STATUS */}
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-1">
                <Badge variant={program.active ? "default" : "secondary"}>
                  {program.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { favourableFinancialFields, isPubliclyCurrent, type ComparisonOption } from "@/lib/universityComparison";

interface ProgramComparisonProps {
  options: ComparisonOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (programId: string) => void;
}

const money = (value?: number | null, currency = "GBP") => value == null
  ? "Check official source"
  : new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

const date = (value?: string | null) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
  : "Not verified";

export function ProgramComparison({ options, open, onOpenChange, onRemove }: ProgramComparisonProps) {
  const favourable = favourableFinancialFields(options);
  const rows: Array<{ label: string; render: (option: ComparisonOption) => React.ReactNode }> = [
    { label: "Location", render: (o) => [o.city, o.country].filter(Boolean).join(", ") },
    { label: "Study level", render: (o) => o.level },
    { label: "International tuition", render: (o) => <Value favourable={o.tuitionAmount != null && o.tuitionAmount === favourable.tuitionAmount}>{money(o.tuitionAmount, o.currency ?? "GBP")}</Value> },
    { label: "Initial deposit", render: (o) => <Value favourable={o.initialDeposit != null && o.initialDeposit === favourable.initialDeposit}>{money(o.initialDeposit, o.currency ?? "GBP")}</Value> },
    { label: "Application fee", render: (o) => <Value favourable={o.applicationFee != null && o.applicationFee === favourable.applicationFee}>{o.applicationFeeWaived ? "Waived" : money(o.applicationFee, o.currency ?? "GBP")}</Value> },
    { label: "Scholarship", render: (o) => o.scholarshipAvailable ? `Up to ${money(o.scholarshipMaximum, o.currency ?? "GBP")}` : "None verified" },
    { label: "Estimated first-year commitment", render: (o) => <Value favourable={o.estimatedFirstYearCost != null && o.estimatedFirstYearCost === favourable.estimatedFirstYearCost}>{money(o.estimatedFirstYearCost, o.currency ?? "GBP")}</Value> },
    { label: "English requirements", render: (o) => o.englishSummary ?? (o.noIeltsPathway ? "Alternative evidence may be accepted" : "Check official requirements") },
    { label: "Academic requirements", render: (o) => o.academicSummary ?? "Check official requirements" },
    { label: "Next intake", render: (o) => o.nextIntake ? date(o.nextIntake) : "Not verified" },
    { label: "Application deadline", render: (o) => date(o.applicationDeadline) },
    { label: "Data status", render: (o) => isPubliclyCurrent(o) ? <Badge className="bg-emerald-600">Verified</Badge> : <Badge variant="outline" className="border-amber-300 text-amber-800">{(o.verificationStatus ?? "unverified").replace("_", " ")}</Badge> },
    { label: "Last verified", render: (o) => date(o.lastVerifiedAt) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(98vw,1400px)] max-w-7xl p-0">
        <DialogHeader className="border-b p-6 pr-12">
          <DialogTitle>Compare programmes</DialogTitle>
          <DialogDescription>Compare verified costs and requirements. Unknown or stale values are never treated as zero.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[78vh] overflow-auto overscroll-contain touch-pan-x touch-pan-y">
          <div className="min-w-[760px] p-6">
            <div className="grid" style={{ gridTemplateColumns: `minmax(170px,.8fr) repeat(${options.length}, minmax(220px,1fr))` }}>
              <div className="border-b p-3 text-sm font-semibold text-muted-foreground">Criteria</div>
              {options.map((option) => (
                <div key={option.programId} className="relative border-b border-l p-3">
                  <button aria-label={`Remove ${option.programName}`} className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted" onClick={() => onRemove(option.programId)}><X className="h-4 w-4" /></button>
                  <p className="pr-7 font-semibold">{option.universityName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.programName}</p>
                </div>
              ))}
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-b bg-muted/40 p-3 text-sm font-medium">{row.label}</div>
                  {options.map((option) => <div key={`${row.label}-${option.programId}`} className="border-b border-l p-3 text-sm">{row.render(option)}</div>)}
                </div>
              ))}
              <div className="p-3" />
              {options.map((option) => (
                <div key={`actions-${option.programId}`} className="space-y-2 border-l p-3">
                  <Button asChild className="w-full"><Link to={`/student/applications/new?program=${option.programId}&source=comparison`}>Apply with UniDoxia</Link></Button>
                  <Button asChild variant="outline" className="w-full"><Link to={`/contact?program=${option.programId}&source=comparison`}>Check My Eligibility</Link></Button>
                  {option.sourceUrl && <Button asChild variant="ghost" size="sm" className="w-full"><a href={option.sourceUrl} target="_blank" rel="noreferrer">Official source <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>Fees, deposits, scholarships and entry rules can change. Confirm important details from the linked official source before applying or paying.</p></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Value({ favourable, children }: { favourable: boolean; children: React.ReactNode }) {
  return <span className={favourable ? "inline-flex items-center gap-1 font-semibold text-emerald-700" : undefined}>{favourable && <CheckCircle2 className="h-4 w-4" />}{children}</span>;
}

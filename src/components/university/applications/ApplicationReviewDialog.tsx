import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ======================================================
   Types (re-exported for hooks)
====================================================== */

export interface ApplicationDocument {
  id: string;
  documentType: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  verified: boolean;
  verificationNotes: string | null;
  uploadedAt: string;
  publicUrl: string | null;
}

export interface EducationRecord {
  id: string;
  level: string;
  institutionName: string;
  country: string;
  startDate: string;
  endDate: string;
  gpa: string;
  gradeScale: string;
  transcriptUrl: string | null;
  certificateUrl: string | null;
}

export interface TestScore {
  testType: string;
  totalScore: number;
  testDate: string;
  subscores?: Record<string, number>;
  reportUrl: string | null;
}

export interface StudentDetails {
  id: string;
  profileId: string;
  legalName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  currentCountry: string | null;
  address: unknown;
  guardian: unknown;
  finances: unknown;
  visaHistory: unknown[] | null;
  avatarUrl: string | null;
  educationHistory: EducationRecord[] | null;
  testScores: TestScore[] | null;
}

export interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  actor?: string;
  details?: string;
}

export interface ExtendedApplication {
  id: string;
  appNumber: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  updatedAt: string | null;
  programId?: string;
  programName: string;
  programLevel: string;
  programDiscipline: string | null;
  intakeMonth: number;
  intakeYear: number;
  studentId: string;
  studentName: string;
  studentNationality: string | null;
  agentId?: string | null;
  notes: string | null;
  internalNotes: string | null;
  timelineJson: TimelineEvent[] | null;
  student: StudentDetails | null;
  documents: ApplicationDocument[];
}

interface Props {
  application: ExtendedApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universityId?: string;
  tenantId?: string;
  isLoading?: boolean;
  onStatusUpdate?: (id: string, status: string) => void;
  onNotesUpdate?: (id: string, notes: string) => void;
}

/* ======================================================
   Constants
====================================================== */

const APPLICATION_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "screening", label: "Under Review" },
  { value: "conditional_offer", label: "Conditional Offer" },
  { value: "unconditional_offer", label: "Unconditional Offer" },
  { value: "cas_loa", label: "CAS / LOA Issued" },
  { value: "visa", label: "Visa Stage" },
  { value: "enrolled", label: "Enrolled" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

/* ======================================================
   Helpers
====================================================== */

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

/* ======================================================
   Component
====================================================== */

export function ApplicationReviewDialog(props: Props) {
  const { application, open, onOpenChange, isLoading = false, onStatusUpdate, onNotesUpdate } =
    props;

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "notes">("overview");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (application) {
      setInternalNotes(application.internalNotes ?? "");
      setSelectedStatus(application.status ?? null);
      setActiveTab("overview");
    }
  }, [application]);

  const statusLabel = useMemo(() => {
    if (!selectedStatus) return "Select status";
    return APPLICATION_STATUSES.find((s) => s.value === selectedStatus)?.label ?? selectedStatus;
  }, [selectedStatus]);

  const saveNotes = useCallback(async () => {
    if (!application) return;

    setSavingNotes(true);
    const { error } = await supabase
      .from("applications")
      .update({ internal_notes: internalNotes })
      .eq("id", application.id);
    setSavingNotes(false);

    if (error) {
      toast({
        title: "Failed",
        description: "Could not save notes",
        variant: "destructive",
      });
      return;
    }

    onNotesUpdate?.(application.id, internalNotes);
    toast({ title: "Saved", description: "Internal notes updated" });
  }, [application, internalNotes, onNotesUpdate, toast]);

  const confirmStatusChange = useCallback(async () => {
    if (!application || !selectedStatus) return;
    if (selectedStatus === application.status) {
      setConfirmStatus(false);
      return;
    }

    setUpdatingStatus(true);

    const newEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      action: `Status changed to ${selectedStatus}`,
      timestamp: new Date().toISOString(),
      actor: "University",
    };

    const { error } = await supabase
      .from("applications")
      .update({
        status: selectedStatus,
        timeline_json: [...(application.timelineJson ?? []), newEvent],
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    setUpdatingStatus(false);
    setConfirmStatus(false);

    if (error) {
      toast({
        title: "Failed",
        description: "Status update failed",
        variant: "destructive",
      });
      return;
    }

    onStatusUpdate?.(application.id, selectedStatus);
    toast({ title: "Updated", description: "Application status updated" });
  }, [application, onStatusUpdate, selectedStatus, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Application review</span>
            {application ? (
              <StatusBadge status={application.status} />
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No selection"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {application ? (
              <>
                {application.appNumber} · {application.programName}
              </>
            ) : isLoading ? (
              "Fetching application details…"
            ) : (
              "Select an application to review."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !application ? (
          <div className="py-6 text-sm text-muted-foreground">Nothing to show.</div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium text-foreground">{application.studentName}</p>
                  <p className="text-muted-foreground">{application.studentNationality ?? "—"}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground">Course</p>
                  <p className="font-medium text-foreground">{application.programName}</p>
                  <p className="text-muted-foreground">{application.programLevel}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium text-foreground">{formatDate(application.submittedAt)}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="font-medium text-foreground">{formatDate(application.updatedAt)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs text-muted-foreground">Status</p>
                  <Select
                    value={selectedStatus ?? application.status}
                    onValueChange={(v) => setSelectedStatus(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setConfirmStatus(true)}
                    disabled={!selectedStatus || selectedStatus === application.status}
                  >
                    Update status
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {application.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ScrollArea className="h-72 rounded-md border border-border">
                  <div className="divide-y divide-border">
                    {application.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType} · {formatFileSize(doc.fileSize)}
                            {doc.verified ? " · Verified" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.publicUrl ? (
                            <Button asChild variant="outline" size="sm">
                              <a href={doc.publicUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              No link
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Internal notes</p>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add private notes for your team…"
                  className="min-h-32"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setInternalNotes(application.internalNotes ?? "")}
                  disabled={savingNotes}
                >
                  Reset
                </Button>
                <Button onClick={() => void saveNotes()} disabled={savingNotes}>
                  {savingNotes ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save notes"
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {application ? (
            <p className="text-xs text-muted-foreground">Status: {application.status}</p>
          ) : (
            <span />
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>

        <AlertDialog open={confirmStatus} onOpenChange={setConfirmStatus}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm status update</AlertDialogTitle>
              <AlertDialogDescription>
                Change status to <strong>{statusLabel}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updatingStatus}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void confirmStatusChange()}
                disabled={updatingStatus}
              >
                {updatingStatus ? "Updating…" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export default ApplicationReviewDialog;

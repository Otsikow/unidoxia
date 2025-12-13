import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  User,
  Globe,
  CreditCard,
} from "lucide-react";

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
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"overview" | "student" | "documents" | "notes">("overview");
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

  // Use the local selectedStatus for display to reflect immediate updates
  const displayStatus = selectedStatus ?? application?.status ?? "unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Application review</span>
            {application ? (
              <StatusBadge status={displayStatus} />
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/university/messages?applicationId=${application.id}`);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Message Student
                </Button>
              </div>

              <Separator />

              {/* Student & Course Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Student
                  </p>
                  <p className="font-medium text-foreground">{application.studentName}</p>
                  <p className="text-muted-foreground">{application.studentNationality ?? "—"}</p>
                  {application.student?.email && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${application.student.email}`} className="hover:underline">
                        {application.student.email}
                      </a>
                    </p>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> Course
                  </p>
                  <p className="font-medium text-foreground">{application.programName}</p>
                  <p className="text-muted-foreground">{application.programLevel}</p>
                  {application.intakeMonth && application.intakeYear && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Intake: {new Date(application.intakeYear, application.intakeMonth - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Submitted
                  </p>
                  <p className="font-medium text-foreground">{formatDate(application.submittedAt)}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Last updated
                  </p>
                  <p className="font-medium text-foreground">{formatDate(application.updatedAt)}</p>
                </div>
              </div>

              <Separator />

              {/* Status Update */}
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
                    disabled={!selectedStatus || selectedStatus === application.status || updatingStatus}
                  >
                    {updatingStatus ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      "Update status"
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Student Details Tab */}
            <TabsContent value="student" className="mt-4">
              <ScrollArea className="h-80">
                {application.student ? (
                  <div className="space-y-6 pr-4">
                    {/* Personal Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Personal Information
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Legal Name</p>
                          <p className="text-sm font-medium">{application.student.legalName}</p>
                        </div>
                        {application.student.preferredName && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Preferred Name</p>
                            <p className="text-sm font-medium">{application.student.preferredName}</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Nationality</p>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {application.student.nationality ?? "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Date of Birth</p>
                          <p className="text-sm font-medium">
                            {application.student.dateOfBirth ? formatDate(application.student.dateOfBirth) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Contact Information
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium">
                            {application.student.email ? (
                              <a href={`mailto:${application.student.email}`} className="text-primary hover:underline flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {application.student.email}
                              </a>
                            ) : "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {application.student.phone ?? "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Current Country</p>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {application.student.currentCountry ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Passport Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Passport Information
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Passport Number</p>
                          <p className="text-sm font-medium font-mono">
                            {application.student.passportNumber ?? "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Passport Expiry</p>
                          <p className="text-sm font-medium">
                            {application.student.passportExpiry ? formatDate(application.student.passportExpiry) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Education History */}
                    {application.student.educationHistory && application.student.educationHistory.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Education History
                          </h4>
                          <div className="space-y-3">
                            {application.student.educationHistory.map((edu) => (
                              <div key={edu.id} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{edu.institutionName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {edu.level} • {edu.country}
                                    </p>
                                  </div>
                                  {edu.gpa && (
                                    <Badge variant="secondary" className="text-xs">
                                      GPA: {edu.gpa}/{edu.gradeScale}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(edu.startDate)} — {formatDate(edu.endDate)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Test Scores */}
                    {application.student.testScores && application.student.testScores.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Test Scores
                          </h4>
                          <div className="space-y-2">
                            {application.student.testScores.map((test, idx) => (
                              <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                  <p className="text-sm font-medium">{test.testType}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(test.testDate)}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-sm font-semibold">
                                  {test.totalScore}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <User className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Student details not available.</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              {application.documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                </div>
              ) : (
                <ScrollArea className="h-72 rounded-md border border-border">
                  <div className="divide-y divide-border">
                    {application.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {doc.fileName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="capitalize">{doc.documentType.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                              {doc.verified && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verified
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.publicUrl ? (
                            <Button asChild variant="outline" size="sm" className="gap-1">
                              <a href={doc.publicUrl} target="_blank" rel="noreferrer">
                                <Download className="h-3 w-3" />
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

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Internal notes (visible only to your team)</p>
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

        <DialogFooter className="gap-2 sm:justify-between mt-auto pt-4 border-t">
          {application ? (
            <div className="flex items-center gap-2">
              <StatusBadge status={displayStatus} />
              <span className="text-xs text-muted-foreground">
                {application.appNumber}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {application && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/university/messages?applicationId=${application.id}`);
                }}
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
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

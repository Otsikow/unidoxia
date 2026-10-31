import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  MessageCircle,
  ExternalLink,
  Copy,
  FileText,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { StudentInternalConversation } from "./StudentInternalConversation";
import {
  COMMUNICATION_TEMPLATES,
  COMMUNICATION_STATUS_LABELS,
  STUDENT_EMAIL_SIGNATURE,
  communicationTemplate,
  registeredWhatsApp,
  whatsAppLink,
  studentName,
  type ContactStudent,
  type ContactApplication,
  type CommunicationRecord,
} from "@/lib/studentCommunication";
export interface CommunicationStudent extends ContactStudent {
  profile_id: string | null;
  reference_code: string | null;
  current_country: string | null;
  applications: ContactApplication[];
}
export interface CommunicationCapabilities {
  emailEnabled: boolean;
  historyEnabled: boolean;
  from: string;
  whatsappMode: string;
  emailReplies: string;
}
async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(
    "student-communication",
    { body },
  );
  if (error) {
    let message =
      "The communication service is unavailable. Your draft has been kept.";
    try {
      const result = await error.context?.json();
      if (result?.error) message = result.error;
    } catch {
      /* Keep safe fallback. */
    }
    throw new Error(message);
  }
  return data;
}
export function CommunicationWorkspace({
  student,
  capabilities,
  initialChannel = "email",
  active = true,
  onDirtyChange,
}: {
  student: CommunicationStudent;
  capabilities: CommunicationCapabilities | null;
  initialChannel?: string;
  active?: boolean;
  onDirtyChange: (value: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const [channel, setChannel] = useState(
    ["email", "whatsapp", "internal", "history"].includes(initialChannel)
      ? initialChannel
      : "email",
  );
  const [applicationId, setApplicationId] = useState("");
  const app = student.applications.find((a) => a.id === applicationId);
  const [template, setTemplate] =
    useState<keyof typeof COMMUNICATION_TEMPLATES>("update");
  const [draft, setDraft] = useState(() =>
    communicationTemplate("update", student),
  );
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const id = useRef<string>(crypto.randomUUID());
  const noteId = useRef<string>(crypto.randomUUID());
  useEffect(() => {
    onDirtyChange(edited || Boolean(note) || (attempted && !accepted));
  }, [edited, note, attempted, accepted, onDirtyChange]);
  const history = useQuery({
    queryKey: [
      "student-communications",
      user?.id,
      profile?.tenant_id,
      student.id,
      historyPage,
    ],
    enabled: Boolean(capabilities?.historyEnabled && active),
    queryFn: () =>
      invoke({
        action: "history",
        studentId: student.id,
        offset: historyPage * 25,
      }) as Promise<{ rows: CommunicationRecord[]; total: number }>,
  });
  const change = (action: () => void) => {
    if (edited || (attempted && !accepted)) setPendingAction(() => action);
    else action();
  };
  const useTemplate = () =>
    change(() => {
      setDraft(communicationTemplate(template, student, app));
      setEdited(false);
      setAttempted(false);
      setAccepted(false);
      id.current = crypto.randomUUID();
      setError("");
      setMessage("");
    });
  const whatsapp = whatsAppLink(student, draft.body + "\n\nUniDoxia Team");
  const phone = registeredWhatsApp(student);
  const email = student.contact_email?.trim() || "";
  const emailApp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body + "\n\n" + STUDENT_EMAIL_SIGNATURE)}`
    : null;
  const send = async () => {
    if (busy || accepted) return;
    setBusy(true);
    setError("");
    setMessage("");
    setAttempted(true);
    try {
      const result = await invoke({
        action: "send_email",
        id: id.current,
        studentId: student.id,
        applicationId: applicationId || null,
        subject: draft.subject,
        body: draft.body,
        expectedEmail: email,
      });
      if (result.status === "accepted") {
        setAccepted(true);
        setEdited(false);
        setMessage(
          "Accepted by the email provider. Delivery and replies are not confirmed here.",
        );
      } else
        setMessage(
          result.message ||
            "The send result is pending. Keep this draft and retry the same message.",
        );
      await history.refetch();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Email could not be confirmed. Keep this draft and retry the same message.",
      );
      await history.refetch();
    } finally {
      setBusy(false);
    }
  };
  const recordNote = async () => {
    if (busy || !note.trim()) return;
    setBusy(true);
    setError("");
    try {
      await invoke({
        action: "record_note",
        id: noteId.current,
        studentId: student.id,
        applicationId: applicationId || null,
        body: note.trim(),
      });
      noteId.current = crypto.randomUUID();
      setNote("");
      setMessage("Manual note saved.");
      await history.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note could not be saved.");
    } finally {
      setBusy(false);
    }
  };
  const logWhatsApp = () => {
    if (!capabilities?.historyEnabled) return;
    void invoke({
      action: "record_whatsapp_launch",
      id: crypto.randomUUID(),
      studentId: student.id,
      applicationId: applicationId || null,
      body: draft.body,
    })
      .then(() => history.refetch())
      .catch(() =>
        setError(
          "WhatsApp was launched, but the launch could not be recorded. Sending is completed outside UniDoxia.",
        ),
      );
  };
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="shrink-0 space-y-3 border-b p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">
              {studentName(student)}
            </h2>
            <p className="break-words text-xs text-muted-foreground">
              {student.reference_code || "Student reference unavailable"} ·{" "}
              {student.current_country || "Country not recorded"}
            </p>
          </div>
          <Link
            className="text-sm font-medium text-primary underline underline-offset-4"
            to={`/admin/students/${student.id}`}
          >
            Student profile
          </Link>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="break-all">
            <Mail className="mr-1 inline h-4 w-4" />
            {email || "Email not recorded"}
          </p>
          <p>
            <MessageCircle className="mr-1 inline h-4 w-4" />
            {phone ? `+${phone}` : "Registered WhatsApp number needed"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={`communication-application-${student.id}`}>Application context</Label>
          <select
            id={`communication-application-${student.id}`}
            value={applicationId}
            disabled={busy || (attempted && !accepted)}
            className="min-w-0 max-w-full basis-full rounded-lg border bg-background p-2 text-sm sm:flex-1 sm:basis-auto"
            onChange={(e) => {
              const value = e.target.value;
              change(() => {
                setApplicationId(value);
                setDraft(
                  communicationTemplate(
                    template,
                    student,
                    student.applications.find((a) => a.id === value),
                  ),
                );
                setEdited(false);
              });
            }}
          >
            <option value="">General student communication</option>
            {student.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.app_number || "Application"} ·{" "}
                {a.program?.name || "Course unavailable"}
              </option>
            ))}
          </select>
          {app && (
            <Link
              to={`/admin/applications?application=${encodeURIComponent(app.id)}`}
              className="inline-flex items-center gap-1 text-sm text-primary underline"
            >
              <FileText className="h-4 w-4" />
              Case & follow-ups
            </Link>
          )}
        </div>
      </header>
      <Tabs
        value={channel}
        onValueChange={setChannel}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="shrink-0 overflow-x-auto p-3">
          <TabsList className="w-max min-w-full">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="internal">Internal chat</TabsTrigger>
            <TabsTrigger value="history">History & notes</TabsTrigger>
          </TabsList>
        </div>
        {["email", "whatsapp"].map((mode) => (
          <TabsContent
            key={mode}
            value={mode}
            className="m-0 min-h-0 flex-1 overflow-y-auto px-4 pb-4"
          >
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                {mode === "email" ? (
                  <>
                    <strong>From: UniDoxia &lt;info@unidoxia.com&gt;</strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Replies go to the official inbox. Email delivery and inbox
                      replies are not synchronised here.
                    </p>
                    {!capabilities?.emailEnabled && (
                      <p className="mt-2 font-medium">
                        Direct email is awaiting service setup. You can use Open
                        email app and choose the official UniDoxia account.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <strong>WhatsApp opens outside UniDoxia</strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Review and send in WhatsApp. Its messages, replies and
                      delivery status are not synchronised here.
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor={`communication-template-${student.id}-${mode}`}>
                    Message template
                  </Label>
                  <select
                    id={`communication-template-${student.id}-${mode}`}
                    value={template}
                    className="w-full rounded-lg border bg-background p-2 text-sm"
                    onChange={(e) =>
                      setTemplate(
                        e.target.value as keyof typeof COMMUNICATION_TEMPLATES,
                      )
                    }
                  >
                    {Object.entries(COMMUNICATION_TEMPLATES).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <Button
                  variant="outline"
                  disabled={busy || (attempted && !accepted)}
                  onClick={useTemplate}
                >
                  Use template
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`communication-subject-${student.id}-${mode}`}>Subject</Label>
                <Input
                  id={`communication-subject-${student.id}-${mode}`}
                  value={draft.subject}
                  maxLength={200}
                  readOnly={attempted}
                  onChange={(e) => {
                    setDraft({ ...draft, subject: e.target.value });
                    setEdited(true);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`communication-body-${student.id}-${mode}`}>
                  Message to {studentName(student)}
                </Label>
                <Textarea
                  id={`communication-body-${student.id}-${mode}`}
                  rows={9}
                  maxLength={10000}
                  value={draft.body}
                  readOnly={attempted}
                  onChange={(e) => {
                    setDraft({ ...draft, body: e.target.value });
                    setEdited(true);
                  }}
                />
              </div>
              {mode === "email" && (
                <p className="whitespace-pre-line rounded-lg border p-3 text-xs text-muted-foreground">
                  {STUDENT_EMAIL_SIGNATURE}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {mode === "email" ? (
                  <>
                    <Button
                      disabled={
                        !capabilities?.emailEnabled ||
                        !emailApp ||
                        !draft.subject.trim() ||
                        !draft.body.trim() ||
                        busy ||
                        accepted
                      }
                      onClick={() => void send()}
                    >
                      {busy
                        ? "Sending…"
                        : accepted
                          ? "Email accepted"
                          : attempted
                            ? "Retry same email"
                            : "Send Email"}
                    </Button>
                    {emailApp && !attempted && (
                      <Button variant="outline" asChild>
                        <a href={emailApp}>
                          Open email app
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </>
                ) : whatsapp ? (
                  <Button
                    asChild
                    className="bg-green-700 text-white hover:bg-green-800"
                  >
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={logWhatsApp}
                    >
                      Message on WhatsApp
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add or correct the registered WhatsApp number in the student
                    profile.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(draft.body + "\n\n" + STUDENT_EMAIL_SIGNATURE)
                      .then(() => setMessage("Message copied."))
                      .catch(() =>
                        setError(
                          "Copy was unavailable. Select the message text to copy it.",
                        ),
                      );
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy message
                </Button>
                {accepted && (
                  <Button variant="outline" onClick={useTemplate}>
                    Start new message
                  </Button>
                )}
              </div>
              {attempted && !accepted && (
                <p className="text-xs text-muted-foreground">
                  This draft is locked to protect against duplicate sends. Check
                  history and retry the same email to recover its result.
                </p>
              )}
            </div>
          </TabsContent>
        ))}
        <TabsContent
          value="internal"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden"
        >
          {active && (
            <StudentInternalConversation profileId={student.profile_id} />
          )}
        </TabsContent>
        <TabsContent
          value="history"
          className="m-0 min-h-0 flex-1 overflow-y-auto px-4 pb-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Communication history</h3>
              <Button
                size="sm"
                variant="ghost"
                disabled={!capabilities?.historyEnabled || history.isFetching}
                onClick={() => void history.refetch()}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Email attempts sent through this centre, WhatsApp launch requests
              and staff notes for this student only. Internal conversations are
              in Internal chat. Previous mailbox and WhatsApp history are not
              imported.
            </p>
            {!capabilities?.historyEnabled ? (
              <p role="status">Shared history is awaiting service setup.</p>
            ) : history.isPending ? (
              <p role="status">Loading history…</p>
            ) : history.isError ? (
              <p role="alert">
                History could not be loaded. Use Refresh to try again.
              </p>
            ) : !history.data?.rows.length ? (
              <p className="text-sm text-muted-foreground">
                No communications recorded in this centre yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {history.data.rows.map((row) => (
                  <li key={row.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap justify-between gap-2 text-xs">
                      <span className="font-semibold">
                        {COMMUNICATION_STATUS_LABELS[row.status]}
                      </span>
                      <time>
                        {new Date(row.created_at).toLocaleString("en-GB")}
                      </time>
                    </div>
                    <h4 className="mt-2 font-medium">{row.subject}</h4>
                    {row.recipient && (
                      <p className="break-all text-xs text-muted-foreground">
                        To: {row.recipient}
                      </p>
                    )}
                    {row.application_id && (
                      <Link
                        className="text-xs text-primary underline"
                        to={`/admin/applications?application=${encodeURIComponent(row.application_id)}`}
                      >
                        Related application
                      </Link>
                    )}
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {row.body}
                    </p>
                    {row.provider_id && (
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        Provider reference: {row.provider_id}
                      </p>
                    )}
                    {row.channel === "email" &&
                      row.author_id === user?.id &&
                      ["pending", "failed"].includes(row.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() =>
                            change(() => {
                              setApplicationId(row.application_id ?? "");
                              setDraft({
                                subject: row.subject,
                                body: row.body,
                              });
                              id.current = row.id;
                              setAttempted(true);
                              setAccepted(false);
                              setEdited(false);
                              setChannel("email");
                              setMessage(
                                "Earlier attempt restored. Retry this same email to recover its result.",
                              );
                            })
                          }
                        >
                          Recover this email attempt
                        </Button>
                      )}
                  </li>
                ))}
              </ol>
            )}
            {capabilities?.historyEnabled && (
              <>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <Button
                    variant="outline"
                    disabled={!historyPage || history.isFetching}
                    onClick={() => setHistoryPage(historyPage - 1)}
                  >
                    Newer
                  </Button>
                  <span>Page {historyPage + 1}</span>
                  <Button
                    variant="outline"
                    disabled={
                      (historyPage + 1) * 25 >= (history.data?.total ?? 0) ||
                      history.isFetching
                    }
                    onClick={() => setHistoryPage(historyPage + 1)}
                  >
                    Older
                  </Button>
                </div>
                <div className="space-y-2 rounded-xl border p-3">
                  <Label htmlFor={`communication-note-${student.id}`}>
                    Manual communication or follow-up note
                  </Label>
                  <Textarea
                    id={`communication-note-${student.id}`}
                    value={note}
                    maxLength={5000}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Record a confirmed external reply, an unanswered follow-up, or agreed next step. Do not record assumptions as confirmed replies."
                  />
                  <Button
                    disabled={busy || !note.trim()}
                    onClick={() => void recordNote()}
                  >
                    Save staff note
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Manual notes are not synchronised channel messages. Use the
                    application’s follow-ups for dated tasks.
                  </p>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {(error || message) && (
        <div className="shrink-0 border-t p-3 text-sm">
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      )}
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsent edits will be replaced. If an earlier email attempt is
              pending, check its history before creating another message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingAction?.();
                setPendingAction(null);
              }}
            >
              Replace draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

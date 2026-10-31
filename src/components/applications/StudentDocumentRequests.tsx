import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatWorkflowDate,
  followUpDeadline,
} from "@/lib/applicationWorkflow";
import { getDocumentRequestUrl } from "@/lib/documentUpload";
import { getErrorMessage } from "@/lib/errorUtils";
import type { Database } from "@/integrations/supabase/types";

type Request = Database["public"]["Tables"]["document_requests"]["Row"];
type Document = {
  id: string;
  document_type: string;
  storage_path: string;
  verified: boolean;
};
const labels: Record<string, string> = {
  pending: "Awaiting file",
  submitted: "Awaiting review",
  received: "Awaiting review",
  approved: "Approved",
  rejected: "Needs replacement",
};
const types = [
  "passport",
  "passport_photo",
  "transcript",
  "ielts",
  "toefl",
  "sop",
  "cv",
  "lor",
  "portfolio",
  "other",
];
const label = (value: string) => value.replace(/_/g, " ");
export function StudentDocumentRequests({
  studentId,
  tenantId,
  documents = [],
  onDirtyChange,
  onBusyChange,
}: {
  studentId: string;
  tenantId: string;
  documents?: Document[];
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const canManage = profile?.role === "admin" || profile?.role === "staff";
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("passport");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const createId = useRef(crypto.randomUUID());
  const dirty = Boolean(
    description.trim() ||
      due ||
      Object.values(notes).some(Boolean) ||
      Object.values(files).some(Boolean),
  );
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const query = useQuery({
    queryKey: ["student-document-requests-workspace", user?.id, studentId],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const rows: Request[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("document_requests")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
  });
  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await query.refetch();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const create = () =>
    run(async () => {
      if (!canManage || !user)
        throw new Error("Only authorised staff can create requests.");
      if (!description.trim())
        throw new Error("Explain what the student needs to upload.");
      if (
        query.data?.some(
          (r) => r.document_type === type && r.status !== "approved",
        )
      )
        throw new Error(
          "An unfinished request for this document already exists. Review it below instead.",
        );
      const dueDate = followUpDeadline(due);
      const requestId = createId.current;
      const { data, error } = await supabase
        .from("document_requests")
        .insert({
          id: requestId,
          student_id: studentId,
          tenant_id: tenantId,
          requested_by: user.id,
          document_type: type,
          requested_at: new Date().toISOString(),
          request_type: type,
          description: description.trim(),
          status: "pending",
          due_date: dueDate,
        })
        .select("id")
        .single();
      if (error?.code === "23505") {
        const existing = await supabase
          .from("document_requests")
          .select("id")
          .eq("id", requestId)
          .eq("student_id", studentId)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (existing.error || !existing.data) throw error;
      } else if (error) throw error;
      else if (!data)
        throw new Error(
          "The request was not confirmed. Refresh before retrying.",
        );
      createId.current = crypto.randomUUID();
      setDescription("");
      setDue("");
      setAdding(false);
      setMessage(
        "Request saved. It is available in the student portal; no email or WhatsApp message was sent.",
      );
    });
  const review = (request: Request, status: "approved" | "rejected") =>
    run(async () => {
      if (!canManage || !user)
        throw new Error("Only authorised staff can review requests.");
      const selected = documents.find((doc) => doc.id === files[request.id]);
      const path = selected?.storage_path || request.storage_path;
      if (!path)
        throw new Error(
          "Choose an uploaded application file before reviewing this request.",
        );
      const note = notes[request.id]?.trim() ?? "";
      if (status === "rejected" && !note)
        throw new Error("Explain what needs to be replaced.");
      let update = supabase
        .from("document_requests")
        .update({
          status,
          storage_path: path,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          notes: note || null,
        })
        .eq("id", request.id)
        .eq("student_id", studentId);
      update = request.updated_at
        ? update.eq("updated_at", request.updated_at)
        : update.is("updated_at", null);
      const { data, error } = await update.select("id").maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error(
          "The request changed or your access changed. Refresh before reviewing again.",
        );
      setNotes((current) => ({ ...current, [request.id]: "" }));
      setFiles((current) => ({ ...current, [request.id]: "" }));
      setMessage(
        status === "approved"
          ? "Request approved. Verify the application file separately after checking it."
          : "Replacement requested. Your explanation is available to the student.",
      );
    });
  const openFile = (request: Request) =>
    run(async () => {
      const path =
        documents.find((doc) => doc.id === files[request.id])?.storage_path ||
        request.storage_path;
      if (!path) throw new Error("Choose an application file to view.");
      const url = await getDocumentRequestUrl(path, studentId, null);
      if (!url)
        throw new Error(
          "File unavailable. Ask the student to upload it again.",
        );
      window.open(url, "_blank", "noopener,noreferrer");
    });
  return (
    <section
      className="space-y-3 border-t pt-4"
      aria-label="Student document requests"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Student document requests</h3>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy || query.isPending || query.isError}
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Hide request form" : "Request a document"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Requests apply to this student and can relate to other applications.
        They are shown separately from this application’s readiness checks.
      </p>
      {adding && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="request-document-type">Document</Label>
            <select
              id="request-document-type"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={type}
              disabled={busy}
              onChange={(e) => setType(e.target.value)}
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
          </div>
          <Label htmlFor="request-description">What is needed?</Label>
          <Textarea
            id="request-description"
            value={description}
            maxLength={2000}
            disabled={busy}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the required file and any corrections"
          />
          <Label htmlFor="request-due">Due date (optional)</Label>
          <Input
            id="request-due"
            type="date"
            value={due}
            disabled={busy}
            onChange={(e) => setDue(e.target.value)}
          />
          <Button
            disabled={busy || !description.trim()}
            onClick={() => void create()}
          >
            {busy ? "Saving…" : "Save document request"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {query.isPending ? (
        <p role="status">Loading requests…</p>
      ) : query.isError ? (
        <p role="alert">
          Requests could not be loaded.{" "}
          <Button variant="link" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </p>
      ) : !query.data?.length ? (
        <p className="text-sm text-muted-foreground">
          No document requests recorded for this student.
        </p>
      ) : (
        <ul className="divide-y">
          {query.data.map((request) => (
            <li key={request.id} className="space-y-2 py-3">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="capitalize">{label(request.document_type)}</p>
                <Badge variant="secondary">
                  {labels[request.status ?? "pending"] || request.status}
                </Badge>
              </div>
              {request.description && (
                <p className="text-sm">{request.description}</p>
              )}
              {request.notes && (
                <p className="text-sm">Staff feedback: {request.notes}</p>
              )}
              {request.due_date && (
                <p className="text-xs text-muted-foreground">
                  Request due: {formatWorkflowDate(request.due_date)}
                </p>
              )}
              {request.status === "approved" && request.storage_path && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void openFile(request)}
                >
                  View approved file
                </Button>
              )}
              {canManage && request.status !== "approved" && (
                <div className="space-y-2 rounded-lg border p-3">
                  <Label htmlFor={`request-file-${request.id}`}>
                    Review an uploaded file
                  </Label>
                  <select
                    id={`request-file-${request.id}`}
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={files[request.id] ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      setFiles((current) => ({
                        ...current,
                        [request.id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">
                      {request.storage_path
                        ? "File linked to this request"
                        : "Choose a file from this application"}
                    </option>
                    {documents.map((doc, index) => (
                      <option key={doc.id} value={doc.id}>
                        {label(doc.document_type)} · File {index + 1}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Students can read this feedback. Check the file matches this
                    request. If the file saved but the request status did not
                    update, select the application file here.
                  </p>
                  <Label htmlFor={`request-note-${request.id}`}>
                    Feedback for student
                  </Label>
                  <Textarea
                    id={`request-note-${request.id}`}
                    maxLength={2000}
                    value={notes[request.id] ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      setNotes((current) => ({
                        ...current,
                        [request.id]: e.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void openFile(request)}
                    >
                      View file
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void review(request, "approved")}
                    >
                      Approve request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void review(request, "rejected")}
                    >
                      Request replacement
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/lib/securityLogger";
import { LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Ban, RotateCcw, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface StudentDetail {
  id: string;
  profile_id: string;
  legal_name: string | null;
  preferred_name: string | null;
  contact_email: string | null;
  current_country: string | null;
  created_at: string | null;
  
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  profile: { full_name: string | null; email: string | null } | null;
}

const AdminStudentDetail = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select(
          `id, profile_id, legal_name, preferred_name, contact_email, current_country, created_at, archived_at, archived_by, archive_reason, profile:profiles!students_profile_id_fkey (full_name, email)`
        )
        .eq("id", studentId)
        .maybeSingle();

      if (error) throw error;
      setStudent(data as StudentDetail | null);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load student", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    void fetchStudent();
  }, [fetchStudent]);

  const studentName =
    student?.preferred_name || student?.legal_name || student?.profile?.full_name || "Unknown Student";

  const isArchived = !!student?.archived_at;

  const handleArchiveStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("students")
        .update({
          archived_at: now,
          archived_by: profile.id,
          archive_reason: actionReason || null,
        } as any)
        .eq("id", student.id);

      if (error) throw error;

      await logSecurityEvent({
        eventType: "custom",
        description: `Admin archived student account: ${studentName}`,
        severity: "medium",
        metadata: { studentId: student.id, studentName, reason: actionReason },
        alert: false,
      });

      toast({
        title: "Student archived",
        description: `${studentName}'s account has been archived. You can restore it anytime.`,
      });

      setArchiveDialogOpen(false);
      setActionReason("");
      navigate("/admin/students");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to archive student", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreStudent = async () => {
    if (!student || !profile?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ archived_at: null, archived_by: null, archive_reason: null } as any)
        .eq("id", student.id);

      if (error) throw error;

      toast({ title: "Student restored", description: `${studentName}'s account has been restored.` });
      setRestoreDialogOpen(false);
      void fetchStudent();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Failed to restore student", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Loading student details..." size="lg" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => navigate("/admin/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Students
        </Button>
        <p className="text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/students")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-semibold">{studentName}</h1>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
        </div>
        <div className="flex gap-2">
          {isArchived ? (
            <Button variant="outline" onClick={() => setRestoreDialogOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-2" /> Restore
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setArchiveDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Archive
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p>{student.profile?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p>{student.profile?.email ?? student.contact_email ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Country</p>
            <p>{student.current_country ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Joined</p>
            <p>{student.created_at ? format(new Date(student.created_at), "MMM d, yyyy") : "—"}</p>
          </div>
          {isArchived && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Archived At</p>
                <p>{student.archived_at ? format(new Date(student.archived_at), "MMM d, yyyy HH:mm") : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Archive Reason</p>
                <p>{student.archive_reason ?? "No reason provided"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {studentName}'s account. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for archiving (optional)"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveStudent} disabled={actionLoading}>
              {actionLoading ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {studentName}'s account and make it active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreStudent} disabled={actionLoading}>
              {actionLoading ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudentDetail;

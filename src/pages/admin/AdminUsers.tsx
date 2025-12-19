import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useAuth } from "@/hooks/useAuth";
import { AccountInspector } from "@/components/admin/AccountInspector";

import {
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  Shield,
  UserRoundX,
} from "lucide-react";

interface RoleSummary {
  role: string;
  users: number;
}

const AdminUsers = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Tables<"profiles">[]>([]);
  const [roleSummary, setRoleSummary] = useState<RoleSummary[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<Tables<"profiles"> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [studentRecord, setStudentRecord] = useState<Tables<"students"> | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<Tables<"student_documents">[]>([]);
  const [documentCount, setDocumentCount] = useState(0);

  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isOpeningDocument, setIsOpeningDocument] = useState<string | null>(null);

  /* ---------------- Load Users ---------------- */
  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      if (!tenantId) {
        setRows([]);
        setRoleSummary([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, created_at, active, phone, country, timezone, onboarded"
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!mounted) return;

        setRows((data ?? []) as Tables<"profiles">[]);

        const summary = new Map<string, number>();
        for (const u of data ?? []) {
          summary.set(u.role, (summary.get(u.role) ?? 0) + 1);
        }

        setRoleSummary(
          Array.from(summary.entries()).map(([role, users]) => ({ role, users }))
        );
      } catch (err) {
        console.error("Failed to load admin users", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const filteredRows = selectedRole
    ? rows.filter((u) => u.role === selectedRole)
    : rows;

  /* ---------------- Select User ---------------- */
  const handleSelectUser = async (user: Tables<"profiles">) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
    setDetailLoading(true);
    setStudentRecord(null);
    setStudentDocuments([]);
    setDocumentCount(0);

    try {
      const { data: student } = await supabase
        .from("students")
        .select(
          "id, legal_name, preferred_name, contact_email, contact_phone, nationality, current_country, profile_completeness, created_at"
        )
        .eq("profile_id", user.id)
        .maybeSingle();

      setStudentRecord(student as Tables<"students"> | null);

      if (student?.id) {
        const [{ data: docs }, { count }] = await Promise.all([
          supabase
            .from("student_documents")
            .select(
              "id, document_type, file_name, storage_path, verified_status, created_at"
            )
            .eq("student_id", student.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("student_documents")
            .select("id", { count: "exact", head: true })
            .eq("student_id", student.id),
        ]);

        setStudentDocuments((docs ?? []) as Tables<"student_documents">[]);
        setDocumentCount(count ?? 0);
      }
    } catch (err) {
      console.error("Failed to load student details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---------------- Status Update ---------------- */
  const updateUserStatus = async (active: boolean) => {
    if (!selectedUser) return;
    setIsStatusUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active })
        .eq("id", selectedUser.id);

      if (error) throw error;

      setRows((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, active } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, active } : prev));
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  /* ---------------- Open Document ---------------- */
  const handleViewDocument = async (doc: Tables<"student_documents">) => {
    setIsOpeningDocument(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("Failed to open document", err);
    } finally {
      setIsOpeningDocument(null);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">User governance</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage administrative identities.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("zoe:open-chat", {
                detail: { prompt: "Outline role assignment gaps" },
              })
            )
          }
        >
          Ask Zoe
        </Button>
      </div>

      <AccountInspector />

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Role distribution</CardTitle>
          <CardDescription>Accounts grouped by role.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {loading && <Skeleton className="h-10 w-24" />}
          {!loading &&
            roleSummary.map((r) => (
              <button
                key={r.role}
                onClick={() =>
                  setSelectedRole((c) => (c === r.role ? null : r.role))
                }
                className={`rounded-full border px-4 py-2 text-sm ${
                  selectedRole === r.role
                    ? "bg-primary/10 border-primary text-primary"
                    : "hover:border-primary"
                }`}
              >
                <span className="font-semibold">{r.users}</span>{" "}
                <span className="uppercase text-xs ml-1">{r.role}</span>
              </button>
            ))}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>Click a user to review details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-2">
              {filteredRows.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="w-full text-left rounded border p-3 hover:bg-muted/50"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant={u.active ? "outline" : "destructive"}>
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User profile
            </SheetTitle>
            <SheetDescription>Review account and documents.</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <Skeleton className="h-20 w-full mt-4" />
          ) : selectedUser ? (
            <div className="mt-6 space-y-4">
              <p className="font-semibold text-lg">{selectedUser.full_name}</p>
              <div className="flex gap-2 text-sm">
                <Mail className="h-4 w-4" /> {selectedUser.email}
              </div>

              <Separator />

              <div className="grid gap-2">
                <Button
                  disabled={isStatusUpdating || selectedUser.active}
                  onClick={() => updateUserStatus(true)}
                >
                  Activate
                </Button>
                <Button
                  variant="outline"
                  disabled={isStatusUpdating || !selectedUser.active}
                  onClick={() => updateUserStatus(false)}
                >
                  Suspend
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUsers;

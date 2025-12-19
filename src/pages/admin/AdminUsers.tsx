import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AccountInspector } from "@/components/admin/AccountInspector";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileText, Mail, Phone, Shield, UserRoundX } from "lucide-react";

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
  const [selectedUser, setSelectedUser] = useState<Tables<"profiles"> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentRecord, setStudentRecord] = useState<Tables<"students"> | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<
    Tables<"student_documents">[]
  >([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isOpeningDocument, setIsOpeningDocument] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      if (!tenantId) {
        if (isMounted) {
          setRows([]);
          setRoleSummary([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, created_at, active, phone, country, timezone, onboarded")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!isMounted) return;

        setRows((data ?? []) as any);
        const summary = new Map<string, number>();
        for (const item of data ?? []) {
          summary.set(item.role, (summary.get(item.role) ?? 0) + 1);
        }
        setRoleSummary(Array.from(summary.entries()).map(([role, users]) => ({ role, users })));
      } catch (error) {
        console.error("Failed to load admin user list", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadUsers();
    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  const handleSelectUser = async (user: Tables<"profiles">) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
    setDetailLoading(true);
    setStudentRecord(null);
    setStudentDocuments([]);
    setDocumentCount(0);

    try {
      const { data: studentData } = await supabase
        .from("students")
        .select(
          "id, legal_name, preferred_name, contact_email, contact_phone, nationality, current_country, profile_completeness, created_at"
        )
        .eq("profile_id", user.id)
        .maybeSingle();

      setStudentRecord((studentData ?? null) as Tables<"students"> | null);

      if (studentData?.id) {
        const [{ data: docs }, { count }] = await Promise.all([
          supabase
            .from("student_documents")
            .select("id, document_type, file_name, storage_path, verified_status, created_at")
            .eq("student_id", studentData.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("student_documents")
            .select("id", { count: "exact", head: true })
            .eq("student_id", studentData.id),
        ]);

        setStudentDocuments((docs ?? []) as Tables<"student_documents">[]);
        setDocumentCount(count ?? 0);
      }
    } catch (error) {
      console.error("Failed to load student details", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateUserStatus = async (active: boolean) => {
    if (!selectedUser) return;
    setIsStatusUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active })
        .eq("id", selectedUser.id);

      if (error) throw error;

      setRows((prev) => prev.map((row) => (row.id === selectedUser.id ? { ...row, active } : row)));
      setSelectedUser((prev) => (prev ? { ...prev, active } : prev));
    } catch (error) {
      console.error("Failed to update user status", error);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleViewDocument = async (doc: Tables<"student_documents">) => {
    setIsOpeningDocument(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from("student-documents")
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err) {
      console.error("Unable to open document", err);
    } finally {
      setIsOpeningDocument(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="page-header">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">User governance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage administrative identities with centralized auditing.
          </p>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto"
          onClick={() =>
            typeof window !== "undefined" &&
            window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt: "Outline role assignment gaps" } }))
          }
        >
          Ask Zoe for analysis
        </Button>
      </div>

      {/* Account Inspector - Diagnose and repair malformed accounts */}
      <AccountInspector />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Role distribution</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Snapshot of active accounts by privilege level.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {loading && <Skeleton className="h-10 w-24" />}
            {!loading &&
              roleSummary.map((role) => (
                <Badge key={role.role} variant="outline" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
                  <span className="font-semibold">{role.users}</span>
                  <span className="ml-1.5 sm:ml-2 uppercase tracking-wide text-xs text-muted-foreground">{role.role}</span>
                </Badge>
              ))}
            {!loading && roleSummary.length === 0 && <p className="text-sm text-muted-foreground">No roles assigned yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Administrators</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Key account holders with administrative or elevated permissions.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="grid gap-2 sm:gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No administrator records found.</p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block space-y-3 md:hidden">
                {rows.map((user) => (
                  <button
                    key={user.id}
                    className="rounded-lg border p-3 space-y-2 text-left w-full transition hover:border-primary"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge variant={user.active ? "outline" : "destructive"} className="text-xs shrink-0">
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t">
                      <Badge variant="secondary" className="text-xs uppercase">{user.role}</Badge>
                      <span className="text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 lg:px-4 lg:py-3">Name</th>
                      <th className="px-3 py-2.5 lg:px-4 lg:py-3">Email</th>
                      <th className="px-3 py-2.5 lg:px-4 lg:py-3">Role</th>
                      <th className="px-3 py-2.5 lg:px-4 lg:py-3">Status</th>
                      <th className="px-3 py-2.5 lg:px-4 lg:py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {rows.map((user) => (
                      <tr
                        key={user.id}
                        className="cursor-pointer transition hover:bg-muted/60"
                        onClick={() => handleSelectUser(user)}
                      >
                        <td className="px-3 py-2 lg:px-4 font-medium">{user.full_name}</td>
                        <td className="px-3 py-2 lg:px-4 text-muted-foreground truncate max-w-[200px]">{user.email}</td>
                        <td className="px-3 py-2 lg:px-4 uppercase tracking-wide text-xs">{user.role}</td>
                        <td className="px-3 py-2 lg:px-4">
                          <Badge variant={user.active ? "outline" : "destructive"} className="text-xs">{user.active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-3 py-2 lg:px-4 text-muted-foreground whitespace-nowrap">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-2">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              User profile
            </SheetTitle>
            <SheetDescription>
              Review student context, documents, and quickly approve or suspend access.
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : selectedUser ? (
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold leading-tight">{selectedUser.full_name}</p>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{selectedUser.email}</span>
                      {selectedUser.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{selectedUser.phone}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="uppercase tracking-wide">{selectedUser.role}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={selectedUser.active ? "outline" : "destructive"} className="gap-1 text-xs">
                    {selectedUser.active ? <CheckCircle2 className="h-4 w-4" /> : <UserRoundX className="h-4 w-4" />}
                    {selectedUser.active ? "Active" : "Suspended"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : "—"}
                  </span>
                  {selectedUser.country && <span className="text-xs text-muted-foreground">• {selectedUser.country}</span>}
                  {selectedUser.timezone && <span className="text-xs text-muted-foreground">• {selectedUser.timezone}</span>}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Student profile</p>
                    <p className="text-sm text-muted-foreground">Enrollment context linked to this account.</p>
                  </div>
                  {typeof studentRecord?.profile_completeness === "number" ? (
                    <Badge variant="secondary" className="text-xs">
                      {studentRecord.profile_completeness}% complete
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Profile drafted</Badge>
                  )}
                </div>

                {studentRecord ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Legal name</Label>
                      <p className="font-medium">{studentRecord.legal_name || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Preferred name</Label>
                      <p className="font-medium">{studentRecord.preferred_name || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Contact email</Label>
                      <p className="font-medium">{studentRecord.contact_email || selectedUser.email}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Contact phone</Label>
                      <p className="font-medium">{studentRecord.contact_phone || selectedUser.phone || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nationality</Label>
                      <p className="font-medium">{studentRecord.nationality || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Current country</Label>
                      <p className="font-medium">{studentRecord.current_country || "—"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No student record linked yet.</p>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Documents</p>
                    <p className="text-sm text-muted-foreground">Latest uploads from the student workspace.</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{documentCount} on file</Badge>
                </div>

                {studentDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {studentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start justify-between gap-3 rounded border p-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-sm">{doc.file_name || doc.document_type}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.document_type} • {new Date(doc.created_at ?? "").toLocaleDateString()}
                          </p>
                          <Badge variant="outline" className="text-[11px] uppercase">
                            {doc.verified_status || "pending"}
                          </Badge>
                        </div>
                        {doc.storage_path && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isOpeningDocument === doc.id}
                            onClick={() => handleViewDocument(doc)}
                          >
                            {isOpeningDocument === doc.id ? "Opening..." : "Review"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="default"
                    onClick={() => updateUserStatus(true)}
                    disabled={isStatusUpdating || selectedUser.active === true}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & activate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateUserStatus(false)}
                    disabled={isStatusUpdating || selectedUser.active === false}
                    className="gap-2"
                  >
                    <UserRoundX className="h-4 w-4" />
                    Suspend access
                  </Button>
                </div>
              </div>

              <Separator />
              <p className="text-xs text-muted-foreground">
                Tip: use the Account Inspector above for deeper repairs, role fixes, or enrollment alignment.
              </p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUsers;

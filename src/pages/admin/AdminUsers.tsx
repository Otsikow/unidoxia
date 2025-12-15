import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AccountInspector } from "@/components/admin/AccountInspector";

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
          .select("id, full_name, email, role, created_at, active")
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
                  <div key={user.id} className="rounded-lg border p-3 space-y-2">
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
                  </div>
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
                      <tr key={user.id}>
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
    </div>
  );
};

export default AdminUsers;

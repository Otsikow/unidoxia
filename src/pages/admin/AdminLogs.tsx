import { formatUkDateTime } from '@/lib/dateFormat';
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shield, Terminal, Download, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";

interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  changes: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
  user: {
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

interface AuditLogRecord {
  id: string;
  action: string;
  entity: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

type AuditLogQuery = any;

const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: "All roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Counselor", value: "counselor" },
  { label: "Verifier", value: "verifier" },
  { label: "Finance", value: "finance" },
  { label: "School Rep", value: "school_rep" },
  { label: "Agent", value: "agent" },
  { label: "Partner", value: "partner" },
  { label: "Student", value: "student" },
];

const PAGE_SIZE = 20;

const openZoe = (prompt: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt } }));
};

const mapAuditLogRow = (row: AuditLogRow): AuditLogRecord => ({
  id: row.id,
  action: row.action,
  entity: row.entity,
  details: row.changes,
  ipAddress: row.ip_address as string,
  userAgent: row.user_agent,
  createdAt: row.created_at,
  userName: row.user?.full_name ?? row.user?.email ?? "System",
  userEmail: row.user?.email ?? "—",
  userRole: row.user?.role ?? "system",
});

const formatDetails = (details: Record<string, unknown> | null) => {
  if (!details || Object.keys(details).length === 0) {
    return "—";
  }

  try {
    const serialized = JSON.stringify(details);
    if (serialized.length <= 120) {
      return serialized;
    }
    return `${serialized.slice(0, 117)}...`;
  } catch (error) {
    console.error("Failed to serialize audit log details", error);
    return "[unavailable]";
  }
};

const AdminLogs = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const applyFilters = useCallback(
    (query: AuditLogQuery) => {
      let builder = query;

      if (debouncedSearch) {
        const likeValue = `%${debouncedSearch}%`;
        builder = builder.or(
          `action.ilike.${likeValue},entity.ilike.${likeValue},user_agent.ilike.${likeValue},ip_address::text.ilike.${likeValue},changes::text.ilike.${likeValue}`,
        );
      }

      if (selectedAction !== "all") {
        builder = builder.eq("action", selectedAction);
      }

      if (selectedRole !== "all") {
        builder = builder.eq("user.role", selectedRole);
      }

      if (startDate) {
        builder = builder.gte("created_at", new Date(startDate).toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        builder = builder.lte("created_at", end.toISOString());
      }

      return builder;
    },
    [debouncedSearch, selectedAction, selectedRole, startDate, endDate],
  );

  const fetchLogs = useCallback(async () => {
    if (!tenantId) {
      setRecords([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let query = supabase
        .from("audit_logs")
        .select(
          `
          id,
          action,
          entity,
          changes,
          ip_address,
          user_agent,
          created_at,
          user:profiles!audit_logs_user_id_fkey (
            id,
            full_name,
            email,
            role
          )
        `,
          { count: "exact" },
        )
        .eq("tenant_id", tenantId);

      query = applyFilters(query);

      const { data, error: queryError, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (queryError) {
        throw queryError;
      }

      setRecords((data ?? []).map(mapAuditLogRow));
      setTotalCount(count ?? 0);
    } catch (fetchError) {
      console.error("Failed to load audit logs", fetchError);
      setError("Unable to load audit logs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, page, applyFilters]);

  const fetchActions = useCallback(async () => {
    if (!tenantId) {
      setAvailableActions([]);
      return;
    }

    try {
      const { data, error: actionError } = await supabase
        .from("audit_logs")
        .select("action")
        .eq("tenant_id", tenantId)
        .order("action", { ascending: true })
        .limit(200);

      if (actionError) {
        throw actionError;
      }

      const uniqueActions = Array.from(new Set((data ?? []).map((item) => item.action)))
        .filter((action): action is string => Boolean(action))
        .sort((a, b) => a.localeCompare(b));
      setAvailableActions(uniqueActions);
    } catch (actionFetchError) {
      console.error("Failed to load audit log actions", actionFetchError);
    }
  }, [tenantId]);

  const handleExport = useCallback(async () => {
    if (!tenantId || exporting) return;

    setExporting(true);

    try {
      let exportQuery = supabase
        .from("audit_logs")
        .select(
          `
          id,
          action,
          entity,
          changes,
          ip_address,
          user_agent,
          created_at,
          user:profiles!audit_logs_user_id_fkey (
            id,
            full_name,
            email,
            role
          )
        `,
        )
        .eq("tenant_id", tenantId);

      exportQuery = applyFilters(exportQuery);

      const { data, error: exportError } = await exportQuery
        .order("created_at", { ascending: false })
        .limit(1000);

      if (exportError) {
        throw exportError;
      }

      const exportRecords = (data ?? []).map(mapAuditLogRow);

      const header = [
        "ID",
        "User",
        "Email",
        "Role",
        "Action",
        "Affected Table",
        "Details",
        "Timestamp",
        "IP Address",
        "User Agent",
      ];

      const rows = exportRecords.map((record) => [
        record.id,
        record.userName,
        record.userEmail,
        record.userRole,
        record.action,
        record.entity,
        record.details ? JSON.stringify(record.details).replace(/"/g, "'") : "",
        new Date(record.createdAt).toISOString(),
        record.ipAddress ?? "",
        record.userAgent ?? "",
      ]);

      const csv = [header, ...rows]
        .map((line) =>
          line
            .map((value) => {
              const stringValue = value ?? "";
              if (/[",\n]/.test(stringValue)) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Failed to export audit logs", exportError);
      setError("Unable to export logs. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [tenantId, exporting, applyFilters]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    void fetchActions();
  }, [fetchActions]);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`audit-logs-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          if (page === 1) {
            void fetchLogs();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, fetchLogs, page]);

  const totalPages = useMemo(() => {
    if (totalCount === 0) return 1;
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }, [totalCount]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRole("all");
    setSelectedAction("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleManualRefresh = () => {
    void fetchLogs();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="page-header">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Audit & system logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Investigate privileged operations and platform activity.</p>
        </div>
        <div className="page-header-actions w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => openZoe("Summarize critical audit events today") }>
            <Shield className="h-4 w-4" />
            <span className="sm:inline">Security digest</span>
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" onClick={handleManualRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button size="sm" onClick={handleExport} className="w-full gap-2 sm:w-auto" disabled={!tenantId || exporting}>
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Audit trail
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Review every privileged action captured through Supabase audit logging.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Filter Section - Responsive */}
          <div className="space-y-3">
            {/* Search and Primary Filters */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedRole}
                onValueChange={(value) => {
                  setSelectedRole(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedAction}
                onValueChange={(value) => {
                  setSelectedAction(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {availableActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full lg:w-auto">
                Clear filters
              </Button>
            </div>
            
            {/* Date Filters - Collapsible on mobile */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[150px]"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[150px]"
                placeholder="End date"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Mobile Card View */}
          <div className="block space-y-3 md:hidden">
            {loading && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading audit logs...
              </div>
            )}
            
            {!loading && records.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No audit records match your current filters.
              </div>
            )}
            
            {!loading && records.map((record) => (
              <div key={record.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{record.userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{record.userEmail}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs shrink-0">
                    {record.userRole}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary" className="text-xs">{record.action}</Badge>
                  <span className="text-muted-foreground">{record.entity}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>{formatUkDateTime(record.createdAt)}</span>
                  <span className="font-mono">{record.ipAddress ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="min-w-[120px]">Action</TableHead>
                  <TableHead className="min-w-[120px]">Table</TableHead>
                  <TableHead className="min-w-[200px] hidden lg:table-cell">Details</TableHead>
                  <TableHead className="min-w-[150px]">Timestamp</TableHead>
                  <TableHead className="w-[120px] hidden xl:table-cell">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                )}

                {!loading && records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No audit records match your current filters.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {record.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-sm">{record.userName}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">{record.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {record.userRole}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{record.action}</TableCell>
                      <TableCell className="text-sm">{record.entity}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground line-clamp-2">{formatDetails(record.details)}</span>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatUkDateTime(record.createdAt)}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">{record.ipAddress ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {(records.length && (page - 1) * PAGE_SIZE + 1) || 0} - {(page - 1) * PAGE_SIZE + records.length} of {totalCount}
            </p>
            <Pagination className="mx-0">
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((current) => Math.max(1, current - 1));
                    }}
                    className="cursor-pointer h-8 px-2 sm:px-3"
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {page} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((current) => Math.min(totalPages, current + 1));
                    }}
                    className="cursor-pointer h-8 px-2 sm:px-3"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs;

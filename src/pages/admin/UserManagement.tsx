import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import BackButton from "@/components/BackButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import {
  Ban,
  CheckCircle2,
  Loader2,
  PencilLine,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

const PAGE_SIZE = 10;

const ROLE_OPTIONS: Database["public"]["Enums"]["app_role"][] = [
  "admin",
  "staff",
  "partner",
  "agent",
  "counselor",
  "verifier",
  "finance",
  "school_rep",
  "student",
];

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];
type UserStatus = "active" | "inactive" | "verification_pending";

type UserQueryFilters = {
  search: string;
  role: AppRole | "all";
  status: UserStatus | "all";
  createdAfter: string | null;
  page: number;
};

type UsersQueryResult = {
  users: ProfileRow[];
  total: number;
};

type UserMutationPayload =
  | { type: "approve" | "suspend"; userId: string }
  | { type: "changeRole"; userId: string; role: AppRole }
  | { type: "delete"; userId: string };

const statusConfig: Record<
  UserStatus,
  { label: string; className: string; dotClass: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200",
    dotClass: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    className: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200",
    dotClass: "bg-rose-500",
  },
  verification_pending: {
    label: "Verification Pending",
    className: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200",
    dotClass: "bg-amber-500",
  },
};

const roleLabel = (role: AppRole) => role.replace(/_/g, " ");

const getStatusForUser = (user: ProfileRow): UserStatus => {
  if (user.active === false) {
    return "inactive";
  }
  if (user.active === true) {
    return "active";
  }
  return "verification_pending";
};

const sanitizeSearch = (value: string) => value.replace(/[,*]/g, " ");

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [createdFilter, setCreatedFilter] = useState<"all" | "7" | "30" | "90">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [roleDialogUser, setRoleDialogUser] = useState<ProfileRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [userToDelete, setUserToDelete] = useState<ProfileRow | null>(null);

  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const createdAfter = useMemo(() => {
    if (createdFilter === "all") {
      return null;
    }
    const days = Number(createdFilter);
    const date = subDays(new Date(), days);
    return date.toISOString();
  }, [createdFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, createdFilter]);

  useEffect(() => {
    if (roleDialogUser) {
      setSelectedRole(roleDialogUser.role);
    } else {
      setSelectedRole(null);
    }
  }, [roleDialogUser]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useQuery<UsersQueryResult, PostgrestError, UsersQueryResult, [string, UserQueryFilters]>(
    {
      queryKey: ["admin-users", { search: debouncedSearch, role: roleFilter, status: statusFilter, createdAfter, page }],
      queryFn: async ({ queryKey }) => {
        const [, filters] = queryKey;
        const { search, role, status, createdAfter: createdAfterFilter, page: currentPage } = filters;

        const sanitizedSearch = sanitizeSearch(search);
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("profiles")
          .select("*", { count: "exact" });

        if (sanitizedSearch) {
          query = query.or(
            `full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`
          );
        }

        if (role !== "all") {
          query = query.eq("role", role);
        }

        if (status !== "all") {
          if (status === "active") {
            query = query.eq("active", true);
          } else if (status === "inactive") {
            query = query.eq("active", false);
          } else if (status === "verification_pending") {
            query = query.or("active.is.null,onboarded.eq.false");
          }
        }

        if (createdAfterFilter) {
          query = query.gte("created_at", createdAfterFilter);
        }

        const { data: profiles, error: fetchError, count } = await query
          .order("created_at", { ascending: false })
          .range(from, to);

        if (fetchError) {
          throw fetchError;
        }

        return {
          users: profiles ?? [],
          total: count ?? 0,
        } satisfies UsersQueryResult;
      },
      placeholderData: (previousData) => previousData,
    }
  );

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const userMutation = useMutation({
    mutationFn: async (payload: UserMutationPayload) => {
      if (payload.type === "approve") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ active: true, onboarded: true })
          .eq("id", payload.userId);

        if (updateError) throw updateError;
        return { title: "User approved", description: "The user has been activated." };
      }

      if (payload.type === "suspend") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ active: false })
          .eq("id", payload.userId);

        if (updateError) throw updateError;
        return { title: "User suspended", description: "The user has been marked as inactive." };
      }

      if (payload.type === "changeRole") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ role: payload.role })
          .eq("id", payload.userId);

        if (updateError) throw updateError;
        return { title: "Role updated", description: "User role has been updated successfully." };
      }

      if (payload.type === "delete") {
        const { error: deleteError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", payload.userId);

        if (deleteError) throw deleteError;
        return { title: "User deleted", description: "The user has been removed." };
      }

      return { title: "No changes applied" };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (result?.title) {
        toast({ title: result.title, description: result.description });
      }
      setRoleDialogUser(null);
      setUserToDelete(null);
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update the user. Please try again.";
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const isMutating = userMutation.isPending;

  const paginationRange = useMemo(() => {
    const totalToShow = 5;
    const start = Math.max(1, page - 2);
    const end = Math.min(pageCount, start + totalToShow - 1);
    const adjustedStart = Math.max(1, end - totalToShow + 1);
    const pages: number[] = [];
    for (let i = adjustedStart; i <= end; i += 1) {
      pages.push(i);
    }
    return {
      pages,
      showStartEllipsis: adjustedStart > 1,
      showEndEllipsis: end < pageCount,
    };
  }, [page, pageCount]);

  const renderStatusBadge = (user: ProfileRow) => {
    const status = getStatusForUser(user);
    const config = statusConfig[status];
    return (
      <Badge
        variant="outline"
        className={cn("gap-2 border", config.className)}
      >
        <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
        {config.label}
      </Badge>
    );
  };

  const handleApprove = (userId: string) => {
    userMutation.mutate({ type: "approve", userId });
  };

  const handleSuspend = (userId: string) => {
    userMutation.mutate({ type: "suspend", userId });
  };

  const handleRoleUpdate = () => {
    if (roleDialogUser && selectedRole) {
      userMutation.mutate({
        type: "changeRole",
        userId: roleDialogUser.id,
        role: selectedRole,
      });
    }
  };

  const handleDelete = () => {
    if (userToDelete) {
      userMutation.mutate({ type: "delete", userId: userToDelete.id });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/admin" />

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Search, review, and manage every user across the platform.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle>User overview</CardTitle>
            <CardDescription>
              {total > 0
                ? `Showing ${users.length} of ${total} users`
                : "No users found for the selected filters."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value as AppRole | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {ROLE_OPTIONS.map((roleOption) => (
                      <SelectItem key={roleOption} value={roleOption}>
                        {roleLabel(roleOption)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as UserStatus | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="verification_pending">Verification pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={createdFilter}
                  onValueChange={(value) => setCreatedFilter(value as typeof createdFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Date created" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setCreatedFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading users…</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        {statusFilter === "verification_pending"
                          ? "No users are awaiting verification."
                          : "No users match the current filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">{user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">
                          <Badge variant="secondary">{roleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>{renderStatusBadge(user)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {user.created_at ? format(new Date(user.created_at), "d MMM yyyy") : "Not set"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={isMutating}
                              onClick={() => handleApprove(user.id)}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={isMutating}
                              onClick={() => handleSuspend(user.id)}
                            >
                              <Ban className="h-4 w-4" />
                              Suspend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={isMutating}
                              onClick={() => setRoleDialogUser(user)}
                            >
                              <PencilLine className="h-4 w-4" />
                              Change role
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-2"
                              disabled={isMutating}
                              onClick={() => setUserToDelete(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {isError && (
                <div className="border-t px-4 py-3 text-sm text-destructive">
                  {(error && "message" in error && (error as PostgrestError).message) ||
                    "Unable to load users. Please try again."}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) setPage((prev) => prev - 1);
                      }}
                      className={cn(page === 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>

                  {paginationRange.showStartEllipsis && (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(1);
                          }}
                          isActive={page === 1}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    </>
                  )}

                  {paginationRange.pages.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(pageNumber);
                        }}
                        isActive={page === pageNumber}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  {paginationRange.showEndEllipsis && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(pageCount);
                          }}
                          isActive={page === pageCount}
                        >
                          {pageCount}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < pageCount) setPage((prev) => prev + 1);
                      }}
                      className={cn(page >= pageCount && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!roleDialogUser}
        onOpenChange={(open) => {
          if (!open) setRoleDialogUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign role</DialogTitle>
            <DialogDescription>
              Update the selected user's access level. This change takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">User</p>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{roleDialogUser?.full_name}</p>
                <p className="text-muted-foreground">{roleDialogUser?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Role</p>
              <Select
                value={selectedRole ?? undefined}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleLabel(roleOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogUser(null)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button onClick={handleRoleUpdate} disabled={!selectedRole || isMutating}>
              {isMutating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user will be permanently removed from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isMutating}
            >
              {isMutating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

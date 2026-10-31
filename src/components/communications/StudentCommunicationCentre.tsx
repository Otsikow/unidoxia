import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MessagesSquare,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MessagingViewport } from "@/components/messages/MessagingViewport";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  CommunicationWorkspace,
  type CommunicationStudent,
  type CommunicationCapabilities,
} from "./CommunicationWorkspace";
import { studentContactSearch, studentName } from "@/lib/studentCommunication";
const SIZE = 25;
export function StudentCommunicationCentre({
  onTeamInbox,
}: {
  onTeamInbox: () => void;
}) {
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("student");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [showTeamWarning, setShowTeamWarning] = useState(false);
  const scope = `${user?.id ?? ""}:${profile?.tenant_id ?? ""}`;
  const [openedCache, setOpenedCache] = useState<{
    scope: string;
    rows: Record<string, CommunicationStudent>;
  }>({ scope, rows: {} });
  const opened = openedCache.scope === scope ? openedCache.rows : {};
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const updateDirty = useCallback(
    (id: string, value: boolean) =>
      setDirty((current) =>
        current[id] === value ? current : { ...current, [id]: value },
      ),
    [],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const anyDirty =
    openedCache.scope === scope && Object.values(dirty).some(Boolean);
  useEffect(() => {
    setOpenedCache((current) =>
      current.scope === scope ? current : { scope, rows: {} },
    );
    setDirty({});
  }, [scope]);
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);
  const list = useQuery({
    queryKey: [
      "communication-students",
      user?.id,
      profile?.tenant_id,
      debounced,
      page,
    ],
    enabled: Boolean(profile?.tenant_id),
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("id,legal_name,preferred_name,contact_email,reference_code", {
          count: "exact",
        })
        .eq("tenant_id", profile!.tenant_id!)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("id")
        .range(page * SIZE, page * SIZE + SIZE - 1);
      if (debounced.trim()) query = query.or(studentContactSearch(debounced));
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
  const detail = useQuery({
    queryKey: [
      "communication-student",
      user?.id,
      profile?.tenant_id,
      selectedId,
    ],
    enabled: Boolean(selectedId && profile?.tenant_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id,profile_id,reference_code,legal_name,preferred_name,contact_email,whatsapp_number,address,current_country,applications(id,app_number,program:programs(name,university:universities(name)))",
        )
        .eq("id", selectedId!)
        .eq("tenant_id", profile!.tenant_id!)
        .single();
      if (error) throw error;
      return data as CommunicationStudent;
    },
  });
  const capabilities = useQuery({
    queryKey: [
      "student-communication-capabilities",
      user?.id,
      profile?.tenant_id,
    ],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "student-communication",
        { body: { action: "capabilities" } },
      );
      if (error) throw error;
      return data as CommunicationCapabilities;
    },
  });
  useEffect(() => {
    if (detail.data && detail.data.id === selectedId)
      setOpenedCache((current) =>
        current.scope === scope && current.rows[selectedId!] === detail.data
          ? current
          : {
              scope,
              rows: {
                ...(current.scope === scope ? current.rows : {}),
                [selectedId!]: detail.data!,
              },
            },
      );
  }, [detail.data, selectedId, scope]);
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("student", id);
    else next.delete("student");
    setParams(next);
  };
  return (
    <DashboardLayout>
      <MessagingViewport>
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm">
          <div>
            <p className="hidden text-xs font-semibold uppercase tracking-widest text-blue-200 sm:block">
              UniDoxia admissions
            </p>
            <h1 className="flex items-center gap-2 text-base font-semibold sm:mt-1 sm:text-2xl">
              <MessagesSquare className="h-5 w-5" />
              Student communication centre
            </h1>
            <p className="mt-1 hidden text-xs text-slate-300 sm:block">
              Find a student. Choose a channel. Keep the next step clear.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-8 border-white/30 bg-transparent px-3 text-xs text-white hover:bg-white/10 hover:text-white sm:h-10 sm:text-sm"
            onClick={() =>
              anyDirty ? setShowTeamWarning(true) : onTeamInbox()
            }
          >
            Team inbox & Zoe
          </Button>
        </header>
        {capabilities.isError && (
          <p
            role="status"
            className="mb-3 shrink-0 rounded-lg border border-amber-600/30 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            Direct email and shared communication history are awaiting setup.
            WhatsApp launch, email-app drafts and internal chat remain
            available.
          </p>
        )}
        <div className="flex min-h-0 flex-1 gap-4">
          <section
            aria-label="Find students"
            className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:w-64 xl:w-72`}
          >
            <div className="shrink-0 space-y-3 border-b p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                Students
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {list.data?.total ?? "—"}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Search students"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email or reference"
                  className="pl-9"
                />
              </div>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              role="region"
              aria-label="Student contacts"
              tabIndex={0}
            >
              {list.isPending ? (
                <p role="status" className="p-4 text-sm">
                  Loading students…
                </p>
              ) : list.isError ? (
                <div className="p-4 text-sm">
                  <p role="alert">Students could not be loaded.</p>
                  <Button variant="link" onClick={() => void list.refetch()}>
                    Try again
                  </Button>
                </div>
              ) : !list.data?.rows.length ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No students match this search.
                </p>
              ) : (
                list.data.rows.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => select(student.id)}
                    aria-pressed={selectedId === student.id}
                    className={`block w-full border-b p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selectedId === student.id ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
                  >
                    <span className="block truncate font-semibold">
                      {studentName(student)}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {student.reference_code || "No reference"} ·{" "}
                      {student.contact_email || "Email not recorded"}
                    </span>
                    {dirty[student.id] && (
                      <span className="mt-1 block text-xs font-medium text-primary">
                        Draft kept in this session
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="flex shrink-0 items-center justify-between border-t p-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous student page"
                disabled={!page || list.isFetching}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Page {page + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next student page"
                disabled={
                  (page + 1) * SIZE >= (list.data?.total ?? 0) ||
                  list.isFetching
                }
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
          <section
            className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1 flex-col`}
            aria-label="Selected student communication"
          >
            {selectedId && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 shrink-0 self-start lg:hidden"
                onClick={() => select(null)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Students
              </Button>
            )}
            {!selectedId ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed bg-card p-6 text-center">
                <div className="max-w-sm space-y-3">
                  <MessagesSquare className="mx-auto h-10 w-10 text-primary" />
                  <h2 className="text-lg font-semibold">
                    Start with a student
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Search by name, email or reference to open their contact
                    details, applications and communication options.
                  </p>
                </div>
              </div>
            ) : detail.isPending ? (
              <p role="status" className="p-4">
                Loading student details…
              </p>
            ) : detail.isError ? (
              <div className="space-y-2 p-4">
                <p role="alert">
                  This student could not be loaded or access is unavailable.
                </p>
                <Button variant="outline" onClick={() => void detail.refetch()}>
                  Try again
                </Button>
              </div>
            ) : null}
            {Object.values(opened).map((student) => (
              <div
                key={`${scope}:${student.id}`}
                style={{
                  display:
                    student.id === selectedId &&
                    !detail.isError &&
                    !detail.isPending
                      ? "flex"
                      : "none",
                }}
                className="min-h-0 flex-1 flex-col"
              >
                <CommunicationWorkspace
                  student={student}
                  capabilities={capabilities.data ?? null}
                  initialChannel={params.get("channel") ?? "email"}
                  active={student.id === selectedId}
                  onDirtyChange={(value) => updateDirty(student.id, value)}
                />
              </div>
            ))}
          </section>
        </div>
        <AlertDialog open={showTeamWarning} onOpenChange={setShowTeamWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Leave your communication drafts?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Drafts are kept while switching students in this centre. Leaving
                for the team inbox will clear them. Check any pending email
                attempt in history before creating a duplicate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction onClick={onTeamInbox}>
                Leave centre
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MessagingViewport>
    </DashboardLayout>
  );
}

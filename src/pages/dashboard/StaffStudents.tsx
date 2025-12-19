"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Download,
  Loader2,
  Mail,
  Search,
  UserCircle,
} from "lucide-react";

import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserConfig } from "@/lib/supabaseClientConfig";
import StaffStudentsTable from "@/components/staff/StaffStudentsTable";
import AgentStudentsManager from "@/components/agent/AgentStudentsManager";

const { url: SUPABASE_URL, functionsUrl: SUPABASE_FUNCTIONS_URL } =
  getSupabaseBrowserConfig();
const FUNCTIONS_BASE = (
  SUPABASE_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`
).replace(/\/+$/, "");

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

interface ApplicationSummary {
  id: string;
  status: ApplicationStatus | null;
  updatedAt: string | null;
  programName: string | null;
  universityName: string | null;
  universityCountry: string | null;
  agentName: string | null;
}

interface StudentRecord {
  assignmentId: string;
  studentId: string;
  name: string;
  email: string;
  country: string;
  displayStatus: string;
  rawStatus: ApplicationStatus | null;
  pipelineStatus: ApplicationStatus | null;
  latestApplicationId: string | null;
  updatedAt: string | null;
  course: string | null;
  university: string | null;
  agentName: string | null;
  nationality: string | null;
  applications: ApplicationSummary[];
}

const STATUS_PIPELINE: { value: ApplicationStatus; label: string }[] = [
  { value: "screening", label: "Under Review" },
  { value: "conditional_offer", label: "Offer" },
  { value: "visa", label: "Visa" },
  { value: "enrolled", label: "Enrolled" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  screening: "Under Review",
  conditional_offer: "Offer",
  unconditional_offer: "Offer",
  cas_loa: "Visa",
  visa: "Visa",
  enrolled: "Enrolled",
  withdrawn: "Withdrawn",
  deferred: "Deferred",
};

const STATUS_PIPELINE_NORMALIZATION: Record<string, ApplicationStatus> = {
  draft: "screening",
  submitted: "screening",
  screening: "screening",
  conditional_offer: "conditional_offer",
  unconditional_offer: "conditional_offer",
  cas_loa: "visa",
  visa: "visa",
  enrolled: "enrolled",
};

const ACTIVE_STATUSES = new Set<ApplicationStatus | null>([
  "screening",
  "conditional_offer",
  "unconditional_offer",
  "cas_loa",
  "visa",
]);

const formatDate = (value: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

const deriveDisplayStatus = (status: ApplicationStatus | null) =>
  STATUS_LABELS[status ?? ""] ??
  (status ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "No Application");

const derivePipelineStatus = (status: ApplicationStatus | null) =>
  STATUS_PIPELINE_NORMALIZATION[status ?? ""] ?? null;

interface StatusPipelineProps {
  applicationId: string | null;
  currentStatus: ApplicationStatus | null;
  onChange: (nextStatus: ApplicationStatus) => void;
  updating: boolean;
}

function StatusPipeline({
  applicationId,
  currentStatus,
  onChange,
  updating,
}: StatusPipelineProps) {
  if (!applicationId) return <Badge variant="outline">No Application</Badge>;
  const pipelineStatus = derivePipelineStatus(currentStatus);
  const activeIndex = STATUS_PIPELINE.findIndex(
    (stage) => stage.value === pipelineStatus
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      {STATUS_PIPELINE.map((stage, index) => {
        const isActive = activeIndex === index;
        const isCompleted = activeIndex > index;
        return (
          <Fragment key={stage.value}>
            <Button
              type="button"
              size="sm"
              variant={isActive ? "default" : "secondary"}
              disabled={updating}
              className={cn(
                "h-7 rounded-full px-3 text-xs",
                isCompleted && "bg-success/10 text-success",
                isActive && "bg-primary text-primary-foreground"
              )}
              onClick={() => onChange(stage.value)}
            >
              {stage.label}
            </Button>
            {index < STATUS_PIPELINE.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function StaffStudents() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const isAgent = profile?.role === "agent";

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    if (isAgent) {
      setStudents([]);
      setLoading(false);
      return;
    }

    if (!profile?.id) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_assignments")
        .select(
          `id, assigned_at, student:students (
            id, preferred_name, legal_name, contact_email, current_country, nationality, updated_at,
            applications (
              id, status, updated_at,
              program:programs ( name, university:universities ( name, country ) ),
              agent:agents ( id, profile:profiles ( full_name ) )
            )
          )`
        )
        .eq("counselor_id", profile.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((assignment: any) => {
        const student = assignment.student;
        if (!student) return null;

        const apps = (student.applications ?? []).sort(
          (a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        const latest = apps[0];
        return {
          assignmentId: assignment.id,
          studentId: student.id,
          name: student.preferred_name ?? student.legal_name ?? "Unnamed",
          email: student.contact_email ?? "",
          country: student.current_country ?? student.nationality ?? "",
          displayStatus: deriveDisplayStatus(latest?.status ?? null),
          rawStatus: latest?.status ?? null,
          pipelineStatus: derivePipelineStatus(latest?.status ?? null),
          latestApplicationId: latest?.id ?? null,
          updatedAt: latest?.updated_at ?? student.updated_at ?? null,
          course: latest?.program?.name ?? null,
          university: latest?.program?.university?.name ?? null,
          agentName: latest?.agent?.profile?.full_name ?? null,
          nationality: student.nationality,
          applications: apps.map((a: any) => ({
            id: a.id,
            status: a.status,
            updatedAt: a.updated_at,
            programName: a.program?.name ?? null,
            universityName: a.program?.university?.name ?? null,
            universityCountry: a.program?.university?.country ?? null,
            agentName: a.agent?.profile?.full_name ?? null,
          })),
        } as StudentRecord;
      });

      setStudents(mapped.filter(Boolean));
    } catch (error) {
      console.error("Failed to load students", error);
      toast({
        title: "Error",
        description: "Failed to load assigned students.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAgent, profile?.id, toast]);

  useEffect(() => {
    if (!authLoading && !isAgent) void fetchStudents();
  }, [authLoading, fetchStudents, isAgent]);

  if (!authLoading && isAgent) {
    return (
      <DashboardLayout showToolbarBackButton={false}>
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <BackButton fallback="/dashboard" label="Back" />
          <AgentStudentsManager />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <BackButton fallback="/dashboard" label="Back" />

        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          {/* @ts-expect-error - Component props type mismatch */}
          <StaffStudentsTable students={students} loading={loading} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

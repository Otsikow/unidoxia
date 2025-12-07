import { useState, useMemo } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";

// Components
import ProgramTable from "./components/ProgramTable";
import ProgramForm, { ProgramFormValues } from "./components/ProgramForm";
import ProgramViewDialog from "./components/ProgramViewDialog";
import ProgramDeleteDialog from "./components/ProgramDeleteDialog";

// Utilities
import { getSuggestedCurrencyForCountry } from "@/lib/universityProfile";
import { LoadingState } from "@/components/LoadingState";
import { StatePlaceholder } from "@/components/university/common/StatePlaceholder";

const defaultValues: ProgramFormValues = {
  name: "",
  level: "Master",
  discipline: "",
  durationMonths: 12,
  tuitionCurrency: "USD",
  tuitionAmount: 10000,
  applicationFee: null,
  seatsAvailable: null,
  ieltsOverall: null,
  toeflOverall: null,
  intakeMonths: [9],
  entryRequirements: "",
  description: "",
  imageUrl: null,
  active: true,
};

export default function ProgramsPage() {
  const { data, refetch, isLoading } = useUniversityDashboard();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const tenantId = data?.university?.tenant_id ?? profile?.tenant_id ?? null;
  const universityId = data?.university?.id ?? null;

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<any | null>(null);
  const [viewProgram, setViewProgram] = useState<any | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const programs = data?.programs ?? [];

  const levelOptions = useMemo(() => {
    const unique = new Set<string>();
    programs.forEach((p) => p.level && unique.add(p.level));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [programs]);

  const combinedLevelOptions = useMemo(() => {
    const defaults = [
      "Foundation",
      "Diploma",
      "Bachelor",
      "Master",
      "Doctorate",
      "Certificate",
      "Executive",
      "Short Course",
    ];

    const all = new Set(defaults);
    programs.forEach((p) => all.add(p.level));

    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [programs]);

  const suggestedCurrency = useMemo(() => {
    return getSuggestedCurrencyForCountry(data?.university?.country ?? null);
  }, [data?.university?.country]);

  const createInitialValues = useMemo(
    () => ({
      ...defaultValues,
      tuitionCurrency: suggestedCurrency ?? defaultValues.tuitionCurrency,
    }),
    [suggestedCurrency]
  );

  const editInitialValues = useMemo(() => {
    if (!editProgram) return null;

    return {
      name: editProgram.name,
      level: editProgram.level,
      discipline: editProgram.discipline ?? "",
      durationMonths: editProgram.duration_months ?? 12,
      tuitionCurrency: editProgram.tuition_currency ?? suggestedCurrency ?? "USD",
      tuitionAmount: Number(editProgram.tuition_amount ?? 10000),
      applicationFee: editProgram.app_fee ?? null,
      seatsAvailable: editProgram.seats_available ?? null,
      ieltsOverall: editProgram.ielts_overall ?? null,
      toeflOverall: editProgram.toefl_overall ?? null,
      intakeMonths:
        editProgram.intake_months?.length > 0
          ? editProgram.intake_months
          : [9],
      entryRequirements: (editProgram.entry_requirements ?? []).join("\n"),
      description: editProgram.description ?? "",
      imageUrl: editProgram.image_url ?? null,
      active: Boolean(editProgram.active),
    };
  }, [editProgram, suggestedCurrency]);

  /** Check if PostgreSQL error indicates a missing column */
  const isMissingColumnError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const code = (error as any).code ?? "";
    const message = ((error as any).message ?? "").toLowerCase();
    return code === "42703" || message.includes("image_url");
  };

  /** CREATE PROGRAM */
  const handleCreate = async (values: ProgramFormValues) => {
    if (!tenantId || !universityId) {
      toast({
        title: "Missing account information",
        description: "Could not verify university account.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const basePayload = {
        name: values.name.trim(),
        level: values.level.trim(),
        discipline: values.discipline.trim(),
        duration_months: values.durationMonths,
        tuition_currency: values.tuitionCurrency,
        tuition_amount: values.tuitionAmount,
        app_fee: values.applicationFee,
        seats_available: values.seatsAvailable,
        ielts_overall: values.ieltsOverall,
        toefl_overall: values.toeflOverall,
        intake_months: values.intakeMonths.sort((a, b) => a - b),
        entry_requirements: values.entryRequirements
          ? values.entryRequirements
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
          : [],
        description: values.description?.trim() || null,
        active: values.active,
        tenant_id: tenantId,
        university_id: universityId,
      };

      const payloadWithImage = { ...basePayload, image_url: values.imageUrl };

      const { error } = await supabase.from("programs").insert(payloadWithImage);

      if (error) {
        if (isMissingColumnError(error)) {
          const { error: retryError } = await supabase
            .from("programs")
            .insert(basePayload);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      toast({ title: "Programme created" });
      setCreateOpen(false);
      await refetch();
    } catch (err) {
      toast({
        title: "Unable to create programme",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** UPDATE PROGRAM */
  const handleUpdate = async (values: ProgramFormValues) => {
    if (!editProgram) return;

    if (!tenantId || !universityId) {
      toast({
        title: "Missing account information",
        description: "Could not verify university account.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const basePayload = {
        name: values.name.trim(),
        level: values.level.trim(),
        discipline: values.discipline.trim(),
        duration_months: values.durationMonths,
        tuition_currency: values.tuitionCurrency,
        tuition_amount: values.tuitionAmount,
        app_fee: values.applicationFee,
        seats_available: values.seatsAvailable,
        ielts_overall: values.ieltsOverall,
        toefl_overall: values.toeflOverall,
        intake_months: values.intakeMonths.sort((a, b) => a - b),
        entry_requirements: values.entryRequirements
          ? values.entryRequirements
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
          : [],
        description: values.description?.trim() || null,
        active: values.active,
      };

      const payloadWithImage = { ...basePayload, image_url: values.imageUrl };

      const { error } = await supabase
        .from("programs")
        .update(payloadWithImage)
        .eq("id", editProgram.id)
        .eq("university_id", universityId)
        .eq("tenant_id", tenantId);

      if (error) {
        if (isMissingColumnError(error)) {
          const { error: retryError } = await supabase
            .from("programs")
            .update(basePayload)
            .eq("id", editProgram.id)
            .eq("university_id", universityId)
            .eq("tenant_id", tenantId);

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      toast({ title: "Programme updated" });
      setEditProgram(null);
      await refetch();
    } catch (err) {
      toast({
        title: "Unable to update programme",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** TOGGLE ACTIVE/INACTIVE */
  const handleToggleActive = async (id: string, active: boolean) => {
    if (!tenantId || !universityId) {
      toast({
        title: "Missing account information",
        description: "Could not verify university account.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingId(id);

    try {
      const { error } = await supabase
        .from("programs")
        .update({ active })
        .eq("id", id)
        .eq("university_id", universityId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "Programme updated",
        description: `Programme is now ${active ? "active" : "inactive"}.`,
      });

      await refetch();
    } catch (err) {
      toast({
        title: "Unable to update programme",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  /** DELETE PROGRAM */
  const handleDelete = async () => {
    if (!deleteId) return;
    if (!tenantId || !universityId) {
      toast({
        title: "Missing account information",
        description: "Could not verify university account.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("id", deleteId)
        .eq("university_id", universityId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({ title: "Programme deleted" });

      setDeleteId(null);
      await refetch();
    } catch (err) {
      toast({
        title: "Unable to delete programme",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return <LoadingState message="Loading programmes..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Programmes</h1>
        <p className="text-sm text-muted-foreground">
          Manage your university programmes in UniDoxia.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Programme catalogue</CardTitle>
            <CardDescription className="text-xs">
              {programs.length} programme{programs.length === 1 ? "" : "s"} connected to your university.
            </CardDescription>
          </div>

          <Button
            className="w-full sm:w-auto gap-2 bg-blue-500 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add programme
          </Button>
        </CardHeader>

        <CardContent>
          {programs.length === 0 ? (
            <StatePlaceholder
              title="No programmes found"
              description="Add programmes to populate your catalogue."
              action={
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  Add your first programme
                </Button>
              }
            />
          ) : (
            <ProgramTable
              programs={programs}
              searchTerm={search}
              onSearchChange={setSearch}
              levelFilter={levelFilter}
              levelOptions={levelOptions}
              onLevelFilterChange={setLevelFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onToggleActive={handleToggleActive}
              updatingId={updatingId}
              onView={(p) => setViewProgram(p)}
              onEdit={(p) => setEditProgram(p)}
              onDelete={(id) => setDeleteId(id)}
            />
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <ProgramForm
          initialValues={createInitialValues}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          isSubmitting={isSubmitting}
          submitLabel="Create programme"
          levelOptions={combinedLevelOptions}
          tenantId={tenantId}
          userId={user?.id ?? null}
          title="Create New Programme"
          description="Add a new academic programme to your catalogue."
        />
      )}

      {editProgram && editInitialValues && (
        <ProgramForm
          initialValues={editInitialValues}
          onSubmit={handleUpdate}
          onCancel={() => setEditProgram(null)}
          isSubmitting={isSubmitting}
          submitLabel="Save changes"
          levelOptions={combinedLevelOptions}
          tenantId={tenantId}
          userId={user?.id ?? null}
          title="Edit Programme"
          description="Update the details for this programme."
        />
      )}

      <ProgramViewDialog
        program={viewProgram}
        open={Boolean(viewProgram)}
        onClose={() => setViewProgram(null)}
      />

      <ProgramDeleteDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </div>
  );
}

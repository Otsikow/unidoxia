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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<any | null>(null);
  const [viewProgram, setViewProgram] = useState<any | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
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

      toast({ title: "Course created" });
      setCreateOpen(false);
      // Trigger a background refresh so the list updates without blocking the UI
      void refetch();
    } catch (err) {
      toast({
        title: "Unable to create course",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** SAVE DRAFT */
  const handleSaveDraft = async (values: Partial<ProgramFormValues>) => {
    if (!tenantId || !universityId) {
      toast({
        title: "Missing account information",
        description: "Could not verify university account.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDraft(true);

    try {
      const basePayload = {
        name: values.name?.trim() || "Untitled Draft",
        level: values.level?.trim() || "Master",
        discipline: values.discipline?.trim() || "",
        duration_months: values.durationMonths || 12,
        tuition_currency: values.tuitionCurrency || "USD",
        tuition_amount: values.tuitionAmount || 0,
        app_fee: values.applicationFee ?? null,
        seats_available: values.seatsAvailable ?? null,
        ielts_overall: values.ieltsOverall ?? null,
        toefl_overall: values.toeflOverall ?? null,
        intake_months: values.intakeMonths?.length ? values.intakeMonths.sort((a, b) => a - b) : [9],
        entry_requirements: values.entryRequirements
          ? values.entryRequirements
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
          : [],
        description: values.description?.trim() || null,
        active: false, // Drafts are not active by default
        is_draft: true,
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

      toast({ 
        title: "Draft saved",
        description: "You can continue editing this course later from your course list."
      });
      setCreateOpen(false);
      // Trigger a background refresh so the list updates without blocking the UI
      void refetch();
    } catch (err) {
      toast({
        title: "Unable to save draft",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
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
      // When saving/updating a course, mark it as no longer a draft
      const wasDraft = editProgram.is_draft === true;
      
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
        is_draft: false, // Mark as published when saving
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

      toast({ 
        title: wasDraft ? "Course published" : "Course updated",
        description: wasDraft ? "Your draft has been published successfully." : undefined
      });
      setEditProgram(null);
      await refetch();
    } catch (err) {
      toast({
        title: "Unable to update course",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** UPDATE DRAFT (Save changes to an existing draft without publishing) */
  const handleUpdateDraft = async (values: Partial<ProgramFormValues>) => {
    if (!editProgram) return;

    if (!tenantId || !universityId) {
      toast({
        title: "Missing account information",
        description: "Could not verify university account.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDraft(true);

    try {
      const basePayload = {
        name: values.name?.trim() || editProgram.name || "Untitled Draft",
        level: values.level?.trim() || editProgram.level || "Master",
        discipline: values.discipline?.trim() || editProgram.discipline || "",
        duration_months: values.durationMonths || editProgram.duration_months || 12,
        tuition_currency: values.tuitionCurrency || editProgram.tuition_currency || "USD",
        tuition_amount: values.tuitionAmount ?? editProgram.tuition_amount ?? 0,
        app_fee: values.applicationFee ?? editProgram.app_fee ?? null,
        seats_available: values.seatsAvailable ?? editProgram.seats_available ?? null,
        ielts_overall: values.ieltsOverall ?? editProgram.ielts_overall ?? null,
        toefl_overall: values.toeflOverall ?? editProgram.toefl_overall ?? null,
        intake_months: values.intakeMonths?.length 
          ? values.intakeMonths.sort((a, b) => a - b) 
          : editProgram.intake_months ?? [9],
        entry_requirements: values.entryRequirements
          ? values.entryRequirements
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
          : editProgram.entry_requirements ?? [],
        description: values.description?.trim() || editProgram.description || null,
        active: false, // Drafts stay inactive
        is_draft: true, // Keep as draft
      };

      const payloadWithImage = { ...basePayload, image_url: values.imageUrl ?? editProgram.image_url };

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

      toast({ 
        title: "Draft saved",
        description: "Your changes have been saved."
      });
      setEditProgram(null);
      await refetch();
    } catch (err) {
      toast({
        title: "Unable to save draft",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
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
        title: "Course updated",
        description: `Course is now ${active ? "active" : "inactive"}.`,
      });

      await refetch();
    } catch (err) {
      toast({
        title: "Unable to update course",
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

      toast({ title: "Course deleted" });

      setDeleteId(null);
      await refetch();
    } catch (err) {
      toast({
        title: "Unable to delete course",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return <LoadingState message="Loading courses..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="text-sm text-muted-foreground">
          Manage your university courses in UniDoxia.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Course catalogue</CardTitle>
            <CardDescription className="text-xs">
              {programs.length} course{programs.length === 1 ? "" : "s"} connected to your university.
            </CardDescription>
          </div>

          <Button
            className="w-full sm:w-auto gap-2 bg-blue-500 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add course
          </Button>
        </CardHeader>

        <CardContent>
          {/* 
            EMPTY STATE: New universities start with zero programs.
            This ensures a clean slate - no pre-existing programs from other institutions.
          */}
          {programs.length === 0 ? (
            <StatePlaceholder
              title="Your course catalogue is empty"
              description="You're starting fresh! Add your academic courses to attract students and make them visible to agents worldwide."
              action={
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  Add your first course
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
          onSaveDraft={handleSaveDraft}
          onCancel={() => setCreateOpen(false)}
          isSubmitting={isSubmitting}
          isSavingDraft={isSavingDraft}
          submitLabel="Create course"
          levelOptions={combinedLevelOptions}
          tenantId={tenantId}
          userId={user?.id ?? null}
          title="Create New Course"
          description="Add a new academic course to your catalogue."
          showSaveDraft={true}
        />
      )}

      {editProgram && editInitialValues && (
        <ProgramForm
          initialValues={editInitialValues}
          onSubmit={handleUpdate}
          onSaveDraft={editProgram.is_draft ? handleUpdateDraft : undefined}
          onCancel={() => setEditProgram(null)}
          isSubmitting={isSubmitting}
          isSavingDraft={isSavingDraft}
          submitLabel={editProgram.is_draft ? "Publish course" : "Save changes"}
          levelOptions={combinedLevelOptions}
          tenantId={tenantId}
          userId={user?.id ?? null}
          title={editProgram.is_draft ? "Complete Draft Course" : "Edit Course"}
          description={editProgram.is_draft 
            ? "Complete the details and publish this course, or save your changes as a draft."
            : "Update the details for this course."
          }
          showSaveDraft={editProgram.is_draft === true}
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

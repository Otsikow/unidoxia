import { useState, useEffect, useCallback } from "react";
import { 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Edit3, 
  GraduationCap, 
  Loader2, 
  MapPin, 
  Save, 
  Trash2, 
  Users, 
  X,
  Building2,
  FileText,
  Award,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProgrammeDetails {
  id: string;
  name: string;
  university_id: string;
  university_name: string;
  country: string;
  level: string;
  discipline: string;
  duration_months: number;
  tuition_amount: number;
  tuition_currency: string;
  intake_months: number[];
  ielts_overall: number | null;
  toefl_overall: number | null;
  seats_available: number | null;
  description: string | null;
  active: boolean;
  applications_count: number;
  created_at: string;
  updated_at: string;
}

interface ProgrammeDetailsSheetProps {
  programmeId: string | null;
  tenantId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const LEVELS = ["Bachelor", "Master", "PhD", "Diploma", "Certificate"];
const DISCIPLINES = [
  "Computer Science",
  "Business Administration",
  "Engineering",
  "Health & Medicine",
  "Humanities",
  "Arts",
  "Law",
  "Natural Sciences",
  "Social Sciences",
  "Education",
];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR"];
const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const ProgrammeDetailsSheet = ({
  programmeId,
  tenantId,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: ProgrammeDetailsSheetProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [programme, setProgramme] = useState<ProgrammeDetails | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    level: "",
    discipline: "",
    duration_months: "",
    tuition_amount: "",
    tuition_currency: "USD",
    intake_months: [] as number[],
    ielts_overall: "",
    toefl_overall: "",
    seats_available: "",
    description: "",
    active: true,
  });

  const fetchProgramme = useCallback(async () => {
    if (!programmeId || !tenantId) return;

    setLoading(true);
    try {
      // Fetch course details
      const { data: programData, error: programError } = await supabase
        .from("programs")
        .select(`
          id,
          name,
          university_id,
          level,
          discipline,
          duration_months,
          tuition_amount,
          tuition_currency,
          intake_months,
          ielts_overall,
          toefl_overall,
          seats_available,
          description,
          active,
          created_at,
          updated_at,
          university:universities (
            name,
            country
          )
        `)
        .eq("id", programmeId)
        .eq("tenant_id", tenantId)
        .single();

      if (programError) throw programError;

      // Fetch applications count
      const { count: appsCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programmeId)
        .eq("tenant_id", tenantId);

      const universityData = programData.university as { name?: string; country?: string } | null;

      const details: ProgrammeDetails = {
        id: programData.id,
        name: programData.name,
        university_id: programData.university_id,
        university_name: universityData?.name || "Unknown University",
        country: universityData?.country || "Not specified",
        level: programData.level,
        discipline: programData.discipline,
        duration_months: programData.duration_months,
        tuition_amount: programData.tuition_amount,
        tuition_currency: programData.tuition_currency || "USD",
        intake_months: programData.intake_months || [1, 9],
        ielts_overall: programData.ielts_overall,
        toefl_overall: programData.toefl_overall,
        seats_available: programData.seats_available,
        description: programData.description,
        active: programData.active ?? true,
        applications_count: appsCount || 0,
        created_at: programData.created_at,
        updated_at: programData.updated_at,
      };

      setProgramme(details);

      // Initialize edit form
      setEditForm({
        name: details.name,
        level: details.level,
        discipline: details.discipline,
        duration_months: details.duration_months.toString(),
        tuition_amount: details.tuition_amount.toString(),
        tuition_currency: details.tuition_currency,
        intake_months: details.intake_months,
        ielts_overall: details.ielts_overall?.toString() || "",
        toefl_overall: details.toefl_overall?.toString() || "",
        seats_available: details.seats_available?.toString() || "",
        description: details.description || "",
        active: details.active,
      });
    } catch (error) {
      console.error("Error fetching course:", error);
      toast({
        title: "Error",
        description: "Failed to load course details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [programmeId, tenantId, toast]);

  useEffect(() => {
    if (open && programmeId) {
      fetchProgramme();
    }
  }, [open, programmeId, fetchProgramme]);

  const handleSave = async () => {
    if (!programmeId || !tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("programs")
        .update({
          name: editForm.name,
          level: editForm.level,
          discipline: editForm.discipline,
          duration_months: parseInt(editForm.duration_months, 10),
          tuition_amount: parseFloat(editForm.tuition_amount),
          tuition_currency: editForm.tuition_currency,
          intake_months: editForm.intake_months,
          ielts_overall: editForm.ielts_overall ? parseFloat(editForm.ielts_overall) : null,
          toefl_overall: editForm.toefl_overall ? parseInt(editForm.toefl_overall, 10) : null,
          seats_available: editForm.seats_available ? parseInt(editForm.seats_available, 10) : null,
          description: editForm.description || null,
          active: editForm.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", programmeId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "Course Updated",
        description: "The course has been successfully updated.",
      });

      setIsEditing(false);
      fetchProgramme();
      onUpdate();
    } catch (error) {
      console.error("Error updating course:", error);
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!programmeId || !tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("id", programmeId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "Course Deleted",
        description: "The course has been permanently deleted.",
      });

      setShowDeleteDialog(false);
      onOpenChange(false);
      onDelete();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (newStatus: boolean) => {
    if (!programmeId || !tenantId) return;

    try {
      const { error } = await supabase
        .from("programs")
        .update({ active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", programmeId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      setProgramme((prev) => (prev ? { ...prev, active: newStatus } : null));
      setEditForm((prev) => ({ ...prev, active: newStatus }));

      toast({
        title: newStatus ? "Course Activated" : "Course Paused",
        description: `The course is now ${newStatus ? "active" : "paused"}.`,
      });

      onUpdate();
    } catch (error) {
      console.error("Error updating course status:", error);
      toast({
        title: "Error",
        description: "Failed to update course status.",
        variant: "destructive",
      });
    }
  };

  const handleIntakeMonthToggle = (month: number) => {
    setEditForm((prev) => ({
      ...prev,
      intake_months: prev.intake_months.includes(month)
        ? prev.intake_months.filter((m) => m !== month)
        : [...prev.intake_months, month].sort((a, b) => a - b),
    }));
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getIntakeMonthsDisplay = (months: number[]) => {
    return months
      .map((m) => MONTHS.find((month) => month.value === m)?.label.slice(0, 3))
      .filter(Boolean)
      .join(", ");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between pr-8">
              <span>{isEditing ? "Edit Course" : "Course Details"}</span>
              {programme && !isEditing && (
                <Badge variant={programme.active ? "default" : "secondary"}>
                  {programme.active ? "Active" : "Paused"}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Make changes to the course details below."
                : "View and manage course information."}
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : programme ? (
            <div className="mt-6 space-y-6">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Course Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select
                        value={editForm.level}
                        onValueChange={(value) => setEditForm((prev) => ({ ...prev, level: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Discipline</Label>
                      <Select
                        value={editForm.discipline}
                        onValueChange={(value) => setEditForm((prev) => ({ ...prev, discipline: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCIPLINES.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (months)</Label>
                      <Input
                        type="number"
                        value={editForm.duration_months}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, duration_months: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Seats Available</Label>
                      <Input
                        type="number"
                        value={editForm.seats_available}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, seats_available: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tuition Amount</Label>
                      <Input
                        type="number"
                        value={editForm.tuition_amount}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, tuition_amount: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={editForm.tuition_currency}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({ ...prev, tuition_currency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IELTS Overall</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editForm.ielts_overall}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, ielts_overall: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>TOEFL Overall</Label>
                      <Input
                        type="number"
                        value={editForm.toefl_overall}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, toefl_overall: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Intake Months</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {MONTHS.map((month) => (
                        <div key={month.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-month-${month.value}`}
                            checked={editForm.intake_months.includes(month.value)}
                            onCheckedChange={() => handleIntakeMonthToggle(month.value)}
                          />
                          <Label htmlFor={`edit-month-${month.value}`} className="text-sm font-normal">
                            {month.label.slice(0, 3)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Course Active</Label>
                    <Switch
                      checked={editForm.active}
                      onCheckedChange={(checked) =>
                        setEditForm((prev) => ({ ...prev, active: checked }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h3 className="text-xl font-semibold">{programme.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{programme.university_name}</span>
                      <span>•</span>
                      <MapPin className="h-4 w-4" />
                      <span>{programme.country}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-semibold">{programme.applications_count}</p>
                      <p className="text-xs text-muted-foreground">Applications</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <GraduationCap className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-semibold">{programme.seats_available || "—"}</p>
                      <p className="text-xs text-muted-foreground">Seats</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-semibold">
                        {formatCurrency(programme.tuition_amount, programme.tuition_currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">Tuition</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Level</p>
                        <p className="text-sm text-muted-foreground">{programme.level}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Discipline</p>
                        <p className="text-sm text-muted-foreground">{programme.discipline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">{programme.duration_months} months</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Intake Months</p>
                        <p className="text-sm text-muted-foreground">
                          {getIntakeMonthsDisplay(programme.intake_months)}
                        </p>
                      </div>
                    </div>

                    {(programme.ielts_overall || programme.toefl_overall) && (
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">English Requirements</p>
                          <p className="text-sm text-muted-foreground">
                            {programme.ielts_overall && `IELTS: ${programme.ielts_overall}`}
                            {programme.ielts_overall && programme.toefl_overall && " / "}
                            {programme.toefl_overall && `TOEFL: ${programme.toefl_overall}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {programme.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">Description</p>
                        <p className="text-sm text-muted-foreground">{programme.description}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Timestamps */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created: {formatDate(programme.created_at)}</p>
                    <p>Last updated: {formatDate(programme.updated_at)}</p>
                  </div>

                  <Separator />

                  {/* Status Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Course Status</p>
                      <p className="text-xs text-muted-foreground">
                        {programme.active ? "Students can apply to this course" : "Applications are paused"}
                      </p>
                    </div>
                    <Switch checked={programme.active} onCheckedChange={handleStatusToggle} />
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsEditing(true)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Course not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{programme?.name}"? This action cannot be undone.
              {programme && programme.applications_count > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This course has {programme.applications_count} application(s) associated with it.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProgrammeDetailsSheet;

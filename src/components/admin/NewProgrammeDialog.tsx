import { useState, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface University {
  id: string;
  name: string;
  country: string;
}

interface NewProgrammeDialogProps {
  tenantId: string | undefined;
  onSuccess: () => void;
  trigger?: React.ReactNode;
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

const NewProgrammeDialog = ({ tenantId, onSuccess, trigger }: NewProgrammeDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [level, setLevel] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [tuitionAmount, setTuitionAmount] = useState("");
  const [tuitionCurrency, setTuitionCurrency] = useState("USD");
  const [intakeMonths, setIntakeMonths] = useState<number[]>([1, 9]);
  const [ieltsOverall, setIeltsOverall] = useState("");
  const [toeflOverall, setToeflOverall] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const fetchUniversities = async () => {
      if (!tenantId || !open) return;

      setLoadingUniversities(true);
      try {
        const { data, error } = await supabase
          .from("universities")
          .select("id, name, country")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("name");

        if (error) throw error;
        setUniversities(data || []);
      } catch (error) {
        console.error("Error fetching universities:", error);
        toast({
          title: "Error",
          description: "Failed to load universities. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingUniversities(false);
      }
    };

    fetchUniversities();
  }, [tenantId, open, toast]);

  const resetForm = () => {
    setName("");
    setUniversityId("");
    setLevel("");
    setDiscipline("");
    setDurationMonths("");
    setTuitionAmount("");
    setTuitionCurrency("USD");
    setIntakeMonths([1, 9]);
    setIeltsOverall("");
    setToeflOverall("");
    setSeatsAvailable("");
    setDescription("");
  };

  const handleIntakeMonthToggle = (month: number) => {
    setIntakeMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId) {
      toast({
        title: "Error",
        description: "Tenant context is required.",
        variant: "destructive",
      });
      return;
    }

    if (!name || !universityId || !level || !discipline || !durationMonths || !tuitionAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("programs").insert({
        tenant_id: tenantId,
        university_id: universityId,
        name,
        level,
        discipline,
        duration_months: parseInt(durationMonths, 10),
        tuition_amount: parseFloat(tuitionAmount),
        tuition_currency: tuitionCurrency,
        intake_months: intakeMonths.length > 0 ? intakeMonths : [1, 9],
        ielts_overall: ieltsOverall ? parseFloat(ieltsOverall) : null,
        toefl_overall: toeflOverall ? parseInt(toeflOverall, 10) : null,
        seats_available: seatsAvailable ? parseInt(seatsAvailable, 10) : null,
        description: description || null,
        active: true,
      });

      if (error) throw error;

      toast({
        title: "Course Created",
        description: `${name} has been successfully created.`,
      });

      resetForm();
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating course:", error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Add a new academic course to your catalogue. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Course Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Master of Computer Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* University */}
            <div className="space-y-2">
              <Label htmlFor="university">University *</Label>
              <Select value={universityId} onValueChange={setUniversityId} required>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUniversities ? "Loading..." : "Select university"} />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id}>
                      {uni.name} ({uni.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select value={level} onValueChange={setLevel} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
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

            {/* Discipline */}
            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline *</Label>
              <Select value={discipline} onValueChange={setDiscipline} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select discipline" />
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

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (months) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="96"
                placeholder="e.g., 24"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                required
              />
            </div>

            {/* Tuition Amount */}
            <div className="space-y-2">
              <Label htmlFor="tuition">Tuition Amount *</Label>
              <Input
                id="tuition"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 45000"
                value={tuitionAmount}
                onChange={(e) => setTuitionAmount(e.target.value)}
                required
              />
            </div>

            {/* Tuition Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={tuitionCurrency} onValueChange={setTuitionCurrency}>
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

            {/* IELTS Score */}
            <div className="space-y-2">
              <Label htmlFor="ielts">IELTS Overall</Label>
              <Input
                id="ielts"
                type="number"
                min="0"
                max="9"
                step="0.5"
                placeholder="e.g., 6.5"
                value={ieltsOverall}
                onChange={(e) => setIeltsOverall(e.target.value)}
              />
            </div>

            {/* TOEFL Score */}
            <div className="space-y-2">
              <Label htmlFor="toefl">TOEFL Overall</Label>
              <Input
                id="toefl"
                type="number"
                min="0"
                max="120"
                placeholder="e.g., 90"
                value={toeflOverall}
                onChange={(e) => setToeflOverall(e.target.value)}
              />
            </div>

            {/* Seats Available */}
            <div className="space-y-2">
              <Label htmlFor="seats">Seats Available</Label>
              <Input
                id="seats"
                type="number"
                min="0"
                placeholder="e.g., 100"
                value={seatsAvailable}
                onChange={(e) => setSeatsAvailable(e.target.value)}
              />
            </div>

            {/* Intake Months */}
            <div className="space-y-2 md:col-span-2">
              <Label>Intake Months</Label>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((month) => (
                  <div key={month.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`month-${month.value}`}
                      checked={intakeMonths.includes(month.value)}
                      onCheckedChange={() => handleIntakeMonthToggle(month.value)}
                    />
                    <Label htmlFor={`month-${month.value}`} className="text-sm font-normal">
                      {month.label.slice(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed description of the course..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProgrammeDialog;

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  BookOpen,
  Building2,
  Globe2,
  Layers3,
  GraduationCap,
  Clock4,
  Shield,
  Sparkles,
  Loader2,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Eye,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import NewProgrammeDialog from "@/components/admin/NewProgrammeDialog";
import ProgrammeDetailsSheet from "@/components/admin/ProgrammeDetailsSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ProgramRecord {
  id: string;
  name: string;
  university: string;
  country: string;
  discipline: string;
  level: string;
  seats: number;
  tuition: string;
  status: "open" | "paused" | "closing";
  applications: number;
  scholarships: string;
  active: boolean;
  tenant_id: string | null;
}

interface ProgramStats {
  activePrograms: number;
  newThisMonth: number;
  avgTuition: string;
  yieldRate: string;
}

interface ReadinessCheck {
  label: string;
  value: number;
  note: string;
}

type SortColumn = "name" | "university" | "country" | "discipline" | "level" | "seats" | "applications" | "status";
type SortDirection = "asc" | "desc";

interface SortConfig {
  column: SortColumn | null;
  direction: SortDirection;
}

const AdminPrograms = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: "asc" });
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Selection state
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());

  // Details sheet state
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  // Bulk action states
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk">("bulk");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const [stats, setStats] = useState<ProgramStats>({
    activePrograms: 0,
    newThisMonth: 0,
    avgTuition: "$0",
    yieldRate: "0%",
  });

  const [readinessChecks, setReadinessChecks] = useState<ReadinessCheck[]>([
    { label: "Content readiness", value: 0, note: "Course pages reviewed for accuracy and brand tone." },
    { label: "Compliance & visas", value: 0, note: "Eligibility, CAS/LOA timelines, and deposit rules validated." },
    { label: "Marketing assets", value: 0, note: "Brochures, webinar decks, and FAQs updated for this intake." },
  ]);

  const fetchProgramData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch programs with university data from all universities
      const { data: programsData, error: programsError } = await supabase
        .from("programs")
        .select(`
          id,
          name,
          level,
          discipline,
          tuition_amount,
          tuition_currency,
          seats_available,
          active,
          created_at,
          description,
          tenant_id,
          university:universities (
            name,
            country
          )
        `)
        .order("created_at", { ascending: false });

      if (programsError) {
        console.error("Error fetching programs:", programsError);
        return;
      }

      // Fetch application counts per program from all tenants
      const { data: applicationCounts } = await supabase
        .from("applications")
        .select("program_id, status");

      // Calculate applications per program and enrolled counts
      const programAppCounts: Record<string, { total: number; enrolled: number }> = {};
      applicationCounts?.forEach((app) => {
        if (app.program_id) {
          if (!programAppCounts[app.program_id]) {
            programAppCounts[app.program_id] = { total: 0, enrolled: 0 };
          }
          programAppCounts[app.program_id].total++;
          if (app.status === "enrolled") {
            programAppCounts[app.program_id].enrolled++;
          }
        }
      });

      // Transform programs data
      const transformedPrograms: ProgramRecord[] = (programsData || []).map((program) => {
        const apps = programAppCounts[program.id] || { total: 0, enrolled: 0 };
        const universityData = program.university as { name?: string; country?: string } | null;

        // Determine status based on active flag and seats
        let status: "open" | "paused" | "closing" = "open";
        if (!program.active) {
          status = "paused";
        } else if (program.seats_available && program.seats_available < 10) {
          status = "closing";
        }

        // Format tuition
        const tuitionAmount = program.tuition_amount || 0;
        const tuitionCurrency = program.tuition_currency || "USD";
        const formattedTuition = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: tuitionCurrency,
          maximumFractionDigits: 0,
        }).format(tuitionAmount);

        // Map discipline for scholarship assignment
        const disciplineScholarships: Record<string, string> = {
          STEM: "Merit & diversity",
          Business: "Dean's list",
          "Health & Medicine": "Employer sponsorship",
          Humanities: "Women in leadership",
          Arts: "Creative excellence",
          Law: "Justice scholars",
        };

        return {
          id: program.id,
          name: program.name,
          university: universityData?.name || "Unknown University",
          country: universityData?.country || "Not specified",
          discipline: program.discipline || "General",
          level: program.level || "Undergraduate",
          seats: program.seats_available || 0,
          tuition: formattedTuition,
          status,
          applications: apps.total,
          scholarships: disciplineScholarships[program.discipline] || "Standard aid",
          active: program.active ?? true,
          tenant_id: (program as any).tenant_id || null,
        };
      });

      setPrograms(transformedPrograms);

      // Calculate stats
      const activeCount = programsData?.filter((p) => p.active).length || 0;

      // Calculate new this month
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonthCount =
        programsData?.filter((p) => new Date(p.created_at) >= firstOfMonth).length || 0;

      // Calculate average tuition
      const totalTuition = programsData?.reduce((sum, p) => sum + (p.tuition_amount || 0), 0) || 0;
      const avgTuitionValue = programsData?.length ? totalTuition / programsData.length : 0;
      const avgTuitionFormatted =
        avgTuitionValue >= 1000
          ? `$${(avgTuitionValue / 1000).toFixed(1)}k`
          : `$${avgTuitionValue.toFixed(0)}`;

      // Calculate yield rate (enrolled / total applications)
      const totalApps = Object.values(programAppCounts).reduce((sum, p) => sum + p.total, 0);
      const totalEnrolled = Object.values(programAppCounts).reduce((sum, p) => sum + p.enrolled, 0);
      const yieldRate = totalApps > 0 ? Math.round((totalEnrolled / totalApps) * 100) : 0;

      setStats({
        activePrograms: activeCount,
        newThisMonth: newThisMonthCount,
        avgTuition: avgTuitionFormatted,
        yieldRate: `${yieldRate}%`,
      });

      // Calculate readiness metrics
      const totalPrograms = programsData?.length || 0;
      const withDescription =
        programsData?.filter((p) => p.description && p.description.length > 50).length || 0;
      const contentReadiness =
        totalPrograms > 0 ? Math.round((withDescription / totalPrograms) * 100) : 0;

      const activePrograms = programsData?.filter((p) => p.active).length || 0;
      const complianceRate = totalPrograms > 0 ? Math.round((activePrograms / totalPrograms) * 100) : 0;

      const withSeats =
        programsData?.filter((p) => p.seats_available && p.seats_available > 0).length || 0;
      const marketingRate = totalPrograms > 0 ? Math.round((withSeats / totalPrograms) * 100) : 0;

      setReadinessChecks([
        {
          label: "Content readiness",
          value: contentReadiness,
          note: "Course pages reviewed for accuracy and brand tone.",
        },
        {
          label: "Compliance & visas",
          value: complianceRate,
          note: "Eligibility, CAS/LOA timelines, and deposit rules validated.",
        },
        {
          label: "Marketing assets",
          value: marketingRate,
          note: "Brochures, webinar decks, and FAQs updated for this intake.",
        },
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching program data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchProgramData();
  }, [fetchProgramData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!tenantId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel("programs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, () =>
        fetchProgramData()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "universities" }, () =>
        fetchProgramData()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () =>
        fetchProgramData()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Programs real-time subscription active");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, fetchProgramData]);

  // Filter programs based on search and tab
  const filteredPrograms = useMemo(() => {
    let filtered = programs;

    // Filter by tab (discipline)
    if (activeTab === "stem") {
      filtered = filtered.filter(
        (p) =>
          p.discipline.toLowerCase().includes("stem") ||
          p.discipline.toLowerCase().includes("science") ||
          p.discipline.toLowerCase().includes("technology") ||
          p.discipline.toLowerCase().includes("engineering") ||
          p.discipline.toLowerCase().includes("math") ||
          p.discipline.toLowerCase().includes("computer")
      );
    } else if (activeTab === "business") {
      filtered = filtered.filter(
        (p) =>
          p.discipline.toLowerCase().includes("business") ||
          p.discipline.toLowerCase().includes("finance") ||
          p.discipline.toLowerCase().includes("management")
      );
    } else if (activeTab === "health") {
      filtered = filtered.filter(
        (p) =>
          p.discipline.toLowerCase().includes("health") ||
          p.discipline.toLowerCase().includes("medicine") ||
          p.discipline.toLowerCase().includes("nursing")
      );
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.university.toLowerCase().includes(query) ||
          p.country.toLowerCase().includes(query) ||
          p.discipline.toLowerCase().includes(query)
      );
    }

    // Sort by selected column
    if (sortConfig.column) {
      filtered = [...filtered].sort((a, b) => {
        const column = sortConfig.column!;
        let aValue: string | number = a[column];
        let bValue: string | number = b[column];

        // Handle numeric columns
        if (column === "seats" || column === "applications") {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          // Convert to lowercase strings for text comparison
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [programs, activeTab, searchQuery, sortConfig]);

  // Selection handlers
  const isAllSelected = filteredPrograms.length > 0 && filteredPrograms.every((p) => selectedPrograms.has(p.id));
  const isSomeSelected = filteredPrograms.some((p) => selectedPrograms.has(p.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPrograms(new Set());
    } else {
      setSelectedPrograms(new Set(filteredPrograms.map((p) => p.id)));
    }
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  // Sort handler
  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        // Toggle direction or clear sort
        if (prev.direction === "asc") {
          return { column, direction: "desc" };
        } else {
          return { column: null, direction: "asc" };
        }
      }
      // New column, start with ascending
      return { column, direction: "asc" };
    });
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
    );
  };

  // Bulk action handlers
  const handleBulkActivate = async () => {
    if (selectedPrograms.size === 0) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("programs")
        .update({ active: true, updated_at: new Date().toISOString() })
        .in("id", Array.from(selectedPrograms));

      if (error) throw error;

      toast({
        title: "Courses Activated",
        description: `${selectedPrograms.size} course(s) have been activated.`,
      });

      setSelectedPrograms(new Set());
      fetchProgramData();
    } catch (error) {
      console.error("Error activating courses:", error);
      toast({
        title: "Error",
        description: "Failed to activate courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkPause = async () => {
    if (selectedPrograms.size === 0) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("programs")
        .update({ active: false, updated_at: new Date().toISOString() })
        .in("id", Array.from(selectedPrograms));

      if (error) throw error;

      toast({
        title: "Courses Paused",
        description: `${selectedPrograms.size} course(s) have been paused.`,
      });

      setSelectedPrograms(new Set());
      fetchProgramData();
    } catch (error) {
      console.error("Error pausing courses:", error);
      toast({
        title: "Error",
        description: "Failed to pause courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPrograms.size === 0) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("programs")
        .delete()
        .in("id", Array.from(selectedPrograms));

      if (error) throw error;

      toast({
        title: "Courses Deleted",
        description: `${selectedPrograms.size} course(s) have been deleted.`,
      });

      setSelectedPrograms(new Set());
      setShowDeleteDialog(false);
      fetchProgramData();
    } catch (error) {
      console.error("Error deleting courses:", error);
      toast({
        title: "Error",
        description: "Failed to delete courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSingleDelete = async () => {
    if (!singleDeleteId) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("id", singleDeleteId);

      if (error) throw error;

      toast({
        title: "Course Deleted",
        description: "The course has been deleted.",
      });

      setSingleDeleteId(null);
      setShowDeleteDialog(false);
      fetchProgramData();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleQuickStatusToggle = async (programId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("programs")
        .update({ active: !currentActive, updated_at: new Date().toISOString() })
        .eq("id", programId);

      if (error) throw error;

      toast({
        title: currentActive ? "Course Paused" : "Course Activated",
        description: `The course is now ${currentActive ? "paused" : "active"}.`,
      });

      fetchProgramData();
    } catch (error) {
      console.error("Error toggling course status:", error);
      toast({
        title: "Error",
        description: "Failed to update course status.",
        variant: "destructive",
      });
    }
  };

  const openProgrammeDetails = (programId: string) => {
    setSelectedProgrammeId(programId);
    setDetailsSheetOpen(true);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes}m ago`;
  };

  const overviewStats = [
    {
      label: "Active programs",
      value: stats.activePrograms.toString(),
      description: "Verified and listed across campuses",
    },
    {
      label: "New this month",
      value: stats.newThisMonth.toString(),
      description: "Awaiting final content checks",
    },
    { label: "Avg. tuition", value: stats.avgTuition, description: "Across published courses" },
    { label: "Yield", value: stats.yieldRate, description: "Applicants to enrolled" },
  ];

  return (
    <div className="space-y-8">
      <BackButton variant="ghost" size="sm" fallback="/admin" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Curate course inventory, surface top picks for agents, and keep compliance artefacts in
            sync.
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={selectedPrograms.size === 0 || bulkActionLoading}>
                {bulkActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers3 className="h-4 w-4" />
                )}
                Bulk actions
                {selectedPrograms.size > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedPrograms.size}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions for {selectedPrograms.size} selected</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkActivate} className="gap-2">
                <Play className="h-4 w-4" />
                Activate all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkPause} className="gap-2">
                <Pause className="h-4 w-4" />
                Pause all
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setDeleteTarget("bulk");
                  setShowDeleteDialog(true);
                }}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NewProgrammeDialog
            tenantId={tenantId}
            onSuccess={fetchProgramData}
            trigger={
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                New course
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Catalogue</CardTitle>
            <CardDescription>Course performance, intake pacing, and geographic coverage.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 text-sm md:text-right">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock4 className="h-4 w-4" />
              {formatTimeAgo(lastUpdated)} from university portals
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Compliance checks enforced for all edits
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All courses</TabsTrigger>
                <TabsTrigger value="stem">STEM</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="pt-4 text-sm text-muted-foreground">
                End-to-end listing of all active and upcoming intakes across partner universities.
              </TabsContent>
              <TabsContent value="stem" className="pt-4 text-sm text-muted-foreground">
                Computer science, data, engineering, and emerging technology courses.
              </TabsContent>
              <TabsContent value="business" className="pt-4 text-sm text-muted-foreground">
                Business, finance, and management pathways with internship options.
              </TabsContent>
              <TabsContent value="health" className="pt-4 text-sm text-muted-foreground">
                Health sciences, public health, and clinical pathways.
              </TabsContent>
            </Tabs>
            <div className="flex w-full flex-col gap-2 md:w-80">
              <Input
                placeholder="Search courses, universities, or countries"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Highlighting courses with strong graduate outcomes
              </p>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all courses"
                      className={isSomeSelected && !isAllSelected ? "opacity-50" : ""}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Course
                      <SortIndicator column="name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("university")}
                  >
                    <div className="flex items-center">
                      University
                      <SortIndicator column="university" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("country")}
                  >
                    <div className="flex items-center">
                      Country
                      <SortIndicator column="country" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("discipline")}
                  >
                    <div className="flex items-center">
                      Discipline
                      <SortIndicator column="discipline" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("level")}
                  >
                    <div className="flex items-center">
                      Level
                      <SortIndicator column="level" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors text-right"
                    onClick={() => handleSort("seats")}
                  >
                    <div className="flex items-center justify-end">
                      Seats
                      <SortIndicator column="seats" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors text-right"
                    onClick={() => handleSort("applications")}
                  >
                    <div className="flex items-center justify-end">
                      Applications
                      <SortIndicator column="applications" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIndicator column="status" />
                    </div>
                  </TableHead>
                  <TableHead>Scholarships</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading courses...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No courses match your search" : "No courses found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrograms.map((program) => (
                    <TableRow
                      key={program.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={(e) => {
                        // Don't open details if clicking on checkbox or action button
                        if ((e.target as HTMLElement).closest('[role="checkbox"]') ||
                            (e.target as HTMLElement).closest('button')) {
                          return;
                        }
                        openProgrammeDetails(program.id);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPrograms.has(program.id)}
                          onCheckedChange={() => handleSelectProgram(program.id)}
                          aria-label={`Select ${program.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{program.name}</TableCell>
                      <TableCell className="text-muted-foreground">{program.university}</TableCell>
                      <TableCell className="text-muted-foreground">{program.country}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{program.discipline}</Badge>
                      </TableCell>
                      <TableCell>{program.level}</TableCell>
                      <TableCell className="text-right">{program.seats}</TableCell>
                      <TableCell className="text-right">{program.applications}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            program.status === "open"
                              ? "default"
                              : program.status === "closing"
                                ? "secondary"
                                : "destructive"
                          }
                          className="capitalize"
                        >
                          {program.status === "open" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {program.status === "paused" && <XCircle className="mr-1 h-3 w-3" />}
                          {program.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{program.scholarships}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => openProgrammeDetails(program.id)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProgrammeId(program.id);
                                setDetailsSheetOpen(true);
                              }}
                              className="gap-2"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit course
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleQuickStatusToggle(program.id, program.active)}
                              className="gap-2"
                            >
                              {program.active ? (
                                <>
                                  <Pause className="h-4 w-4" />
                                  Pause course
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" />
                                  Activate course
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeleteTarget("single");
                                setSingleDeleteId(program.id);
                                setShowDeleteDialog(true);
                              }}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredPrograms.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {selectedPrograms.size > 0
                  ? `${selectedPrograms.size} of ${filteredPrograms.length} course(s) selected`
                  : `${filteredPrograms.length} course(s)`}
              </span>
              {selectedPrograms.size > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedPrograms(new Set())}>
                  Clear selection
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quality gates</CardTitle>
            <CardDescription>Pre-launch checklist for new courses and intake updates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {["Admissions", "Marketing", "Finance"].map((category, index) => (
              <div key={category} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  {index === 0 && <GraduationCap className="h-4 w-4 text-primary" />}
                  {index === 1 && <BookOpen className="h-4 w-4 text-primary" />}
                  {index === 2 && <Globe2 className="h-4 w-4 text-primary" />}
                  <p className="text-sm font-semibold">{category}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {index === 0 &&
                    "Eligibility, prerequisites, and intake capacity confirmed with registrars."}
                  {index === 1 && "Copy, visuals, and keyword tags aligned to regional campaigns."}
                  {index === 2 && "Tuition, deposits, and agent incentives reconciled with finance."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness checks</CardTitle>
            <CardDescription>Operational confidence for the next intake window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {readinessChecks.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{loading ? "..." : `${item.value}%`}</span>
                </div>
                <Progress value={loading ? 0 : item.value} />
                <p className="text-xs text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Course Details Sheet */}
      <ProgrammeDetailsSheet
        programmeId={selectedProgrammeId}
        tenantId={tenantId}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        onUpdate={fetchProgramData}
        onDelete={fetchProgramData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === "bulk"
                ? `Delete ${selectedPrograms.size} Course(s)`
                : "Delete Course"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "bulk"
                ? `Are you sure you want to delete ${selectedPrograms.size} course(s)? This action cannot be undone.`
                : "Are you sure you want to delete this course? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTarget === "bulk" ? handleBulkDelete : handleSingleDelete}
              disabled={bulkActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPrograms;

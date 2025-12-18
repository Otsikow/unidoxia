import { useMemo } from "react";
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { withUniversitySurfaceTint } from "@/components/university/common/cardStyles";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

const formatCurrency = (currency: string | null, amount: number | null) => {
  if (amount === null || amount === undefined) return "—";

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  });

  try {
    return formatter.format(amount);
  } catch {
    return `${currency ?? "USD"} ${amount}`;
  }
};

interface ProgramTableProps {
  programs: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;

  levelFilter: string;
  levelOptions: string[];
  onLevelFilterChange: (value: string) => void;

  statusFilter: "all" | "active" | "inactive" | "draft";
  onStatusFilterChange: (value: "all" | "active" | "inactive" | "draft") => void;

  onToggleActive: (programId: string, nextActive: boolean) => void;
  updatingId: string | null;

  onView: (program: any) => void;
  onEdit: (program: any) => void;
  onDelete: (programId: string) => void;
}

export default function ProgramTable({
  programs,
  searchTerm,
  onSearchChange,
  levelFilter,
  levelOptions,
  onLevelFilterChange,
  statusFilter,
  onStatusFilterChange,
  onToggleActive,
  updatingId,
  onView,
  onEdit,
  onDelete,
}: ProgramTableProps) {
  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();

    return programs.filter((p) => {
      const matchesSearch =
        s.length === 0 ||
        p.name.toLowerCase().includes(s) ||
        (p.discipline ?? "").toLowerCase().includes(s);

      const matchesLevel =
        levelFilter === "all" ||
        p.level.toLowerCase() === levelFilter.toLowerCase();

      const isDraft = p.is_draft === true;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "draft" && isDraft) ||
        (statusFilter === "active" && p.active && !isDraft) ||
        (statusFilter === "inactive" && !p.active && !isDraft);

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [programs, searchTerm, levelFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 flex-1">
          {/* SEARCH */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or discipline"
              className="pl-9"
            />
          </div>

          {/* LEVEL FILTER */}
          <Select value={levelFilter} onValueChange={onLevelFilterChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levelOptions.map((l) => (
                <SelectItem key={l} value={l.toLowerCase()}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* STATUS FILTER */}
          <Select value={statusFilter} onValueChange={onStatusFilterChange as (v: string) => void}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No courses match your criteria.</p>
      ) : (
        <div className={withUniversitySurfaceTint("overflow-auto rounded-lg border border-border")}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Level</th>
                <th className="px-4 py-3 text-left font-medium">Discipline</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Tuition</th>
                <th className="px-4 py-3 text-left font-medium">Intakes</th>
                <th className="px-4 py-3 text-center font-medium">Active</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const isDraft = p.is_draft === true;
                return (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {p.name}
                      {isDraft && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/50 bg-amber-500/10">
                          Draft
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{p.level}</Badge>
                  </td>
                  <td className="px-4 py-3">{p.discipline ?? "—"}</td>
                  <td className="px-4 py-3">{p.duration_months} mo</td>
                  <td className="px-4 py-3">
                    {formatCurrency(p.tuition_currency, p.tuition_amount)}
                  </td>
                  <td className="px-4 py-3">
                    {(p.intake_months ?? [])
                      .map((m: number) => monthFormatter.format(new Date(2000, m - 1, 1)))
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={!!p.active}
                      disabled={updatingId === p.id}
                      onCheckedChange={(next) => onToggleActive(p.id, next)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(p)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Pencil className="mr-2 h-4 w-4" /> {isDraft ? "Continue editing" : "Edit"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(p.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

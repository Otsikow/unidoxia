import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw } from "lucide-react";
import type { AgentFilters as FiltersType } from "./types";
import { DEFAULT_FILTERS } from "./types";

interface Props {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
  countries: string[];
}

export default function AgentFiltersBar({ filters, onChange, countries }: Props) {
  const update = (partial: Partial<FiltersType>) => onChange({ ...filters, ...partial });
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, email, country, or ID…"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      <Select value={filters.status} onValueChange={(v) => update({ status: v as any })}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="at_risk">At Risk</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.performance} onValueChange={(v) => update({ performance: v as any })}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Performance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Performance</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="declining">Declining</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.compliance} onValueChange={(v) => update({ compliance: v as any })}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Compliance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Compliance</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
          <SelectItem value="pending">Pending Docs</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="missing">Missing</SelectItem>
        </SelectContent>
      </Select>

      {countries.length > 0 && (
        <Select value={filters.country || "all"} onValueChange={(v) => update({ country: v === "all" ? "" : v })}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!isDefault && (
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)} className="h-9 gap-1.5 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

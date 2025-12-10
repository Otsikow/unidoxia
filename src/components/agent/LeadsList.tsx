import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Download, Filter, Plus, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BulkActions from "./BulkActions";
import LeadTableRow from "./LeadTableRow";
import { useLeads } from "@/hooks/useLeads";
import { Lead, LeadPriorityLevel } from "@/types/lead";

export default function LeadsList() {
  const { data: leads, isLoading, error } = useLeads();
  const navigate = useNavigate();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriorityLevel | "all">("all");
  const [sortBy, setSortBy] = useState<"priority" | "name">("priority");

  useEffect(() => {
    if (!leads) return;
    setSelectedLeads((prev) => prev.filter((id) => leads.some((lead) => lead.id === id)));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesFilters = (lead: Lead) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        lead.first_name.toLowerCase().includes(normalizedSearch) ||
        lead.last_name.toLowerCase().includes(normalizedSearch) ||
        lead.email.toLowerCase().includes(normalizedSearch) ||
        lead.country.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || lead.priorityLevel === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    };

    const filtered = leads.filter(matchesFilters);

    return filtered.sort((a, b) => {
      if (sortBy === "priority") {
        return b.priorityScore - a.priorityScore;
      }

      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [leads, searchTerm, statusFilter, priorityFilter, sortBy]);

  const statusCounts = useMemo(() => {
    return (leads ?? []).reduce(
      (acc, lead) => {
        acc.total += 1;
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        acc.hot += lead.priorityLevel === "hot" ? 1 : 0;
        return acc;
      },
      { total: 0, hot: 0 } as Record<string, number>,
    );
  }, [leads]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <LoadingState message="Loading leads..." size="md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading leads</AlertTitle>
            <AlertDescription>{error.message || "Failed to load your leads. Please try again."}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelect = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const isAllSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) => selectedLeads.includes(lead.id));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total leads</CardDescription>
            <CardTitle className="text-3xl">{statusCounts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hot leads</CardDescription>
            <CardTitle className="text-3xl text-orange-500">
              {statusCounts.hot || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offers ready</CardDescription>
            <CardTitle className="text-3xl text-emerald-500">
              {statusCounts.offer_ready || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Docs pending</CardDescription>
            <CardTitle className="text-3xl text-amber-500">
              {statusCounts.documents_pending || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 lg:flex lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>My Leads</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredLeads.length} visible
              </Badge>
            </div>
            <CardDescription>
              Manage your student leads and move them toward application submission.
            </CardDescription>
            <BulkActions
              selectedCount={selectedLeads.length}
              selectedLeadIds={selectedLeads}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/dashboard/import")}
            >
              <Download className="h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/dashboard/students")}
            >
              <Plus className="h-4 w-4" />
              Add lead
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-1/2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, or country"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Filter className="h-3.5 w-3.5" /> Filters
              </Badge>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="offer_ready">Offer ready</SelectItem>
                  <SelectItem value="documents_pending">Documents pending</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as LeadPriorityLevel | "all")}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Sort by priority</SelectItem>
                  <SelectItem value="name">Sort by name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableCaption>A list of your leads.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all leads"
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <LeadTableRow
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={handleSelect}
                />
              ))}
              {filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10">
                    <EmptyState
                      title="No leads match your filters"
                      description="Try adjusting your filters or import a new lead list to get started."
                      actionLabel="Import leads"
                      onAction={() => navigate("/dashboard/import")}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

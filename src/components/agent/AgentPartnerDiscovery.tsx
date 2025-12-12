import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Filter, Globe2, Handshake, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UNIVERSITY_DIRECTORY_DATA, type UniversityDirectoryItem } from "@/data/university-directory";

const universityStatuses: Record<string, PartnerStatus> = {
  pineapple: "approved",
  uopeople: "approved",
  tartu: "pending",
  porto: "rejected",
  ljubljana: "pending",
};

type PartnerStatus = "not_requested" | "pending" | "approved" | "rejected";

type PartnerUniversity = UniversityDirectoryItem & {
  status: PartnerStatus;
  responseTime: string;
  focus: string;
};

const PRIORITY_UNIVERSITY_IDS = ["pineapple"];

const mapToPartnerUniversities = (): PartnerUniversity[] => {
  const prioritized = UNIVERSITY_DIRECTORY_DATA.filter((university) =>
    PRIORITY_UNIVERSITY_IDS.includes(university.id),
  );
  const remaining = UNIVERSITY_DIRECTORY_DATA.filter(
    (university) => !PRIORITY_UNIVERSITY_IDS.includes(university.id),
  );

  return [...prioritized, ...remaining].slice(0, 8).map((university) => ({
    ...university,
    status: universityStatuses[university.id] ?? "not_requested",
    responseTime: university.id === "uopeople" ? "<24h" : university.id === "porto" ? "48h" : "72h",
    focus:
      university.focusAreas.slice(0, 2).join(", ") ||
      university.notablePrograms.slice(0, 2).join(", ") ||
      "International recruitment",
  }));
};

const statusLabels: Record<PartnerStatus, string> = {
  not_requested: "Not Connected",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const statusVariants: Record<PartnerStatus, "default" | "secondary" | "outline" | "destructive"> = {
  not_requested: "secondary",
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

const statusFilters: { value: PartnerStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "not_requested", label: "Not connected" },
];

export function AgentPartnerDiscovery() {
  const [partners, setPartners] = useState<PartnerUniversity[]>(mapToPartnerUniversities());
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<UniversityDirectoryItem["region"] | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | "all">("all");
  const { toast } = useToast();

  const filteredPartners = useMemo(() => {
    return partners.filter((university) => {
      const matchesSearch =
        university.name.toLowerCase().includes(search.toLowerCase()) ||
        university.country.toLowerCase().includes(search.toLowerCase()) ||
        university.city.toLowerCase().includes(search.toLowerCase());
      const matchesRegion = regionFilter === "all" || university.region === regionFilter;
      const matchesStatus = statusFilter === "all" || university.status === statusFilter;

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [partners, regionFilter, search, statusFilter]);

  const handleRequest = (id: string) => {
    setPartners((prev) =>
      prev.map((university) =>
        university.id === id
          ? {
              ...university,
              status: "pending",
            }
          : university,
      ),
    );

    const university = partners.find((item) => item.id === id);
    toast({
      title: "Connection request sent",
      description: university?.name
        ? `We'll notify you when ${university.name} responds.`
        : "Your request has been submitted.",
    });
  };

  const handleResubmit = (id: string) => {
    setPartners((prev) =>
      prev.map((university) =>
        university.id === id
          ? {
              ...university,
              status: "pending",
            }
          : university,
      ),
    );

    const university = partners.find((item) => item.id === id);
    toast({
      title: "Request resubmitted",
      description: university?.name
        ? `${university.name} will review your renewed request.`
        : "We've updated your request status to pending.",
    });
  };

  const renderAction = (university: PartnerUniversity) => {
    switch (university.status) {
      case "approved":
        return (
          <Button variant="outline" className="w-full" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Connected
          </Button>
        );
      case "pending":
        return (
          <Button variant="outline" className="w-full" disabled>
            <ClockIcon /> Pending review
          </Button>
        );
      case "rejected":
        return (
          <Button className="w-full" onClick={() => handleResubmit(university.id)}>
            <Handshake className="h-4 w-4 mr-2" /> Resubmit request
          </Button>
        );
      default:
        return (
          <Button className="w-full" onClick={() => handleRequest(university.id)}>
            <Handshake className="h-4 w-4 mr-2" /> Request connection
          </Button>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">Partner Network</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Universities & Partners</h2>
          <p className="text-sm text-muted-foreground">
            Discover vetted universities, request new partnerships, and track approvals in one place.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved partners</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{partners.filter((item) => item.status === "approved").length}</div>
              <p className="text-xs text-muted-foreground">Ready for referrals and joint campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requests pending</CardTitle>
              <ClockIcon />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{partners.filter((item) => item.status === "pending").length}</div>
              <p className="text-xs text-muted-foreground">We'll notify you when they respond</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open opportunities</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {partners.filter((item) => item.status === "not_requested" || item.status === "rejected").length}
              </div>
              <p className="text-xs text-muted-foreground">Universities actively seeking agent partners</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Partner universities</CardTitle>
            <CardDescription>
              Search, filter, and send requests to universities looking for new student recruitment partners.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder="Search by university or country"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <Select value={regionFilter} onValueChange={(value) => setRegionFilter(value as typeof regionFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {[...new Set(UNIVERSITY_DIRECTORY_DATA.map((item) => item.region))].map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPartners.map((university) => (
            <Card key={university.id} className="flex flex-col h-full border-muted/60">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe2 className="h-4 w-4" />
                      {university.city}, {university.country}
                    </div>
                    <CardTitle className="text-xl leading-tight">{university.name}</CardTitle>
                    <CardDescription>
                      {university.institutionType} • Founded {university.founded}
                    </CardDescription>
                  </div>
                  <Badge variant={statusVariants[university.status]} className="capitalize">
                    {statusLabels[university.status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {university.focusAreas.slice(0, 3).map((area) => (
                    <Badge key={area} variant="outline">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{university.description}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1 rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Response time</p>
                    <p className="font-medium">{university.responseTime}</p>
                  </div>
                  <div className="space-y-1 rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Partnership focus</p>
                    <p className="font-medium">{university.focus}</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Courses: {university.programCount}+ | Average tuition: {university.tuitionDisplay}</p>
                  <p>Research highlights: {university.researchHighlights.slice(0, 1).join(", ")}</p>
                </div>

                <div className="mt-auto grid gap-2">
                  {renderAction(university)}
                  <Button variant="ghost" className="w-full" asChild>
                    <a href={university.website} target="_blank" rel="noreferrer">
                      <Mail className="h-4 w-4 mr-2" /> View partner profile
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPartners.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              <Filter className="h-6 w-6 mb-2" />
              <p className="font-medium">No universities match your filters yet.</p>
              <p className="text-sm">Try adjusting your search or removing a filter.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClockIcon() {
  return <div className="h-4 w-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">⏳</div>;
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Filter, RefreshCw, Search } from "lucide-react";
import BackButton from "@/components/BackButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type OfferType = "conditional" | "unconditional";
type OfferStatus = "issued" | "pending" | "awaiting_update";

interface SupabaseProfile {
  full_name?: string | null;
  email?: string | null;
}

interface SupabaseStudent {
  legal_name?: string | null;
  preferred_name?: string | null;
  profiles?: SupabaseProfile | null;
}

interface SupabaseUniversity {
  name?: string | null;
  country?: string | null;
}

interface SupabaseProgram {
  name?: string | null;
  universities?: SupabaseUniversity | null;
}

interface SupabaseApplication {
  id: string;
  students?: SupabaseStudent | null;
  programs?: SupabaseProgram | null;
}

interface OfferRecord {
  id: string;
  offer_type: OfferType;
  letter_url?: string | null;
  created_at: string;
  application_id: string;
  applications?: SupabaseApplication | null;
}

interface CasRecord {
  id: string;
  cas_number?: string | null;
  issue_date?: string | null;
  file_url?: string | null;
  application_id: string;
  applications?: SupabaseApplication | null;
}

interface CombinedRecord {
  applicationId: string;
  studentName: string;
  studentEmail?: string;
  universityName: string;
  programName?: string;
  offerType?: OfferType;
  offerId?: string;
  offerLetterUrl?: string;
  offerCreatedAt?: string;
  casId?: string;
  casNumber?: string;
  casFileUrl?: string;
  casIssueDate?: string;
}

const statusConfig: Record<
  OfferStatus,
  { label: string; className: string }
> = {
  issued: {
    label: "Issued",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60",
  },
  awaiting_update: {
    label: "Awaiting Update",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800/60",
  },
};

type SortOption = "date_desc" | "date_asc" | "student_asc" | "student_desc";

interface ProcessedRecord {
  id: string;
  student: string;
  university: string;
  program?: string;
  offerType?: OfferType;
  casNumber?: string;
  dateIssued?: string;
  status: OfferStatus;
  downloadUrl?: string;
  email?: string;
}

const deriveStatus = (record: CombinedRecord): OfferStatus => {
  if (record.casIssueDate) {
    return "issued";
  }
  if (record.offerId) {
    return "pending";
  }
  return "awaiting_update";
};

const toProcessedRecord = (record: CombinedRecord): ProcessedRecord => {
  const status = deriveStatus(record);
  const displayDate = record.casIssueDate ?? record.offerCreatedAt;

  return {
    id: record.applicationId,
    student: record.studentName,
    university: record.universityName,
    program: record.programName,
    offerType: record.offerType,
    casNumber: record.casNumber ?? undefined,
    dateIssued: displayDate,
    status,
    downloadUrl: record.casFileUrl ?? record.offerLetterUrl ?? undefined,
    email: record.studentEmail,
  };
};

const formatDate = (isoDate?: string) => {
  if (!isoDate) return "—";
  try {
    return format(new Date(isoDate), "PPP");
  } catch (error) {
    console.warn("Unable to format date", error);
    return "—";
  }
};

const buildFilterDescription = (
  statusFilter: OfferStatus | "all",
  offerTypeFilter: OfferType | "all",
  searchQuery: string,
) => {
  const parts: string[] = [];
  if (statusFilter !== "all") {
    parts.push(statusConfig[statusFilter].label);
  }
  if (offerTypeFilter !== "all") {
    parts.push(
      offerTypeFilter === "conditional" ? "Conditional offers" : "Unconditional offers",
    );
  }
  if (searchQuery.trim()) {
    parts.push(`matching "${searchQuery.trim()}"`);
  }
  if (parts.length === 0) {
    return "Displaying all records";
  }
  return `Filtered by ${parts.join(" • ")}`;
};

export default function OffersManagement() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "all">("all");
  const [offerTypeFilter, setOfferTypeFilter] = useState<OfferType | "all">("all");
  const [sortOption, setSortOption] = useState<SortOption>("date_desc");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["offers-and-cas"],
    queryFn: async () => {
      const offerSelect = `
        id,
        offer_type,
        letter_url,
        created_at,
        application_id,
        applications (
          id,
          students (
            legal_name,
            preferred_name,
            profiles!students_profile_id_fkey (
              full_name,
              email
            )
          ),
          programs (
            name,
            universities (
              name,
              country
            )
          )
        )
      `;

      const casSelect = `
        id,
        cas_number,
        issue_date,
        file_url,
        application_id,
        applications (
          id,
          students (
            legal_name,
            preferred_name,
            profiles!students_profile_id_fkey (
              full_name,
              email
            )
          ),
          programs (
            name,
            universities (
              name,
              country
            )
          )
        )
      `;

      const fetchCasLetters = async (): Promise<CasRecord[]> => {
        const casLettersResponse = await supabase
          .from("cas_letters" as any)
          .select(casSelect)
          .order("issue_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (casLettersResponse.error) {
          const errorCode = (casLettersResponse.error as { code?: string }).code;
          if (
            errorCode === "42P01" ||
            casLettersResponse.error.message?.toLowerCase().includes("cas_letters")
          ) {
            const fallbackResponse = await supabase
              .from("cas_loa" as any)
              .select(casSelect)
              .order("issue_date", { ascending: false })
              .order("created_at", { ascending: false });

            if (fallbackResponse.error) {
              throw fallbackResponse.error;
            }

            return (fallbackResponse.data ?? []) as unknown as CasRecord[];
          }

          throw casLettersResponse.error;
        }

        return (casLettersResponse.data ?? []) as unknown as CasRecord[];

        if (casLettersResponse.error) {
          // fallback to older table name if cas_letters does not exist
          const errorCode = (casLettersResponse.error as { code?: string }).code;
          if (
            errorCode === "42P01" ||
            casLettersResponse.error.message?.includes("cas_letters")
          ) {
            const fallbackResponse = await supabase
              .from("cas_loa")
              .select(casSelect)
              .order("issue_date", { ascending: false, nullsFirst: false })
              .order("created_at", { ascending: false, nullsFirst: false });
            if (fallbackResponse.error) {
              throw fallbackResponse.error;
            }
            return (fallbackResponse.data ?? []) as unknown as CasRecord[];
          }
          throw casLettersResponse.error;
        }

        return (casLettersResponse.data ?? []) as unknown as CasRecord[];
      };

      const [offersResponse, casLetters] = await Promise.all([
        supabase
          .from("offers")
          .select(offerSelect)
          .order("created_at", { ascending: false }),
        fetchCasLetters(),
      ]);

      if (offersResponse.error) {
        throw offersResponse.error;
      }

      const offers = (offersResponse.data ?? []) as OfferRecord[];

      const combinedMap = new Map<string, CombinedRecord>();

      const upsertRecord = (
        applicationId: string,
        updater: (record: CombinedRecord) => CombinedRecord,
      ) => {
        const existing =
          combinedMap.get(applicationId) ??
          ({
            applicationId,
            studentName: "Unknown Student",
            universityName: "Unknown University",
          } as CombinedRecord);
        const next = updater(existing);
        combinedMap.set(applicationId, next);
      };

      const pullApplicationDetails = (application?: SupabaseApplication | null) => {
        const students = application?.students as any;
        // Priority: profile full_name > preferred_name > legal_name
        const studentName =
          students?.profiles?.full_name ?? students?.preferred_name ?? students?.legal_name ?? "Unknown Student";
        const studentEmail = students?.profiles?.email ?? undefined;
        const universityName =
          application?.programs?.universities?.name ?? "Unknown University";
        const programName = application?.programs?.name ?? undefined;
        return { studentName, studentEmail, universityName, programName };
      };

      for (const offer of offers) {
        const { studentName, studentEmail, universityName, programName } =
          pullApplicationDetails(offer.applications);

        upsertRecord(offer.application_id, (current) => ({
          ...current,
          studentName,
          studentEmail,
          universityName,
          programName,
          offerType: offer.offer_type,
          offerId: offer.id,
          offerLetterUrl: offer.letter_url ?? undefined,
          offerCreatedAt: offer.created_at,
        }));
      }

      for (const cas of casLetters) {
        const { studentName, studentEmail, universityName, programName } =
          pullApplicationDetails(cas.applications);

        upsertRecord(cas.application_id, (current) => ({
          ...current,
          studentName,
          studentEmail,
          universityName,
          programName,
          casId: cas.id,
          casNumber: cas.cas_number ?? undefined,
          casFileUrl: cas.file_url ?? undefined,
          casIssueDate: cas.issue_date ?? undefined,
        }));
      }

      return Array.from(combinedMap.values()).map(toProcessedRecord);
    },
    staleTime: 1000 * 60 * 5,
    meta: {
      onError: (queryError: Error) => {
        console.error("Failed to fetch offers and CAS letters", queryError);
        toast({
          variant: "destructive",
          title: "Failed to load records",
          description:
            queryError instanceof Error
              ? queryError.message
              : "Please try again in a moment.",
        });
      },
    },
  });

  const processedRecords = (data ?? []) as ProcessedRecord[];

  const stats = useMemo(() => {
    const total = processedRecords.length;
    const issued = processedRecords.filter((record) => record.status === "issued").length;
    const pending = processedRecords.filter((record) => record.status === "pending").length;
    const awaiting = processedRecords.filter(
      (record) => record.status === "awaiting_update",
    ).length;
    return { total, issued, pending, awaiting };
  }, [processedRecords]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let records = processedRecords;

    if (normalizedQuery) {
      records = records.filter((record) => {
        const haystack = [
          record.student,
          record.university,
          record.program,
          record.casNumber,
          record.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }

    if (statusFilter !== "all") {
      records = records.filter((record) => record.status === statusFilter);
    }

    if (offerTypeFilter !== "all") {
      records = records.filter((record) => record.offerType === offerTypeFilter);
    }

    const sorted = [...records];
    sorted.sort((a, b) => {
      switch (sortOption) {
        case "date_asc":
          return (a.dateIssued ?? "").localeCompare(b.dateIssued ?? "");
        case "student_asc":
          return a.student.localeCompare(b.student);
        case "student_desc":
          return b.student.localeCompare(a.student);
        case "date_desc":
        default:
          return (b.dateIssued ?? "").localeCompare(a.dateIssued ?? "");
      }
    });

    return sorted;
  }, [processedRecords, searchQuery, statusFilter, offerTypeFilter, sortOption]);

  const activeFilterDescription = useMemo(
    () => buildFilterDescription(statusFilter, offerTypeFilter, searchQuery),
    [statusFilter, offerTypeFilter, searchQuery],
  );

  const handleDownload = (url?: string) => {
    if (!url) {
      toast({
        title: "No file available",
        description: "This record does not have a downloadable document yet.",
        variant: "destructive",
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <DashboardLayout showToolbarBackButton={false}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <BackButton variant="ghost" size="sm" fallback="/dashboard" />

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Offers &amp; CAS Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor issued offers, track CAS letters, and manage outstanding actions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{stats.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Issued CAS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.issued}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending offers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.pending}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Awaiting updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                {stats.awaiting}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>{activeFilterDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student, university, CAS number, or email"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as OfferStatus | "all")
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="awaiting_update">Awaiting update</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={offerTypeFilter}
                  onValueChange={(value) =>
                    setOfferTypeFilter(value as OfferType | "all")
                  }
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Offer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All offer types</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                    <SelectItem value="unconditional">Unconditional</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortOption}
                  onValueChange={(value) => setSortOption(value as SortOption)}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date issued (newest)</SelectItem>
                    <SelectItem value="date_asc">Date issued (oldest)</SelectItem>
                    <SelectItem value="student_asc">Student name (A–Z)</SelectItem>
                    <SelectItem value="student_desc">Student name (Z–A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <Badge variant="outline" className="bg-muted/30">
                {filteredRecords.length} record(s) visible
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isFetching && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offers &amp; CAS records</CardTitle>
            <CardDescription>
              Review offer status, download letters, and follow up with universities or
              students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || (isFetching && !data) ? (
              <div className="py-16">
                <LoadingState message="Loading offers and CAS records..." />
              </div>
            ) : error && !isFetching ? (
              <div className="py-12 text-center">
                <p className="font-medium text-destructive">
                  We couldn&apos;t load the records.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please refresh the page or try again later.
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No records match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Offer type</TableHead>
                      <TableHead>CAS number</TableHead>
                      <TableHead>Date issued</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={`${record.id}-${record.casNumber ?? record.offerType ?? "row"}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.student}</div>
                            {record.email && (
                              <div className="text-xs text-muted-foreground">
                                {record.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="truncate" title={record.university}>
                            {record.university}
                          </div>
                          {record.program && (
                            <div className="text-xs text-muted-foreground truncate" title={record.program}>
                              {record.program}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {record.offerType ?? "—"}
                        </TableCell>
                        <TableCell>{record.casNumber ?? "—"}</TableCell>
                        <TableCell>{formatDate(record.dateIssued)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusConfig[record.status].className}>
                            {statusConfig[record.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDownload(record.downloadUrl)}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

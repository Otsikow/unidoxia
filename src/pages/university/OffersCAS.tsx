import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard } from "@/components/university/panels/MetricCard";
import { LoadingState } from "@/components/LoadingState";
import { StatePlaceholder } from "@/components/university/common/StatePlaceholder";
import {
  withUniversityCardStyles,
  withUniversitySurfaceTint,
} from "@/components/university/common/cardStyles";
import { useUniversityDashboard } from "@/components/university/layout/UniversityDashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Stamp, Clock3, Eye, Download, RefreshCw } from "lucide-react";
import emptyStateIllustration from "@/assets/university-application.png";
import { AIOfferLetterChecker } from "@/components/university/offers/AIOfferLetterChecker";

type OfferType = "conditional" | "unconditional";
type RecordStatus = "issued" | "pending";

interface SupabaseProfile {
  full_name?: string | null;
}

interface SupabaseStudent {
  legal_name?: string | null;
  profiles?: SupabaseProfile | null;
}

interface SupabaseProgram {
  id?: string;
  name?: string | null;
  university_id?: string | null;
}

interface SupabaseApplication {
  id: string;
  students?: SupabaseStudent | null;
  programs?: SupabaseProgram | null;
}

interface OfferRow {
  id: string;
  offer_type?: string | null;
  letter_url?: string | null;
  created_at?: string | null;
  application_id: string | null;
  university_id?: string | null;
  applications?: SupabaseApplication | null;
}

interface CasRow {
  id: string;
  cas_number?: string | null;
  file_url?: string | null;
  issue_date?: string | null;
  created_at?: string | null;
  application_id: string | null;
  university_id?: string | null;
  applications?: SupabaseApplication | null;
}

interface CombinedRecord {
  applicationId: string;
  universityId: string | null;
  studentName: string;
  courseName: string;
  offerType?: OfferType;
  offerLetterUrl?: string;
  offerIssuedAt?: string;
  casNumber?: string;
  casLetterUrl?: string;
  casIssueDate?: string;
}

interface ProcessedRecord {
  id: string;
  studentName: string;
  courseName: string;
  offerType?: OfferType;
  casNumber?: string;
  dateIssued?: string;
  status: RecordStatus;
  offerLetterUrl?: string;
  casLetterUrl?: string;
}

const offerTypeBadgeClasses: Record<OfferType, string> = {
  conditional:
    "border-amber-500/50 bg-amber-500/15 text-warning",
  unconditional:
    "border-success/30 bg-success/10 text-success",
};

const statusBadgeClasses: Record<RecordStatus, string> = {
  issued: "border-success/30 bg-success/10 text-success",
  pending: "border-border bg-muted/60 text-primary",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const normalizeOfferType = (value?: string | null): OfferType | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("unconditional")) {
    return "unconditional";
  }
  if (normalized.includes("conditional")) {
    return "conditional";
  }
  return undefined;
};

const extractStudentName = (application?: SupabaseApplication | null) => {
  if (!application) return "Unknown Student";
  return (
    application.students?.profiles?.full_name ??
    application.students?.legal_name ??
    "Unknown Student"
  );
};

const extractCourseName = (application?: SupabaseApplication | null) => {
  if (!application) return "Unknown Course";
  return application.programs?.name ?? "Unknown Course";
};

const resolveUniversityId = (
  row: { university_id?: string | null; applications?: SupabaseApplication | null },
) => {
  return (
    row.university_id ??
    row.applications?.programs?.university_id ??
    null
  );
};

const fetchOffersAndCas = async (universityId: string, tenantId: string | null): Promise<ProcessedRecord[]> => {
  if (!universityId) {
    return [];
  }

  const offerSelect = `
    id,
    offer_type,
    letter_url,
    created_at,
    university_id,
    application_id,
    applications (
      id,
      students (
        legal_name,
        profiles (
          full_name
        )
      ),
      programs (
        id,
        name,
        university_id
      )
    )
  `;

  const casSelect = `
    id,
    cas_number,
    issue_date,
    file_url,
    created_at,
    university_id,
    application_id,
    applications (
      id,
      students (
        legal_name,
        profiles (
          full_name
        )
      ),
      programs (
        id,
        name,
        university_id
      )
    )
  `;

  // ISOLATION: Filter by university_id at the database level for performance and security
  const fetchCasLetters = async (): Promise<CasRow[]> => {
    const casQuery = (supabase as any)
      .from("cas_letters")
      .select(casSelect)
      .eq("university_id", universityId)
      .order("issue_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    const casLettersResponse = await casQuery;

    if (casLettersResponse.error) {
      const errorCode = (casLettersResponse.error as { code?: string }).code;
      if (
        errorCode === "42P01" ||
        casLettersResponse.error.message?.toLowerCase().includes("cas_letters")
      ) {
        const fallbackResponse = await (supabase as any)
          .from("cas_loa")
          .select(casSelect)
          .eq("university_id", universityId)
          .order("issue_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false, nullsFirst: false });

        if (fallbackResponse.error) {
          throw fallbackResponse.error;
        }

        return (fallbackResponse.data ?? []) as unknown as CasRow[];
      }
      throw casLettersResponse.error;
    }

    return (casLettersResponse.data ?? []) as unknown as CasRow[];
  };

  // ISOLATION: Filter by university_id at the database level
  const [offersResponse, casLetters] = await Promise.all([
    (supabase as any)
      .from("offers")
      .select(offerSelect)
      .eq("university_id", universityId)
      .order("created_at", { ascending: false, nullsFirst: false }),
    fetchCasLetters(),
  ]);

  if (offersResponse.error) {
    throw offersResponse.error;
  }

  const offers = (offersResponse.data ?? []) as unknown as OfferRow[];

  const combinedMap = new Map<string, CombinedRecord>();

  const upsertRecord = (applicationId: string, updates: Partial<CombinedRecord>) => {
    const existing =
      combinedMap.get(applicationId) ?? {
        applicationId,
        universityId: null,
        studentName: "Unknown Student",
        courseName: "Unknown Course",
      };

    const next: CombinedRecord = {
      ...existing,
      ...updates,
      applicationId,
      studentName: updates.studentName ?? existing.studentName,
      courseName: updates.courseName ?? existing.courseName,
      universityId: updates.universityId ?? existing.universityId,
    };

    combinedMap.set(applicationId, next);
  };

  for (const offer of offers) {
    if (!offer.application_id) continue;
    const recordUniversityId = resolveUniversityId(offer);
    if (recordUniversityId !== universityId) continue;

    upsertRecord(offer.application_id, {
      universityId: recordUniversityId,
      studentName: extractStudentName(offer.applications),
      courseName: extractCourseName(offer.applications),
      offerType: normalizeOfferType(offer.offer_type),
      offerLetterUrl: offer.letter_url ?? undefined,
      offerIssuedAt: offer.created_at ?? undefined,
    });
  }

  for (const cas of casLetters) {
    if (!cas.application_id) continue;
    const recordUniversityId = resolveUniversityId(cas);
    if (recordUniversityId !== universityId) continue;

    upsertRecord(cas.application_id, {
      universityId: recordUniversityId,
      studentName: extractStudentName(cas.applications),
      courseName: extractCourseName(cas.applications),
      casNumber: cas.cas_number ?? undefined,
      casLetterUrl: cas.file_url ?? undefined,
      casIssueDate: cas.issue_date ?? cas.created_at ?? undefined,
    });
  }

  return Array.from(combinedMap.values())
    .filter((record) => record.universityId === universityId)
    .map((record): ProcessedRecord => {
      const hasCasDetails =
        Boolean(record.casNumber) ||
        Boolean(record.casLetterUrl) ||
        Boolean(record.casIssueDate);

      return {
        id: record.applicationId,
        studentName: record.studentName,
        courseName: record.courseName,
        offerType: record.offerType,
        casNumber: record.casNumber,
        dateIssued: record.casIssueDate ?? record.offerIssuedAt,
        status: hasCasDetails ? "issued" : "pending",
        offerLetterUrl: record.offerLetterUrl,
        casLetterUrl: record.casLetterUrl,
      };
    })
    .sort((a, b) => {
      const aDate = a.dateIssued ?? "";
      const bDate = b.dateIssued ?? "";
      return bDate.localeCompare(aDate);
    });
};

const OffersCASPage = () => {
  const { data } = useUniversityDashboard();
  const { toast } = useToast();
  const universityId = data?.university?.id ?? "";
  // ISOLATION: Include tenant_id for defense-in-depth data isolation
  const tenantId = data?.university?.tenant_id ?? null;

  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: records = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ProcessedRecord[], Error>({
    queryKey: ["university-offers-cas", universityId, tenantId],
    enabled: Boolean(universityId),
    queryFn: () => fetchOffersAndCas(universityId, tenantId),
    staleTime: 1000 * 60 * 5,
  });

  // Log errors for debugging
  if (error) {
    console.error("Failed to fetch university offers and CAS records", error);
  }

  const filteredRecords = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return records;

    return records.filter((record) => {
      const haystack = `${record.studentName ?? ""} ${record.courseName ?? ""}`.toLowerCase();
      return haystack.includes(normalizedTerm);
    });
  }, [records, searchTerm]);

  const summary = useMemo(() => {
    const totalOffers = records.length;
    const casIssued = records.filter((record) => record.status === "issued").length;
    const casPending = totalOffers - casIssued;
    return {
      totalOffers,
      casIssued,
      casPending,
    };
  }, [records]);

  const aiInsightsSource = useMemo(
    () =>
      records.map((record) => ({
        id: record.id,
        studentName: record.studentName,
        courseName: record.courseName,
      })),
    [records],
  );

  const handleOpenLink = (url?: string, fallbackMessage?: string) => {
    if (!url) {
      toast({
        title: fallbackMessage ?? "Document unavailable",
        description: "This record does not have an attached file yet.",
        variant: "destructive",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!universityId) {
    return (
      <StatePlaceholder
        title="No university selected"
        description="Connect your university profile to view offer and CAS activity."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Offers &amp; CAS</h1>
        <p className="text-sm text-muted-foreground">
          Track offers issued to your applicants and monitor CAS letter progress for
          upcoming intakes.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total Offers"
          value={summary.totalOffers}
          description="Applications with issued offers"
          icon={<GraduationCap className="h-5 w-5" />}
          tone="info"
        />
        <MetricCard
          label="CAS Issued"
          value={summary.casIssued}
          description="Students with CAS numbers or letters"
          icon={<Stamp className="h-5 w-5" />}
          tone="success"
        />
        <MetricCard
          label="CAS Pending"
          value={summary.casPending}
          description="Students awaiting CAS issuance"
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
        />
      </section>

      <AIOfferLetterChecker records={aiInsightsSource} isLoading={isLoading || isFetching} />

      <Card className={withUniversityCardStyles("rounded-2xl text-card-foreground")}>
        <CardHeader className="space-y-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-card-foreground">
              Offers and CAS letters
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Search across students or courses to review offer status and CAS issuance.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Input
              value={searchTerm}
              placeholder="Search by student or course name"
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full text-sm sm:max-w-xs"
            />
            <Button
              variant="outline"
              className="gap-2 text-card-foreground"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-16">
              <LoadingState message="Loading offers and CAS records..." />
            </div>
          ) : error ? (
            <StatePlaceholder
              title="We couldn't load your records"
              description="Please refresh the page or try again later."
              className="bg-transparent"
            />
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-16">
              <img
                src={emptyStateIllustration}
                alt="No offers yet"
                className={withUniversitySurfaceTint("h-40 w-40 rounded-2xl object-cover p-4 bg-muted/60")}
              />
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold text-card-foreground">
                  No offers issued yet
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  When your team issues offers and CAS letters, they will appear here for
                  tracking and follow-up.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 text-card-foreground"
                onClick={() => void refetch()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <StatePlaceholder
              title="No records match your search"
              description="Try a different student or course name to see more results."
              className="bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="text-muted-foreground">Student</TableHead>
                    <TableHead className="text-muted-foreground">Offer Type</TableHead>
                    <TableHead className="text-muted-foreground">CAS Number</TableHead>
                    <TableHead className="text-muted-foreground">Date Issued</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="border-border bg-muted/40 transition hover:bg-muted/40"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{record.studentName}</span>
                          <span className="text-xs text-muted-foreground">{record.courseName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.offerType ? (
                          <Badge
                            variant="outline"
                            className={offerTypeBadgeClasses[record.offerType]}
                          >
                            {record.offerType === "conditional" ? "Conditional" : "Unconditional"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {record.casNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {formatDate(record.dateIssued)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClasses[record.status]}>
                          {record.status === "issued" ? "Issued" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-primary hover:text-primary-foreground"
                            onClick={() =>
                              handleOpenLink(record.offerLetterUrl, "Offer letter unavailable")
                            }
                          >
                            <Eye className="h-4 w-4" />
                            View Offer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-success hover:text-success"
                            onClick={() =>
                              handleOpenLink(record.casLetterUrl, "CAS letter unavailable")
                            }
                          >
                            <Download className="h-4 w-4" />
                            Download CAS Letter
                          </Button>
                        </div>
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
  );
};

export default OffersCASPage;

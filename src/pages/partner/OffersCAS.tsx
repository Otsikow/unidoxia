import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Filter, GraduationCap, University } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { PartnerHeader } from "@/components/partner/PartnerHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/LoadingState";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import emptyStateIllustration from "@/assets/university-application.png";

type OfferType = "conditional" | "unconditional";
type RecordStatus = "issued" | "pending";

interface SupabaseProfile {
  full_name?: string | null;
  email?: string | null;
}

interface SupabaseStudent {
  id?: string | null;
  legal_name?: string | null;
  preferred_name?: string | null;
  profiles?: SupabaseProfile | null;
}

interface SupabaseUniversity {
  name?: string | null;
}

interface SupabaseProgram {
  universities?: SupabaseUniversity | null;
}

interface SupabaseApplication {
  id: string;
  students?: SupabaseStudent | null;
  programs?: SupabaseProgram | null;
}

interface OfferRecord {
  id: string;
  offer_type: OfferType | null;
  letter_url?: string | null;
  created_at: string | null;
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

interface OfferDocumentRecord {
  id: string;
  application_id: string;
  document_type?: string | null;
  storage_path?: string | null;
  uploaded_at?: string | null;
  applications?: SupabaseApplication | null;
}

interface CombinedRecord {
  applicationId: string;
  studentName: string;
  studentEmail?: string;
  universityName: string;
  offerType?: OfferType;
  offerLetterUrl?: string;
  offerCreatedAt?: string;
  casNumber?: string;
  casLetterUrl?: string;
  casIssueDate?: string;
}

interface ProcessedRecord {
  id: string;
  student: string;
  email?: string;
  university: string;
  offerType?: OfferType;
  offerLetterUrl?: string;
  casNumber?: string;
  casLetterUrl?: string;
  dateIssued?: string;
  status: RecordStatus;
}

const offerTypeBadgeStyles: Record<OfferType, string> = {
  conditional:
    "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100",
  unconditional:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
};

const statusBadgeStyles: Record<RecordStatus, string> = {
  issued:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-100",
  pending:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/40 dark:bg-slate-800 dark:text-slate-200",
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

const isStoragePath = (url?: string | null): boolean => {
  if (!url) return false;
  return !url.startsWith("http://") && !url.startsWith("https://");
};

const fetchOffersAndCas = async (): Promise<ProcessedRecord[]> => {
  const offerSelect = `
    id,
    offer_type,
    letter_url,
    created_at,
    application_id,
    applications (
      id,
      student_id,
      students (
        id,
        legal_name,
        preferred_name,
        profiles (
          full_name,
          email
        )
      ),
      programs (
        universities (
          name
        )
      )
    )
  `;

  const offerDocumentSelect = `
    id,
    application_id,
    document_type,
    storage_path,
    uploaded_at,
    applications (
      id,
      student_id,
      students (
        id,
        legal_name,
        preferred_name,
        profiles (
          full_name,
          email
        )
      ),
      programs (
        universities (
          name
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
      student_id,
      students (
        id,
        legal_name,
        preferred_name,
        profiles (
          full_name,
          email
        )
      ),
      programs (
        universities (
          name
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
  };

  const [offersResponse, casLetters] = await Promise.all([
    supabase.from("offers").select(offerSelect).order("created_at", {
      ascending: false,
    }),
    fetchCasLetters(),
  ]);

  if (offersResponse.error) {
    throw offersResponse.error;
  }

  const offers = (offersResponse.data ?? []) as unknown as OfferRecord[];

  // Cast document types to any since the enum may not include all offer types
  const offerDocTypes = [
    "offer_letter",
    "conditional_offer",
    "unconditional_offer",
    "cas",
    "cas_letter",
    "loa",
    "other",
  ] as any[];

  const { data: offerDocData, error: offerDocError } = await supabase
    .from("application_documents")
    .select(offerDocumentSelect)
    .in("document_type", offerDocTypes)
    .order("uploaded_at", { ascending: false });

  if (offerDocError) throw offerDocError;

  const offerDocuments = (offerDocData ?? []) as unknown as OfferDocumentRecord[];

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

  const extractDetails = (application?: SupabaseApplication | null) => {
    const students = application?.students as any;
    // Priority: profile full_name > preferred_name > legal_name
    const studentName = students?.profiles?.full_name 
      || students?.preferred_name 
      || students?.legal_name 
      || "Unknown Student";
    const studentEmail = students?.profiles?.email ?? undefined;
    const universityName =
      application?.programs?.universities?.name ?? "Unknown University";
    return { studentName, studentEmail, universityName };
  };

  for (const offer of offers) {
    const { studentName, studentEmail, universityName } = extractDetails(
      offer.applications,
    );

    upsertRecord(offer.application_id, (current) => ({
      ...current,
      studentName,
      studentEmail,
      universityName,
      offerType: offer.offer_type ?? undefined,
      offerLetterUrl: offer.letter_url ?? undefined,
      offerCreatedAt: offer.created_at ?? undefined,
    }));
  }

  for (const doc of offerDocuments) {
    const { studentName, studentEmail, universityName } = extractDetails(
      doc.applications,
    );

    const inferredOfferType = doc.document_type?.includes("conditional")
      ? "conditional"
      : doc.document_type?.includes("unconditional")
        ? "unconditional"
        : undefined;

    upsertRecord(doc.application_id, (current) => ({
      ...current,
      studentName,
      studentEmail,
      universityName,
      offerType: current.offerType ?? inferredOfferType,
      offerLetterUrl: current.offerLetterUrl ?? doc.storage_path ?? undefined,
      offerCreatedAt: current.offerCreatedAt ?? doc.uploaded_at ?? undefined,
    }));
  }

  for (const cas of casLetters) {
    const { studentName, studentEmail, universityName } = extractDetails(
      cas.applications,
    );

    upsertRecord(cas.application_id, (current) => ({
      ...current,
      studentName,
      studentEmail,
      universityName,
      casNumber: cas.cas_number ?? undefined,
      casLetterUrl: cas.file_url ?? undefined,
      casIssueDate: cas.issue_date ?? undefined,
    }));
  }

  const combinedRecords = Array.from(combinedMap.values());

  return combinedRecords.map((record) => {
    const status: RecordStatus =
      record.casNumber || record.casLetterUrl || record.casIssueDate
        ? "issued"
        : record.offerLetterUrl
          ? "pending"
          : "pending";

    return {
      id: record.applicationId,
      student: record.studentName,
      email: record.studentEmail,
      university: record.universityName,
      offerType: record.offerType,
      offerLetterUrl: record.offerLetterUrl,
      casNumber: record.casNumber,
      casLetterUrl: record.casLetterUrl,
      dateIssued: record.casIssueDate ?? record.offerCreatedAt,
      status,
    };
  });
};

export default function OffersCASPage() {
  const { toast } = useToast();

  const [offerTypeFilter, setOfferTypeFilter] = useState<OfferType | "all">("all");
  const [universityFilter, setUniversityFilter] = useState<string>("all");

  const {
    data: records = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["partner-offers-cas"],
    queryFn: fetchOffersAndCas,
    staleTime: 1000 * 60 * 5,
  }) as any;

  const universityOptions = useMemo(() => {
    const unique = Array.from(
      new Set(records.map((record: any) => record.university).filter(Boolean)),
    );
    return unique.sort((a: any, b: any) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesOfferType =
        offerTypeFilter === "all" || record.offerType === offerTypeFilter;
      const matchesUniversity =
        universityFilter === "all" || record.university === universityFilter;
      return matchesOfferType && matchesUniversity;
    });
  }, [records, offerTypeFilter, universityFilter]);

  const summary = useMemo(() => {
    const totalOffers = records.length;
    const issuedCas = records.filter((record) => record.status === "issued").length;
    const pendingCas = records.filter((record) => record.status === "pending").length;
    return { totalOffers, issuedCas, pendingCas };
  }, [records]);

  const handleDownload = async (url?: string) => {
    if (!url) {
      toast({
        title: "No document available",
        description: "This record does not have a downloadable file yet.",
        variant: "destructive",
      });
      return;
    }

    if (isStoragePath(url)) {
      const normalizedPath = url.replace(/^application-documents\//, "");
      // Get signed URL for private bucket
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(normalizedPath, 3600);
      
      if (error || !data?.signedUrl) {
        toast({
          title: "Could not access document",
          description: "Failed to generate download link. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-16">
          <LoadingState message="Loading partner offers and CAS letters..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-base font-medium text-red-600 dark:text-red-400">
            We couldn&apos;t load the records.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please refresh the page or try again later.
          </p>
        </div>
      );
    }

    if (records.length === 0) {
      return (
        <div className="flex flex-col items-center gap-6 py-16">
          <img
            src={emptyStateIllustration}
            alt="No offers yet"
            className="h-40 w-40 rounded-xl border border-slate-200 bg-slate-50 object-cover p-4 dark:border-slate-800/60 dark:bg-slate-900/60"
          />
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              No offers or CAS letters yet
            </h3>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              Once universities issue offers and CAS letters for your students, they will
              appear here for quick tracking.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <Filter className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      );
    }

    if (filteredRecords.length === 0) {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No records match these filters
          </p>
          <p className="max-w-md text-sm">
            Try adjusting the offer type or university filter to see more results.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-800/60">
              <TableHead className="text-slate-600 dark:text-slate-300">Student</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-300">University</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-300">Offer Type</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-300">CAS Number</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-300">Date Issued</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-300">Status</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow
                key={`${record.id}-${record.casNumber ?? record.offerType ?? "record"}`}
                className="border-slate-200/60 bg-white/40 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:bg-slate-950/40 dark:hover:bg-slate-900/40"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{record.student}</span>
                    {record.email && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{record.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <span className="truncate text-slate-900 dark:text-slate-100" title={record.university}>
                    {record.university}
                  </span>
                </TableCell>
                <TableCell>
                  {record.offerType ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        offerTypeBadgeStyles[record.offerType],
                      )}
                    >
                      {record.offerType}
                    </Badge>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-700 dark:text-slate-200">
                  {record.casNumber ?? "—"}
                </TableCell>
                <TableCell className="text-slate-700 dark:text-slate-200">
                  {formatDate(record.dateIssued)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("capitalize", statusBadgeStyles[record.status])}
                  >
                    {record.status === "issued" ? "Issued" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-100"
                      onClick={() => handleDownload(record.offerLetterUrl)}
                    >
                      <Download className="h-4 w-4" />
                      Offer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-200 dark:hover:text-emerald-100"
                      onClick={() => handleDownload(record.casLetterUrl)}
                    >
                      <Download className="h-4 w-4" />
                      CAS Letter
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <PartnerSidebar />
        <SidebarInset className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <PartnerHeader />
          <main className="flex-1 space-y-8 px-4 pb-12 pt-6 md:px-8 lg:px-12">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Offers &amp; CAS Tracking
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Review university offers, track CAS issuance, and download documents for
                your students.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border border-slate-200 bg-white/80 backdrop-blur transition-colors dark:border-slate-800/60 dark:bg-slate-950/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total Offers
                  </CardTitle>
                  <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {summary.totalOffers}
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 bg-white/80 backdrop-blur transition-colors dark:border-slate-800/60 dark:bg-slate-950/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Issued CAS
                  </CardTitle>
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {summary.issuedCas}
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 bg-white/80 backdrop-blur transition-colors dark:border-slate-800/60 dark:bg-slate-950/60">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Pending CAS
                  </CardTitle>
                  <University className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-slate-700 dark:text-slate-200">
                    {summary.pendingCas}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-slate-200 bg-white/80 backdrop-blur transition-colors dark:border-slate-800/60 dark:bg-slate-950/60">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Filters</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Narrow the records by offer type or university partner.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Offer Type
                  </p>
                  <Select
                    value={offerTypeFilter}
                    onValueChange={(value) =>
                      setOfferTypeFilter(value as OfferType | "all")
                    }
                  >
                    <SelectTrigger className="bg-white text-slate-900 dark:bg-slate-900/80 dark:text-slate-100">
                      <Filter className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <SelectValue placeholder="All offer types" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                      <SelectItem value="all">All offer types</SelectItem>
                      <SelectItem value="conditional">Conditional</SelectItem>
                      <SelectItem value="unconditional">Unconditional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    University
                  </p>
                  <Select
                    value={universityFilter}
                    onValueChange={(value) => setUniversityFilter(value)}
                  >
                    <SelectTrigger className="bg-white text-slate-900 dark:bg-slate-900/80 dark:text-slate-100">
                      <University className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <SelectValue placeholder="All universities" />
                    </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-y-auto bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                      <SelectItem value="all">All universities</SelectItem>
                      {universityOptions.map((university, idx) => (
                        <SelectItem key={String(university ?? `uni-${idx}`)} value={String(university)}>
                          {String(university)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <Filter className={cn("h-4 w-4", isFetching && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white/80 backdrop-blur transition-colors dark:border-slate-800/60 dark:bg-slate-950/60">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                  Offers &amp; CAS Letters
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Track offers and CAS issuance progress across your student portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent>{renderContent()}</CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

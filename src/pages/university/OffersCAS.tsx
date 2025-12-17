import { useMemo, useState, useEffect } from "react";
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

const normalizeOfferType = (status: string): OfferType | undefined => {
  if (status === "conditional_offer") return "conditional";
  if (status === "unconditional_offer") return "unconditional";
  if (["cas_loa", "visa", "enrolled"].includes(status)) return "unconditional";
  return undefined;
};

const fetchOffersAndCas = async (universityId: string, tenantId: string | null): Promise<ProcessedRecord[]> => {
  if (!universityId) {
    return [];
  }

  // Fetch applications that have reached at least the offer stage
  const { data: applications, error } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      updated_at,
      created_at,
      programs!inner (
        name,
        university_id
      ),
      students (
        legal_name,
        profiles (
          full_name
        )
      ),
      application_documents (
        id,
        storage_path,
        document_type,
        created_at
      )
    `)
    .eq("programs.university_id", universityId)
    .in("status", ["conditional_offer", "unconditional_offer", "cas_loa", "visa", "enrolled"])
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  // Process records and generate signed URLs
  const processed = await Promise.all(
    (applications || []).map(async (app: any) => {
      const studentName = app.students?.profiles?.full_name || app.students?.legal_name || "Unknown Student";
      const courseName = app.programs?.name || "Unknown Course";
      const status = app.status;
      
      const isCasIssued = ["cas_loa", "visa", "enrolled"].includes(status);
      const recordStatus: RecordStatus = isCasIssued ? "issued" : "pending";
      
      const offerType = normalizeOfferType(status);

      // Sort docs by date descending
      const docs = (app.application_documents || []).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      let offerLetterUrl: string | undefined;
      let casLetterUrl: string | undefined;

      // Heuristic for documents:
      // The latest document is likely related to the current status.
      // If status is CAS/Visa, latest doc might be CAS letter.
      // We look for docs uploaded by university (implied if we are here, but actually app docs can be student uploaded too)
      // We assume for now the latest doc is the relevant one.
      
      if (docs.length > 0) {
        const latestDoc = docs[0];
        if (latestDoc.storage_path) {
           const { data } = supabase.storage
            .from("application-documents")
            .getPublicUrl(latestDoc.storage_path);
           
           if (isCasIssued) {
             casLetterUrl = data.publicUrl;
             // Try to find an older doc that might be the offer letter
             if (docs.length > 1) {
                const prevDoc = docs[1];
                if (prevDoc.storage_path) {
                  const { data: offerData } = supabase.storage
                    .from("application-documents")
                    .getPublicUrl(prevDoc.storage_path);
                  offerLetterUrl = offerData.publicUrl;
                }
             }
           } else {
             offerLetterUrl = data.publicUrl;
           }
        }
      }

      return {
        id: app.id,
        studentName,
        courseName,
        offerType,
        casNumber: undefined, 
        dateIssued: app.updated_at || app.created_at,
        status: recordStatus,
        offerLetterUrl,
        casLetterUrl,
      };
    })
  );
  
  return processed;
};

const OffersCASPage = () => {
  const { data } = useUniversityDashboard();
  const { toast } = useToast();
  const universityId = data?.university?.id ?? "";
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

  useEffect(() => {
    if (!universityId) return;

    const channel = supabase
      .channel("offers-cas-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
        },
        () => void refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_documents",
        },
        () => void refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [universityId, refetch]);

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
    // Total offers: All records since we filter by status >= Offer
    const totalOffers = records.length;
    // CAS Issued: status is "issued"
    const casIssued = records.filter((record) => record.status === "issued").length;
    // CAS Pending: status is "pending" (i.e. currently in Offer stage)
    const casPending = records.filter((record) => record.status === "pending").length;
    
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

  const hasRecords = records.length > 0;
  const shouldShowErrorState = Boolean(error && !isFetching && !hasRecords);

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
          ) : shouldShowErrorState ? (
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

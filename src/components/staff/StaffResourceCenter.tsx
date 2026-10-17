import { formatUkDate } from '@/lib/dateFormat';
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatError, type NormalizedError } from "@/lib/error";
import { logError } from "@/lib/errorUtils";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Filter,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";


const STORAGE_BUCKET = "resources";

const CATEGORY_LABELS = {
  policies: "Policies",
  training: "Training",
  forms: "Forms",
  reports: "Reports",
} as const;

const FILE_TYPE_LABELS = {
  pdf: "PDF",
  doc: "Document",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  image: "Image",
  video: "Video",
  other: "Other",
} as const;

type ResourceCategory = keyof typeof CATEGORY_LABELS;
type FileType = keyof typeof FILE_TYPE_LABELS;

type AccessLevel = "public" | "agents" | "universities" | "staff";

interface ResourceMetadataRow {
  id: string;
  title: string | null;
  description: string | null;
  file_type: string | null;
  access_level: AccessLevel | null;
  resource_type: string | null;
  storage_path: string;
  file_name: string | null;
  file_extension: string | null;
  file_size: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  fileType: FileType;
  accessLevel: AccessLevel | null;
  storagePath: string;
  fileName: string;
  fileExtension: string;
  size: number | null;
  publicUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const resolveFileTypeFromExtension = (extension?: string | null): FileType => {
  const normalized = (extension ?? "").toLowerCase();

  if (normalized === "pdf") return "pdf";
  if (["doc", "docx"].includes(normalized)) return "doc";
  if (["xls", "xlsx", "csv"].includes(normalized)) return "spreadsheet";
  if (["ppt", "pptx"].includes(normalized)) return "presentation";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(normalized)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(normalized)) return "video";

  return "other";
};

const resolveCategory = (row: ResourceMetadataRow): ResourceCategory => {
  const candidates = [row.resource_type, row.storage_path.split("/")[0] ?? ""]
    .map((value) => (value ?? "").toLowerCase());

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.includes("policy")) return "policies";
    if (candidate.includes("train")) return "training";
    if (candidate.includes("form")) return "forms";
    if (candidate.includes("report")) return "reports";
  }

  return "reports";
};

const formatBytes = (bytes: number | null) => {
  if (!bytes || Number.isNaN(bytes)) return "";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const openZoe = (prompt: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("zoe:open-chat", { detail: { prompt } }));
};

const getFileIcon = (fileType: FileType): LucideIcon => {
  switch (fileType) {
    case "pdf":
      return FileText;
    case "doc":
    case "presentation":
      return FileType;
    case "spreadsheet":
      return FileSpreadsheet;
    case "image":
      return ImageIcon;
    case "video":
      return Video;
    default:
      return FileText;
  }
};

const StaffResourceCenter = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ResourceCategory>("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | FileType>("all");
  const [errorState, setErrorState] = useState<NormalizedError | null>(null);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      const { data, error } = await supabase
        .from("resource_library")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as ResourceMetadataRow[];

      const mappedResources = await Promise.all(
        rows.map(async (row) => {
          const { data: publicUrlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(row.storage_path);

          const extensionFromName = row.file_extension
            ? row.file_extension.replace(/^\./, "")
            : row.file_name?.split(".").pop() ?? "";

          const normalizedFileType = (row.file_type ?? "").toLowerCase();
          const resolvedFileType = (Object.keys(FILE_TYPE_LABELS) as FileType[]).includes(
            normalizedFileType as FileType,
          )
            ? (normalizedFileType as FileType)
            : resolveFileTypeFromExtension(extensionFromName);

          return {
            id: row.id ?? row.storage_path,
            title: row.title?.trim() || row.file_name || "Untitled resource",
            description: row.description?.trim() || "No description provided.",
            category: resolveCategory(row),
            fileType: resolvedFileType,
            accessLevel: row.access_level ?? null,
            storagePath: row.storage_path,
            fileName: row.file_name ?? row.storage_path.split("/").pop() ?? row.storage_path,
            fileExtension: extensionFromName,
            size: row.file_size,
            publicUrl: publicUrlData?.publicUrl ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          } satisfies ResourceItem;
        }),
      );

      setResources(mappedResources);
      setErrorState(null);
    } catch (fetchError) {
      logError(fetchError, "StaffResourceCenter.fetchResources");
      const normalizedError = formatError(fetchError, {
        title: "Unable to load resources",
        description: "We couldn't fetch the staff documents. Please try again.",
      });

      setErrorState(normalizedError);
      toast({
        title: normalizedError.title,
        description: normalizedError.description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const filteredResources = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        resource.title.toLowerCase().includes(normalizedSearch) ||
        resource.description.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === "all" || resource.category === categoryFilter;

      const matchesFileType =
        fileTypeFilter === "all" || resource.fileType === fileTypeFilter;

      return matchesSearch && matchesCategory && matchesFileType;
    });
  }, [resources, searchTerm, categoryFilter, fileTypeFilter]);

  const categorizedResources = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as ResourceCategory[]).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: filteredResources.filter((resource) => resource.category === category),
    }));
  }, [filteredResources]);

  const handleAiSummary = (resource: ResourceItem) => {
    const promptParts = [
      `Summarize the document titled "${resource.title}" in one paragraph for staff context.`,
      "Highlight key actions, compliance notes, and any deadlines if present.",
    ];

    if (resource.publicUrl) {
      promptParts.push(`You can reference the file at ${resource.publicUrl}.`);
    }

    openZoe(promptParts.join(" "));
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Document library</CardTitle>
            <CardDescription>
              Browse the latest policies, training guides, forms, and reports curated for staff enablement.
            </CardDescription>
          </div>

          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-2 md:w-auto md:max-w-md lg:flex lg:items-center">
              <div className="relative w-full md:w-auto">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-full rounded-lg border-0 bg-background pl-9 shadow-none ring-1 ring-inset ring-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="grid w-full grid-cols-2 gap-3 md:w-auto lg:flex">
                <Select
                  value={categoryFilter}
                  onValueChange={(value: ResourceCategory | "all") => setCategoryFilter(value)}
                >
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {(Object.keys(CATEGORY_LABELS) as ResourceCategory[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {CATEGORY_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={fileTypeFilter}
                  onValueChange={(value: FileType | "all") => setFileTypeFilter(value)}
                >
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All file types</SelectItem>
                    {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {FILE_TYPE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="hidden md:flex">
              <Button variant="outline" className="gap-2" onClick={fetchResources} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
            <div className="flex w-full md:hidden">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={fetchResources}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-8">
          {errorState ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
              <AlertCircle className="h-5 w-5" />
              <div className="flex flex-col gap-3">
                <div>
                  <AlertTitle>{errorState.title}</AlertTitle>
                  <AlertDescription>{errorState.description}</AlertDescription>
                  {errorState.code ? (
                    <p className="mt-2 text-xs text-muted-foreground">Error code: {errorState.code}</p>
                  ) : null}
                  {typeof errorState.details === "string" && errorState.details ? (
                    <p className="mt-1 text-xs text-muted-foreground">{errorState.details}</p>
                  ) : null}
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={fetchResources} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Try again
                  </Button>
                </div>
              </div>
            </Alert>
          ) : isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`resource-skeleton-${index}`} className="space-y-3 rounded-lg border p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">No resources match your filters yet.</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting the filters or check back later for new uploads.
              </p>
              <Button variant="outline" size="sm" onClick={fetchResources} className="mt-2">
                Refresh list
              </Button>
            </div>
          ) : (
            categorizedResources.map(({ category, label, items }) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{label}</h3>
                  <Badge variant="secondary">{items.length} files</Badge>
                </div>

                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files in this category match your filters.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {items.map((resource) => {
                      const Icon = getFileIcon(resource.fileType);
                      const uploadedDate = resource.createdAt
                        ? formatUkDate(resource.createdAt)
                        : null;

                      return (
                        <div
                          key={resource.id}
                          className="flex h-full flex-col justify-between rounded-lg border bg-card p-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="rounded-md border bg-muted/40 p-2">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold leading-snug">{resource.title}</h4>
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {resource.description}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">{FILE_TYPE_LABELS[resource.fileType]}</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {uploadedDate ? <span>Uploaded {uploadedDate}</span> : null}
                              {resource.size ? <span>• {formatBytes(resource.size)}</span> : null}
                              {resource.accessLevel ? <span>• Access: {resource.accessLevel}</span> : null}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              asChild
                              disabled={!resource.publicUrl}
                            >
                              <a
                                href={resource.publicUrl ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                download={resource.fileName}
                              >
                                <Download className="h-4 w-4" /> Download
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleAiSummary(resource)}
                            >
                              <Sparkles className="h-4 w-4" /> AI summary
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffResourceCenter;

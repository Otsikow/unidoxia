import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateFileUpload } from "@/lib/fileUpload";
import {
  File as FileIcon,
  FileText,
  FileType,
  Filter,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  UploadCloud,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_BUCKET = "resources";

const RESOURCE_TYPE_OPTIONS = [
  { value: "student_guide", label: "Student Guide" },
  { value: "agent_training", label: "Agent Training" },
  { value: "university_info", label: "University Info" },
] as const;

const ACCESS_LEVEL_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "agents", label: "Agents Only" },
  { value: "universities", label: "Universities Only" },
  { value: "staff", label: "Staff Only" },
] as const;

const FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "DOCX / DOC" },
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
] as const;

type ResourceType = (typeof RESOURCE_TYPE_OPTIONS)[number]["value"];
type AccessLevel = (typeof ACCESS_LEVEL_OPTIONS)[number]["value"];
type FileMetadataType = (typeof FILE_TYPE_OPTIONS)[number]["value"];

interface ResourceMetadataRow {
  id: string;
  title: string;
  description: string | null;
  file_type: string | null;
  access_level: AccessLevel;
  resource_type: ResourceType;
  storage_path: string;
  file_name: string | null;
  file_extension: string | null;
  file_size: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ResourceItem {
  id: string;
  metadataId: string | null;
  title: string;
  description: string | null;
  fileType: FileMetadataType;
  accessLevel: AccessLevel;
  type: ResourceType;
  storagePath: string;
  fileName: string;
  fileExtension: string;
  size: number | null;
  publicUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ResourceFormState {
  title: string;
  description: string;
  type: ResourceType;
  fileType: FileMetadataType;
  accessLevel: AccessLevel;
}

const DEFAULT_FORM_STATE: ResourceFormState = {
  title: "",
  description: "",
  type: "student_guide",
  fileType: "pdf",
  accessLevel: "public",
};

const resolveFileTypeFromExtension = (
  extension?: string | null,
): FileMetadataType => {
  switch ((extension ?? "").toLowerCase()) {
    case "pdf":
      return "pdf";
    case "doc":
    case "docx":
      return "doc";
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
    case "webm":
      return "video";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
      return "image";
    case "xls":
    case "xlsx":
    case "csv":
      return "spreadsheet";
    case "ppt":
    case "pptx":
      return "presentation";
    default:
      return "other";
  }
};

const getIconForResource = (extension: string, fileType: string) => {
  const normalized = extension.toLowerCase();
  const normalizedType = fileType.toLowerCase();

  if (normalized === "pdf" || normalizedType === "pdf") {
    return <FileText className="h-8 w-8 text-primary" />;
  }

  if (
    ["doc", "docx"].includes(normalized) ||
    ["doc", "docx"].includes(normalizedType)
  ) {
    return <FileType className="h-8 w-8 text-primary" />;
  }

  if (
    ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(normalized) ||
    normalizedType === "image"
  ) {
    return <ImageIcon className="h-8 w-8 text-primary" />;
  }

  if (
    ["mp4", "mov", "avi", "mkv", "webm"].includes(normalized) ||
    normalizedType === "video"
  ) {
    return <Video className="h-8 w-8 text-primary" />;
  }

  return <FileIcon className="h-8 w-8 text-primary" />;
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

const AdminResources = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"upload" | "edit">("upload");
  const [formState, setFormState] = useState<ResourceFormState>(DEFAULT_FORM_STATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<ResourceType | "all">("all");

  const fetchResources = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: metadataRows, error: metadataError } = await supabase
        .from("resource_library")
        .select("*")
        .order("created_at", { ascending: false });

      if (metadataError) {
        throw metadataError;
      }

      const rows = (metadataRows ?? []) as ResourceMetadataRow[];

      const mappedResources = await Promise.all(
        rows.map(async (row) => {
          const { data: publicUrlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(row.storage_path);

          const extensionFromName = row.file_extension
            ? row.file_extension.replace(/^\./, "")
            : row.file_name?.split(".").pop() ?? "";
          const normalizedFileType = (row.file_type ?? "").toLowerCase();
          const resolvedFileType = FILE_TYPE_OPTIONS.some(
            (option) => option.value === normalizedFileType,
          )
            ? (normalizedFileType as FileMetadataType)
            : resolveFileTypeFromExtension(extensionFromName);

          return {
            id: row.id ?? row.storage_path,
            metadataId: row.id ?? null,
            title: row.title ?? row.file_name ?? "Untitled resource",
            description: row.description,
            fileType: resolvedFileType,
            accessLevel: row.access_level ?? "public",
            type: row.resource_type ?? "student_guide",
            storagePath: row.storage_path,
            fileName: row.file_name ?? row.storage_path.split("/").pop() ?? row.storage_path,
            fileExtension: extensionFromName ?? "",
            size: row.file_size,
            publicUrl: publicUrlData?.publicUrl ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          } satisfies ResourceItem;
        }),
      );

      setResources(mappedResources);
    } catch (error) {
      console.error("Failed to load resources", error);
      toast({
        title: "Unable to load resources",
        description:
          error instanceof Error ? error.message : "Unexpected error fetching resources.",
        variant: "destructive",
      });
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const openUploadDialog = () => {
    setDialogMode("upload");
    setFormState(DEFAULT_FORM_STATE);
    setSelectedFile(null);
    setSelectedResource(null);
    setDialogOpen(true);
  };

  const openEditDialog = (resource: ResourceItem) => {
    if (!resource.metadataId) {
      toast({
        title: "Metadata unavailable",
        description: "Re-upload this file to manage metadata and permissions.",
        variant: "destructive",
      });
      return;
    }

    const normalizedFileType = resource.fileType;
    setDialogMode("edit");
    setSelectedResource(resource);
    setFormState({
      title: resource.title,
      description: resource.description ?? "",
      type: resource.type,
      fileType: normalizedFileType,
      accessLevel: resource.accessLevel,
    });
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (file && dialogMode === "upload") {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const resolvedType = resolveFileTypeFromExtension(extension);
      setFormState((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        fileType: resolvedType,
      }));
    }
  };

  const resetDialogState = () => {
    setSelectedFile(null);
    setSelectedResource(null);
    setFormState(DEFAULT_FORM_STATE);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetDialogState();
  };

  const handleSubmit = async () => {
    if (dialogMode === "upload" && !selectedFile) {
      toast({
        title: "File required",
        description: "Select a file to upload before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (dialogMode === "edit" && !selectedResource) {
      toast({
        title: "Missing resource",
        description: "Select a resource to update before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let storagePath = selectedResource?.storagePath ?? "";
      let uploadedFile = selectedFile;
      let validatedUpload = null as
        | Awaited<ReturnType<typeof validateFileUpload>>
        | null;

      if (selectedFile) {
        validatedUpload = await validateFileUpload(selectedFile, {
          allowedMimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "video/mp4",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska",
            "video/webm",
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ],
          allowedExtensions: [
            "pdf",
            "doc",
            "docx",
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "svg",
            "mp4",
            "mov",
            "avi",
            "mkv",
            "webm",
            "xls",
            "xlsx",
            "csv",
            "ppt",
            "pptx",
          ],
          maxSizeBytes: 50 * 1024 * 1024,
        });

        uploadedFile = validatedUpload.preparedFile;
      }

      if (dialogMode === "upload" && selectedFile) {
        storagePath = `${formState.type}/${Date.now()}_${validatedUpload?.sanitizedFileName ?? selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, uploadedFile!, {
            cacheControl: "3600",
            upsert: false,
            contentType: validatedUpload?.detectedMimeType ?? selectedFile.type,
            metadata: {
              title: formState.title,
              description: formState.description,
              type: formState.type,
              access_level: formState.accessLevel,
              file_type: formState.fileType,
            },
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      if (dialogMode === "edit" && selectedResource && selectedFile) {
        const newStoragePath = `${formState.type}/${Date.now()}_${validatedUpload?.sanitizedFileName ?? selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(newStoragePath, uploadedFile!, {
            cacheControl: "3600",
            upsert: true,
            contentType: validatedUpload?.detectedMimeType ?? selectedFile.type,
            metadata: {
              title: formState.title,
              description: formState.description,
              type: formState.type,
              access_level: formState.accessLevel,
              file_type: formState.fileType,
            },
          });

        if (uploadError) {
          throw uploadError;
        }

        if (newStoragePath !== selectedResource.storagePath) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([selectedResource.storagePath]);
        }

        storagePath = newStoragePath;
        uploadedFile = selectedFile;
      }

      if (dialogMode === "upload") {
        const { error: insertError } = await supabase.from("resource_library").insert({
          tenant_id: profile?.tenant_id,
          title: formState.title,
          description: formState.description,
          file_type: formState.fileType,
          file_url: storagePath,
          access_level: formState.accessLevel,
          resource_type: formState.type,
          storage_path: storagePath,
          file_name: uploadedFile?.name ?? null,
          file_extension: uploadedFile?.name.split(".").pop()?.toLowerCase() ?? null,
          file_size: uploadedFile?.size ?? null,
          created_by: profile?.id,
        } as any);

        if (insertError) {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
          throw insertError;
        }

        toast({
          title: "Resource uploaded",
          description: `${formState.title || selectedFile?.name} is now available in the library.`,
        });
      }

      if (dialogMode === "edit" && selectedResource?.metadataId) {
        const { error: updateError } = await supabase
          .from("resource_library")
          .update({
            title: formState.title,
            description: formState.description,
            file_type: formState.fileType,
            access_level: formState.accessLevel,
            resource_type: formState.type,
            storage_path: storagePath,
            file_name: uploadedFile?.name ?? selectedResource.fileName,
            file_extension:
              uploadedFile?.name.split(".").pop()?.toLowerCase() ?? selectedResource.fileExtension,
            file_size: uploadedFile?.size ?? selectedResource.size,
          })
          .eq("id", selectedResource.metadataId);

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Resource updated",
          description: `${formState.title || selectedResource.fileName} has been updated.`,
        });
      }

      await fetchResources();
      closeDialog();
    } catch (error) {
      console.error("Error saving resource", error);
      toast({
        title: "Unable to save resource",
        description: error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (resource: ResourceItem) => {
    setIsSubmitting(true);

    try {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([resource.storagePath]);

      if (storageError) {
        throw storageError;
      }

      if (resource.metadataId) {
        const { error: deleteError } = await supabase
          .from("resource_library")
          .delete()
          .eq("id", resource.metadataId);

        if (deleteError) {
          throw deleteError;
        }
      }

      toast({
        title: "Resource deleted",
        description: `${resource.title || resource.fileName} has been removed.`,
      });

      setResources((prev) => prev.filter((item) => item.id !== resource.id));
    } catch (error) {
      console.error("Error deleting resource", error);
      toast({
        title: "Unable to delete resource",
        description: error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVisibilityChange = async (
    resource: ResourceItem,
    nextVisibility: AccessLevel,
  ) => {
    try {
      if (!resource.metadataId) {
        toast({
          title: "Metadata missing",
          description: "This file is missing metadata. Re-upload to manage visibility.",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("resource_library")
        .update({ access_level: nextVisibility })
        .eq("id", resource.metadataId);

      if (updateError) {
        throw updateError;
      }

      setResources((prev) =>
        prev.map((item) =>
          item.id === resource.id ? { ...item, accessLevel: nextVisibility } : item,
        ),
      );

      toast({
        title: "Visibility updated",
        description: `${resource.title || resource.fileName} is now ${
          ACCESS_LEVEL_OPTIONS.find((option) => option.value === nextVisibility)?.label ||
          "updated"
        }.`,
      });
    } catch (error) {
      console.error("Failed to update visibility", error);
      toast({
        title: "Unable to update visibility",
        description: error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const filteredResources = useMemo(() => {
    if (filterType === "all") {
      return resources;
    }

    return resources.filter((resource) => resource.type === filterType);
  }, [resources, filterType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resource management</h1>
          <p className="text-sm text-muted-foreground">
            Upload, organize, and distribute program guides, compliance materials, and internal playbooks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={fetchResources} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            Refresh
          </Button>
          <Button onClick={openUploadDialog} className="gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload resource
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Filter by resource type to focus on the content you need.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              size="sm"
            >
              All resources
            </Button>
            {RESOURCE_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={filterType === option.value ? "default" : "outline"}
                onClick={() => setFilterType(option.value)}
                size="sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resource library</CardTitle>
          <CardDescription>
            Preview files, manage metadata, and control visibility per audience segment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading resources...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              <UploadCloud className="h-6 w-6" />
              <div>No resources found in this category.</div>
              <Button variant="outline" onClick={openUploadDialog}>
                Upload your first resource
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="flex h-full flex-col">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                        {getIconForResource(resource.fileExtension, resource.fileType)}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {resource.title || resource.fileName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {resource.fileName}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(resource)}>
                          Edit metadata
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(resource)}>
                          Delete resource
                        </DropdownMenuItem>
                        {resource.publicUrl ? (
                          <DropdownMenuItem asChild>
                            <a href={resource.publicUrl} target="_blank" rel="noreferrer">
                              Open file
                            </a>
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>{resource.description || "No description provided."}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                          {RESOURCE_TYPE_OPTIONS.find((option) => option.value === resource.type)?.label ||
                            "Uncategorized"}
                        </Badge>
                        <Badge variant="outline">
                          {
                            FILE_TYPE_OPTIONS.find((option) => option.value === resource.fileType)
                              ?.label ?? "Unknown"
                          }
                        </Badge>
                        {resource.size ? <Badge variant="outline">{formatBytes(resource.size)}</Badge> : null}
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-foreground">Visibility</span>
                        <Select
                          value={resource.accessLevel}
                          onValueChange={(value) => handleVisibilityChange(resource, value as AccessLevel)}
                        >
                          <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCESS_LEVEL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {resource.createdAt ? (
                          <span>
                            Added {format(new Date(resource.createdAt), "d MMM yyyy")}
                          </span>
                        ) : null}
                        {resource.updatedAt ? (
                          <span>Updated {format(new Date(resource.updatedAt), "d MMM yyyy")}</span>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true);
          } else {
            closeDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "upload" ? "Upload new resource" : "Edit resource metadata"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "upload"
                ? "Add a new training resource, guide, or reference document to the Supabase library."
                : "Update the metadata, audience access, or replace the source file."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Resource name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Provide context, usage notes, or release status."
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formState.type}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, type: value as ResourceType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>File type</Label>
                <Select
                  value={formState.fileType}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, fileType: value as FileMetadataType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select file type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Access level</Label>
              <Select
                value={formState.accessLevel}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, accessLevel: value as AccessLevel }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="file">Resource file</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                className={cn(dialogMode === "edit" ? "border-dashed" : "")}
              />
              <p className="text-xs text-muted-foreground">
                {dialogMode === "upload"
                  ? "Upload PDF, DOCX, video, or image assets directly to Supabase storage."
                  : "Select a file to replace the current version or leave empty to keep the existing upload."}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : dialogMode === "upload" ? (
                "Upload"
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminResources;

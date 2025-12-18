import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

export const INTAKE_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = index + 1;
  return { value, label: monthFormatter.format(new Date(2000, index, 1)) };
});

const CURRENCY_OPTIONS = ["USD", "CAD", "GBP", "EUR", "AUD", "NZD", "SGD"];

const PROGRAM_IMAGE_BUCKET = "course-images";
const PROGRAM_IMAGE_FALLBACK_BUCKET = "university-media";
const PROGRAM_IMAGE_FOLDER = "program-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const optionalImageUrlSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    // Normalize empty/whitespace strings to null
    if (!value || (typeof value === "string" && !value.trim())) {
      return null;
    }
    return typeof value === "string" ? value.trim() : null;
  })
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const parsed = new URL(v);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a valid image URL including https://" },
  );

export const programSchema = z.object({
  name: z.string().min(2),
  level: z.string().min(2),
  discipline: z.string().min(2),
  durationMonths: z.number().min(1),
  tuitionCurrency: z.string().min(1),
  tuitionAmount: z.number().min(0),
  applicationFee: z.number().min(0).nullable().optional(),
  seatsAvailable: z.number().min(0).nullable().optional(),
  ieltsOverall: z.number().min(0).max(9).nullable().optional(),
  toeflOverall: z.number().min(0).nullable().optional(),
  intakeMonths: z.array(z.number().int().min(1).max(12)).min(1),
  entryRequirements: z.string().max(2000).optional(),
  description: z.string().max(4000).optional(),
  imageUrl: optionalImageUrlSchema,
  active: z.boolean(),
});

export type ProgramFormValues = z.infer<typeof programSchema>;

interface ProgramFormProps {
  initialValues: ProgramFormValues;
  onSubmit: (values: ProgramFormValues) => Promise<void> | void;
  onSaveDraft?: (values: Partial<ProgramFormValues>) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting: boolean;
  isSavingDraft?: boolean;
  submitLabel: string;
  levelOptions: string[];
  tenantId: string | null;
  userId: string | null;
  title?: string;
  description?: string;
  showSaveDraft?: boolean;
}

export default function ProgramForm({
  initialValues,
  onSubmit,
  onSaveDraft,
  onCancel,
  isSubmitting,
  isSavingDraft = false,
  submitLabel,
  levelOptions,
  tenantId,
  userId,
  title = "Course Details",
  description = "Enter the details for this course.",
  showSaveDraft = false,
}: ProgramFormProps) {
  const { toast } = useToast();
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Allowed: JPEG, PNG, WebP",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Max size 5 MB",
      });
      return;
    }

    if (!tenantId || !userId) {
      toast({
        variant: "destructive",
        title: "Upload error",
        description: "User or tenant not identified",
      });
      return;
    }

    setIsUploading(true);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const uniqueName = `${tenantId}/${userId}/${Date.now()}.${ext}`;
    const storagePath = `${PROGRAM_IMAGE_FOLDER}/${uniqueName}`;

    const uploadToBucket = async (bucket: string) => {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return publicUrlData.publicUrl;
    };

    try {
      let usedBucket = PROGRAM_IMAGE_BUCKET;
      let publicUrl: string | null = null;

      try {
        publicUrl = await uploadToBucket(usedBucket);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Bucket not found")) {
          usedBucket = PROGRAM_IMAGE_FALLBACK_BUCKET;
          publicUrl = await uploadToBucket(usedBucket);
          toast({
            title: "Image uploaded",
            description: "Used fallback storage bucket for now.",
          });
        } else {
          throw err;
        }
      }

      if (!publicUrl) throw new Error("Upload failed");

      form.setValue("imageUrl", publicUrl, { shouldValidate: true });

      if (usedBucket === PROGRAM_IMAGE_BUCKET) {
        toast({ title: "Image uploaded" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ variant: "destructive", title: "Upload failed", description: msg });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    form.setValue("imageUrl", null, { shouldValidate: true });
  };

  const imageUrl = form.watch("imageUrl");

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    
    // Get current form values without validation (allow partial data)
    const currentValues = form.getValues();
    await onSaveDraft(currentValues);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="flex h-[85vh] w-[95vw] max-w-3xl flex-col overflow-hidden border border-border bg-background p-0 sm:h-[90vh]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-6 py-2">
          <Form {...form}>
            <form
              id="program-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5 pb-6"
            >
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MSc Data Science" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Level & Discipline */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {levelOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discipline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discipline</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration & Tuition */}
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="durationMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tuitionCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tuitionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tuition Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* App Fee & Seats */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="applicationFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Fee (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seatsAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seats Available (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* IELTS & TOEFL */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ieltsOverall"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IELTS Overall (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min={0}
                          max={9}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toeflOverall"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TOEFL Overall (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Intake Months */}
              <FormField
                control={form.control}
                name="intakeMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intake Months</FormLabel>
                    <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-4 md:grid-cols-6">
                      {INTAKE_MONTH_OPTIONS.map((m) => {
                        const selected = field.value.includes(m.value);
                        return (
                          <label
                            key={m.value}
                            className="flex cursor-pointer items-center gap-1.5 select-none"
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...field.value, m.value]
                                  : field.value.filter((v) => v !== m.value);
                                field.onChange(next);
                              }}
                            />
                            <span className="text-sm">{m.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Entry Requirements */}
              <FormField
                control={form.control}
                name="entryRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Requirements</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Minimum qualifications…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Course overview…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Image (optional)</FormLabel>
                    <FormDescription className="text-xs">
                      Upload an image or paste a URL. Max 5 MB.
                    </FormDescription>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploading ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Upload
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ALLOWED_IMAGE_TYPES.join(",")}
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        {imageUrl && (
                          <div className="relative h-10 w-16 overflow-hidden rounded border border-border bg-muted">
                            <img
                              src={imageUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute right-0.5 top-0.5 h-4 w-4 p-0 text-[10px]"
                              onClick={handleRemoveImage}
                            >
                              ×
                            </Button>
                          </div>
                        )}
                      </div>

                      <FormControl>
                        <Input
                          placeholder="https://…"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Active */}
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Publish Course</FormLabel>
                      <FormDescription className="text-xs">
                        Visible to agents and students.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        {/* Actions - Outside scroll area for consistent positioning */}
        <div className="shrink-0 flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
          {/* Left side - Save Draft button */}
          <div className="order-last sm:order-first">
            {showSaveDraft && onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft}
                className="w-full sm:w-auto gap-2"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving draft...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save as draft
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Right side - Cancel and Submit buttons */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting || isSavingDraft} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="program-form" disabled={isSubmitting || isSavingDraft} className="w-full sm:w-auto">
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Loader2 } from "lucide-react";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { tenantStudentsQueryKey } from "@/hooks/useTenantStudents";

const inviteStudentSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Please provide at least 2 characters.")
      .max(200, "Name cannot exceed 200 characters."),
    email: z.string().email("Enter a valid email address."),
    phone: z
      .string()
      .optional()
      .refine(
        (value) => !value || value.trim().length >= 6,
        "If provided, phone number should contain at least 6 characters.",
      ),
    sendWhatsApp: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (values.sendWhatsApp && !values.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "WhatsApp number is required when sending via WhatsApp.",
      });
    }
  });

type InviteStudentFormValues = z.infer<typeof inviteStudentSchema>;

const extractInviteErrorMessage = async (error: unknown): Promise<string> => {
  const parseResponseError = async (response: Response) => {
    const statusDetails = `${response.status || ""} ${response.statusText || ""}`.trim();

    try {
      const parsedBody = await response.clone().json();

      const candidateMessage =
        (typeof parsedBody === "object" && parsedBody !== null
          ? [
              // Common error shapes returned by edge functions and APIs
              (parsedBody as { error?: string }).error,
              (parsedBody as { message?: string }).message,
              (parsedBody as { error_description?: string }).error_description,
              (parsedBody as { details?: string }).details,
            ]
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
              .at(0)
          : undefined) ?? (typeof parsedBody === "string" ? parsedBody : undefined);

      if (candidateMessage) {
        return statusDetails ? `${candidateMessage} (${statusDetails})` : candidateMessage;
      }
    } catch {
      // Ignore JSON parse errors and fall back to the plain text body.
    }

    try {
      const text = await response.clone().text();
      if (text) {
        return statusDetails ? `${text} (${statusDetails})` : text;
      }
    } catch {
      // Ignore body parsing failures and fall through to the default message.
    }

    if (statusDetails) return statusDetails;

    return undefined;
  };

  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    const response = error.context;

    if (response instanceof Response) {
      const responseMessage = await parseResponseError(response);
      if (responseMessage) return responseMessage;
    }

    return error.message;
  }

  if (error instanceof FunctionsFetchError) {
    return error.message ||
      "Unable to reach the invite service. Please check your connection and try again.";
  }

  if (error instanceof Error) return error.message;

  return "Unexpected error while inviting the student.";
};

export interface InviteStudentDialogProps {
  tenantId?: string | null;
  agentProfileId?: string | null;
  counselorProfileId?: string | null;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  triggerLabel?: string;
  onSuccess?: () => void;
}

export function InviteStudentDialog({
  tenantId,
  agentProfileId,
  counselorProfileId,
  disabled,
  open,
  onOpenChange,
  title = "Invite a student",
  description = "Send an invite to connect a student to your dashboard. They\u2019ll receive an email with instructions to activate their account. Optionally, also send the activation link via WhatsApp.",
  triggerLabel = "Invite Student",
  onSuccess,
}: InviteStudentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteStudentFormValues>({
    resolver: zodResolver(inviteStudentSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      sendWhatsApp: false,
    },
  });

  const sendWhatsApp = watch("sendWhatsApp");

  const canInvite = useMemo(() => {
    if (!tenantId) return false;
    return Boolean(agentProfileId || counselorProfileId);
  }, [agentProfileId, counselorProfileId, tenantId]);

  const buildWhatsAppUrl = (phoneNumber: string, message: string) => {
    const digitsOnly = phoneNumber.replace(/[^\d]/g, "");
    const cleaned = digitsOnly.startsWith("00") ? digitsOnly.slice(2) : digitsOnly;
    const base = `https://wa.me/${cleaned}`;
    return `${base}?text=${encodeURIComponent(message)}`;
  };

  const closeDialog = () => {
    onOpenChange(false);
    reset();
  };

  const invalidateQueries = (currentTenantId: string) => {
    queryClient.invalidateQueries({
      queryKey: tenantStudentsQueryKey(currentTenantId),
    });

    const staffBaseKey = ["staff", "students", currentTenantId] as const;

    queryClient.invalidateQueries({
      queryKey: staffBaseKey,
      exact: false,
    });
  };

  const onSubmit = async (values: InviteStudentFormValues) => {
    if (!tenantId || !canInvite) {
      toast({
        title: "Invite unavailable",
        description: "We couldn\u2019t verify the required staff or agent details. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: {
        fullName: string;
        email: string;
        phone?: string;
        tenantId: string;
        agentProfileId?: string;
        counselorProfileId?: string;
        includeActionLink?: boolean;
      } = {
        fullName: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        tenantId,
      };

      if (values.phone?.trim()) {
        payload.phone = values.phone.trim();
      }

      if (values.sendWhatsApp) {
        payload.includeActionLink = true;
      }

      if (agentProfileId) {
        payload.agentProfileId = agentProfileId;
      }

      if (counselorProfileId) {
        payload.counselorProfileId = counselorProfileId;
      }

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        studentId?: string;
        inviteType?: string;
        actionLink?: string;
        error?: string;
      }>("invite-student", {
        body: payload,
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const inviteSuccessful = data?.success ?? Boolean(data?.studentId);

      if (!inviteSuccessful) {
        throw new Error("The student invite could not be completed.");
      }

      const actionLink = data?.actionLink;
      const shouldOfferWhatsApp = Boolean(values.sendWhatsApp && payload.phone && actionLink);
      const whatsAppMessage = shouldOfferWhatsApp
        ? `Hi ${values.fullName.trim()}! You\u2019ve been invited to UniDoxia. Activate your account here: ${actionLink}`
        : null;
      const whatsAppUrl =
        shouldOfferWhatsApp && whatsAppMessage ? buildWhatsAppUrl(payload.phone!, whatsAppMessage) : null;

      toast({
        title: "Student invited",
        description: values.sendWhatsApp
          ? `${values.fullName} will receive an email. You can also send the activation link via WhatsApp.`
          : `${values.fullName} will receive an email with next steps.`,
        action: whatsAppUrl ? (
          <ToastAction
            altText="Open WhatsApp"
            onClick={() => window.open(whatsAppUrl, "_blank", "noopener,noreferrer")}
          >
            Open WhatsApp
          </ToastAction>
        ) : undefined,
      });

      closeDialog();

      invalidateQueries(tenantId);

      onSuccess?.();
    } catch (error) {
      const message = await extractInviteErrorMessage(error);

      toast({
        title: "Unable to invite student",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogTrigger asChild>
        <Button disabled={disabled || !canInvite} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
            <Checkbox
              id="sendWhatsApp"
              checked={sendWhatsApp}
              onCheckedChange={(checked) => setValue("sendWhatsApp", Boolean(checked))}
              disabled={isSubmitting}
            />
            <div className="space-y-1 leading-tight">
              <Label htmlFor="sendWhatsApp" className="cursor-pointer">
                Also send via WhatsApp
              </Label>
              <p className="text-sm text-muted-foreground">
                We\u2019ll generate an activation link you can send on WhatsApp.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp number {sendWhatsApp ? "" : "(optional)"}</Label>
            <Input
              id="phone"
              autoComplete="tel"
              placeholder={sendWhatsApp ? "e.g. +447700900123" : undefined}
              {...register("phone")}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending
                </>
              ) : (
                "Send invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteStudentDialog;

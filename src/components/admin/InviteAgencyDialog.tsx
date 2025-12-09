import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const inviteAgencySchema = z.object({
  fullName: z
    .string()
    .min(2, "Please provide at least 2 characters.")
    .max(200, "Name cannot exceed 200 characters."),
  email: z.string().email("Enter a valid email address."),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters.")
    .max(200, "Company name cannot exceed 200 characters."),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.trim().length >= 6,
      "If provided, phone number should contain at least 6 characters."
    ),
});

type InviteAgencyFormValues = z.infer<typeof inviteAgencySchema>;

export interface InviteAgencyDialogProps {
  tenantId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteAgencyDialog({
  tenantId,
  open,
  onOpenChange,
  onSuccess,
}: InviteAgencyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteAgencyFormValues>({
    resolver: zodResolver(inviteAgencySchema),
    defaultValues: {
      fullName: "",
      email: "",
      companyName: "",
      phone: "",
    },
  });

  const closeDialog = () => {
    onOpenChange(false);
    reset();
  };

  const onSubmit = async (values: InviteAgencyFormValues) => {
    if (!tenantId) {
      toast({
        title: "Invite unavailable",
        description: "Tenant information is missing. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the current session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast({
          title: "Authentication required",
          description: "Please sign in again to invite agencies.",
          variant: "destructive",
        });
        return;
      }

      // Call the invite-agent edge function
      const response = await supabase.functions.invoke("invite-agent", {
        body: {
          fullName: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
          companyName: values.companyName.trim(),
          phone: values.phone?.trim() || undefined,
          tenantId,
        },
      });

      if (response.error) {
        // Handle specific error cases
        const errorMessage = response.error.message || "Failed to invite agency";
        
        if (errorMessage.includes("already associated with a different tenant")) {
          toast({
            title: "Email already in use",
            description: "This email is associated with a different organization.",
            variant: "destructive",
          });
          return;
        }

        if (errorMessage.includes("agent with this email already exists")) {
          toast({
            title: "Agency already exists",
            description: "An agency with this email already exists.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(errorMessage);
      }

      toast({
        title: "Agency invited",
        description: `${values.companyName} will receive an email with instructions to set up their account.`,
      });

      closeDialog();

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });

      onSuccess?.();
    } catch (error) {
      console.error("Error inviting agency:", error);
      const message = error instanceof Error ? error.message : "Unexpected error while inviting the agency.";
      toast({
        title: "Unable to invite agency",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite an Agency</DialogTitle>
          <DialogDescription>
            Send an invitation to a new recruitment agency. They'll receive an email with instructions to activate their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" autoComplete="organization" {...register("companyName")} />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Contact person name</Label>
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

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number (optional)</Label>
            <Input id="phone" autoComplete="tel" {...register("phone")} />
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
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Send invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteAgencyDialog;

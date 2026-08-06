import { useMemo, useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, FileSignature, Loader2 } from "lucide-react";
import {
  AGENT_AGREEMENT_ACCEPTANCE,
  AGENT_AGREEMENT_INTRO,
  AGENT_AGREEMENT_SECTIONS,
  AGENT_AGREEMENT_TITLE,
  AGENT_AGREEMENT_VERSION,
} from "@/content/agentAgreementTerms";

const signatureSchema = z.object({
  full_legal_name: z.string().trim().min(2, "Full legal name is required").max(150),
  business_name: z.string().trim().max(150).optional().or(z.literal("")),
  company_registration_number: z.string().trim().max(80).optional().or(z.literal("")),
  country_of_operation: z.string().trim().min(2, "Country of operation is required").max(80),
  business_address: z.string().trim().min(5, "Business address is required").max(300),
  email: z.string().trim().email("A valid email address is required").max(255),
  phone: z.string().trim().min(6, "Telephone or WhatsApp number is required").max(40),
  identification_number: z.string().trim().max(80).optional().or(z.literal("")),
  representative_name: z.string().trim().max(150).optional().or(z.literal("")),
  position_title: z.string().trim().max(120).optional().or(z.literal("")),
  electronic_signature: z.string().trim().min(2, "Type your full name as your electronic signature").max(150),
});

type FormValues = z.infer<typeof signatureSchema>;

const emptyForm: FormValues = {
  full_legal_name: "",
  business_name: "",
  company_registration_number: "",
  country_of_operation: "",
  business_address: "",
  email: "",
  phone: "",
  identification_number: "",
  representative_name: "",
  position_title: "",
  electronic_signature: "",
};

interface AgentAgreementDialogProps {
  open: boolean;
  onSigned: () => void;
}

export function AgentAgreementDialog({ open, onSigned }: AgentAgreementDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptance, setAcceptance] = useState<boolean[]>([false, false, false]);
  const [form, setForm] = useState<FormValues>(() => ({
    ...emptyForm,
    full_legal_name: profile?.full_name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    country_of_operation: profile?.country ?? "",
  }));

  const allAccepted = useMemo(() => acceptance.every(Boolean), [acceptance]);

  const setField = (key: keyof FormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async () => {
    const parsed = signatureSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      Object.entries(parsed.error.flatten().fieldErrors).forEach(([key, messages]) => {
        if (messages?.[0]) fieldErrors[key] = messages[0];
      });
      setErrors(fieldErrors);
      toast({
        title: "Please complete the required details",
        description: "Some agent details are missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    if (!allAccepted) {
      toast({
        title: "Confirmation required",
        description: "Please tick all three acceptance confirmations.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sign-agent-agreement", {
        body: {
          ...parsed.data,
          agreement_version: AGENT_AGREEMENT_VERSION,
          confirmed_read: acceptance[0],
          confirmed_authority: acceptance[1],
          consented_verification: acceptance[2],
        },
      });

      if (error) throw error;

      toast({
        title: "Agreement signed",
        description:
          (data as { emailed?: boolean } | null)?.emailed === false
            ? "Your agreement is recorded. We will email your PDF copy shortly."
            : "A signed PDF copy has been emailed to you.",
      });
      onSigned();
    } catch (error) {
      console.error("Failed to sign agent agreement", error);
      toast({
        title: "Could not complete signing",
        description: "Please try again or contact info@unidoxia.com.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderBlocks = (blocks: Array<string | string[]>, keyPrefix: string) =>
    blocks.map((block, index) =>
      Array.isArray(block) ? (
        <ul key={`${keyPrefix}-${index}`} className="ml-5 list-disc space-y-1.5 text-sm text-muted-foreground">
          {block.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p key={`${keyPrefix}-${index}`} className="text-sm leading-relaxed text-muted-foreground">
          {block}
        </p>
      ),
    );

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className="max-w-3xl gap-0 p-0"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-2 border-b px-6 py-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Approved agent onboarding
          </div>
          <DialogTitle className="text-xl">{AGENT_AGREEMENT_TITLE}</DialogTitle>
          <DialogDescription>
            Your account has been vetted and approved. Please review and sign the agreement to continue. A signed PDF copy
            will be emailed to you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 py-5">
            {renderBlocks(AGENT_AGREEMENT_INTRO, "intro")}

            {AGENT_AGREEMENT_SECTIONS.map((section) => (
              <section key={section.title} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{section.title}</h3>
                {renderBlocks(section.blocks, section.title)}
              </section>
            ))}

            <Separator />

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Agent details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full legal name of agent or counsellor" required error={errors.full_legal_name}>
                  <Input value={form.full_legal_name} onChange={(e) => setField("full_legal_name", e.target.value)} />
                </Field>
                <Field label="Business or organisation name" error={errors.business_name}>
                  <Input value={form.business_name} onChange={(e) => setField("business_name", e.target.value)} />
                </Field>
                <Field label="Company registration number" error={errors.company_registration_number}>
                  <Input
                    value={form.company_registration_number}
                    onChange={(e) => setField("company_registration_number", e.target.value)}
                  />
                </Field>
                <Field label="Country of operation" required error={errors.country_of_operation}>
                  <Input
                    value={form.country_of_operation}
                    onChange={(e) => setField("country_of_operation", e.target.value)}
                  />
                </Field>
                <Field label="Business address" required error={errors.business_address} className="sm:col-span-2">
                  <Input value={form.business_address} onChange={(e) => setField("business_address", e.target.value)} />
                </Field>
                <Field label="Email address" required error={errors.email}>
                  <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                </Field>
                <Field label="Telephone or WhatsApp number" required error={errors.phone}>
                  <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                </Field>
                <Field
                  label="Government ID number or company identification reference"
                  error={errors.identification_number}
                  className="sm:col-span-2"
                >
                  <Input
                    value={form.identification_number}
                    onChange={(e) => setField("identification_number", e.target.value)}
                  />
                </Field>
                <Field label="Name of company owner or authorised representative" error={errors.representative_name}>
                  <Input
                    value={form.representative_name}
                    onChange={(e) => setField("representative_name", e.target.value)}
                  />
                </Field>
                <Field label="Position or job title" error={errors.position_title}>
                  <Input value={form.position_title} onChange={(e) => setField("position_title", e.target.value)} />
                </Field>
                <Field
                  label="Electronic signature (type your full name)"
                  required
                  error={errors.electronic_signature}
                  className="sm:col-span-2"
                >
                  <Input
                    value={form.electronic_signature}
                    onChange={(e) => setField("electronic_signature", e.target.value)}
                    className="font-serif italic"
                    placeholder="Your full name"
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Acceptance</h3>
              {AGENT_AGREEMENT_ACCEPTANCE.map((item, index) => (
                <label key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                  <Checkbox
                    checked={acceptance[index]}
                    onCheckedChange={(checked) =>
                      setAcceptance((prev) => prev.map((value, i) => (i === index ? checked === true : value)))
                    }
                    className="mt-0.5"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </section>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Agreement version {AGENT_AGREEMENT_VERSION} · Governed by the laws of England and Wales.
          </p>
          <Button onClick={handleSubmit} disabled={submitting || !allAccepted} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
            {submitting ? "Signing…" : "I AGREE AND SIGN"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default AgentAgreementDialog;

import { useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/supabaseEdgeFunctions";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const createContactSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("components.contactForm.errors.nameRequired"))
      .max(100, t("components.contactForm.errors.nameMax")),
    email: z
      .string()
      .trim()
      .email(t("components.contactForm.errors.emailInvalid"))
      .max(255, t("components.contactForm.errors.emailMax")),
    message: z
      .string()
      .trim()
      .min(1, t("components.contactForm.errors.messageRequired"))
      .max(1000, t("components.contactForm.errors.messageMax")),
    whatsapp: z
      .string()
      .trim()
      .regex(
        /^[0-9+()\-\s]*$/,
        t("components.contactForm.errors.whatsappInvalid"),
      )
      .max(30, t("components.contactForm.errors.whatsappMax"))
      .optional(),
  });

export const ContactForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sending = useRef(false);
  const fieldId = useId();
  const { toast } = useToast();
  const { t } = useTranslation();

  const contactSchema = useMemo(() => createContactSchema(t), [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current) return;

    try {
      // Validate input
      const validatedData = contactSchema.parse({
        name,
        email,
        message,
        whatsapp: whatsapp.trim() ? whatsapp.trim() : undefined,
      });

      sending.current = true;
      setIsSubmitting(true);

      const { data, error } = await invokeEdgeFunction<{ success?: boolean }>("send-contact-email", {
        body: validatedData,
      });

      if (error || data?.success !== true) throw error ?? new Error("The contact submission was not confirmed");

      toast({
        title: t("components.contactForm.notifications.successTitle"),
        description: t(
          "components.contactForm.notifications.successDescription",
        ),
      });

      // Clear form
      setName("");
      setEmail("");
      setWhatsapp("");
      setMessage("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("components.contactForm.notifications.validationTitle"),
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("components.contactForm.notifications.errorTitle"),
          description: t(
            "components.contactForm.notifications.errorDescription",
          ),
          variant: "destructive",
        });
      }
    } finally {
      sending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${fieldId}-name`}>{t("components.contactForm.placeholders.name")}</label>
        <Input
          id={`${fieldId}-name`}
          name="name"
          autoComplete="name"
          type="text"
          aria-label={t("components.contactForm.placeholders.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${fieldId}-email`}>{t("components.contactForm.placeholders.email")}</label>
        <Input
          id={`${fieldId}-email`}
          name="email"
          autoComplete="email"
          type="email"
          aria-label={t("components.contactForm.placeholders.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${fieldId}-whatsapp`}>{t("components.contactForm.placeholders.whatsapp")}</label>
        <Input
          id={`${fieldId}-whatsapp`}
          name="whatsapp"
          autoComplete="tel"
          type="tel"
          aria-label={t("components.contactForm.placeholders.whatsapp")}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          maxLength={30}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${fieldId}-message`}>{t("components.contactForm.placeholders.message")}</label>
        <Textarea
          id={`${fieldId}-message`}
          name="message"
          aria-label={t("components.contactForm.placeholders.message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={1000}
          rows={5}
          className="resize-none"
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? t("components.contactForm.submit.loading")
          : t("components.contactForm.submit.default")}
      </Button>
    </form>
  );
};

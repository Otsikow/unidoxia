import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/ContactForm";
import BackButton from "@/components/BackButton";
import professionalConsultant from "@/assets/professional-consultant.png";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const Contact = () => {
  const { t } = useTranslation();
  const emailAddress = t("pages.contact.email");
  const whatsappNumber = t("pages.contact.whatsappNumber");
  const whatsappLink = "https://wa.me/447360961803";
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="Contact Us - UniDoxia"
        description="Get in touch with the UniDoxia team. We're here to help with your questions about studying abroad, university applications, and our services."
        keywords="contact, support, study abroad help, university admissions contact, student recruitment support, university partnership inquiries"
      />
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <BackButton variant="ghost" size="sm" fallback="/" />
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold">{t("pages.contact.heroTitle")}</h1>
                <p className="text-muted-foreground text-lg">{t("pages.contact.heroSubtitle")}</p>
                <div className="flex flex-col gap-3 text-sm">
                  <p>
                    {t("pages.contact.emailPrompt")} {" "}
                    <a className="text-primary hover:underline font-medium" href={`mailto:${emailAddress}`}>
                      {emailAddress}
                    </a>
                  </p>
                  <a
                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-primary transition hover:border-primary hover:bg-primary/10"
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="font-medium">
                      {t("pages.contact.whatsappCta", { number: whatsappNumber })}
                    </span>
                  </a>
                </div>
            </div>
            <div className="hidden md:block">
              <img 
                src={professionalConsultant} 
                  alt={t("pages.contact.imageAlt")}
                className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
                <CardTitle>{t("pages.contact.formTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Contact;

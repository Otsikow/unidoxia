import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/ContactForm";
import { HomePhotography } from "@/components/landing/HomePhotography";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const Contact = () => {
  const { t } = useTranslation();
  const emailAddress = t("pages.contact.email");
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
                      {t("pages.contact.whatsappCta")}
                    </span>
                  </a>
                </div>
            </div>
            <div className="hidden md:block">
              <HomePhotography image="education-guidance" alt="A tutor and adult learners discussing their work in a university library" className="overflow-hidden" sizes="(max-width: 767px) 0px, 460px" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email the right team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">Choose the address that best fits your question.</p>
              <dl className="grid gap-5 sm:grid-cols-2">
                {[
                  ['General enquiries', 'info@unidoxia.com', 'Questions about UniDoxia and our services.'],
                  ['Admissions', 'admissions@unidoxia.com', 'Questions about admissions and entry requirements.'],
                  ['Application help', 'applications@unidoxia.com', 'Help with an existing or planned application.'],
                  ['Recruitment agents', 'agents@unidoxia.com', 'Enquiries from education agents.'],
                  ['University partnerships', 'partnerships@unidoxia.com', 'Enquiries from universities and institutions.'],
                  ['General support', 'support@unidoxia.com', 'Help using UniDoxia and its services.'],
                  ['Data protection', 'privacy@unidoxia.com', 'Privacy questions and data requests.'],
                ].map(([label, email, description]) => (
                  <div key={email} className="min-w-0 space-y-1">
                    <dt className="font-semibold">{label}</dt>
                    <dd><a className="break-all text-primary underline-offset-4 hover:underline" href={`mailto:${email}`}>{email}</a></dd>
                    <dd className="text-sm text-muted-foreground">{description}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted-foreground">
                Please upload application documents through your <Link className="text-primary underline underline-offset-4" to="/student/documents">student portal</Link>, rather than emailing them.
              </p>
            </CardContent>
          </Card>

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

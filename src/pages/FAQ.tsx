import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import libraryStudent from "@/assets/library.png";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";
import BackButton from "@/components/BackButton";

const FAQ = () => {
  const { t } = useTranslation();
  const sections = t("pages.faq.sections", { returnObjects: true }) as Array<{
    audience: string;
    items: Array<{ question: string; answer: string }>;
  }>;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SEO
        title="Frequently Asked Questions - UniDoxia"
        description="Find answers to common questions about studying abroad, university applications, student visas, and our platform. Get the information you need to start your journey."
        keywords="FAQ, study abroad questions, university application help, student visa FAQ, international student questions, agent recruitment FAQ"
      />
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <BackButton variant="ghost" size="sm" fallback="/" wrapperClassName="mb-6" />
          <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold">{t("pages.faq.heroTitle")}</h1>
              <p className="text-muted-foreground text-lg">{t("pages.faq.heroSubtitle")}</p>
            </div>
            <div className="hidden md:block">
              <img 
                src={libraryStudent} 
                alt={t("pages.faq.imageAlt")}
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>

          {sections.map((section, sectionIndex) => (
            <div key={`${section.audience}-${sectionIndex}`} className="mb-10">
              <h2 className="text-2xl font-semibold mb-4">{section.audience}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {section.items.map((faq, index) => (
                  <AccordionItem
                    key={`${sectionIndex}-${index}`}
                    value={`item-${sectionIndex}-${index}`}
                    className="border rounded-lg px-6 bg-card"
                  >
                    <AccordionTrigger className="py-6 text-left">
                      <span className="font-semibold text-base">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FAQ;

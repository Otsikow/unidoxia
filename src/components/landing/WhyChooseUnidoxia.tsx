import { GraduationCap, FileCheck2, Compass, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: GraduationCap,
    title: "University Admissions Support",
    description:
      "End-to-end guidance from shortlisting and applications to acceptance — across top universities worldwide.",
  },
  {
    icon: FileCheck2,
    title: "Visa Guidance & Documentation",
    description:
      "Expert visa preparation, document review, and interview coaching to maximise your approval chances.",
  },
  {
    icon: Compass,
    title: "Personalized Destination Matching",
    description:
      "Find the right country, university, and programme aligned with your goals, budget, and academic profile.",
  },
];

export function WhyChooseUnidoxia() {
  return (
    <section className="relative bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Why Choose UniDoxia
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            A premium partner for your global study journey
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Trusted by students worldwide — built on a decade of admissions and
            visa expertise.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 shadow-[0_2px_30px_-15px_hsl(var(--foreground)/0.15)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_60px_-25px_hsl(var(--primary)/0.4)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/5 blur-2xl transition-opacity duration-300 group-hover:bg-primary/15"
              />
              <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-5 text-xl font-semibold leading-snug">
                {title}
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" className="rounded-full h-12 px-7">
            <Link to="/auth/signup">
              Start Your Study Journey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default WhyChooseUnidoxia;

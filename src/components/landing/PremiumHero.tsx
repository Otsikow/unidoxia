import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ArrowRight, CalendarCheck, ShieldCheck, Globe2, GraduationCap, Sparkles } from "lucide-react";
import heroStudents from "@/assets/hero-global-students.jpg";
import unidoxiaLogo from "@/assets/unidoxia-logo.png";

const trustBadges = [
  { icon: CalendarCheck, label: "Since 2014" },
  { icon: GraduationCap, label: "Admission & Visa Guidance" },
  { icon: Globe2, label: "UK · Canada · USA · Europe · Australia" },
  { icon: ShieldCheck, label: "Trusted International Support" },
  { icon: Sparkles, label: "Students Worldwide" },
];

export function PremiumHero() {
  return (
    <section className="relative overflow-hidden bg-[hsl(220_42%_9%)] text-white">
      {/* Ambient gradient accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 20%, hsl(45 90% 60% / 0.18), transparent 38%), radial-gradient(circle at 85% 30%, hsl(210 100% 70% / 0.22), transparent 42%), radial-gradient(circle at 50% 100%, hsl(220 80% 40% / 0.25), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <LandingHeader />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36 pb-16 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT — Copy */}
          <div className="lg:col-span-7 space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(45_90%_60%)]" />
              Global Study Abroad Platform
            </div>

            <h1 className="font-extrabold tracking-tight leading-[1.05] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl">
              Study Abroad{" "}
              <span className="bg-gradient-to-r from-[hsl(45_95%_65%)] via-[hsl(38_92%_60%)] to-[hsl(28_90%_58%)] bg-clip-text text-transparent">
                Opportunities
              </span>{" "}
              for Students Worldwide
            </h1>

            <p className="max-w-2xl text-base sm:text-lg lg:text-xl text-white/75 leading-relaxed">
              UniDoxia helps students secure admission, navigate visa processes,
              and access trusted universities across Europe, the UK, Canada,
              the USA, Australia, and beyond.
            </p>

            <p className="text-sm text-white/55 italic">
              Guiding students step by step since 2014.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full px-8 text-base font-semibold bg-gradient-to-r from-[hsl(45_95%_58%)] to-[hsl(35_92%_55%)] text-[hsl(220_42%_9%)] shadow-[0_18px_45px_-10px_hsl(40_90%_55%/0.6)] hover:opacity-95 hover:shadow-[0_22px_55px_-10px_hsl(40_90%_55%/0.75)] border-0"
              >
                <Link to="/auth/signup">
                  Start Your Study Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full px-8 text-base font-semibold bg-white/5 border-white/25 text-white backdrop-blur hover:bg-white/15 hover:text-white hover:border-white/40"
              >
                <Link to="/contact">
                  <CalendarCheck className="mr-2 h-5 w-5" />
                  Book a Free Consultation
                </Link>
              </Button>
            </div>

            {/* Inline micro-trust */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-xs sm:text-sm text-white/60">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[hsl(45_90%_65%)]" />
                Trusted guidance since 2014
              </span>
              <span className="inline-flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[hsl(45_90%_65%)]" />
                Admission + Visa Support
              </span>
              <span className="inline-flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[hsl(45_90%_65%)]" />
                Global Study Destinations
              </span>
            </div>
          </div>

          {/* RIGHT — Visual */}
          <div className="lg:col-span-5">
            <div className="relative">
              {/* Glow */}
              <div
                aria-hidden
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[hsl(45_90%_55%/0.35)] via-[hsl(210_90%_60%/0.25)] to-transparent blur-2xl"
              />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-[0_40px_80px_-20px_hsl(220_60%_4%/0.7)]">
                <img
                  src={heroStudents}
                  alt="Diverse international students celebrating university admission"
                  width={1280}
                  height={1280}
                  className="h-full w-full object-cover aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5]"
                />
                {/* Subtle gradient for legibility of overlay chip */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[hsl(220_42%_9%)/0.85] to-transparent"
                />

                {/* Floating stat cards */}
                <div className="absolute left-4 top-4 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-md shadow-lg">
                  <div className="flex items-center gap-2">
                    <img
                      src={unidoxiaLogo}
                      alt=""
                      className="h-6 w-6 rounded-md brightness-0 invert"
                    />
                    <div className="leading-tight">
                      <p className="text-[10px] uppercase tracking-wider text-white/65">Trusted since</p>
                      <p className="text-sm font-bold">2014</p>
                    </div>
                  </div>
                </div>

                <div className="absolute right-4 bottom-4 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-md shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(45_90%_60%)] text-[hsl(220_42%_9%)]">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-[10px] uppercase tracking-wider text-white/65">Admissions</p>
                      <p className="text-sm font-bold">Approved Worldwide</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div className="relative z-10 border-t border-white/10 bg-[hsl(220_45%_7%)/0.6] backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm text-white/70">
            {trustBadges.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[hsl(45_90%_65%)]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium tracking-wide">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default PremiumHero;

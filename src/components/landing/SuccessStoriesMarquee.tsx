"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Quote, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Testimonial = {
  name: string;
  role: string;
  country: string;
  quote: string;
  rating: number;
};

const clampRating = (rating: number) => {
  if (!Number.isFinite(rating)) return 5;
  return Math.max(1, Math.min(5, Math.round(rating)));
};

const initialsFromName = (name: string) => {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") ?? "";
  return `${first}${last}`.toUpperCase();
};

const Stars = ({ rating }: { rating: number }) => {
  const count = clampRating(rating);
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
      ))}
      <span className="sr-only">{count} out of 5 stars</span>
    </div>
  );
};

const StoryCard = ({
  item,
  isActive,
  className,
}: {
  item: Testimonial;
  isActive: boolean;
  className?: string;
}) => {
  const initials = initialsFromName(item.name);
  return (
    <div className={cn("success-marquee__item", className)}>
      <div
        className={cn(
          "relative h-full rounded-3xl border bg-background/70 p-5 shadow-sm backdrop-blur-sm transition-all duration-300",
          "hover:-translate-y-1 hover:shadow-md",
          isActive ? "border-primary/30 shadow-md ring-1 ring-primary/20" : "border-border/70",
        )}
      >
        <div className="absolute right-5 top-5 text-primary/15">
          <Quote className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="flex items-start gap-3">
          <div
            className={cn(
              "h-10 w-10 shrink-0 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 to-primary/5",
              "flex items-center justify-center font-semibold text-primary",
            )}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold leading-none">{item.name}</p>
              <span className="text-xs text-muted-foreground">•</span>
              <p className="text-xs text-muted-foreground">{item.country}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.role}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm leading-relaxed text-foreground/90">
            <span className="sr-only">Quote:</span>
            “{item.quote}”
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <Stars rating={item.rating} />
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
            Verified
          </div>
        </div>
      </div>
    </div>
  );
};

export function SuccessStoriesMarquee({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(
    () =>
      (t("pages.index.testimonials.items", { returnObjects: true }) as Testimonial[]) ?? [],
    [t],
  );

  const title = t("pages.index.testimonials.heading");

  useEffect(() => {
    if (!items.length) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [items.length]);

  const loopA = useMemo(() => [...items, ...items], [items]);
  const loopB = useMemo(() => {
    if (items.length < 2) return [...items, ...items];
    const pivot = Math.floor(items.length / 2);
    const rotated = [...items.slice(pivot), ...items.slice(0, pivot)];
    return [...rotated, ...rotated];
  }, [items]);

  if (!items.length) return null;

  return (
    <section className={cn("relative py-20", className)}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold">{title}</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Real students. Real outcomes. See why applicants choose UniDoxia.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-6xl">
          <div className="pointer-events-none absolute -inset-x-6 -top-10 h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -inset-x-6 -bottom-10 h-32 bg-gradient-to-r from-transparent via-primary/5 to-primary/10 blur-2xl" />

          <div className="success-marquee">
            <div className="success-marquee__fade success-marquee__fade--left" aria-hidden="true" />
            <div className="success-marquee__fade success-marquee__fade--right" aria-hidden="true" />

            <div className="space-y-4 sm:space-y-5">
              <div className="success-marquee__track">
                {loopA.map((item, idx) => (
                  <StoryCard
                    key={`${item.name}-${idx}`}
                    item={item}
                    isActive={idx % items.length === activeIndex}
                  />
                ))}
              </div>
              <div className="success-marquee__track success-marquee__track--reverse">
                {loopB.map((item, idx) => (
                  <StoryCard
                    key={`${item.name}-b-${idx}`}
                    item={item}
                    isActive={(idx + 2) % items.length === activeIndex}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
            Verified success stories from real students
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="button-border-beam">
              <Link to="/auth/signup?role=student">Start your application</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/courses?view=programs">Browse programs</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}


"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Bot,
  Building2,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Users2,
} from "lucide-react";

import zoePortrait from "@/assets/professional-consultant.png";

interface FocusArea {
  key: string;
  label: string;
  headline: string;
  description: string;
  highlights: string[];
}

interface InsightStat {
  value: string;
  label: string;
}

interface PanelCopy {
  title: string;
  subtitle: string;
  previewLabel: string;
  highlightsHeading: string;
}

interface MultiRoleConfig {
  key: string;
  title: string;
  description: string;
  capabilities: string[];
}

const fallbackFocusAreas: FocusArea[] = [
  {
    key: "stem",
    label: "STEM",
    headline: "Tailored pathways for technical innovators",
    description:
      "Spotlight courses with research labs, co-ops, and funding built for scientists and engineers.",
    highlights: [
      "Scholarships that prioritise STEM majors and research output",
      "Industry-aligned curricula with internships and co-op rotations",
      "Visa guidance for high-demand technology and engineering roles",
    ],
  },
  {
    key: "scholarships",
    label: "Scholarships",
    headline: "Funding opportunities matched to your profile",
    description:
      "Identify grants, bursaries, and assistantships you can realistically secure.",
    highlights: [
      "Curated list of merit and need-based awards with deadlines",
      "Eligibility insights that map to your academic background",
      "Application tips to strengthen statements and references",
    ],
  },
  {
    key: "visa",
    label: "Visa friendly",
    headline: "Study routes with smooth immigration journeys",
    description:
      "Compare countries and institutions with favourable visa pathways.",
    highlights: [
      "Post-study work options and stay-back durations summarised",
      "Documentation checklists tailored to your nationality",
      "Advisories on financial proof, health cover, and interview prep",
    ],
  },
  {
    key: "undergraduate",
    label: "Undergraduate",
    headline: "Undergraduate journeys built for first-time applicants",
    description:
      "Understand entry requirements, prerequisites, and support services.",
    highlights: [
      "Step-by-step timeline from transcript evaluation to offer acceptance",
      "Guidance on choosing majors, minors, and foundation years",
      "Transition resources covering housing, orientation, and budgeting",
    ],
  },
  {
    key: "postgraduate",
    label: "Postgraduate",
    headline: "Master's and doctoral courses curated for your goals",
    description:
      "Compare research supervisors, cohort sizes, and funding models.",
    highlights: [
      "Faculty highlights with current research themes",
      "Assistantship and fellowship availability with stipends",
      "Interview preparation and portfolio expectations by course",
    ],
  },
  {
    key: "coop",
    label: "Co-op & Internships",
    headline: "Work-integrated learning with global employers",
    description:
      "Surface courses that blend study with hands-on professional experience.",
    highlights: [
      "Placement rates and employer partnerships across regions",
      "Visa considerations for paid placements and work terms",
      "Career services support for resumes, interviews, and networking",
    ],
  },
];

const fallbackStats: InsightStat[] = [
  {
    value: "12k+",
    label: "AI insights generated for global applicants",
  },
  {
    value: "84%",
    label: "Students matched to at least three best-fit courses",
  },
  {
    value: "50+",
    label: "Countries covered with verified admissions data",
  },
];

const fallbackPanelCopy: PanelCopy = {
  title: "Preview Zoe Intelligence",
  subtitle: "Choose a focus area to explore the insights you'll unlock.",
  previewLabel: "Sample",
  highlightsHeading: "What the AI prepares for you",
};

const fallbackRoles: Array<
  MultiRoleConfig & { icon: ComponentType<{ className?: string }>; accent: string }
> = [
  {
    key: "students",
    title: "Students & families",
    description:
      "Zoe is a study-abroad counsellor that walks every applicant through the full UniDoxia experience.",
    capabilities: [
      "Answers any study-abroad question instantly in plain language.",
      "Guides you through every task inside the UniDoxia app so nothing is missed.",
      "Reviews uploaded transcripts, essays, and proof of funds to suggest best-fit schools.",
      "Shares personalised counselling recommendations informed by your goals.",
    ],
    icon: GraduationCap,
    accent: "from-sky-500 to-blue-500",
  },
  {
    key: "agents",
    title: "Agents & counsellors",
    description:
      "Training, coaching, and on-demand answers are built into the same workspace that powers your agency.",
    capabilities: [
      "Delivers bite-sized training refreshers for new advisors and support staff.",
      "Turns shared student documents into quick school shortlists you can review with clients.",
      "Drafts outreach scripts, follow-up plans, and counselling recommendations automatically.",
      "Flags opportunities to improve conversion using agent analytics pulled from Zoe Intelligence.",
    ],
    icon: Users2,
    accent: "from-amber-500 to-orange-500",
  },
  {
    key: "universities",
    title: "Universities & partners",
    description:
      "Zoe lives inside the university dashboard to keep recruitment, compliance, and service teams aligned.",
    capabilities: [
      "Surfaces partner health alerts and suggested actions directly in the dashboard.",
      "Summarises applicant pipelines by region with notes about policy differences.",
      "Provides training snippets for staff onboarding so teams can self-serve answers.",
      "Escalates issues that need human attention so you can focus on strategic relationships.",
    ],
    icon: Building2,
    accent: "from-emerald-500 to-teal-500",
  },
];

const fallbackHighlights = [
  "Answers every study-abroad question, no matter the destination.",
  "Guides learners, agents, and universities through the entire UniDoxia app.",
  "Reads shared documents to recommend schools, funding, and next steps.",
];

const parseFocusAreas = (value: unknown): FocusArea[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const focus = item as Partial<FocusArea>;
      if (!focus.key || !focus.label) return null;
      return {
        key: String(focus.key),
        label: String(focus.label),
        headline: focus.headline ? String(focus.headline) : "",
        description: focus.description ? String(focus.description) : "",
        highlights: Array.isArray(focus.highlights)
          ? focus.highlights.map((highlight) => String(highlight))
          : [],
      } satisfies FocusArea;
    })
    .filter((item): item is FocusArea => Boolean(item));

  return parsed.length > 0 ? parsed : null;
};

const parseStats = (value: unknown): InsightStat[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const stat = item as Partial<InsightStat>;
      if (!stat.value || !stat.label) return null;
      return {
        value: String(stat.value),
        label: String(stat.label),
      } satisfies InsightStat;
    })
    .filter((item): item is InsightStat => Boolean(item));

  return parsed.length > 0 ? parsed : null;
};

const parsePanelCopy = (value: unknown): PanelCopy | null => {
  if (!value || typeof value !== "object") return null;
  const panel = value as Partial<PanelCopy>;
  if (!panel.title || !panel.subtitle || !panel.previewLabel || !panel.highlightsHeading) {
    return null;
  }

  return {
    title: String(panel.title),
    subtitle: String(panel.subtitle),
    previewLabel: String(panel.previewLabel),
    highlightsHeading: String(panel.highlightsHeading),
  } satisfies PanelCopy;
};

const parseRoles = (value: unknown): MultiRoleConfig[] | null => {
  if (!Array.isArray(value)) return null;

  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = item as Partial<MultiRoleConfig>;
      if (!role.key || !role.title) return null;
      return {
        key: String(role.key),
        title: String(role.title),
        description: role.description ? String(role.description) : "",
        capabilities: Array.isArray(role.capabilities)
          ? role.capabilities.map((capability) => String(capability))
          : [],
      } satisfies MultiRoleConfig;
    })
    .filter((role): role is MultiRoleConfig => Boolean(role));

  return parsed.length ? parsed : null;
};

const parseHighlights = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => Boolean(item));
  return parsed.length ? parsed : null;
};

export function ZoeExperienceSection() {
  const { t } = useTranslation();

  const badgeLabel = t("pages.index.aiSearch.badge");
  const heading = t("pages.index.aiSearch.heading");
  const description = t("pages.index.aiSearch.description");
  const subheading = t("pages.index.aiSearch.subheading");
  const ctaLabel = t("pages.index.aiSearch.ctaLabel");

  const focusAreas = useMemo(() => {
    const raw = t("pages.index.aiSearch.focusAreas", {
      returnObjects: true,
    }) as unknown;
    return parseFocusAreas(raw) ?? fallbackFocusAreas;
  }, [t]);

  const stats = useMemo(() => {
    const raw = t("pages.index.aiSearch.stats", {
      returnObjects: true,
    }) as unknown;
    return parseStats(raw) ?? fallbackStats;
  }, [t]);

  const panelCopy = useMemo(() => {
    const raw = t("pages.index.aiSearch.panel", {
      returnObjects: true,
    }) as unknown;
    return parsePanelCopy(raw) ?? fallbackPanelCopy;
  }, [t]);

  const [activeFocus, setActiveFocus] = useState<string>(() => focusAreas[0]?.key ?? fallbackFocusAreas[0].key);

  useEffect(() => {
    if (focusAreas.length === 0) return;
    setActiveFocus((current) => (focusAreas.some((area) => area.key === current) ? current : focusAreas[0].key));
  }, [focusAreas]);

  const activeArea =
    focusAreas.find((area) => area.key === activeFocus) ?? focusAreas[0] ?? fallbackFocusAreas[0];

  const multiBadgeLabel = t("pages.index.zoeMultiRole.badge");
  const multiHeading = t("pages.index.zoeMultiRole.heading");
  const multiDescription = t("pages.index.zoeMultiRole.description");
  const highlightsHeading = t("pages.index.zoeMultiRole.highlightsHeading");
  const competitorsNote = t("pages.index.zoeMultiRole.note");

  const highlightItems = useMemo(() => {
    const fromTranslation = parseHighlights(
      t("pages.index.zoeMultiRole.highlights", { returnObjects: true })
    );
    return fromTranslation ?? fallbackHighlights;
  }, [t]);

  const translationRoles = useMemo(() => {
    const parsed = parseRoles(t("pages.index.zoeMultiRole.roles", { returnObjects: true }));
    if (!parsed) return fallbackRoles;

    return parsed.map((role) => {
      const fallback = fallbackRoles.find((item) => item.key === role.key);
      return {
        ...role,
        icon: fallback?.icon ?? Sparkles,
        accent: fallback?.accent ?? "from-primary to-primary/80",
      };
    });
  }, [t]);

  return (
    <section className="relative overflow-hidden border-y border-primary/10 bg-muted/40 py-24">
      <div className="container mx-auto space-y-16 px-4">
        <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-primary/10 text-primary">{badgeLabel}</Badge>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {multiBadgeLabel}
              </Badge>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">{heading}</h2>
              <p className="text-lg text-muted-foreground">{description}</p>
              <p className="text-base text-muted-foreground/90">{subheading}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <Card key={`${stat.label}-${stat.value}`} className="border border-primary/10 bg-background/80 shadow-sm">
                  <CardContent className="space-y-1 p-6">
                    <div className="text-2xl font-semibold text-primary">{stat.value}</div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-6 rounded-[32px] border border-primary/20 bg-background/90 p-6 shadow-xl">
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() => setActiveFocus(area.key)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      activeFocus === area.key
                        ? "border-primary bg-primary text-primary-foreground shadow"
                        : "border-primary/20 bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    {area.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                    {panelCopy.previewLabel}
                  </p>
                  <h3 className="text-2xl font-semibold text-primary">{activeArea.headline}</h3>
                  <p className="text-sm text-muted-foreground">{activeArea.description}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                    {panelCopy.highlightsHeading}
                  </p>
                  <ul className="space-y-3">
                    {activeArea.highlights.map((highlight, index) => (
                      <li key={`${activeArea.key}-highlight-${index}`} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button asChild size="lg" className="w-full rounded-2xl">
                <Link to="/auth/signup?feature=ai-search">{ctaLabel}</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border border-primary/20 bg-background/95 shadow-2xl">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold">{panelCopy.title}</CardTitle>
                    <CardDescription>{panelCopy.subtitle}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Zoe
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_55%)]" />
                  <div className="relative flex flex-col items-center gap-4 text-center">
                    <img
                      src={zoePortrait}
                      alt={t("pages.index.aiSearch.zoeAlt", "Portrait of Zoe, the Bridge intelligence guide")}
                      className="h-auto w-full max-w-[320px] rounded-2xl object-cover drop-shadow-xl"
                      loading="lazy"
                    />
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-primary">Zoe, your intelligence companion</p>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "pages.index.aiSearch.zoeCaption",
                          "Meet Zoe – the friendly face guiding every insight and recommendation."
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                    {highlightsHeading}
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {highlightItems.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs italic text-muted-foreground">{competitorsNote}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">{multiBadgeLabel}</p>
              <h3 className="text-3xl font-semibold tracking-tight text-foreground">{multiHeading}</h3>
              <p className="text-base text-muted-foreground">{multiDescription}</p>
            </div>
            <Button asChild variant="outline" size="lg" className="w-full shrink-0 rounded-2xl border-primary/30 px-6 text-foreground hover:border-primary hover:bg-primary/10 sm:w-auto md:self-auto">
              <Link to="/auth/signup?feature=ai-search">Explore Zoe for your team</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {translationRoles.map(({ key, title, description, capabilities, icon: Icon, accent }) => (
              <Card key={key} className="flex h-full flex-col border border-border/60 bg-background shadow-lg">
                <CardHeader>
                  <div className={cn(
                    "inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                    accent
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {capabilities.map((capability) => (
                    <div key={capability} className="rounded-xl bg-muted/40 p-3">
                      {capability}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ZoeExperienceSection;

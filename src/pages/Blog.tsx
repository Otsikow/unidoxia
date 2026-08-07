import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpRight,
  GraduationCap,
  Users,
  Globe2,
  Sparkles,
  BookOpenCheck,
  BarChart3,
  MapPinned,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
}

export default function Blog() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["blog", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, tags, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) {
        console.error("[blog] Failed to load posts", error.message);
        throw new Error("blog_list_fetch_failed");
      }
      return data as BlogPost[];
    },
    retry: 1,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((p) =>
      [p.title, p.excerpt, ...(p.tags || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [data, q]);

  const playbookSections = [
    {
      value: "students",
      label: "Student playbook",
      icon: GraduationCap,
      headline: "International Student Playbook",
      description:
        "Step-by-step guidance to shortlist universities, prepare documents, and stay on top of deadlines.",
      cta: { label: "Explore admissions checklist", href: "/auth/signup?role=student" },
      resources: [
        {
          title: "Scholarship strategy workbook",
          description: "Identify funding options and build a compelling financial aid story.",
          type: "Guide",
          href: "/help",
          icon: BookOpenCheck,
        },
        {
          title: "Visa preparation timeline",
          description: "Track every requirement from document collection to interview day.",
          type: "Insight",
          href: "/courses?view=programs",
          icon: MapPinned,
        },
      ],
    },
    {
      value: "agents",
      label: "Agent playbook",
      icon: Users,
      headline: "Agent Success Hub",
      description:
        "Operational templates and reporting insights to support student cohorts at scale.",
      cta: { label: "Visit agent dashboard", href: "/dashboard" },
      resources: [
        {
          title: "Recruitment pipeline tracker",
          description: "Monitor enquiries, applications, and offers across every market.",
          type: "Guide",
          href: "/dashboard",
          icon: BarChart3,
        },
        {
          title: "Compliance review checklist",
          description: "Standardise documentation and maintain transparent student records.",
          type: "Insight",
          href: "/help",
          icon: BookOpenCheck,
        },
      ],
    },
    {
      value: "partners",
      label: "Partner playbook",
      icon: Globe2,
      headline: "Partner Resource Centre",
      description:
        "Market intelligence to position courses and engage the right-fit student audiences.",
      cta: { label: "See partner guides", href: "/universities" },
      resources: [
        {
          title: "Regional demand dashboard",
          description: "Spot trending subject areas and tailor your recruitment mix.",
          type: "Insight",
          href: "/universities",
          icon: BarChart3,
        },
        {
          title: "Co-marketing launch kit",
          description: "Align messaging, timelines, and conversion goals with verified agents.",
          type: "Guide",
          href: "/contact",
          icon: MapPinned,
        },
      ],
    },
  ] as const;

  const quickLinks = [
    {
      title: "UniDoxia — Study Abroad Platform",
      description:
        "Connecting international students with world-class universities through verified agents and transparent application management.",
      links: [
        { label: "info@unidoxia.com", href: "mailto:info@unidoxia.com", external: true },
        { label: "Book a discovery call", href: "/contact", external: false },
      ],
    },
    {
      title: "Platform",
      description: "Navigate essential tools for every stage of the recruitment journey.",
      links: [
        { label: "Search Universities", href: "/courses?view=programs", external: false },
        { label: "Help Centre", href: "/help", external: false },
        { label: "Visa Calculator", href: "/visa-calculator", external: false },
      ],
    },
  ] as const;

  return (
    <div className="relative">
      <SEO
        title="Study Abroad Blog | UniDoxia"
        description="Weekly, source-checked guidance on visa rule changes, scholarships, admissions, and common application mistakes for international students."
        keywords="study abroad blog, international student advice, university application tips, scholarships, student visa guidance"
        canonicalPath="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "UniDoxia Blog",
          url: "https://unidoxia.com/blog",
          description:
            "Weekly, source-checked guidance on visa rule changes, scholarships, admissions, and common application mistakes.",
          publisher: {
            "@type": "Organization",
            name: "UniDoxia",
            url: "https://unidoxia.com",
          },
        }}
      />

      <section className="border-b bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Weekly, source-checked guidance
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Insights & Guides</h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Every week we publish source-checked updates on visa rule changes, scholarships, admissions, and the most common application mistakes — so you can plan with clarity. We share guidance, not guarantees of visa or scholarship outcomes.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
              <div className="relative w-full sm:min-w-[320px] sm:max-w-lg">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-11"
                  placeholder="Search articles…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/contact">
                  Talk with an expert
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Latest from the blog</h2>
              <p className="text-sm text-muted-foreground">
                Fresh perspectives from our research team, admissions experts, and partner network.
              </p>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2 sm:w-auto" asChild>
              <Link to="/contact">
                Talk with our team
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid auto-rows-fr items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="flex h-full flex-col overflow-hidden">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <CardHeader className="flex-1 space-y-3 p-5">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </CardHeader>
                  <CardFooter className="p-5 pt-0">
                    <Skeleton className="h-10 w-32 rounded-xl" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="border-dashed border-border/70">
              <CardHeader className="items-center space-y-2 text-center">
                <CardTitle className="text-xl">We couldn’t load the blog right now</CardTitle>
                <CardDescription>
                  Please refresh the page or try again in a few moments.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : filtered.length > 0 ? (
            <div className="grid auto-rows-fr items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((post) => (
                <Card key={post.id} className="flex h-full flex-col overflow-hidden border-border/70">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[16/10] w-full bg-muted" />
                  )}
                  <CardHeader className="flex-1 space-y-3 p-5">
                    <div className="flex min-h-6 flex-wrap gap-2">
                      {(post.tags || []).slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="line-clamp-2 min-h-14 text-lg leading-tight">
                      <Link to={`/blog/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    {post.excerpt && (
                      <CardDescription className="line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter className="mt-auto p-5 pt-0">
                    <Button asChild className="w-full justify-between gap-2">
                      <Link to={`/blog/${post.slug}`}>
                        Read article
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/70">
              <CardHeader className="items-center space-y-2 text-center">
                <CardTitle className="text-xl">No results yet</CardTitle>
                <CardDescription>
                  We couldn’t find an article that matches “{q}”. Try another keyword or explore the playbooks below.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </section>

      <section className="border-y bg-muted/30 py-12 sm:py-16">
        <div className="container mx-auto px-4 space-y-8">
          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-semibold">Playbooks, insights & guides</h2>
            <p className="text-sm text-muted-foreground">
              Select a pathway to access curated resources tailored to students, certified agents, and partner universities.
            </p>
          </div>

          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid gap-2 sm:grid-cols-3">
              {playbookSections.map((section) => (
                <TabsTrigger
                  key={section.value}
                  value={section.value}
                  className="flex items-start gap-3 rounded-xl border border-transparent bg-background px-4 py-3 text-left data-[state=active]:border-primary/30 data-[state=active]:bg-primary/5"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.headline}</p>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {playbookSections.map((section) => (
              <TabsContent key={section.value} value={section.value} className="space-y-6">
                <Card className="border-border/70">
                  <CardHeader className="space-y-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <section.icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{section.headline}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{section.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild className="gap-2">
                      <Link to={section.cta.href}>
                        {section.cta.label}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  {section.resources.map((resource) => (
                    <Card key={resource.title} className="h-full border-border/70">
                      <CardHeader className="flex flex-row items-start gap-3">
                        <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <resource.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{resource.type}</Badge>
                            <span className="text-xs text-muted-foreground">Playbook resource</span>
                          </div>
                          <CardTitle className="text-base leading-tight">{resource.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="ghost" className="justify-start gap-2 px-0 text-sm font-medium">
                          <Link to={resource.href}>
                            View resource
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {quickLinks.map((section) => (
            <Card key={section.title} className="h-full border-border/70 bg-card/60 backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.links.map((link) => (
                  <Button
                    key={link.href}
                    asChild
                    variant="ghost"
                    className="w-full justify-between px-4 py-2 text-left text-sm font-medium"
                  >
                    {link.external ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                      >
                        <span>{link.label}</span>
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link to={link.href}>
                        <span>{link.label}</span>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    )}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

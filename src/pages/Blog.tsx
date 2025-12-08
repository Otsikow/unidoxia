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
  const { data, isLoading } = useQuery({
    queryKey: ["blog", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, tags, published_at")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
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

  const heroPost = filtered[0];
  const supportingPosts = filtered.slice(1, 4);
  const remainingPosts = filtered.slice(4);

  const playbookSections = [
    {
      value: "students",
      label: "Student playbook",
      icon: GraduationCap,
      headline: "International Student Playbook",
      description:
        "Step-by-step guidance to shortlist universities, prepare documents, and stay on top of deadlines.",
      cta: { label: "Explore admissions checklist", href: "/student/onboarding" },
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
        { label: "+1 (202) 555-0148", href: "tel:+12025550148", external: true },
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
        title="Blog - UniDoxia"
        description="Explore articles, guides, and insights on studying abroad, university admissions, and international education trends. Your resource for a successful academic journey."
        keywords="study abroad blog, international student advice, university application tips, education articles, student recruitment trends, university marketing"
      />
      <section className="border-b bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Fresh research, interviews, and platform tips every week
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Insights & Guides</h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Advice for international students, certified agents, and university partners navigating global recruitment.
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
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <Card className="hidden h-full overflow-hidden lg:block">
                <Skeleton className="h-full w-full" />
              </Card>
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <Skeleton className="h-36 w-full" />
                  </Card>
                ))}
              </div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-10">
              <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                {heroPost && (
                  <Card className="overflow-hidden border-border/70">
                    {heroPost.cover_image_url ? (
                      <img
                        src={heroPost.cover_image_url}
                        alt={heroPost.title}
                        className="h-72 w-full object-cover"
                      />
                    ) : (
                      <div className="h-72 w-full bg-muted" />
                    )}
                    <CardHeader className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-primary">
                        {(heroPost.tags || []).slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <CardTitle className="text-2xl leading-tight">
                          <Link to={`/blog/${heroPost.slug}`} className="hover:underline">
                            {heroPost.title}
                          </Link>
                        </CardTitle>
                        {heroPost.excerpt && (
                          <CardDescription className="text-base text-muted-foreground">
                            {heroPost.excerpt}
                          </CardDescription>
                        )}
                      </div>
                    </CardHeader>
                    <CardFooter>
                      <Button asChild className="gap-2">
                        <Link to={`/blog/${heroPost.slug}`}>
                          Read article
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                <div className="grid gap-4">
                  {supportingPosts.map((post) => (
                    <Card key={post.id} className="overflow-hidden border-border/70">
                      {post.cover_image_url ? (
                        <img src={post.cover_image_url} alt={post.title} className="h-36 w-full object-cover" />
                      ) : (
                        <div className="h-36 w-full bg-muted" />
                      )}
                      <CardHeader className="space-y-3">
                        <CardTitle className="text-lg leading-tight">
                          <Link to={`/blog/${post.slug}`} className="hover:underline">
                            {post.title}
                          </Link>
                        </CardTitle>
                        {post.excerpt && (
                          <CardDescription className="line-clamp-3 text-sm text-muted-foreground">
                            {post.excerpt}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>

              {remainingPosts.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-muted-foreground">More articles</h3>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {remainingPosts.map((post) => (
                      <Card key={post.id} className="overflow-hidden border-border/70">
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt={post.title} className="h-40 w-full object-cover" />
                        ) : (
                          <div className="h-40 w-full bg-muted" />
                        )}
                        <CardHeader className="space-y-2">
                          <CardTitle className="line-clamp-2 text-lg">
                            <Link to={`/blog/${post.slug}`} className="hover:underline">
                              {post.title}
                            </Link>
                          </CardTitle>
                        </CardHeader>
                        {post.excerpt && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                          </CardContent>
                        )}
                        {(post.tags || []).length > 0 && (
                          <CardFooter className="flex flex-wrap gap-2">
                            {(post.tags || []).slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </CardFooter>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
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

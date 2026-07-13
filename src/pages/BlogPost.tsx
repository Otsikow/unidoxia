import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useParams, Navigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, RefreshCcw, Clock, Info } from "lucide-react";
import { SEO } from "@/components/SEO";
import ShareButtons from "@/components/blog/ShareButtons";

interface BlogPostDetail {
  id: string;
  slug: string;
  title: string;
  content_html: string | null;
  content_md: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
  updated_at: string | null;
  status: "draft" | "published";
  seo_title: string | null;
  seo_description: string | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

const estimateReadingMinutes = (text: string | null | undefined) => {
  if (!text) return 1;
  const words = text.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, slug, title, content_html, content_md, excerpt, cover_image_url, tags, published_at, updated_at, status, seo_title, seo_description"
        )
        .eq("slug", slug)
        .eq("status", "published")
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[blog] Failed to load article", error.message);
        throw new Error("blog_fetch_failed");
      }
      return (data as BlogPostDetail | null);
    },
    enabled: Boolean(slug),
    retry: 1,
  });

  const sanitizedHtml = useMemo(() => {
    if (!data) return null;
    const normalize = (s: string) =>
      s.replace(/\s+/g, " ").trim().toLowerCase();
    const stripLeadingTitleH1 = (html: string) => {
      // Remove a leading <h1>…</h1> only when its text matches the article
      // title, so the page template's H1 is not duplicated by content.
      const match = html.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/i);
      if (!match) return html;
      const inner = match[1].replace(/<[^>]+>/g, "");
      if (normalize(inner) === normalize(data.title)) {
        return html.slice(match[0].length);
      }
      return html;
    };
    if (data.content_html && data.content_html.trim().length > 0) {
      return DOMPurify.sanitize(stripLeadingTitleH1(data.content_html));
    }
    if (data.content_md && data.content_md.trim().length > 0) {
      // Also strip a leading Markdown H1 (# Title) that matches the DB title.
      let md = data.content_md;
      const mdMatch = md.match(/^\s*#\s+(.+?)\s*\n/);
      if (mdMatch && normalize(mdMatch[1]) === normalize(data.title)) {
        md = md.slice(mdMatch[0].length);
      }
      const rendered = marked.parse(md, { async: false }) as string;
      return DOMPurify.sanitize(stripLeadingTitleH1(rendered), {
        ADD_ATTR: ["target", "rel"],
      });
    }
    return null;
  }, [data]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-8 w-2/3 mb-6" />
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-4">
        <h1 className="text-2xl font-semibold">We couldn’t load this article</h1>
        <p className="text-muted-foreground">
          Something went wrong while fetching this post. Please refresh the page or try again shortly.
        </p>
        <Button asChild variant="outline">
          <Link to="/blog"><ArrowLeft className="h-4 w-4 mr-2" />Back to Blog</Link>
        </Button>
      </div>
    );
  }

  if (!data) return <Navigate to="/blog" replace />;

  const publishedLabel = formatDate(data.published_at);
  const updatedLabel = formatDate(data.updated_at);
  const readingMinutes = estimateReadingMinutes(data.content_html || data.content_md || data.excerpt);
  const coverAlt = data.cover_image_url ? `Cover image for article: ${data.title}` : "";

  const seoTitle = data.seo_title || `${data.title} | UniDoxia Blog`;
  const seoDescription =
    data.seo_description ||
    data.excerpt ||
    `Read ${data.title} on the UniDoxia blog — source-checked guidance on studying abroad.`;

  const canonicalPath = `/blog/${data.slug}`;
  const canonicalUrl = `https://unidoxia.com${canonicalPath}`;
  const absoluteCover = data.cover_image_url
    ? (data.cover_image_url.startsWith("http")
        ? data.cover_image_url
        : `https://unidoxia.com${data.cover_image_url.startsWith("/") ? "" : "/"}${data.cover_image_url}`)
    : undefined;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: seoDescription,
    image: absoluteCover ? [absoluteCover] : undefined,
    datePublished: data.published_at || undefined,
    dateModified: data.updated_at || data.published_at || undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    author: { "@type": "Organization", name: "UniDoxia Editorial Team", url: "https://unidoxia.com/editorial-policy" },
    publisher: {
      "@type": "Organization",
      name: "UniDoxia",
      url: "https://unidoxia.com",
      logo: { "@type": "ImageObject", url: "https://unidoxia.com/favicon.png" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://unidoxia.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://unidoxia.com/blog" },
      { "@type": "ListItem", position: 3, name: data.title, item: canonicalUrl },
    ],
  };

  return (
    <article className="container mx-auto px-4 py-10 max-w-3xl">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={canonicalPath}
        ogImage={data.cover_image_url || undefined}
        ogType="article"
        publishedTime={data.published_at || undefined}
        modifiedTime={data.updated_at || undefined}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />

      <div className="mb-8">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="px-0 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link to="/blog" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to blog</span>
          </Link>
        </Button>
      </div>

      <header className="mb-10 space-y-5 border-b border-border/60 pb-8">
        {(data.tags || []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {data.tags.map((t) => (
              <Badge key={t} variant="secondary" className="font-medium">
                {t}
              </Badge>
            ))}
          </div>
        )}

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.15]">
          {data.title}
        </h1>

        {data.excerpt && (
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {data.excerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span>
            By <span className="font-medium text-foreground">UniDoxia Editorial Team</span>
          </span>
          {publishedLabel && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <span>{publishedLabel}</span>
            </span>
          )}
          {updatedLabel && (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              <span>Updated {updatedLabel}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{readingMinutes} min read</span>
          </span>
          <Link
            to="/editorial-policy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Editorial policy
          </Link>
        </div>
      </header>

      {data.cover_image_url && (
        <figure className="mb-10 -mx-4 sm:mx-0">
          <img
            src={data.cover_image_url}
            alt={coverAlt}
            className="w-full max-h-[460px] object-cover sm:rounded-xl shadow-sm"
            loading="lazy"
          />
        </figure>
      )}

      {sanitizedHtml ? (
        <div
          className="prose prose-lg prose-neutral dark:prose-invert max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24
            prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/60
            prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-3
            prose-h4:text-lg prose-h4:mt-8 prose-h4:mb-2
            prose-p:leading-[1.8] prose-p:my-5 prose-p:text-foreground/90
            prose-li:leading-[1.75] prose-li:my-1.5
            prose-ul:my-5 prose-ol:my-5
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4
            prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:bg-muted/40 prose-blockquote:rounded-r-md prose-blockquote:py-1 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:text-foreground/90
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:border prose-pre:border-border/60
            prose-img:rounded-lg prose-img:shadow-sm prose-img:my-8
            prose-hr:my-10 prose-hr:border-border/60
            [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-ring [&_a:focus-visible]:rounded-sm"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      ) : (
        <p className="text-muted-foreground italic">No content available.</p>
      )}

      <div className="mt-12 border-t border-border/60 pt-6">
        <ShareButtons url={canonicalUrl} title={data.title} description={data.excerpt || undefined} />
      </div>

      <aside
        role="note"
        aria-label="Editorial disclaimer"
        className="mt-8 flex gap-3 rounded-lg border border-border/70 bg-muted/40 p-5 text-sm text-muted-foreground"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="leading-relaxed">
          Visa and scholarship rules can change. Always confirm requirements on the linked official source before
          applying. UniDoxia provides educational guidance, not legal advice.
        </p>
      </aside>

      <div className="mt-10 border-t border-border/60 pt-6">
        <Button asChild variant="outline">
          <Link to="/blog" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to all articles</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}

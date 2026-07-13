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

  const { data, isLoading } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, slug, title, content_html, content_md, excerpt, cover_image_url, tags, published_at, updated_at, status, seo_title, seo_description"
        )
        .eq("slug", slug)
        .limit(1)
        .single();
      if (error) throw error;
      return data as BlogPostDetail;
    },
    enabled: Boolean(slug),
  });

  const sanitizedHtml = useMemo(() => {
    if (!data) return null;
    if (data.content_html && data.content_html.trim().length > 0) {
      return DOMPurify.sanitize(data.content_html);
    }
    if (data.content_md && data.content_md.trim().length > 0) {
      const rendered = marked.parse(data.content_md, { async: false }) as string;
      return DOMPurify.sanitize(rendered, { ADD_ATTR: ["target", "rel"] });
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

  if (!data) return <Navigate to="/blog" replace />;
  if (data.status !== "published") return <Navigate to="/blog" replace />;

  const publishedLabel = formatDate(data.published_at);
  const updatedLabel = formatDate(data.updated_at);
  const readingMinutes = estimateReadingMinutes(data.content_html || data.content_md || data.excerpt);
  const coverAlt = data.cover_image_url ? `Cover image for article: ${data.title}` : "";

  const seoTitle = data.seo_title || `${data.title} | UniDoxia Blog`;
  const seoDescription =
    data.seo_description ||
    data.excerpt ||
    `Read ${data.title} on the UniDoxia blog — source-checked guidance on studying abroad.`;

  return (
    <article className="container mx-auto px-4 py-10">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={`/blog/${data.slug}`}
        ogImage={data.cover_image_url || undefined}
        ogType="article"
        publishedTime={data.published_at || undefined}
        modifiedTime={data.updated_at || undefined}
      />

      <div className="mb-6">
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

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{data.title}</h1>
      {data.excerpt && <p className="text-muted-foreground mb-6">{data.excerpt}</p>}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mb-6">
        {publishedLabel && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span>
              <span className="sr-only">Published on </span>
              Published {publishedLabel}
            </span>
          </span>
        )}
        {updatedLabel && (
          <span className="inline-flex items-center gap-1.5">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            <span>Last checked {updatedLabel}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>{readingMinutes} min read</span>
        </span>
      </div>

      {(data.tags || []).length > 0 && (
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {data.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {data.cover_image_url && (
        <img
          src={data.cover_image_url}
          alt={coverAlt}
          className="w-full max-h-[420px] object-cover rounded-lg mb-10"
          loading="lazy"
        />
      )}

      {sanitizedHtml ? (
        <div
          className="prose prose-neutral dark:prose-invert max-w-none prose-a:underline prose-a:underline-offset-2 focus-within:[&_a]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-ring [&_a:focus-visible]:rounded-sm"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      ) : (
        <p className="text-muted-foreground italic">No content available.</p>
      )}

      <aside
        role="note"
        aria-label="Editorial disclaimer"
        className="mt-12 flex gap-3 rounded-lg border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p>
          Visa and scholarship rules can change. Always confirm requirements on the linked official source before
          applying. UniDoxia provides educational guidance, not legal advice.
        </p>
      </aside>
    </article>
  );
}

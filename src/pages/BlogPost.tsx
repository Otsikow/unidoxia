import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useParams, Navigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BlogPostDetail {
  id: string;
  title: string;
  content_html: string | null;
  content_md: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
  status: "draft" | "published";
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, content_html, content_md, excerpt, cover_image_url, tags, published_at, status")
        .eq("slug", slug)
        .limit(1)
        .single();
      if (error) throw error;
      return data as BlogPostDetail;
    },
    enabled: Boolean(slug),
  });

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

  const sanitized = data.content_html ? DOMPurify.sanitize(data.content_html) : null;

  return (
    <article className="container mx-auto px-4 py-10">
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="px-0 text-muted-foreground hover:text-foreground"
        >
          <Link to="/blog" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to blog</span>
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{data.title}</h1>
      {data.excerpt && <p className="text-muted-foreground mb-6">{data.excerpt}</p>}

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
        <img src={data.cover_image_url} alt="" className="w-full max-h-[420px] object-cover rounded-lg mb-10" />
      )}

      {sanitized ? (
        <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitized }} />
      ) : (
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {data.content_md || "No content"}
        </pre>
      )}
    </article>
  );
}

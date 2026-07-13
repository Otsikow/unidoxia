import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface BlogCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
}

export default function LatestFromBlog() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["landing", "latest-blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, tags, published_at")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as BlogCard[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError || (!isLoading && (!data || data.length === 0))) return null;

  return (
    <section className="container mx-auto px-4 py-16" aria-labelledby="latest-blog-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h2 id="latest-blog-heading" className="text-3xl font-bold mb-2">
            Latest from the Blog
          </h2>
          <p className="text-muted-foreground">
            Weekly, source-checked guidance on visas, scholarships, and admissions.
          </p>
        </div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all articles <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
            ))
          : data!.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                <Card className="h-full overflow-hidden border-border/70 transition hover:border-primary/60">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      loading="lazy"
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 w-full bg-muted" />
                  )}
                  <CardContent className="p-5 space-y-3">
                    {(post.tags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags!.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm text-primary">
                      Read article <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </section>
  );
}

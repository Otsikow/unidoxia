import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { articleCover, articleDate, selectHomeArticles, type HomeArticle } from "@/lib/homeBlog";

export default function LatestFromBlog() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["landing", "latest-blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, tags, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(12)
        .abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return (data ?? []) as HomeArticle[];
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const posts = selectHomeArticles(data ?? []);

  return (
    <section className="udx-section udx-insights" aria-labelledby="latest-blog-heading" id="insights">
      <div className="udx-wrap">
      <div className="udx-section-head">
        <div>
          <p className="udx-kicker">Latest insights &amp; student resources</p>
          <h2 id="latest-blog-heading">Make your next move<br className="udx-desktop-break" /> an informed one.</h2>
        </div>
        <div className="udx-insights-intro">
          <p>Practical reading on applications, scholarships and life as an international student.</p>
          <Link to="/blog" className="udx-text-link">View all articles <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>

      {isLoading ? (
        <div className="udx-insights-state" role="status">Loading published articles…</div>
      ) : isError ? (
        <div className="udx-insights-state" role="status">
          <p>Student insights are temporarily unavailable.</p>
          <button className="udx-text-link" type="button" onClick={() => void refetch()}>Try loading articles again <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      ) : !posts.length ? (
        <p className="udx-insights-state" role="status">No articles are available yet. You can contact our team for help with your study plans.</p>
      ) : (
        <div className="udx-insights-grid">
          {posts.map((post) => (
            <article className="udx-insight" key={post.id}>
              <Link to={`/blog/${post.slug}`} className="udx-insight-link">
                {post.cover_image_url && (
                  <img src={articleCover(post.cover_image_url)} alt="" width={1280} height={720} loading="lazy" fetchPriority="low" decoding="async" />
                )}
                <div className="udx-insight-copy">
                  <div className="udx-article-meta">
                    {post.tags?.[0] && <span>{post.tags[0]}</span>}
                    {articleDate(post.published_at) && <time dateTime={post.published_at!}>{articleDate(post.published_at)}</time>}
                  </div>
                  <h3>{post.title}</h3>
                  {post.excerpt && <p>{post.excerpt}</p>}
                  <span className="udx-text-link">Read article <ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}

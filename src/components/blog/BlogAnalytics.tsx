import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Calendar, 
  BarChart3, 
  Clock,
  FileText,
  Star,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface BlogAnalyticsProps {
  className?: string;
}

interface PostAnalytics {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  views_count: number;
  likes_count: number;
  published_at: string | null;
  created_at: string;
  featured: boolean;
}

interface AnalyticsData {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  total_views: number;
  total_likes: number;
  recent_posts: number;
  top_posts: PostAnalytics[];
  views_trend: number;
  likes_trend: number;
  posts_trend: number;
}

export function BlogAnalytics({ className = "" }: BlogAnalyticsProps) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["blog-analytics"],
    staleTime: 30_000,
    queryFn: async (): Promise<AnalyticsData> => {
      // Get all posts
      const { data: posts, error: postsError } = await supabase
        .from("blog_posts")
        .select("id, title, slug, status, views_count, likes_count, published_at, created_at, featured")
        .order("views_count", { ascending: false });

      if (postsError) throw postsError;

      // Get data from 30 days ago for trend calculation
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: oldPosts, error: oldPostsError } = await supabase
        .from("blog_posts")
        .select("views_count, likes_count, created_at")
        .lt("created_at", thirtyDaysAgo);

      if (oldPostsError) throw oldPostsError;

      // Calculate current metrics
      const total_posts = posts.length;
      const published_posts = posts.filter(p => p.status === "published").length;
      const draft_posts = posts.filter(p => p.status === "draft").length;
      const total_views = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const total_likes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      
      // Recent posts (last 7 days)
      const weekAgo = subDays(new Date(), 7);
      const recent_posts = posts.filter(p => new Date(p.created_at) > weekAgo).length;

      // Top posts (top 10 by views)
      const top_posts = posts.slice(0, 10).map(post => ({
        ...post,
        status: post.status as "draft" | "published"
      }));

      // Calculate trends
      const oldViews = oldPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
      const oldLikes = oldPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      const oldPostsCount = oldPosts.length;

      const views_trend = oldViews > 0 ? ((total_views - oldViews) / oldViews) * 100 : 0;
      const likes_trend = oldLikes > 0 ? ((total_likes - oldLikes) / oldLikes) * 100 : 0;
      const posts_trend = oldPostsCount > 0 ? ((total_posts - oldPostsCount) / oldPostsCount) * 100 : 0;

      return {
        total_posts,
        published_posts,
        draft_posts,
        total_views,
        total_likes,
        recent_posts,
        top_posts,
        views_trend,
        likes_trend,
        posts_trend
      };
    },
  });

  // Set up real-time subscription for live updates
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('blog-analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blog_posts',
        },
        () => {
          // Invalidate and refetch blog analytics when changes occur
          queryClient.invalidateQueries({ queryKey: ["blog-analytics"] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Blog analytics real-time subscription active');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);

  const formatTrend = (trend: number) => {
    const isPositive = trend >= 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const color = isPositive ? "text-green-600" : "text-red-600";
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-sm font-medium">
          {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_posts}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {analytics.recent_posts} this week
              </span>
              {formatTrend(analytics.posts_trend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.published_posts}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.draft_posts} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_views.toLocaleString()}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">All time</span>
              {formatTrend(analytics.views_trend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_likes.toLocaleString()}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">All time</span>
              {formatTrend(analytics.likes_trend)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Performing Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Likes</TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.top_posts.map((post, index) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium line-clamp-1">
                        {index + 1}. {post.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        /{post.slug}
                      </div>
                      {post.featured && (
                        <Badge variant="outline" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{post.views_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{post.likes_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {post.published_at ? (
                        format(new Date(post.published_at), "d MMM yyyy")
                      ) : (
                        <span className="text-muted-foreground">Not published</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Publishing Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.total_posts > 0 
                ? Math.round((analytics.published_posts / analytics.total_posts) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.published_posts} of {analytics.total_posts} posts published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Views per Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.published_posts > 0 
                ? Math.round(analytics.total_views / analytics.published_posts)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average views across published posts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.total_views > 0 
                ? ((analytics.total_likes / analytics.total_views) * 100).toFixed(1)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Likes per view ratio
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
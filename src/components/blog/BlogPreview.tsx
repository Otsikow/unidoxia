import { formatUkDate, formatUkDateTime } from '@/lib/dateFormat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Calendar, Eye, Heart, User, Tag } from 'lucide-react';

import DOMPurify from 'dompurify';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content_html: string | null;
  content_md: string | null;
  cover_image_url: string | null;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  published_at: string | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface BlogPreviewProps {
  post: BlogPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlogPreview({ post, open, onOpenChange }: BlogPreviewProps) {
  const sanitizedContent = post.content_html ? DOMPurify.sanitize(post.content_html) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Post Preview</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={post.status === "published" ? "default" : "secondary"}>
                {post.status}
              </Badge>
              {post.featured && (
                <Badge variant="outline">Featured</Badge>
              )}
              {post.status === "published" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/blog/${post.id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Live
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-0">
            {/* Cover Image */}
            {post.cover_image_url && (
              <div className="mb-6">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{post.author?.full_name || 'Unknown Author'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {post.published_at 
                    ? formatUkDate(post.published_at)
                    : formatUkDate(post.created_at)
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{post.views_count || 0} views</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span>{post.likes_count || 0} likes</span>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="mb-6" />

            {/* Content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {sanitizedContent ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
              ) : post.content_md ? (
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg overflow-x-auto">
                  {post.content_md}
                </pre>
              ) : (
                <div className="text-muted-foreground italic">
                  No content available
                </div>
              )}
            </div>

            {/* SEO Information */}
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">SEO Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">URL:</span> /blog/{post.id}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {post.status}
                </div>
                {post.published_at && (
                  <div>
                    <span className="font-medium">Published:</span> {formatUkDateTime(post.published_at)}
                  </div>
                )}
                <div>
                  <span className="font-medium">Last Updated:</span> {formatUkDateTime(post.created_at)}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
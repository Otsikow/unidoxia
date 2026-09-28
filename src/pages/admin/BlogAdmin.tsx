"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle,
  Filter,
  Search,
  Download,
  Plus,
  Save,
  Edit3,
  Globe,
  Heart,
  Sparkles,
  RefreshCcw,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseEdgeFunctions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogAnalytics } from "@/components/blog/BlogAnalytics";
import { BlogPreview } from "@/components/blog/BlogPreview";
import BackButton from "@/components/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { findEditorialDuplicate } from "@/lib/blogEditorial";

// Utility functions
const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createUniqueId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
};

// Types
type BlogStatus = "draft" | "published";

interface AuthorInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_md: string | null;
  content_html: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  status: BlogStatus;
  featured: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  views_count: number | null;
  likes_count: number | null;
  tenant_id?: string;
  author?: AuthorInfo | null;
}

interface PendingImagePreview {
  dataUrl: string;
  mimeType: string;
  base64: string;
}

interface BlogFormState {
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  content_md: string;
  content_html: string;
  status: BlogStatus;
  featured: boolean;
  tags: string;
  seo_title: string;
  seo_description: string;
}

const createInitialFormState = (): BlogFormState => ({
  title: "",
  slug: "",
  excerpt: "",
  cover_image_url: "",
  content_md: "",
  content_html: "",
  status: "draft",
  featured: false,
  tags: "",
  seo_title: "",
  seo_description: "",
});

export default function BlogAdmin() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const { hasRole } = useUserRoles();
  const tenantId = profile?.tenant_id ?? "00000000-0000-0000-0000-000000000001";
  const backFallback = hasRole("admin") ? "/admin/overview" : "/dashboard";

  // UI states
  const [activeTab, setActiveTab] = useState<"list" | "analytics" | "edit">(
    "list",
  );
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogFormState>(createInitialFormState);
  const [preview, setPreview] = useState<BlogPost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogStatus>("all");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<PendingImagePreview | null>(
    null,
  );
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [imageGenerationProgress, setImageGenerationProgress] = useState(0);
  const [imageGenerationStatus, setImageGenerationStatus] = useState<
    string | null
  >(null);
  const [statusTargetId, setStatusTargetId] = useState<string | null>(null);
  const progressResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, author:profiles(id, full_name, avatar_url)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: BlogFormState) => {
      const { error } = await supabase.from("blog_posts").insert({
        tenant_id: tenantId,
        author_id: user?.id,
        title: data.title,
        slug: data.slug || generateSlug(data.title),
        excerpt: data.excerpt || null,
        content_md: data.content_md || null,
        content_html: data.content_html || null,
        cover_image_url: data.cover_image_url || null,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : null,
        status: data.status,
        featured: data.featured,
        seo_title: data.seo_title || null,
        seo_description: data.seo_description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success("Blog post created!");
      setForm(createInitialFormState);
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<BlogFormState>;
    }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt || null,
          content_md: data.content_md || null,
          content_html: data.content_html || null,
          cover_image_url: data.cover_image_url || null,
          tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : null,
          status: data.status,
          featured: data.featured,
          seo_title: data.seo_title || null,
          seo_description: data.seo_description || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success("Blog post updated!");
      setEditing(null);
      setForm(createInitialFormState);
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update post: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success("Blog post deleted!");
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });

  // Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      currentStatus,
    }: {
      id: string;
      currentStatus: BlogStatus;
    }) => {
      const newStatus: BlogStatus =
        currentStatus === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: newStatus,
          published_at:
            newStatus === "published" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.success("Status updated!");
      setStatusTargetId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
      setStatusTargetId(null);
    },
  });

  // Handlers
  const handleEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      cover_image_url: post.cover_image_url || "",
      content_md: post.content_md || "",
      content_html: post.content_html || "",
      status: post.status,
      featured: post.featured || false,
      tags: post.tags?.join(", ") || "",
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
    });
    setActiveTab("edit");
  };

  const handlePreview = (post: BlogPost) => {
    setPreview(post);
    setIsPreviewDialogOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const duplicate = findEditorialDuplicate(posts, form, editing?.id);
    if (duplicate) {
      toast.error(
        duplicate.kind === "cover"
          ? `Choose a new cover image. It is already used by “${duplicate.post.title}”.`
          : `Choose a distinct title. “${duplicate.post.title}” already exists.`,
      );
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleGenerateImage = async () => {
    if (!form.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    setImageGenerationProgress(0);
    setImageGenerationStatus("Preparing...");

    const progressInterval = setInterval(() => {
      setImageGenerationProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const { data, error } = await invokeEdgeFunction<{ imageUrl?: string }>(
        "generate-blog-image",
        {
          body: {
            title: form.title,
            excerpt: form.excerpt,
            tags: form.tags,
            postId: editing?.id || createUniqueId(),
          },
        },
      );

      clearInterval(progressInterval);

      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No image URL received");

      setImageGenerationProgress(100);
      setImageGenerationStatus("Complete!");
      setForm({ ...form, cover_image_url: data.imageUrl });
      toast.success("Image generated successfully!");

      if (progressResetRef.current) clearTimeout(progressResetRef.current);
      progressResetRef.current = setTimeout(() => {
        setImageGenerationProgress(0);
        setImageGenerationStatus(null);
      }, 2000);
    } catch (error: any) {
      clearInterval(progressInterval);
      setImageGenerationProgress(0);
      setImageGenerationStatus(null);
      toast.error(`Failed to generate image: ${error.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = post.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchTerm, statusFilter]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BackButton fallback={backFallback} />
            <h1 className="text-3xl font-bold">Blog Management</h1>
          </div>
          <p className="text-muted-foreground">Create and manage blog posts</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(createInitialFormState);
            setActiveTab("edit");
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="list">
            <FileText className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Globe className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="edit">
            <Edit3 className="h-4 w-4 mr-2" />
            {editing ? "Edit Post" : "New Post"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Posts</CardTitle>
                  <CardDescription>Manage your blog content</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search posts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as any)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">
                          {post.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              post.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {post.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {post.author?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {post.published_at
                            ? format(new Date(post.published_at), "MMM d, yyyy")
                            : format(new Date(post.created_at!), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(post)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(post)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: post.id,
                                  currentStatus: post.status,
                                })
                              }
                              disabled={statusTargetId === post.id}
                            >
                              {statusTargetId === post.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(post.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <BlogAnalytics />
        </TabsContent>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {editing ? "Edit Post" : "Create New Post"}
                </CardTitle>
                <CardDescription>
                  {editing
                    ? "Update this post without reusing another post’s title or cover image."
                    : "Lead with one specific student question, a real consequence and a useful next check. Keep the title and cover distinct from every existing post."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug: generateSlug(e.target.value),
                      })
                    }
                    required
                    placeholder="e.g. UK Student Visa: When Could UKVI Ask for Your Documents?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={form.excerpt}
                    onChange={(e) =>
                      setForm({ ...form, excerpt: e.target.value })
                    }
                    rows={3}
                    placeholder="Give the practical answer and why the student should care; avoid generic weekly-roundup wording."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover_image">Cover Image</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cover_image"
                      value={form.cover_image_url}
                      onChange={(e) =>
                        setForm({ ...form, cover_image_url: e.target.value })
                      }
                      placeholder="A unique cover image URL"
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      variant="outline"
                    >
                      {isGeneratingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {(isGeneratingImage || imageGenerationProgress > 0) && (
                    <div className="space-y-2">
                      <Progress value={imageGenerationProgress} />
                      {imageGenerationStatus && (
                        <p className="text-sm text-muted-foreground">
                          {imageGenerationStatus}
                        </p>
                      )}
                    </div>
                  )}
                  {form.cover_image_url && (
                    <img
                      src={form.cover_image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Every post needs its own rights-safe cover. A strong shareable post answers a timely question plainly, shows the practical consequence, and gives readers a checklist they can save or send on.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_md">Content (Markdown)</Label>
                  <Textarea
                    id="content_md"
                    value={form.content_md}
                    onChange={(e) =>
                      setForm({ ...form, content_md: e.target.value })
                    }
                    rows={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_html">Content (HTML)</Label>
                  <Textarea
                    id="content_html"
                    value={form.content_html}
                    onChange={(e) =>
                      setForm({ ...form, content_html: e.target.value })
                    }
                    rows={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="study abroad, visa, scholarships"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={form.featured}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, featured: checked })
                      }
                    />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="status">Status:</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm({ ...form, status: v as BlogStatus })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    value={form.seo_title}
                    onChange={(e) =>
                      setForm({ ...form, seo_title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Textarea
                    id="seo_description"
                    value={form.seo_description}
                    onChange={(e) =>
                      setForm({ ...form, seo_description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setForm(createInitialFormState);
                    setActiveTab("list");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editing ? "Update" : "Create"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>

      {preview && (
        <BlogPreview
          post={preview}
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              blog post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

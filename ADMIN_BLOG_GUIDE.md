# Admin Blog Management - Complete Guide

## Overview

The Admin Blog Management system is a fully-featured, professional content management interface for creating, editing, and publishing blog posts. It's designed for admin and staff users to manage the platform's blog content efficiently.

## Access

**URL:** `/admin/blog`

**Required Roles:** `admin` or `staff`

**Navigation:**
- From Admin Dashboard: Quick Actions → "Manage Blog"
- From Staff Dashboard: Quick Actions → "Manage Blog"
- Direct URL: `/admin/blog`

## Editorial Cover Image Requirement (Mandatory)

Every new UniDoxia blog post **must** ship with a professional cover image before it can be published. This is a universal editorial rule enforced by editors during the existing publication approval workflow — it does not change how posts are approved or deployed.

### Image standards
- **Format & ratio**: Photorealistic, 16:9 aspect ratio, high resolution (min 1600×900).
- **Relevance**: Must clearly relate to the article's topic, destination, or student audience.
- **Style**: Editorial and credible — natural lighting, realistic environments and people, professional composition. No stock-photo clichés, no AI "uncanny" artefacts.
- **Inclusivity**: Culturally inclusive and representative of UniDoxia's international student audience.
- **Cropping**: Centre-safe composition so the image reads well as both a listing card thumbnail and a full-width article header (avoid critical subjects near edges).
- **Forbidden**: No embedded text or headlines baked into the image, no watermarks, no invented or fabricated university logos/crests, no misleading imagery.

### Alt text (required)
- Every cover image must have **descriptive alt text** that conveys the scene and its relevance to the article (not just the post title).
- Keep alt text concise (roughly 8–20 words), specific, and free of "image of" / "photo of" prefixes.

### Editor checklist before approving publication
1. Cover image is present and 16:9.
2. Image is topically relevant and culturally appropriate.
3. No text, watermark, or fabricated logos present.
4. Centre-safe crop verified on both card preview and article header.
5. Descriptive alt text is filled in.
6. Existing approval workflow (draft → review → publish) is followed as usual.

## Features


### 1. Dashboard View

The dashboard provides a comprehensive overview of your blog content:

#### Analytics Cards
- **Total Posts**: Overall count of all blog posts
- **Published**: Number of live, published posts
- **Drafts**: Number of unpublished draft posts
- **Total Views**: Cumulative view count across all posts
- **Total Likes**: Cumulative like count across all posts

#### Recent Posts
- Quick view of the 5 most recent posts
- Cover image preview
- Title, excerpt, and metadata display
- View count and like count
- Status badges (Published/Draft)
- Featured post indicators
- Quick edit and preview actions

### 2. All Posts View

Comprehensive list management with advanced filtering:

#### Search & Filter
- **Search**: Find posts by title, excerpt, or tags
- **Status Filter**: Filter by all posts, published only, or drafts only
- **Clear Filters**: Quick reset of all active filters

#### Post Cards
Each post card displays:
- Cover image (or placeholder)
- Title and URL slug
- Excerpt (limited to 2 lines)
- Status badge (Published/Draft)
- Featured badge (if applicable)
- Tags (up to 5 shown)
- View and like counts
- Creation date
- Action buttons: Preview, Edit, Delete

### 3. Post Editor

Full-featured editor for creating and editing blog posts:

#### Basic Information
- **Title** (required): Main post title
- **URL Slug** (required): SEO-friendly URL
  - Auto-generation button available
  - Live preview of full URL
- **Excerpt**: Brief summary for listings (character count shown)

#### Media
- **Cover Image**: Image URL input
  - Live preview
  - Remove button on hover
  - Placeholder when empty

#### Content
- **Markdown Content**: Full markdown editor
  - Syntax highlighting
  - Collapsible formatting help
  - Line counter
  - Monospace font for better editing
  
- **HTML Content** (Optional): Raw HTML override
  - Use when markdown isn't sufficient
  - Overrides markdown when provided

#### Markdown Formatting Help
```markdown
# Heading 1
## Heading 2
### Heading 3
**bold text**
*italic text*
`inline code`
[link text](url)
![image alt](image-url)
- bullet list item
1. numbered list item
> blockquote
```

#### Post Settings
- **Status**: Draft or Published
  - Draft: Hidden from public view
  - Published: Visible on blog page
- **Featured Post**: Toggle for homepage/featured placement
- **Tags**: Comma-separated keywords
  - Visual badge preview
  - Automatic trimming and cleaning

#### SEO Settings
- **SEO Title**: Optimized title for search engines
  - Character count (60 recommended)
- **SEO Description**: Meta description for search results
  - Character count (160 recommended)

#### Editor Actions
- **Preview**: View how the post will appear to readers
- **Cancel**: Discard changes and return to posts list
- **Save**: Create new post or update existing

### 4. Preview Mode

Before publishing, preview your post:
- Full article layout
- Rendered markdown/HTML content
- Cover image display
- Tags visualization
- Excerpt display
- Sanitized HTML for security

### 5. Delete Confirmation

Safe deletion with confirmation dialog:
- Warning message
- Cancel option
- Confirm deletion button
- Permanent action warning

## Keyboard Shortcuts & UX

### Navigation
- Tab-based interface for quick switching
- Responsive design for all screen sizes
- Smooth transitions and animations

### Auto-features
- **Auto-slug generation**: Converts title to URL-friendly format
- **Auto-publish date**: Sets publish date when status changes to published
- **Character counters**: For excerpt and SEO fields
- **Tag parsing**: Automatically cleans and formats tags

## Data Structure

### Blog Post Schema
```typescript
{
  id: string;                    // UUID
  tenant_id: string;             // Multi-tenancy support
  author_id: string;             // Author profile reference
  slug: string;                  // URL-friendly unique identifier
  title: string;                 // Post title
  excerpt: string | null;        // Short summary
  content_md: string | null;     // Markdown content
  content_html: string | null;   // HTML content (optional)
  cover_image_url: string | null; // Cover image URL
  tags: string[];                // Array of tags
  status: "draft" | "published"; // Publication status
  featured: boolean;             // Featured flag
  seo_title: string | null;      // SEO optimized title
  seo_description: string | null; // SEO meta description
  published_at: string | null;   // Publication timestamp
  created_at: string;            // Creation timestamp
  updated_at: string;            // Last update timestamp
  views_count: number;           // View counter
  likes_count: number;           // Like counter
}
```

## Best Practices

### Content Creation
1. **Write compelling titles** - Keep under 60 characters for SEO
2. **Add excerpts** - Help readers decide if they want to read more
3. **Use tags wisely** - 3-5 relevant tags per post
4. **Add cover images** - Visual appeal increases engagement
5. **Preview before publishing** - Always check formatting

### SEO Optimization
1. **Unique slugs** - Use descriptive, keyword-rich URLs
2. **Meta descriptions** - Write compelling 150-160 character summaries
3. **SEO titles** - Include primary keywords naturally
4. **Internal linking** - Link to related posts in content
5. **Alt text** - Include in markdown images

### Workflow
1. Start with **Draft** status while writing
2. Use **Preview** to review formatting
3. Check **SEO fields** before publishing
4. Set **Featured** for important announcements
5. **Publish** when ready

## Security Features

- **Role-based access control**: Only admin/staff can access
- **HTML sanitization**: XSS protection in preview/display
- **Row Level Security**: Database-level access control
- **Tenant isolation**: Multi-tenant data separation

## Technical Details

### Dependencies
- React Query for data fetching and caching
- Supabase for backend/database
- DOMPurify for HTML sanitization
- Lucide React for icons
- Shadcn UI components

### Performance
- Optimistic updates for better UX
- Query caching for faster navigation
- Lazy loading of images
- Efficient filtering and search

### Database Policies
- Public can read published posts
- Admin/staff can CRUD within their tenant
- Author tracking for accountability

## Troubleshooting

### Common Issues

**Can't access the page?**
- Verify you have admin or staff role
- Check if you're logged in
- Contact system administrator

**Slug already exists?**
- Use the auto-generate button
- Manually adjust the slug to be unique
- Check existing posts for conflicts

**Images not loading?**
- Verify image URL is publicly accessible
- Check URL format (http:// or https://)
- Try a different image hosting service

**Preview not showing content?**
- Ensure title and content are filled
- Check markdown syntax
- Verify HTML is valid (if using HTML content)

## Future Enhancements

Potential features for future versions:
- Image upload directly to storage
- Rich text WYSIWYG editor
- Scheduled publishing
- Post categories
- Author profiles
- Comment management
- Post versioning/revisions
- Bulk operations
- Import/export functionality
- Analytics integration

## Support

For issues or feature requests:
1. Check this documentation
2. Review error messages
3. Contact development team
4. Submit bug report with details

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0

// Public share endpoint that returns per-post Open Graph / Twitter metadata
// so that social crawlers (WhatsApp, Facebook, LinkedIn, X, Slack, iMessage)
// display the correct title, description, and cover image when a UniDoxia
// blog article link is shared. Humans are redirected to the real article.
//
// URL shape: /functions/v1/blog-share/<slug>
//         or /functions/v1/blog-share?slug=<slug>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_ORIGIN = "https://unidoxia.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = (s: string) => escapeHtml(s);

const buildHtml = (opts: {
  title: string;
  previewTitle?: string;
  description: string;
  canonical: string;
  image?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  tags?: string[] | null;
}) => {
  const {
    title,
    previewTitle = title,
    description,
    canonical,
    image,
    publishedTime,
    modifiedTime,
    tags,
  } = opts;

  const imageTag = image
    ? `
    <meta property="og:image" content="${escapeAttr(image)}" />
    <meta property="og:image:secure_url" content="${escapeAttr(image)}" />
    <meta name="twitter:image" content="${escapeAttr(image)}" />
    <meta name="twitter:card" content="summary_large_image" />`
    : `<meta name="twitter:card" content="summary" />`;

  const publishedTag = publishedTime
    ? `<meta property="article:published_time" content="${escapeAttr(publishedTime)}" />`
    : "";
  const modifiedTag = modifiedTime
    ? `<meta property="article:modified_time" content="${escapeAttr(modifiedTime)}" />`
    : "";
  const tagTags = (tags || [])
    .map((t) => `<meta property="article:tag" content="${escapeAttr(t)}" />`)
    .join("\n    ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />

    <meta property="og:site_name" content="UniDoxia" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeAttr(previewTitle)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    ${imageTag}

    <meta name="twitter:title" content="${escapeAttr(previewTitle)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />

    ${publishedTag}
    ${modifiedTag}
    ${tagTags}

    <meta http-equiv="refresh" content="0; url=${escapeAttr(canonical)}" />
  </head>
  <body>
    <p>Redirecting to <a href="${escapeAttr(canonical)}">${escapeHtml(previewTitle)}</a>…</p>
    <script>window.location.replace(${JSON.stringify(canonical)});</script>
  </body>
</html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Support both /blog-share/<slug> and /blog-share?slug=<slug>
    const segments = url.pathname.split("/").filter(Boolean);
    const idx = segments.indexOf("blog-share");
    const pathSlug = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : null;
    const slug = (pathSlug || url.searchParams.get("slug") || "").trim();

    if (!slug) {
      return new Response("Missing slug", {
        status: 400,
        headers: { ...corsHeaders, "content-type": "text/plain; charset=utf-8" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey);

    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "slug, title, excerpt, cover_image_url, tags, published_at, updated_at, status, seo_title, seo_description",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .limit(1)
      .maybeSingle();

    const canonical = `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}`;

    if (error || !data) {
      const html = buildHtml({
        title: "UniDoxia Blog",
        description:
          "Source-checked guidance on studying abroad — universities, visas, scholarships, and more.",
        canonical: `${SITE_ORIGIN}/blog`,
      });
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    const previewTitle = data.title;
    const title = data.seo_title || `${data.title} | UniDoxia Blog`;
    const description =
      data.seo_description ||
      data.excerpt ||
      `Read ${data.title} on the UniDoxia blog — source-checked guidance on studying abroad.`;
    const image = data.cover_image_url
      ? data.cover_image_url.startsWith("http")
        ? data.cover_image_url
        : `${SITE_ORIGIN}${data.cover_image_url.startsWith("/") ? "" : "/"}${data.cover_image_url}`
      : null;

    const html = buildHtml({
      title,
      previewTitle,
      description,
      canonical,
      image,
      publishedTime: data.published_at,
      modifiedTime: data.updated_at || data.published_at,
      tags: data.tags || [],
    });

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (e) {
    console.error("[blog-share] error", e);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "content-type": "text/plain; charset=utf-8" },
    });
  }
});

import { useEffect } from "react";

type JsonLd = Record<string, unknown>;

type SEOProps = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** Optional robots directive, e.g. "noindex,nofollow" */
  robots?: string;
  /** JSON-LD structured data. Pass one object or an array of objects. */
  jsonLd?: JsonLd | JsonLd[];
};

export const SITE_ORIGIN = "https://unidoxia.com";
const SITE_NAME = "UniDoxia";
const OWNED_ATTR = "data-managed-seo";

const toAbsolute = (path?: string) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

/**
 * Upsert a <meta> tag by (name|property). Removes any duplicate copies so
 * exactly one instance survives, and marks the surviving node as managed.
 */
const upsertMeta = (
  key: "name" | "property",
  value: string,
  content: string,
) => {
  const selector = `meta[${key}="${value}"]`;
  const nodes = Array.from(document.head.querySelectorAll<HTMLMetaElement>(selector));
  let el = nodes.shift() ?? null;
  // Remove any extra duplicates (from static index.html + previous renders).
  nodes.forEach((n) => n.parentNode?.removeChild(n));
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(key, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  el.setAttribute(OWNED_ATTR, "1");
};

const removeMeta = (key: "name" | "property", value: string) => {
  const selector = `meta[${key}="${value}"]`;
  document.head.querySelectorAll(selector).forEach((n) => n.parentNode?.removeChild(n));
};

/** Upsert exactly one <link rel="canonical" href="…">. */
const upsertCanonical = (href: string) => {
  const nodes = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
  );
  let el = nodes.shift() ?? null;
  nodes.forEach((n) => n.parentNode?.removeChild(n));
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  el.setAttribute(OWNED_ATTR, "1");
};

/** Replace all managed JSON-LD scripts with the provided items. */
const setJsonLd = (items: JsonLd[]) => {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${OWNED_ATTR}]`)
    .forEach((n) => n.parentNode?.removeChild(n));
  items.forEach((item) => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute(OWNED_ATTR, "1");
    // JSON.stringify never emits raw "<", but escape defensively for safety.
    s.text = JSON.stringify(item)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
    document.head.appendChild(s);
  });
};

export const SEO = ({
  title,
  description,
  keywords,
  canonicalPath,
  ogImage,
  ogType,
  publishedTime,
  modifiedTime,
  robots,
  jsonLd,
}: SEOProps) => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const canonicalUrl = toAbsolute(canonicalPath);
    const absoluteOgImage = toAbsolute(ogImage);
    const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

    // <title>
    if (document.title !== title) document.title = title;

    // Standard meta
    upsertMeta("name", "description", description);
    if (keywords) upsertMeta("name", "keywords", keywords);
    else removeMeta("name", "keywords");

    if (robots) upsertMeta("name", "robots", robots);
    else removeMeta("name", "robots");

    // Canonical
    if (canonicalUrl) upsertCanonical(canonicalUrl);

    // Open Graph
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", ogType || "website");
    if (canonicalUrl) upsertMeta("property", "og:url", canonicalUrl);
    if (absoluteOgImage) upsertMeta("property", "og:image", absoluteOgImage);
    else removeMeta("property", "og:image");

    // Twitter
    upsertMeta(
      "name",
      "twitter:card",
      absoluteOgImage ? "summary_large_image" : "summary",
    );
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    if (absoluteOgImage) upsertMeta("name", "twitter:image", absoluteOgImage);
    else removeMeta("name", "twitter:image");

    // Article timestamps
    if (publishedTime) upsertMeta("property", "article:published_time", publishedTime);
    else removeMeta("property", "article:published_time");
    if (modifiedTime) upsertMeta("property", "article:modified_time", modifiedTime);
    else removeMeta("property", "article:modified_time");

    // JSON-LD
    setJsonLd(jsonLdItems);
  }, [
    title,
    description,
    keywords,
    canonicalPath,
    ogImage,
    ogType,
    publishedTime,
    modifiedTime,
    robots,
    // Stable serialization of jsonLd to avoid needless effect runs.
    jsonLd ? JSON.stringify(jsonLd) : "",
  ]);

  return null;
};

export default SEO;

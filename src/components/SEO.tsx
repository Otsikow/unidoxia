import { Helmet } from "react-helmet-async";

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

const toAbsolute = (path?: string) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

// Escape a JSON string so it cannot break out of a </script> tag
const safeJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

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
  const canonicalUrl = toAbsolute(canonicalPath);
  const absoluteOgImage = toAbsolute(ogImage);
  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {robots && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType || "website"} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {absoluteOgImage && <meta property="og:image" content={absoluteOgImage} />}
      <meta name="twitter:card" content={absoluteOgImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {absoluteOgImage && <meta name="twitter:image" content={absoluteOgImage} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {jsonLdItems.map((item, i) => (
        <script key={i} type="application/ld+json">{safeJson(item)}</script>
      ))}
    </Helmet>
  );
};

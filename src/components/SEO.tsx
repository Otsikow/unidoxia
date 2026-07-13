import { Helmet } from "react-helmet-async";

type SEOProps = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

const SITE_ORIGIN = "https://unidoxia.com";

export const SEO = ({
  title,
  description,
  keywords,
  canonicalPath,
  ogImage,
  ogType,
  publishedTime,
  modifiedTime,
}: SEOProps) => {
  const canonicalUrl = canonicalPath
    ? `${SITE_ORIGIN}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
    : undefined;
  const absoluteOgImage = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${SITE_ORIGIN}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`
    : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
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
    </Helmet>
  );
};

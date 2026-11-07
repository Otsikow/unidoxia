import { editorialReview } from "./editorialReview.mjs";
import { selectDistinctBlogCards } from "./blogEditorial.ts";

export interface HomeArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
}

export function selectHomeArticles(posts: HomeArticle[]) {
  const available = posts
    .filter(post => post.slug && !editorialReview[post.slug])
    .sort((a, b) => Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));

  return selectDistinctBlogCards(available, 3);
}

export function articleDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

const coverThumbnails: Record<string, string> = {
  "/blog/2026-11-04-study-abroad-update-november-2026-cover-16x9.png": "/home/insights/november-study-update.webp",
  "/blog/2026-10-26-uk-student-visa-financial-evidence-cover.png": "/home/insights/uk-student-funds.webp",
  "/blog/2026-09-18-international-student-visa-updates-cover.png": "/home/insights/international-visa-update.webp",
};

export function articleCover(source: string) {
  return coverThumbnails[source] ?? source;
}

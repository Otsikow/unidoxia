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
  "/blog/2026-10-26-uk-student-visa-financial-evidence-cover.png": "/home/student-1260.webp",
  "/blog/2026-09-18-international-student-visa-updates-cover.png": "/home/campus-life-1100.webp",
};

export function articleCover(source: string) {
  return coverThumbnails[source] ?? source;
}

export function articleCoverSources(source: string) {
  const thumbnail = coverThumbnails[source];
  if (!thumbnail) return undefined;
  if (thumbnail === "/home/student-1260.webp") return "/home/student-660.webp 660w, /home/student-810.webp 810w, /home/student-1260.webp 1260w";
  if (thumbnail === "/home/campus-life-1100.webp") return "/home/campus-life-640.webp 640w, /home/campus-life-1100.webp 1100w";
  const stem = thumbnail.replace(/\.webp$/, "");
  return `${stem}-320.webp 320w, ${stem}-640.webp 640w, ${thumbnail} 1100w`;
}

export function articleCoverSizes(index: number) {
  return index === 0
    ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 44vw, 570px"
    : "(max-width: 639px) 25vw, (max-width: 1023px) 44vw, 135px";
}

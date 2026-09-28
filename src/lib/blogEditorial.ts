export interface BlogEditorialRecord {
  id: string;
  title: string;
  cover_image_url: string | null;
}

export interface BlogEditorialCandidate {
  title: string;
  cover_image_url: string | null | undefined;
}

const normalise = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

/**
 * Keeps public lists from presenting repeat titles or exact repeat cover URLs.
 * The database trigger is the authoritative write-time guard; this is a
 * defensive presentation layer for legacy records already in production.
 */
export const selectDistinctBlogCards = <T extends BlogEditorialRecord>(
  posts: T[],
  limit?: number,
): T[] => {
  const titles = new Set<string>();
  const covers = new Set<string>();
  const result: T[] = [];

  for (const post of posts) {
    const title = normalise(post.title);
    const cover = normalise(post.cover_image_url);

    if ((title && titles.has(title)) || (cover && covers.has(cover))) continue;

    if (title) titles.add(title);
    if (cover) covers.add(cover);
    result.push(post);

    if (limit && result.length >= limit) break;
  }

  return result;
};

export const findEditorialDuplicate = <T extends BlogEditorialRecord>(
  posts: T[],
  candidate: BlogEditorialCandidate,
  excludedId?: string,
): { kind: "title" | "cover"; post: T } | null => {
  const title = normalise(candidate.title);
  const cover = normalise(candidate.cover_image_url);

  for (const post of posts) {
    if (post.id === excludedId) continue;

    if (cover && normalise(post.cover_image_url) === cover) {
      return { kind: "cover", post };
    }

    if (title && normalise(post.title) === title) {
      return { kind: "title", post };
    }
  }

  return null;
};

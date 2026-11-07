import { describe, expect, it } from "vitest";
import { articleDate, selectHomeArticles, type HomeArticle } from "./homeBlog";

describe("homepage insights", () => {
  it("orders published candidates, excludes articles under review and keeps distinct covers", () => {
    const post = (id: string, published_at: string, cover_image_url: string): HomeArticle => ({
      id, slug: id, title: id, published_at, cover_image_url, excerpt: null, tags: null,
    });
    const posts = [
      post("older", "2026-10-01T10:00:00Z", "/older.png"),
      post("newest", "2026-11-07T10:00:00Z", "/shared.png"),
      post("repeated-cover", "2026-11-06T10:00:00Z", "/shared.png"),
      post("uk-graduate-visa-2027-timing-what-to-check", "2026-11-05T10:00:00Z", "/review.png"),
      post("middle", "2026-11-04T10:00:00Z", "/middle.png"),
    ];
    expect(selectHomeArticles(posts).map(item => item.id)).toEqual(["newest", "middle", "older"]);
    expect(posts[0].id).toBe("older");
  });

  it("uses the same UK publication date in the browser and generated HTML", () => {
    expect(articleDate("2026-06-15T23:30:00Z")).toBe("16 Jun 2026");
    expect(articleDate(null)).toBeNull();
    expect(articleDate("unavailable")).toBeNull();
  });
});

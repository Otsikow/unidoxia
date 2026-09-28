import { describe, expect, it } from "vitest";
import { findEditorialDuplicate, selectDistinctBlogCards } from "./blogEditorial";

const posts = [
  { id: "new", title: "Student visa checklist", cover_image_url: "/blog/new.png" },
  { id: "same-cover", title: "Different headline", cover_image_url: "/blog/new.png" },
  { id: "same-title", title: "  STUDENT visa   checklist ", cover_image_url: "/blog/other.png" },
  { id: "unique", title: "Scholarship deadline", cover_image_url: "/blog/unique.png" },
];

describe("blog editorial uniqueness", () => {
  it("keeps the newest card for each title and cover", () => {
    expect(selectDistinctBlogCards(posts).map((post) => post.id)).toEqual(["new", "unique"]);
  });

  it("flags duplicate covers before a blog post is saved", () => {
    expect(findEditorialDuplicate(posts, { title: "Fresh topic", cover_image_url: "/blog/new.png" }))
      .toMatchObject({ kind: "cover", post: { id: "new" } });
  });

  it("allows the post currently being edited to retain its own cover", () => {
    const onlyPost = [posts[0]];
    expect(findEditorialDuplicate(onlyPost, posts[0], "new")).toBeNull();
  });
});

import { expect, test } from "@playwright/test";
import fs from "node:fs";
test.skip(!process.env.SEO_PREVIEW, "Requires the built public route manifest");
const routes = (process.env.SEO_PREVIEW
  ? JSON.parse(fs.readFileSync("dist/seo-routes.json", "utf8"))
  : []) as {
  path: string;
  noindex?: boolean;
}[];
test.beforeEach(async ({ page }) => {
  await page.route("**/*.supabase.co/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
});
test("a failed course read is retryable and is not a false missing listing", async ({
  page,
}) => {
  const path = routes.find(
    (r) => r.path.startsWith("/courses/") && !r.noindex,
  )!.path;
  const id = path.split("/").pop();
  let reads = 0;
  let unavailable = true;
  await page.route(
    "**/rest/v1/programs?**",
    (r) => (
      reads++,
      r.fulfill({
        status: unavailable ? 400 : 200,
        contentType: "application/json",
        body: unavailable
          ? JSON.stringify({ message: "Isolated read outage" })
          : JSON.stringify({
              id,
              name: "Fixture course recovery",
              university_id: "fixture-university",
              description: "Synthetic recovery fixture.",
              level: "Undergraduate",
              tuition_amount: null,
              program_intakes: [],
              program_fees: [],
              universities: {
                id: "fixture-university",
                name: "Fixture University",
                slug: "fixture-university",
                country: "Canada",
                active: true,
                listing_status: "active",
              },
            }),
      })
    ),
  );
  await page.goto(path);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "We couldn’t load this course",
      exact: true,
    }),
  ).toBeVisible();
  unavailable = false;
  await page
    .getByRole("button", { name: "Try loading the course again", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fixture course recovery",
      exact: true,
    }),
  ).toBeVisible();
  expect(reads).toBe(2);
});
test("a failed university read is retryable and retains a real enquiry route", async ({
  page,
}) => {
  const path = routes.find(
    (r) => r.path.startsWith("/universities/") && !r.noindex,
  )!.path;
  let reads = 0;
  let unavailable = true;
  await page.route(
    "**/rest/v1/universities?**",
    (r) => (
      reads++,
      r.fulfill({
        status: unavailable ? 400 : 200,
        contentType: "application/json",
        body: unavailable
          ? JSON.stringify({ message: "Isolated read outage" })
          : JSON.stringify({
              id: "fixture-university",
              name: "Fixture university recovery",
              slug: "fixture-university",
              country: "Canada",
              active: true,
              description: "Synthetic recovery fixture.",
              submission_config_json: {},
              listing_status: "active",
              ranking: null,
              logo_url: null,
              website: null,
            }),
      })
    ),
  );
  await page.goto(path);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "We couldn’t load this university",
      exact: true,
    }),
  ).toBeVisible();
  unavailable = false;
  await page
    .getByRole("button", {
      name: "Try loading the university again",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fixture university recovery",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Ask UniDoxia about studying here",
      exact: true,
    }),
  ).toBeVisible();
  expect(reads).toBe(2);
});
test("a failed published-article read can retry without losing article navigation", async ({
  page,
}) => {
  const path = routes.find(
    (r) => r.path.startsWith("/blog/") && !r.noindex,
  )!.path;
  const slug = path.split("/").pop();
  let reads = 0;
  let unavailable = true;
  await page.route(
    "**/rest/v1/blog_posts?**",
    (r) => (
      reads++,
      r.fulfill({
        status: unavailable ? 400 : 200,
        contentType: "application/json",
        body: unavailable
          ? JSON.stringify({ message: "Isolated read outage" })
          : JSON.stringify({
              id: "fixture-post",
              slug,
              title: "Fixture article recovery",
              content_html: "<p>Published article recovery fixture.</p>",
              excerpt: "Recovery test.",
              cover_image_url: null,
              tags: [],
              published_at: "2026-11-01T10:00:00Z",
              status: "published",
            }),
      })
    ),
  );
  await page.goto(path);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "We couldn’t load this article",
      exact: true,
    }),
  ).toBeVisible();
  unavailable = false;
  await page
    .getByRole("button", { name: "Try loading the article again", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fixture article recovery",
      exact: true,
    }),
  ).toBeVisible();
  expect(reads).toBe(2);
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/rpc/validate_course_search_filters", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, fields: {} }) });
  });
  await page.goto("/courses");
  await expect(page.getByRole("heading", { name: "Search courses" })).toBeVisible();
});

test("valid filters update results and create removable chips", async ({ page }) => {
  await page.getByLabel("Where?").click();
  await page.getByRole("option", { name: "United Kingdom" }).click();
  await page.getByLabel("Study level").click();
  await page.getByRole("option", { name: "Postgraduate" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByTestId("applied-filters")).toContainText("United Kingdom");
  await expect(page.getByTestId("applied-filters")).toContainText("Postgraduate");
  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /courses across/ })).toBeVisible();
});

test("removing one chip preserves the other filters and refreshes", async ({ page }) => {
  await page.getByLabel("Where?").click();
  await page.getByRole("option", { name: "United Kingdom" }).click();
  await page.getByLabel("Study level").click();
  await page.getByRole("option", { name: "Postgraduate" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "Remove United Kingdom filter" }).click();
  await expect(page.getByTestId("applied-filters")).not.toContainText("United Kingdom");
  await expect(page.getByTestId("applied-filters")).toContainText("Postgraduate");
});

test("zero results remain useful and reset restores browsing", async ({ page }) => {
  await page.getByRole("button", { name: /More filters/ }).click();
  await page.getByLabel("Maximum annual tuition").fill("1");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No courses match all your selected filters.")).toBeVisible();
  await expect(page.getByTestId("applied-filters")).toContainText("Tuition");
  await expect(page.getByRole("button", { name: "Reset all filters" }).last()).toBeVisible();
  await page.getByRole("button", { name: "Reset all filters" }).last().click();
  await expect(page.getByTestId("applied-filters")).toHaveCount(0);
  await expect(page.getByText("No courses match all your selected filters.")).toHaveCount(0);
});

test("invalid query values are validation errors, not zero results", async ({ page }) => {
  await page.goto("/courses?tuitionMax=-5&sort=unsupported");
  await expect(page.getByRole("alert")).toContainText("cannot be negative");
  await expect(page.getByText("No courses match all your selected filters.")).toHaveCount(0);
});

test("filter controls and chips fit the viewport", async ({ page }) => {
  await page.getByLabel("Where?").click();
  await page.getByRole("option", { name: "United Kingdom" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const chips = page.getByTestId("applied-filters");
  await expect(chips).toBeVisible();
  const box = await chips.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x || 0) + (box?.width || 0)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});

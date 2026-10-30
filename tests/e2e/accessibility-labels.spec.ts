import { expect, test } from '@playwright/test';

test('public directory and course sorting controls have programmatic labels', async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/universities');
  await expect(page.getByLabel('Country', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Sort By', { exact: true })).toBeVisible();
  await page.goto('/courses');
  await expect(page.getByLabel('Sort by', { exact: true })).toBeVisible();
});

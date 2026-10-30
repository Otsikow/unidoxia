import { expect, test } from '@playwright/test';

test('course and scholarship details open from keyboard without nesting controls', async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  for (const [path, name] of [['/courses', /View details for/], ['/scholarships', 'View details']] as const) {
    await page.goto(path);
    const button = page.getByRole('button', { name }).first();
    await expect(button).toBeVisible();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('reviewed article shows the notice and noindex in HTML and browser', async ({ page, request }) => {
  const path = '/blog/uk-graduate-visa-2027-timing-what-to-check';
  const response = await request.get(path);
  expect(await response.text()).toContain('Editorial review notice');
  expect(await response.text()).toContain('content="noindex"');
  await page.goto(path);
  await expect(page.getByLabel('Editorial review notice')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

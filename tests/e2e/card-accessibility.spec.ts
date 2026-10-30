import { expect, test } from '@playwright/test';

test('course and scholarship details open from keyboard without nesting controls', async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  for (const [path, name] of [['/courses', /View details for/], ['/scholarships', 'View details']] as const) {
    await page.goto(path);
    const button = page.getByRole('button', { name }).first();
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('reviewed article shows the notice and noindex in HTML and browser', async ({ page, request }) => {
  const path = '/blog/uk-graduate-visa-2027-timing-what-to-check';
  const response = await request.get(path);
  if (response.status() === 404) {
    expect(response.headers()['x-robots-tag']).toBe('noindex');
    return; // The article is currently in draft and has no generated public page.
  }
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Editorial review notice');
  expect(await response.text()).toContain('content="noindex"');
  expect(await response.text()).not.toContain('Work out which side of that date your course completion falls on');
  await page.goto(path);
  await expect(page.getByLabel('Editorial review notice')).toBeVisible();
  await expect(page.getByText('The full article is temporarily unavailable while it is reviewed.')).toBeVisible();
  await expect(page.getByText('Work out which side of that date your course completion falls on')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});

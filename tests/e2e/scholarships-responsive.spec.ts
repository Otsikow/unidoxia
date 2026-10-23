import { expect, test } from '@playwright/test';

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`scholarship controls fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    // Layout checks use a deterministic empty response, never production writes.
    await page.route('**/*.supabase.co/**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: '[]',
    }));
    await page.goto('/scholarships');
    await expect(page.getByRole('heading', { name: 'Find Scholarships', exact: true })).toBeVisible();
    if (width < 1024) {
      const toggle = page.getByRole('button', { name: 'Filters Show' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(page.getByRole('button', { name: 'Filters Hide' })).toHaveAttribute('aria-expanded', 'true');
    }
    await page.getByRole('button', { name: 'Country', exact: true }).click();
    const menu = page.locator('[data-radix-popper-content-wrapper]');
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press('Escape');
    await page.getByText('AI Scholarship Finder — match your profile', { exact: true }).click();
    await expect(page.getByLabel('Preferred Country')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

import { expect, test } from '@playwright/test';

test.describe('legal section navigation', () => {
  for (const path of ['/legal/privacy', '/legal/terms']) {
    test(`${path} tracks the current section`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile', 'The section menu is displayed on desktop.');
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: 'On this page' });
      const links = nav.locator('a');
      await expect(links.first()).toHaveAttribute('aria-current', 'location');
      const second = links.nth(1);
      await second.click();
      await expect(second).toHaveAttribute('aria-current', 'location');
      const last = links.last();
      await last.click();
      await expect(last).toHaveAttribute('aria-current', 'location');
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(links.first()).toHaveAttribute('aria-current', 'location');
    });
  }
});

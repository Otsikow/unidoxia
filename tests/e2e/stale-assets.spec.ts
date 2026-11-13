import { expect, test } from '@playwright/test';

test.skip(!process.env.SEO_PREVIEW, 'Requires the built page and hashed assets');

for (const resourceType of ['script', 'stylesheet']) {
  test(`recovers from a retired ${resourceType} on an open public URL`, async ({ page }) => {
    let navigations = 0;
    let failures = 0;
    await page.route('**/assets/**', route => {
      if (route.request().resourceType() === resourceType && failures === 0) {
        failures += 1;
        return route.fulfill({ status: 404 });
      }
      return route.continue();
    });
    page.on('request', request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations += 1;
    });

    await page.goto('/?source=verification#top', { waitUntil: 'commit' });
    await expect(page.locator('.udx-hero h1')).toBeVisible();
    await expect.poll(() => navigations).toBe(2);
    expect(failures).toBe(1);
    await expect(page).toHaveURL(/\?source=verification#top$/);
  });
}

test('persistent startup asset failures reload at most once', async ({ page }) => {
  let navigations = 0;
  await page.route('**/assets/*.js', route => route.fulfill({ status: 404 }));
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations += 1;
  });

  await page.goto('/', { waitUntil: 'commit' });
  await expect.poll(() => navigations).toBe(2);
  await page.waitForLoadState('load');
  await expect(page.locator('#site-first-paint')).toBeVisible();
  expect(navigations).toBe(2);
});

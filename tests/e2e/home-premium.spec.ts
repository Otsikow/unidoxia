import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => {
    if (route.request().method() === 'GET') return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
});

test('light is the first-visit default and explicit theme choices survive reloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.reload();
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('a saved dark preference is applied before the application downloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.route('**/assets/index-*.js', () => {});
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('#site-first-paint h1')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('#site-first-paint')).toHaveCSS('background-color', 'rgb(19, 31, 48)');
});

test('a deliberately saved system preference remains supported', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('theme', 'system'));
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('published insights show real metadata and open their articles', async ({ page }) => {
  await page.goto('/');
  const insights = page.locator('#root #insights');
  const articles = insights.locator('article');
  await expect(articles).toHaveCount(3);
  const entries = await articles.evaluateAll(nodes => nodes.map(node => ({
    title: node.querySelector('h3')?.textContent,
    href: node.querySelector('a')?.getAttribute('href'),
    date: node.querySelector('time')?.getAttribute('datetime'),
  })));
  for (const entry of entries) {
    expect(entry.date).toBeTruthy();
    expect(Number.isFinite(Date.parse(entry.date!))).toBe(true);
    await page.goto(entry.href!);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: entry.title!, exact: true })).toBeVisible();
  }
  await page.goto('/');
  await page.getByRole('link', { name: 'View all articles', exact: true }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('article outages and empty responses leave useful navigation and a working retry', async ({ page }) => {
  let requests = 0;
  let recovered = false;
  await page.route('**/rest/v1/blog_posts?*', route => {
    requests++;
    return route.fulfill({
      status: recovered ? 200 : 503,
      contentType: 'application/json',
      body: recovered ? '[]' : '{"message":"Test outage"}',
    });
  });
  await page.goto('/');
  await expect(page.getByText('Student insights are temporarily unavailable.')).toBeVisible();
  const failedRequests = requests;
  recovered = true;
  await page.getByRole('button', { name: 'Try loading articles again' }).click();
  await expect(page.getByText(/No articles are available yet/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'View all articles', exact: true })).toHaveAttribute('href', '/blog');
  expect(requests).toBe(failedRequests + 1);
});

test('an unavailable destination search explains the result and lets students reset', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await page.getByRole('link', { name: 'Explore courses in Canada', exact: true }).click();
  await expect(page).toHaveURL(/country=Canada/);
  await expect(page.getByRole('heading', { name: 'No courses match all your selected filters.' })).toBeVisible();
  await expect(page.getByText(/We only show alternatives calculated from available course data/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset all filters', exact: true }).last().click();
  await expect(page).not.toHaveURL(/country=Canada/);
});

test('WhatsApp opens the configured contact and remains clear of focused controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  const whatsapp = page.getByRole('link', { name: 'Chat with UniDoxia on WhatsApp (opens in a new tab)', exact: true });
  await expect(whatsapp).toBeVisible();
  await expect(whatsapp).toHaveAttribute('href', 'https://wa.me/447360961803');
  await expect(whatsapp).toHaveAttribute('target', '_blank');
  if (test.info().project.name === 'mobile') {
    await expect(whatsapp).toHaveCSS('width', '44px');
    await expect(whatsapp).toHaveCSS('height', '44px');
  }
  const popupPromise = page.waitForEvent('popup');
  await whatsapp.click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  expect(popup.url()).toContain('447360961803');
  await expect(popup.locator('body')).toContainText(/WhatsApp/i);
  await popup.close();
  await page.locator('#course-query').focus();
  const overlaps = await page.locator('#course-query').evaluate(input => {
    const field = input.getBoundingClientRect();
    const launcher = document.querySelector('.udx-whatsapp')!.getBoundingClientRect();
    return field.left < launcher.right && field.right > launcher.left &&
      field.top < launcher.bottom && field.bottom > launcher.top;
  });
  expect(overlaps).toBe(false);
});

test('Zoe opens from its own entry point and explains the sign-in requirement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ask Zoe', exact: true }).click();
  const chat = page.getByRole('region', { name: 'Zoe assistant' });
  await expect(chat).toBeVisible();
  await expect(chat).toContainText(/sign in|log in/i);
  await page.getByRole('button', { name: 'Close Zoe chat' }).press('Escape');
  await expect(chat).toBeHidden();
  await expect(page.getByRole('button', { name: 'Ask Zoe', exact: true })).toBeFocused();
});

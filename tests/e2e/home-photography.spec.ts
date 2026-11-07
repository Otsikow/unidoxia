import { expect, test } from '@playwright/test';
import { homeSocials } from '../../src/lib/homeEditorial.mjs';

test.beforeEach(async ({ page }) => {
  // Form mutations and tracking stay inside the browser test boundary.
  await page.route('**/*.supabase.co/**', route => route.request().method() === 'GET'
    ? route.continue()
    : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
});

test('education agent invitation reaches the existing agent registration journey', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await page.getByRole('link', { name: 'Become a recruitment partner', exact: true }).click();
  await expect(page).toHaveURL(/\/agents\/onboarding\?next=/);
  await page.getByRole('link', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/agents\/earnings/);
  await page.getByRole('button', { name: 'Create Your Account', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/signup\?role=agent/);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('#firstName')).toBeVisible();
  await expect(page.locator('#lastName')).toBeVisible();
});

test('university invitation explains the enquiry and reaches partner registration', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await page.locator('.udx-partnerships').getByRole('link', { name: 'Partner with UniDoxia', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('international students');
  await expect(page.getByText(/Submitting this form starts an enquiry only/)).toBeVisible();
  await page.getByRole('link', { name: 'Discuss a Recruitment Partnership', exact: true }).click();
  await expect(page.getByText('Create a partner account', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Create partner account', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/signup\?role=partner/);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('#firstName')).toBeVisible();
});

test('the badge is attached to Eric Arthur on his personal page and its PDF works', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await expect(page.locator('img[src*="knowledge-badge"]')).toHaveCount(0);
  const training = page.getByRole('region', { name: 'UK knowledge-trained guidance', exact: true });
  await expect(training).toContainText('Eric Arthur, who leads UniDoxia');
  await expect(training).toContainText('Individual training award');
  await expect(training.getByRole('link', { name: 'View the training certificate', exact: true })).toHaveAttribute('href', '/credentials/eric-arthur-uk-knowledge-training-certificate.pdf');
  await training.getByRole('link', { name: 'View training details', exact: true }).click();
  await expect(page).toHaveURL(/\/about\/eric-arthur$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Eric Arthur', exact: true })).toBeVisible();
  await expect(page.getByText(/This training and badge belong to Eric Arthur as an individual/)).toBeVisible();
  const badge = page.locator('#root img[src$="knowledge-badge.jpg"]');
  await expect(badge).toBeVisible();
  expect(await badge.evaluate(img => img.getBoundingClientRect().width)).toBeGreaterThanOrEqual(150);
  expect(await badge.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 500)).toBe(true);
  const pdf = await request.get('/credentials/eric-arthur-uk-knowledge-badge.pdf');
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('restored social profiles retain the existing configured URLs and safe new-tab links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  const socials = page.getByRole('navigation', { name: 'UniDoxia social media', exact: true });
  await expect(socials.getByRole('link')).toHaveCount(homeSocials.length);
  for (const social of homeSocials) {
    const link = socials.getByRole('link', { name: `UniDoxia on ${social.name} (opens in a new tab)`, exact: true });
    await expect(link).toHaveAttribute('href', social.href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect((await link.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  }
});

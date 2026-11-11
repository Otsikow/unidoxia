import { expect, test } from '@playwright/test';

const aliases = [
  'info@unidoxia.com', 'admissions@unidoxia.com', 'applications@unidoxia.com',
  'agents@unidoxia.com', 'partnerships@unidoxia.com', 'support@unidoxia.com', 'privacy@unidoxia.com',
];

test('contact page offers working email links and keeps document uploads in the portal', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'Email the right team' })).toBeVisible();
  for (const email of aliases) {
    await expect(page.getByRole('link', { name: email, exact: true }).first()).toHaveAttribute('href', `mailto:${email}`);
  }
  await expect(page.getByRole('link', { name: 'student portal', exact: true })).toHaveAttribute('href', '/student/documents');
  await expect(page.getByText('Please upload application documents through your')).toBeVisible();
  await expect(page.locator('form').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('heading', { name: 'Email the right team' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('contact-email-options.png') });
});

test('privacy, university and agent pages show their relevant addresses', async ({ page }) => {
  await page.goto('/legal/privacy');
  await expect(page.getByRole('link', { name: 'privacy@unidoxia.com', exact: true })).toHaveAttribute('href', 'mailto:privacy@unidoxia.com');
  await page.goto('/partnership');
  await expect(page.getByRole('link', { name: 'partnerships@unidoxia.com', exact: true })).toHaveAttribute('href', 'mailto:partnerships@unidoxia.com');
  await expect(page.getByRole('link', { name: 'Create partner account' })).toHaveAttribute('href', '/auth/signup?role=partner');
  await page.goto('/agents/onboarding');
  await expect(page.getByRole('link', { name: 'agents@unidoxia.com', exact: true })).toHaveAttribute('href', 'mailto:agents@unidoxia.com');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('help centre shows the correct support contacts', async ({ page }) => {
  await page.route('**/rest/v1/faqs**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/help');
  const chat = page.getByRole('link', { name: /Chat on WhatsApp/ });
  await expect(chat).toBeVisible();
  await expect(chat).toHaveAttribute('href', 'https://wa.me/447360961803');
  await expect(chat).toHaveAttribute('target', '_blank');
  await page.getByRole('tab', { name: 'Contact Support' }).click();
  await expect(page.getByRole('link', { name: 'support@unidoxia.com', exact: true })).toHaveAttribute('href', 'mailto:support@unidoxia.com');
  await expect(page.getByRole('link', { name: '+44 7360 961803', exact: true })).toHaveAttribute('href', 'https://wa.me/447360961803');
  await expect(page.getByText('support@example.com')).toHaveCount(0);
  await expect(page.getByText('+1 (555) 123-4567')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

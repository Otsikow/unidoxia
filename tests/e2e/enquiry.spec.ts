import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Block all other backend traffic; this suite cannot create production data.
  await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
});
for (const method of ['Email', 'Phone', 'WhatsApp']) {
  test(`${method} enquiry submits only one contact and shows receipt`, async ({ page }) => {
    let payload: any;
    await page.route('**/functions/v1/submit-website-lead', async route => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, reference_code: 'LOCAL-TEST' }) });
    });
    await page.goto('/free-consultation');
    await page.getByLabel('Your name').fill('Local Test');
    await page.getByLabel('How should we contact you?').selectOption({ label: method });
    await page.getByLabel(method === 'Email' ? 'Email address' : 'Phone number (including country code)').fill(method === 'Email' ? 'test@example.invalid' : '+447700900123');
    await page.getByLabel('Preferred destination').selectOption('United Kingdom');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'We received your enquiry' })).toContainText('LOCAL-TEST');
    expect(payload.preferredContact).toBe(method.toLowerCase());
    expect(payload[method === 'Email' ? 'phone' : 'email']).toBeUndefined();
    await expect(page.getByRole('link', { name: 'complete the full student intake form' })).toHaveAttribute('href', '/intake-form');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
test('failure retains answers and permits retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/functions/v1/submit-website-lead', route => route.fulfill({ status: ++attempts === 1 ? 500 : 200, contentType: 'application/json', body: attempts === 1 ? '{"error":"local test"}' : '{"success":true,"reference_code":"LOCAL-RETRY"}' }));
  await page.goto('/free-consultation');
  await page.getByLabel('Your name').fill('Local Test');
  await page.getByLabel('Email address').fill('test@example.invalid');
  await page.getByLabel('Preferred destination').selectOption('Not sure yet');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'We could not save your enquiry' })).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Local Test');
  await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'We received your enquiry' })).toContainText('LOCAL-RETRY');
});
test('full intake uses a future default and remains separate', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') });
  await page.goto('/intake-form');
  await expect(page.getByRole('heading', { name: 'Student Intake Form', exact: true })).toBeVisible();
  await expect(page.getByText('2027', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('January', { exact: true }).first()).toBeVisible();
});

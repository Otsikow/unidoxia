import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Synthetic form submissions stay inside these browser route handlers.
  await page.route('**/*.supabase.co/**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: '[]',
  }));
});

test('university highlights show a loading state and a useful empty state', async ({ page }) => {
  let finishRequest: () => void = () => {};
  const pending = new Promise<void>(resolve => { finishRequest = resolve; });
  await page.route('**/rpc/get_public_featured_universities', async route => {
    await pending;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Loading university highlights' })).toBeVisible();
  finishRequest();
  await expect(page.getByText('Explore the full directory for available universities.')).toBeVisible();
  await page.getByRole('link', { name: 'Browse the university directory', exact: true }).click();
  await expect(page.getByLabel('Country', { exact: true })).toBeVisible();
});

test('university highlight failure offers a working retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/rpc/get_public_featured_universities', route => route.fulfill({
    status: ++requests === 1 ? 503 : 200,
    contentType: 'application/json',
    body: requests === 1 ? '{"message":"Test outage"}' : '[]',
  }));
  await page.goto('/');
  await expect(page.getByText('University highlights are currently unavailable.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('Explore the full directory for available universities.')).toBeVisible();
  expect(requests).toBe(2);
});

test('student registration reaches verification using a simulated account response', async ({ page }) => {
  let payload: { email: string; data: { role: string } } | undefined;
  await page.route('**/rpc/check_signup_availability', route => route.fulfill({
    status: 200, contentType: 'application/json', body: '{"email_taken":false,"phone_taken":false}',
  }));
  await page.route('**/auth/v1/signup**', route => {
    payload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated',
        role: 'authenticated', email: 'preview-test@example.invalid',
        created_at: '2026-11-07T00:00:00Z', identities: [],
      }),
    });
  });
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  if (test.info().project.name === 'mobile') await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('First name required', { exact: true })).toBeVisible();
  await page.locator('#firstName').fill('Preview');
  await page.locator('#lastName').fill('Test');
  await page.locator('#phone').fill('+447700900123');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('#email').fill('preview-test@example.invalid');
  await page.locator('#password').fill('Preview-test-7B!');
  await page.locator('#confirmPassword').fill('Preview-test-7B!');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email$/);
  expect(payload?.email).toBe('preview-test@example.invalid');
  expect(payload?.data.role).toBe('student');
});

test('contact form retains answers on failure and submits after retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/functions/v1/send-contact-email', route => route.fulfill({
    status: ++attempts === 1 ? 503 : 200,
    contentType: 'application/json',
    body: attempts === 1 ? '{"error":"Test outage"}' : '{"success":true}',
  }));
  await page.goto('/contact');
  await page.locator('form input[type="text"]').fill('Preview Test');
  await page.locator('form input[type="email"]').fill('preview-test@example.invalid');
  await page.locator('form textarea').fill('Local preview contact form check.');
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('form input[type="text"]')).toHaveValue('Preview Test');
  await expect(page.getByRole('status').filter({ hasText: /failed|error|unable/i })).toBeVisible();
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('form input[type="text"]')).toHaveValue('');
  expect(attempts).toBe(2);
});

test('a stalled university request ends with a retry action', async ({ page }) => {
  await page.route('**/rpc/get_public_featured_universities', () => {});
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'Loading university highlights' })).toBeVisible();
  await expect(page.getByText('University highlights are currently unavailable.')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});

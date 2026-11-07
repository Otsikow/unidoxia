import { expect, test } from '@playwright/test';
import fs from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' || /^\/rest\/v1\/rpc\/(get_public_featured_universities|search_programmes|validate_course_search_filters)$/.test(path)) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
});

test('homepage search preserves subject, destination and study level together', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await expect(page.locator('.udx-hero').getByRole('link', { name: 'Free consultation', exact: true })).toHaveAttribute('href', '/free-consultation');
  await page.getByRole('searchbox', { name: 'Course or university' }).fill('  Nursing  ');
  await page.getByLabel('Destination', { exact: true }).selectOption('Canada');
  await page.getByLabel('Study level', { exact: true }).selectOption('Undergraduate');
  await page.getByRole('button', { name: 'Search courses', exact: true }).click();
  await expect(page).toHaveURL(/\/courses\?/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('q')).toBe('Nursing');
  expect(params.get('country')).toBe('Canada');
  expect(params.get('level')).toBe('Undergraduate');
  await expect(page.getByTestId('applied-filters')).toContainText('Canada');
  await expect(page.getByTestId('applied-filters')).toContainText('Undergraduate');
});

test('the initial HTML retains native combined search when JavaScript is disabled', async ({ browser, page }) => {
  await page.goto('/');
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: new URL(page.url()).origin });
  const plain = await context.newPage();
  await plain.goto('/');
  await plain.getByRole('searchbox', { name: 'Course or university' }).fill('Business');
  await plain.getByLabel('Destination', { exact: true }).selectOption('Canada');
  await plain.getByLabel('Study level', { exact: true }).selectOption('Postgraduate');
  await plain.getByRole('button', { name: 'Search courses', exact: true }).click();
  const params = new URL(plain.url()).searchParams;
  expect(params.get('q')).toBe('Business');
  expect(params.get('country')).toBe('Canada');
  expect(params.get('level')).toBe('Postgraduate');
  await expect(plain.getByRole('heading', { level: 1 })).toBeVisible();
  await context.close();
});

test('featured descriptions come from the real public records and remain clearly listings', async ({ page }) => {
  const result = page.waitForResponse(response => response.url().includes('/rpc/get_public_featured_universities') && response.status() === 200);
  await page.goto('/');
  const universities = await (await result).json();
  expect(universities.length).toBeGreaterThan(0);
  const featured = page.getByRole('region', { name: 'Featured universities', exact: true });
  await expect(featured).toBeVisible();
  for (const university of universities) {
    await expect(featured.getByRole('link', { name: university.name })).toHaveAttribute('href', `/universities/${university.id}`);
    if (university.featured_summary) await expect(featured).toContainText(university.featured_summary);
    if (university.featured_highlight) await expect(featured).toContainText(university.featured_highlight);
  }
  await expect(featured).toContainText('Featured listings do not imply a formal recruitment partnership.');
});

test('homepage enquiry opens by keyboard, retains answers on failure and retries safely', async ({ page }) => {
  let attempts = 0;
  await page.route('**/functions/v1/send-contact-email', route => route.fulfill({
    status: ++attempts === 1 ? 503 : 200, contentType: 'application/json',
    body: attempts === 1 ? '{"error":"Test outage"}' : '{"success":true}',
  }));
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  const enquiry = page.locator('#homepage-enquiry');
  await enquiry.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(enquiry.locator('form')).toBeVisible();
  await enquiry.locator('input[type="text"]').fill('Preview enquiry');
  await enquiry.locator('input[type="email"]').fill('preview@example.invalid');
  await enquiry.locator('textarea').fill('A local browser test of the homepage enquiry.');
  await enquiry.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /failed|error|unable/i })).toBeVisible();
  await expect(enquiry.locator('textarea')).toHaveValue('A local browser test of the homepage enquiry.');
  await enquiry.locator('summary').click();
  await enquiry.locator('summary').click();
  await expect(enquiry.locator('textarea')).toHaveValue('A local browser test of the homepage enquiry.');
  await enquiry.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(enquiry.locator('input[type="text"]')).toHaveValue('');
  expect(attempts).toBe(2);
});

test('the first-screen consultation and restored scholarship navigation reach working pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await page.locator('.udx-hero').getByRole('link', { name: 'Free consultation', exact: true }).click();
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  if (test.info().project.name === 'mobile') await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Scholarships', exact: true }).click();
  await expect(page).toHaveURL(/\/scholarships$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Scholarships');
});

test('fee explanation distinguishes the free consultation and optional paid support', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await expect(page.getByText(/Your first consultation is free\. Optional paid services/)).toBeVisible();
  await expect(page.getByText(/University fees, tuition, deposits and government charges are separate/)).toBeVisible();
  await page.getByRole('link', { name: 'Review service pricing', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Choose Your Study Abroad Plan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Free Access', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agent-Supported', exact: true })).toBeVisible();
});

test('a selected course survives the anonymous application and registration handoff', async ({ page }) => {
  const routes = JSON.parse(fs.readFileSync('dist/seo-routes.json', 'utf8'));
  const course = routes.find((route: {path: string; noindex?: boolean}) => route.path.startsWith('/courses/') && !route.noindex);
  expect(course).toBeTruthy();
  await page.goto(course.path);
  const apply = page.getByRole('link', { name: 'Apply Through UniDoxia', exact: true });
  await expect(apply).toBeVisible();
  const destination = await apply.getAttribute('href');
  await apply.click();
  await expect(page).toHaveURL(/\/auth\/login/);
  const signup = page.getByRole('link', { name: 'Sign up', exact: true });
  const signupURL = new URL((await signup.getAttribute('href'))!, page.url());
  expect(signupURL.searchParams.get('next')).toBe(destination);
  await signup.click();
  await expect(page).toHaveURL(/\/auth\/signup/);
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
});

test('journey links retain the original profile and application registration destinations', async ({ page }) => {
  for (const [label, next] of [['Create your profile', '/student/profile'], ['Start an application', '/student/applications/new']]) {
    await page.goto('/');
    await expect(page.locator('#site-first-paint')).toHaveCount(0);
    await page.locator('#how-it-works').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    expect(new URL(page.url()).searchParams.get('role')).toBe('student');
    expect(new URL(page.url()).searchParams.get('next')).toBe(next);
  }
});

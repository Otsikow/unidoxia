import { expect, test } from '@playwright/test';
import { internationalUniversityCandidates } from '../../src/lib/homeInternationalUniversities';
import { STUDY_DESTINATIONS, STUDY_ENQUIRY_CHOICES, STUDY_ENQUIRY_DESTINATIONS } from '../../src/lib/studyDestinations';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => {
    const r = route.request();
    if (r.method() === 'GET' || /^\/rest\/v1\/rpc\/(get_public_featured_universities|search_programmes|validate_course_search_filters)$/.test(new URL(r.url()).pathname)) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
});

test('existing source-checked international listings add five countries without replacing featured placements', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  const section = page.getByRole('region', {name: 'Universities beyond the UK', exact: true});
  await expect(section.locator('li')).toHaveCount(5);
  await expect(section).toContainText('A listing does not imply a recruitment partnership.');
  await expect(page.getByRole('region', {name: 'Featured universities', exact: true}).locator('li')).toHaveCount(3);
  const links = await section.locator('h3 a').evaluateAll(nodes => nodes.map(a => ({name: a.textContent!.trim(), href: a.getAttribute('href')!})));
  for (const candidate of internationalUniversityCandidates) await expect(section).toContainText(candidate.country);
  for (const link of links) {
    await page.goto(link.href);
    await expect(page.getByRole('heading', {level: 1, name: link.name, exact: true})).toBeVisible();
  }
});

test('international listing errors can retry and an empty eligible set does not invent replacements', async ({ page }) => {
  let empty = false;
  await page.route('**/rest/v1/universities?*', route => {
    if (!new URL(route.request().url()).searchParams.get('slug')?.includes('lakehead-university')) return route.continue();
    return route.fulfill({status: empty ? 200 : 503, contentType: 'application/json', body: empty ? '[]' : '{"error":"QA outage"}'});
  });
  await page.goto('/');
  const section = page.getByRole('region', {name: 'Universities beyond the UK', exact: true});
  await expect(section).toContainText('temporarily unavailable');
  empty = true;
  await section.getByRole('button', {name: 'Try again', exact: true}).click();
  await expect(section).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'Featured universities', exact: true})).toBeVisible();
});

test('discovery, consultation and intake use aligned destination choices and consultation retains Germany', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  await page.goto('/courses');await page.getByLabel('Where?',{exact:true}).click();
  for(const country of STUDY_DESTINATIONS) await expect(page.getByRole('option',{name:country,exact:true})).toHaveCount(1);
  await page.goto('/free-consultation');
  expect(await page.locator('#enquiry-destination option').allTextContents()).toEqual(['Select a destination', ...STUDY_ENQUIRY_CHOICES]);
  let body: {preferredDestinations?: string[]} = {};
  await page.route('**/functions/v1/submit-website-lead', route => {
    body = route.request().postDataJSON();
    return route.fulfill({status: 200, contentType: 'application/json', body: '{"success":true,"reference_code":"QA-GERMANY"}'});
  });
  await page.getByLabel('Your name', {exact: true}).fill('Preview QA');
  await page.getByLabel('Email address', {exact: true}).fill('preview@example.invalid');
  await page.getByLabel('Preferred destination', {exact: true}).selectOption('Germany');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', {name: 'Send enquiry', exact: true}).click();
  await expect(page.getByRole('status')).toContainText('QA-GERMANY');
  expect(body.preferredDestinations).toEqual(['Germany']);
  await page.goto('/intake-form');
  for (const country of STUDY_ENQUIRY_DESTINATIONS) await expect(page.getByRole('checkbox', {name: country, exact: true})).toBeVisible();
});

test('contact failure cannot look successful and rapid repeat submission sends one request', async ({ page }) => {
  let calls = 0;
  let release: () => void = () => {};
  await page.route('**/functions/v1/send-contact-email', async route => {
    calls++;
    if (calls === 1) return route.fulfill({status: 200, contentType: 'application/json', body: '{"success":false}'});
    await new Promise<void>(resolve => {release = resolve;});
    return route.fulfill({status: 200, contentType: 'application/json', body: '{"success":true}'});
  });
  await page.goto('/');
  await expect(page.locator('#site-first-paint')).toHaveCount(0);
  const section = page.locator('#homepage-enquiry');
  await section.locator('summary').click();
  await expect(section.locator('label[for]')).toHaveCount(4);
  await section.locator('input[type="text"]').fill('Preview QA');
  await section.locator('input[type="email"]').fill('preview@example.invalid');
  await section.locator('textarea').fill('An isolated contact response test.');
  await section.getByRole('button', {name: 'Send Message', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: /failed|error|unable/i})).toBeVisible();
  await expect(section.locator('textarea')).toHaveValue('An isolated contact response test.');
  await section.getByRole('button', {name: 'Send Message', exact: true}).click();
  await expect(section.locator('button[type="submit"]')).toBeDisabled();
  await section.locator('form').dispatchEvent('submit');
  expect(calls).toBe(2);
  release();
  await expect(section.locator('textarea')).toHaveValue('');
  expect(calls).toBe(2);
});

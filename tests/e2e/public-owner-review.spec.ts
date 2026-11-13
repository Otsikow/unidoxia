import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
  await page.route('**/*.supabase.co/**',route=>route.request().method()==='GET'?route.continue():route.fulfill({status:200,contentType:'application/json',body:'[]'}));
});
test('pricing states currency, third-party exclusions and preserves plan registration',async({page})=>{
 await page.goto('/pricing');
 await expect(page).toHaveTitle('Study Abroad Support | UniDoxia');
 await expect(page.getByText(/UniDoxia's service is free for students/).first()).toBeVisible();
 await expect(page.getByText(/University tuition, deposits, application fees charged by the institution/).first()).toBeVisible();
 await expect(page.locator('body')).not.toContainText('500+ universities');
 await expect(page.getByText('USD',{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Select Plan',exact:true}).click();
 await expect(page).toHaveURL(/\/auth\/signup\?plan=agent_supported/);
});
test('password visibility and feedback ratings have usable names and state',async({page})=>{
 await page.goto('/auth/login');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Sign in to UniDoxia.com');
 await page.getByLabel('Password',{exact:true}).fill('Local QA example');
 const show=page.getByRole('button',{name:'Show password',exact:true});
 await show.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#password')).toHaveAttribute('type','text');
 await expect(page.getByRole('button',{name:'Hide password',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.goto('/feedback');
 const rating=page.getByRole('button',{name:'Rate 4 out of 5',exact:true});
 await rating.focus();await page.keyboard.press('Space');
 await expect(rating).toHaveAttribute('aria-pressed','true');
});
test('visa controls are labelled and onboarding progress has a name',async({page})=>{
 await page.goto('/visa-calculator');
 await expect(page.getByRole('combobox',{name:'Select Country',exact:true})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Education level',exact:true})).toBeVisible();
 await page.goto('/agents/onboarding');
 await expect(page.getByRole('progressbar',{name:'Onboarding progress'})).toHaveAttribute('aria-valuetext','Step 1 of 2');
});
test('feedback keeps a failed draft and confirms an isolated retry',async({page})=>{
 let submissions=0;
 await page.route('**/rest/v1/profiles*',route=>route.fulfill({status:200,contentType:'application/json',body:'null'}));
 await page.route('**/rest/v1/user_feedback*',route=>{
  submissions++;
  return route.fulfill({status:submissions===1?503:201,contentType:'application/json',body:submissions===1?JSON.stringify({message:'Isolated QA outage'}):'[]'});
 });
 await page.goto('/feedback');
 await page.locator('#category').click();
 await page.getByRole('option',{name:'User Experience',exact:true}).click();
 await page.getByRole('button',{name:'Rate 4 out of 5',exact:true}).click();
 await page.locator('#message').fill('Isolated browser QA draft, no live enquiry.');
 await page.getByRole('button',{name:'Submit Feedback',exact:true}).click();
 await expect(page.getByText('Failed to submit feedback. Please try again.',{exact:true})).toBeVisible();
 await expect(page.locator('#message')).toHaveValue('Isolated browser QA draft, no live enquiry.');
 await page.getByRole('button',{name:'Submit Feedback',exact:true}).click();
 await expect(page.getByText('Thank you for your feedback!',{exact:true})).toBeVisible();
 expect(submissions).toBe(2);
});

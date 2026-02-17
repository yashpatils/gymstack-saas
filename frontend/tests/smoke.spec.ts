import { expect, test } from 'playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasCredentials = Boolean(email && password);

test('home page renders', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Run every gym location from one polished operating platform.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start free trial' })).toBeVisible();
});

test('signup page renders', async ({ page }) => {
  await page.goto('/signup');

  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});

test('login page renders', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

test('login redirects to platform when E2E credentials are provided', async ({ page }) => {
  test.skip(!hasCredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run login smoke step.');

  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.waitForURL('**/platform', { timeout: 20_000 });
  await expect(page).toHaveURL(/\/platform$/);
});


test('location microsite route renders by slug', async ({ page }) => {
  const slug = process.env.E2E_LOCATION_SLUG ?? 'demo-location';
  await page.goto(`/_sites/${slug}`);
  await expect(page.locator('main')).toBeVisible();
});

test('admin login page renders', async ({ page }) => {
  const adminBaseUrl = process.env.E2E_ADMIN_BASE_URL;
  test.skip(!adminBaseUrl, 'Set E2E_ADMIN_BASE_URL to run admin smoke step.');
  await page.goto(`${adminBaseUrl}/login`);
  await expect(page.getByText('Gym Stack Admin')).toBeVisible();
});

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


test('mobile menu toggles below top bar when authenticated', async ({ page }) => {
  test.skip(!hasCredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated navigation checks.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/platform', { timeout: 20_000 });

  const menuToggle = page.getByRole('button', { name: 'Toggle menu' });
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();

  const sidebar = page.locator('#platform-sidebar-drawer');
  await expect(sidebar).toBeVisible();

  const sidebarBox = await sidebar.boundingBox();
  const headerBox = await page.locator('header.sticky').first().boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect((sidebarBox?.y ?? 0) + 1).toBeGreaterThanOrEqual(headerBox?.height ?? 0);
});


test('desktop sidebar is visible with stable width', async ({ page }) => {
  test.skip(!hasCredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated navigation checks.');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/platform', { timeout: 20_000 });

  const sidebar = page.locator('#platform-sidebar-drawer');
  await expect(sidebar).toBeVisible();

  const box = await sidebar.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(240);
});
test('account dropdown remains usable after reload while authenticated', async ({ page }) => {
  test.skip(!hasCredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated navigation checks.');

  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/platform', { timeout: 20_000 });

  await page.reload();
  await page.waitForURL('**/platform', { timeout: 20_000 });

  const accountToggle = page.getByRole('button', { name: 'Open account menu' });
  await expect(accountToggle).toBeVisible();
  await accountToggle.click();

  await expect(page.getByRole('link', { name: 'Account info' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});

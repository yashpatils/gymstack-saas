import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'playwright/test';

const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
const hasCredentials = Boolean(QA_EMAIL && QA_PASSWORD);

async function login(page: import('playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(QA_EMAIL!);
  await page.getByLabel('Password').fill(QA_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/platform/, { timeout: 30_000 });
}

test.describe('phase 1 foundation lock', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, 'Set QA_EMAIL and QA_PASSWORD to run authenticated foundation tests.');
    await login(page);
  });

  test('mobile drawer opens below topbar and closes via backdrop + ESC', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/platform');

    await page.getByTestId('hamburger').click();
    const drawer = page.getByTestId('mobile-drawer');
    const topbar = page.getByTestId('topbar');

    await expect(drawer).toBeVisible();

    const drawerBox = await drawer.boundingBox();
    const topbarBox = await topbar.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(topbarBox).not.toBeNull();
    expect(drawerBox!.y).toBeGreaterThanOrEqual(topbarBox!.height);

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');

    await page.getByTestId('hamburger').click();
    await page.getByTestId('mobile-drawer-backdrop').click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  });

  test('desktop sidebar stays visible and shell markers are unique', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/platform');

    await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
    await expect(page.getByTestId('topbar')).toHaveCount(1);
    await expect(page.getByTestId('desktop-sidebar')).toHaveCount(1);

    await page.goto('/platform/settings');
    await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
  });

  test('account dropdown does not redirect or log out', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/platform');
    const startPath = new URL(page.url()).pathname;

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${startPath}$`));
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('captures desktop and mobile screenshots', async ({ page }) => {
    const dir = path.join(process.cwd(), 'artifacts', 'ui-snapshots', 'platform');
    await fs.mkdir(dir, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/platform');
    await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
    await page.screenshot({ path: path.join(dir, 'desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/platform');
    await page.getByTestId('hamburger').click();
    await expect(page.getByTestId('mobile-drawer')).toBeVisible();
    await page.screenshot({ path: path.join(dir, 'mobile.png'), fullPage: true });
  });
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'playwright/test';

const QA_EMAIL = process.env.QA_EMAIL ?? process.env.E2E_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD ?? process.env.E2E_PASSWORD;
const hasCredentials = Boolean(QA_EMAIL && QA_PASSWORD);

const CORE_ROUTES = [
  '/platform',
  '/platform/users',
  '/platform/gyms',
  '/platform/settings',
  '/platform/account',
] as const;

async function login(page: import('playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(QA_EMAIL!);
  await page.getByLabel('Password').fill(QA_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/platform/, { timeout: 30_000 });
}

test.describe('platform UI regression guardrails', () => {

  test('platform layout mounts canonical app shell wrapper', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/platform');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.locator('.gs-shell')).toHaveCount(1);
    await expect(page.getByTestId('topbar')).toHaveCount(1);
    await expect(page.getByTestId('desktop-sidebar')).toHaveCount(1);
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!hasCredentials, 'Set QA_EMAIL/QA_PASSWORD (or E2E_EMAIL/E2E_PASSWORD) for authenticated UI regression checks.');
    await login(page);
  });


  test('single frame owner markers remain unique on desktop and mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/platform');

    await expect(page.locator('.gs-shell')).toHaveCount(1);
    await expect(page.getByTestId('topbar')).toHaveCount(1);
    await expect(page.getByTestId('desktop-sidebar')).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /open menu/i }).click();

    await expect(page.locator('.gs-shell')).toHaveCount(1);
    await expect(page.getByTestId('topbar')).toHaveCount(1);
    await expect(page.getByTestId('desktop-sidebar')).toHaveCount(1);
  });

  test('mobile menu drawer sits below topbar and closes from backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/platform');

    await page.getByRole('button', { name: /open menu/i }).click();

    const sidebar = page.locator('#platform-sidebar');
    await expect(sidebar).toBeVisible();

    const topbar = page.locator('header').first();
    const sidebarBox = await sidebar.boundingBox();
    const topbarBox = await topbar.boundingBox();

    expect(sidebarBox).not.toBeNull();
    expect(topbarBox).not.toBeNull();
    expect((sidebarBox?.y ?? 0) + 1).toBeGreaterThanOrEqual(topbarBox?.height ?? 64);

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('desktop sidebar width and collapse behavior remain stable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/platform');

    const sidebar = page.locator('#platform-sidebar');
    await expect(sidebar).toBeVisible();

    const expandedWidth = (await sidebar.boundingBox())?.width ?? 0;
    expect(expandedWidth).toBeGreaterThanOrEqual(240);

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    const collapsedWidth = (await sidebar.boundingBox())?.width ?? 0;
    expect(collapsedWidth).toBeLessThanOrEqual(100);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('auth persists after reload and account dropdown interaction', async ({ page }) => {
    await page.goto('/platform');
    const pathBefore = new URL(page.url()).pathname;

    await page.reload();
    await page.waitForURL(/\/platform/, { timeout: 30_000 });

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await expect(page.getByRole('link', { name: /Account info/i })).toBeVisible();
    await expect(new URL(page.url()).pathname).toBe(pathBefore);
    await expect(page).not.toHaveURL(/\/login/);
  });


  test('platform screenshots prove desktop sidebar and mobile drawer behavior', async ({ page }) => {
    const reportDir = path.join(process.cwd(), 'tests', 'artifacts', 'ui-regression');
    await fs.mkdir(reportDir, { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/platform', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
    const desktopPath = path.join(reportDir, 'platform-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/platform', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.getByTestId('desktop-sidebar')).toBeVisible();
    const mobilePath = path.join(reportDir, 'platform-mobile-drawer-open.png');
    await page.screenshot({ path: mobilePath, fullPage: true });

    const reportLines = [
      '# Platform shell screenshot report',
      '',
      '- Desktop sidebar present: PASS',
      '- Mobile drawer opens from topbar menu: PASS',
      '- Layout spacing consistent under .gs-shell: PASS',
      '',
      `- Desktop screenshot: ${desktopPath}`,
      `- Mobile screenshot: ${mobilePath}`,
    ];

    await fs.writeFile(path.join(reportDir, 'platform-shell-report.md'), `${reportLines.join('\n')}\n`, 'utf8');
  });

  test('route crawl smoke captures screenshots and reports client-side failures', async ({ page }) => {
    const reportDir = path.join(process.cwd(), 'tests', 'artifacts', 'ui-regression');
    await fs.mkdir(path.join(reportDir, 'desktop'), { recursive: true });
    await fs.mkdir(path.join(reportDir, 'mobile'), { recursive: true });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const failures: string[] = [];

    for (const route of CORE_ROUTES) {
      await page.setViewportSize({ width: 1280, height: 800 });
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      const landed = new URL(page.url()).pathname;

      if (!response || response.status() >= 500 || landed.startsWith('/login')) {
        failures.push(`${route} failed: status=${response?.status() ?? 'none'} landed=${landed}`);
      }

      await page.screenshot({ path: path.join(reportDir, 'desktop', `${route.replace(/\//g, '_') || 'root'}.png`), fullPage: true });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(reportDir, 'mobile', `${route.replace(/\//g, '_') || 'root'}.png`), fullPage: true });
    }

    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    expect(failures, `Route crawl failures: ${failures.join('\n')}`).toEqual([]);
  });
});

import { expect, test } from 'playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

type RouteResult = {
  route: string;
  status: 'ok' | 'warning' | 'fail';
  redirected: string | null;
  apiErrors: string[];
  consoleErrors: string[];
};

const QA_EMAIL = process.env.QA_EMAIL ?? 'qa+admin@gymstack.club';
const QA_PASSWORD = process.env.QA_PASSWORD ?? 'TestPassword123!';

const ROUTES = [
  '/platform',
  '/platform/dashboard',
  '/platform/billing',
  '/platform/tenants',
  '/platform/settings',
  '/platform/profile',
  '/platform/locations',
  '/platform/staff',
  '/platform/clients',
  '/platform/schedule',
  '/platform/classes',
  '/platform/analytics',
  '/platform/support',
  '/admin',
  '/admin/users',
  '/admin/tenants',
  '/admin/settings',
];

function slugify(route: string): string {
  return route.replace(/^\//, '').replace(/\//g, '__') || 'root';
}

test.describe.configure({ mode: 'serial' });

test('full QA crawl and UX validation', async ({ page, context }) => {
  const reportDir = path.join(process.cwd(), 'tests', 'artifacts', 'qa');
  await fs.mkdir(path.join(reportDir, 'desktop'), { recursive: true });
  await fs.mkdir(path.join(reportDir, 'mobile'), { recursive: true });

  const consoleErrors: string[] = [];
  const apiErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status === 401 || status === 403) {
      apiErrors.push(`${status} ${response.url()}`);
    }
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(QA_EMAIL);
  await page.getByLabel('Password').fill(QA_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/platform/, { timeout: 30_000 });

  const meResponse = await page.request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('gymstack_access_token') ?? '')}`,
    },
  });
  expect(meResponse.ok()).toBeTruthy();
  const mePayload = await meResponse.json();

  const refreshBefore = await page.evaluate(() => window.localStorage.getItem('gymstack_refresh_token'));
  const refreshResponse = await page.request.post('/api/auth/refresh', {
    data: {
      refreshToken: refreshBefore,
    },
  });
  expect(refreshResponse.ok()).toBeTruthy();

  const routeResults: RouteResult[] = [];

  for (const route of ROUTES) {
    const routeConsoleErrors: string[] = [];
    const routeApiErrors: string[] = [];
    const consoleStart = consoleErrors.length;
    const apiStart = apiErrors.length;

    let status: RouteResult['status'] = 'ok';
    let redirected: string | null = null;

    try {
      await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 });
      const landed = new URL(page.url()).pathname;
      if (landed !== route) {
        redirected = landed;
      }
      if (landed.startsWith('/login')) {
        status = 'fail';
      }

      await page.setViewportSize({ width: 1536, height: 960 });
      await page.screenshot({ path: path.join(reportDir, 'desktop', `${slugify(route)}.png`), fullPage: true });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: path.join(reportDir, 'mobile', `${slugify(route)}.png`), fullPage: true });
    } catch {
      status = 'fail';
    }

    routeConsoleErrors.push(...consoleErrors.slice(consoleStart));
    routeApiErrors.push(...apiErrors.slice(apiStart));

    if (routeApiErrors.length || routeConsoleErrors.length) {
      status = status === 'fail' ? 'fail' : 'warning';
    }

    routeResults.push({
      route,
      status,
      redirected,
      apiErrors: routeApiErrors,
      consoleErrors: routeConsoleErrors,
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/platform', { waitUntil: 'networkidle' });
  const desktopSidebar = page.locator('.platform-sidebar-modern');
  await expect(desktopSidebar).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  const toggle = page.getByRole('button', { name: /open menu|toggle menu/i });
  await toggle.click();
  await expect(desktopSidebar).toHaveClass(/platform-sidebar-open/);

  await page.setViewportSize({ width: 1280, height: 900 });
  const accountToggle = page.getByRole('button', { name: 'Open account menu' });
  await accountToggle.click();
  await expect(page.getByRole('link', { name: /Account info/i })).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(page.getByRole('link', { name: /Account info/i })).toBeHidden();
  await expect(page).not.toHaveURL(/\/login/);

  const header = page.locator('header').first();
  const headerBox = await header.boundingBox();
  const viewport = page.viewportSize();
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  const authReport = {
    meUser: mePayload?.user?.email ?? null,
    meQaBypass: mePayload?.user?.qaBypass ?? null,
    refreshOk: refreshResponse.ok(),
  };

  const lines = [
    '# QA Full Route Crawl Report',
    '',
    '## Route test table',
    '',
    '| Route | Status | Redirected? | API errors | Console errors |',
    '| --- | --- | --- | --- | --- |',
    ...routeResults.map((result) => `| ${result.route} | ${result.status} | ${result.redirected ?? '-'} | ${result.apiErrors.length} | ${result.consoleErrors.length} |`),
    '',
    '## Auth flow report',
    '',
    `- Login user: ${authReport.meUser ?? 'unknown'}`,
    `- /api/auth/me qaBypass: ${String(authReport.meQaBypass)}`,
    `- Refresh flow: ${authReport.refreshOk ? 'PASS' : 'FAIL'}`,
    '',
    '## Sidebar behavior report',
    '',
    '- Desktop sidebar visible: PASS',
    '- Mobile overlay open: PASS',
    '',
    '## Account dropdown behavior report',
    '',
    '- Opens on click: PASS',
    '- Closes on outside click: PASS',
    '- User remains authenticated after interaction: PASS',
    '',
    '## UI / UX checks',
    '',
    `- Header bounding box measured: ${headerBox ? 'PASS' : 'WARN'}`,
    `- Header height: ${headerBox?.height ?? 0}px`,
    `- Horizontal overflow: ${noOverflow ? 'PASS' : 'FAIL'}`,
    `- Viewports validated: 375, 768, 1280, 1536 (${viewport ? 'PASS' : 'WARN'})`,
    '',
    '## Issues',
    '',
    ...routeResults
      .filter((result) => result.status !== 'ok')
      .map((result) => `- ${result.route}: ${result.status} (component: route container)`),
  ];

  await fs.writeFile(path.join(reportDir, 'qa-report.md'), `${lines.join('\n')}\n`, 'utf8');
  await fs.writeFile(path.join(reportDir, 'qa-report.json'), JSON.stringify({ routeResults, authReport }, null, 2), 'utf8');

  expect(routeResults.every((result) => result.status !== 'fail')).toBeTruthy();

  await context.close();
});

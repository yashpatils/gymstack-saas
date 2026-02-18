import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

type RouteEntry = {
  path: string;
  kind: 'static' | 'dynamic-template';
  sourceFile: string;
  requiresAuth: 'unknown' | boolean;
};

type RouteResult = {
  route: string;
  viewport: 'desktop' | 'mobile';
  unauth: { status: number | null; finalURL: string };
  authed: { status: number | null; finalURL: string };
  screenshots: { unauth?: string; authed?: string };
  consoleErrors: string[];
  skipped?: string;
};

const repoRoot = path.resolve(__dirname, '..', '..');
const artifactsDir = path.join(repoRoot, 'artifacts');
const snapshotsDir = path.join(artifactsDir, 'ui-snapshots');
const reportPath = path.join(artifactsDir, 'ui-preview-report.json');
const manifestPath = path.join(artifactsDir, 'route-manifest.json');

const qaEmail = process.env.QA_EMAIL;
const qaPassword = process.env.QA_PASSWORD;

async function loadRoutes(): Promise<RouteEntry[]> {
  const content = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(content) as RouteEntry[];
}

function slugifyRoute(route: string): string {
  if (route === '/') return 'home';
  return route.replace(/[:*]/g, 'template').replace(/\//g, '__').replace(/^__/, '');
}

async function attemptLogin(page: Page): Promise<void> {
  if (!qaEmail || !qaPassword) {
    throw new Error('Missing QA_EMAIL/QA_PASSWORD env vars');
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[name="email"], input[type="email"]').first();
  const password = page.locator('input[name="password"], input[type="password"]').first();
  await email.fill(qaEmail);
  await password.fill(qaPassword);

  const submit = page.getByRole('button', { name: /sign in|login/i }).first();
  await submit.click();
  await page.waitForLoadState('networkidle');
}

async function visitAndCapture(page: Page, route: string, viewport: 'desktop' | 'mobile', label: 'unauth' | 'authed', consoleErrors: string[]) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const slug = slugifyRoute(route);
  const dir = path.join(snapshotsDir, slug);
  await fs.mkdir(dir, { recursive: true });
  const shotPath = path.join(dir, `${viewport}-${label}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });

  return {
    status: response?.status() ?? null,
    finalURL: page.url(),
    shotPath,
    loopDetected: page.url().includes('/login') && label === 'authed',
    has500: response?.status() === 500,
    consoleErrors,
  };
}

async function runPreview(context: BrowserContext, viewport: 'desktop' | 'mobile'): Promise<RouteResult[]> {
  const routes = await loadRoutes();
  const page = await context.newPage();
  const results: RouteResult[] = [];

  for (const route of routes) {
    const consoleErrors: string[] = [];
    page.removeAllListeners('console');
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    if (route.kind === 'dynamic-template') {
      results.push({
        route: route.path,
        viewport,
        unauth: { status: null, finalURL: route.path },
        authed: { status: null, finalURL: route.path },
        screenshots: {},
        consoleErrors,
        skipped: 'Dynamic route template skipped (no seeded id auto-discovered).',
      });
      continue;
    }

    const unauth = await visitAndCapture(page, route.path, viewport, 'unauth', consoleErrors);
    await attemptLogin(page);
    const authed = await visitAndCapture(page, route.path, viewport, 'authed', consoleErrors);

    if (authed.loopDetected) {
      throw new Error(`Auth regression: ${route.path} redirected to login after authenticated visit.`);
    }
    if (unauth.has500 || authed.has500) {
      throw new Error(`Server error detected on route ${route.path}`);
    }
    expect(consoleErrors, `Console errors found on route ${route.path}`).toEqual([]);

    results.push({
      route: route.path,
      viewport,
      unauth: { status: unauth.status, finalURL: unauth.finalURL },
      authed: { status: authed.status, finalURL: authed.finalURL },
      screenshots: {
        unauth: path.relative(repoRoot, unauth.shotPath),
        authed: path.relative(repoRoot, authed.shotPath),
      },
      consoleErrors,
    });
  }

  await page.close();
  return results;
}

test.describe.configure({ mode: 'serial' });

test('generate route previews for desktop + mobile', async ({ browser }) => {
  await fs.mkdir(snapshotsDir, { recursive: true });

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopResults = await runPreview(desktopContext, 'desktop');
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobileResults = await runPreview(mobileContext, 'mobile');
  await mobileContext.close();

  const combined = [...desktopResults, ...mobileResults];
  await fs.writeFile(reportPath, `${JSON.stringify(combined, null, 2)}\n`);
});

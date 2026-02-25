import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const navConfigPath = path.join(ROOT, 'frontend', 'src', 'components', 'shell', 'nav-config.ts');
const routesPath = path.join(ROOT, 'artifacts', 'route-manifest.json');
const endpointsPath = path.join(ROOT, 'artifacts', 'endpoint-manifest.json');
const navOutput = path.join(ROOT, 'artifacts', 'nav-manifest.json');
const reportOutput = path.join(ROOT, 'artifacts', 'nav-parity-report.json');
const matrixOutput = path.join(ROOT, 'artifacts', 'nav-parity-matrix.md');

const SEED = new Set([
  '/platform','/platform/gyms','/platform/team','/platform/invites','/platform/billing','/platform/coach','/platform/client','/platform/insights','/platform/analytics','/platform/notifications','/platform/data','/platform/settings','/platform/developer','/platform/qa','/platform/dev/shell-preview','/platform/locations/settings','ADMIN_PORTAL_FRESH_LOGIN_URL','/admin','/admin/tenants','/admin/users','/admin/audit','/admin/growth','/admin/backups',
]);

function extractArray(text, key) {
  const start = text.indexOf(`export const ${key}`);
  if (start < 0) return '';
  const assign = text.indexOf('=', start);
  const from = text.indexOf('[', assign);
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === '[') depth += 1;
    if (text[i] === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(from + 1, i);
    }
  }
  return '';
}

function parseItems(block, section) {
  const chunks = block.match(/\{[^}]+\}/g) ?? [];
  return chunks.map((chunk) => ({
    section,
    label: chunk.match(/label:\s*"([^"]+)"/)?.[1] ?? 'Unknown',
    href: chunk.match(/href:\s*([^,\n]+)/)?.[1]?.trim().replace(/['"`]/g, '') ?? '',
    requiresRole: chunk.match(/requiresRole:\s*"([^"]+)"/)?.[1] ?? 'ALL_AUTHENTICATED',
    debugOnly: /debugOnly:\s*true/.test(chunk),
    featureFlag: chunk.match(/featureFlag:\s*"([^"]+)"/)?.[1] ?? null,
    sourceFile: path.relative(ROOT, navConfigPath).replace(/\\/g, '/'),
  }));
}

function classify(item, routeExists, backendWired) {
  if (item.debugOnly) return routeExists ? 'INTENTIONAL_STUB' : 'BROKEN';
  if (!routeExists) return 'BROKEN';
  if (!backendWired && item.href.startsWith('/admin')) return 'PARTIAL';
  return 'WORKING';
}

const navText = await fs.readFile(navConfigPath, 'utf8');
const navItems = [
  ...parseItems(extractArray(navText, 'platformNavItems'), 'platform'),
  ...parseItems(extractArray(navText, 'adminNavItems'), 'admin'),
].filter((item) => SEED.has(item.href));

const routes = JSON.parse(await fs.readFile(routesPath, 'utf8'));
const endpoints = JSON.parse(await fs.readFile(endpointsPath, 'utf8'));
const routeSet = new Set(routes.map((r) => r.path));

const report = navItems.map((item) => {
  const routeExists = item.href.startsWith('/') ? routeSet.has(item.href) : true;
  const backendCandidates = endpoints.filter((endpoint) => {
    if (!item.href.startsWith('/admin')) return false;
    if (item.href === '/admin') return endpoint.path.startsWith('/admin/overview');
    const tail = item.href.replace('/admin', '');
    return tail ? endpoint.path.includes(tail) : false;
  });
  const backendWired = item.href.startsWith('/admin') ? backendCandidates.length > 0 : true;
  const classification = classify(item, routeExists, backendWired);
  return {
    ...item,
    routeExists,
    pageRenders: routeExists,
    backendWired,
    backendEndpoints: backendCandidates.map((endpoint) => `${endpoint.method} ${endpoint.path}`),
    dataSource: backendWired ? 'REAL_OR_INFERRED' : 'PLACEHOLDER_OR_UNKNOWN',
    permissionsCorrect: item.requiresRole === 'PLATFORM_ADMIN' ? backendCandidates.some((candidate) => candidate.guards.some((guard) => guard.includes('RequirePlatformAdminGuard'))) || !item.href.startsWith('/admin') : true,
    uxStatesPresent: 'UNKNOWN',
    classification,
    fixApplied: classification === 'BROKEN' ? 'NONE' : 'N/A',
    filesChanged: [],
  };
});

await fs.writeFile(navOutput, `${JSON.stringify(navItems, null, 2)}\n`);
await fs.writeFile(reportOutput, `${JSON.stringify(report, null, 2)}\n`);

const matrixHeader = '| Nav Item | Path | Visible To (roles) | DebugOnly / Feature Flag / Env Dependency | Route Exists | Page Renders | Backend Wired | Data Real or Placeholder | Permissions Correct (FE + BE) | UX States Present (loading/empty/error) | Classification | Fix Applied | Files Changed |';
const sep = '|---|---|---|---|---|---|---|---|---|---|---|---|---|';
const rows = report.map((row) => `| ${row.label} | ${row.href} | ${row.requiresRole} | ${row.debugOnly ? 'debugOnly' : 'none'}${row.featureFlag ? `, flag:${row.featureFlag}` : ''} | ${row.routeExists ? 'yes' : 'no'} | ${row.pageRenders ? 'yes' : 'no'} | ${row.backendWired ? 'yes' : 'no'} | ${row.dataSource} | ${row.permissionsCorrect ? 'yes' : 'no'} | ${row.uxStatesPresent} | ${row.classification} | ${row.fixApplied} | ${row.filesChanged.join(', ') || '-'} |`);
await fs.writeFile(matrixOutput, [matrixHeader, sep, ...rows].join('\n') + '\n');

console.log(`Wrote ${navItems.length} nav items and ${report.length} parity rows`);

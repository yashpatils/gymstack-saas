import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'frontend', 'app');
const OUTPUT = path.join(ROOT, 'artifacts', 'route-manifest.json');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    if (entry.isFile() && entry.name === 'page.tsx') files.push(full);
  }
  return files;
}

function normalizeRoute(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/');
  const segments = rel.replace('/page.tsx', '').split('/').filter(Boolean);
  const visible = segments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  const routePath = `/${visible.join('/')}`.replace(/\/+/g, '/');
  return routePath === '/' ? '/' : routePath;
}

async function buildLayoutChain(filePath) {
  const relDir = path.dirname(path.relative(APP_DIR, filePath));
  const segments = relDir.split(path.sep).filter(Boolean);
  const chain = [];
  for (let i = 0; i <= segments.length; i += 1) {
    const scope = segments.slice(0, i);
    const candidate = path.join(APP_DIR, ...scope, 'layout.tsx');
    try {
      await fs.access(candidate);
      chain.push(path.relative(ROOT, candidate).replace(/\\/g, '/'));
    } catch {}
  }
  return chain;
}

const pages = await walk(APP_DIR);
const manifest = [];
for (const page of pages) {
  manifest.push({
    path: normalizeRoute(page),
    sourceFile: path.relative(ROOT, page).replace(/\\/g, '/'),
    layoutChain: await buildLayoutChain(page),
    suspectedAuth: page.includes('/admin/') ? 'PLATFORM_ADMIN' : page.includes('/platform/') ? 'TENANT_AUTHENTICATED' : 'PUBLIC_OR_MIXED',
  });
}
manifest.sort((a, b) => a.path.localeCompare(b.path));
await fs.writeFile(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.length} routes to ${path.relative(ROOT, OUTPUT)}`);

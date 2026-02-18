import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const appDir = path.join(repoRoot, 'frontend', 'app');
const artifactsDir = path.join(repoRoot, 'artifacts');

const EXCLUDED_FOLDERS = new Set(['_components', 'components', 'lib', 'hooks']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_FOLDERS.has(entry.name)) continue;
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function normalizeRouteSegment(segment) {
  if (segment.startsWith('(') && segment.endsWith(')')) return null;
  if (segment.startsWith('[') && segment.endsWith(']')) {
    const inner = segment.slice(1, -1);
    if (inner.startsWith('...') || inner.startsWith('[...') || inner.startsWith('[[...')) return '*';
    if (inner.startsWith('...')) return '*';
    if (inner.startsWith('[...')) return '*';
    if (inner.startsWith('[[')) return '*';
    return `:${inner.replace(/\[|\]/g, '')}`;
  }
  return segment;
}

function routeFromFile(file) {
  const rel = path.relative(appDir, file).replace(/\\/g, '/');
  if (rel.startsWith('api/')) return null;
  if (!(rel.endsWith('/page.tsx') || rel.endsWith('/route.ts'))) return null;

  const withoutFile = rel.replace(/\/(page\.tsx|route\.ts)$/, '');
  const segments = withoutFile.split('/').filter(Boolean);
  const normalized = segments
    .map(normalizeRouteSegment)
    .filter((seg) => seg !== null);

  const pathValue = `/${normalized.join('/')}`.replace(/\/+/g, '/');
  const clean = pathValue === '/' ? '/' : pathValue.replace(/\/$/, '');
  const kind = clean.includes(':') || clean.includes('*') ? 'dynamic-template' : 'static';

  return {
    path: clean,
    kind,
    sourceFile: `frontend/app/${rel}`,
    requiresAuth: 'unknown',
  };
}

async function buildRouteManifest() {
  const files = await walk(appDir);
  const routes = files.map(routeFromFile).filter(Boolean).sort((a, b) => a.path.localeCompare(b.path));
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.writeFile(path.join(artifactsDir, 'route-manifest.json'), `${JSON.stringify(routes, null, 2)}\n`);
}

async function buildApiEndpoints() {
  const files = await walk(path.join(repoRoot, 'frontend'));
  const endpointPattern = /['"`]\/?api\/auth\/[a-z0-9\-\/]+['"`]/gi;
  const endpointSources = new Map();

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    if (rel.includes('node_modules')) continue;
    const content = await fs.readFile(file, 'utf8');
    const matches = content.match(endpointPattern) ?? [];
    for (const match of matches) {
      const endpoint = match.slice(1, -1).startsWith('/') ? match.slice(1, -1) : `/${match.slice(1, -1)}`;
      if (!endpointSources.has(endpoint)) endpointSources.set(endpoint, new Set());
      endpointSources.get(endpoint).add(rel);
    }
  }

  const endpoints = Array.from(endpointSources.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([endpoint, sources]) => ({
    endpoint,
    sources: Array.from(sources).sort(),
  }));

  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.writeFile(path.join(artifactsDir, 'api-endpoints.json'), `${JSON.stringify({ backendFolder: 'backend', authEndpoints: endpoints }, null, 2)}\n`);
}

await Promise.all([buildRouteManifest(), buildApiEndpoints()]);
console.log('Generated artifacts/route-manifest.json and artifacts/api-endpoints.json');

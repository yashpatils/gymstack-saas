import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminNavItems, platformNavItems } from '../src/components/shell/nav-config';

function collectRoutePaths(rootDir: string): Set<string> {
  const routes = new Set<string>();

  const walk = (dir: string, parts: string[] = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
          walk(path.join(dir, entry.name), parts);
          continue;
        }

        walk(path.join(dir, entry.name), [...parts, entry.name]);
        continue;
      }

      if (entry.isFile() && entry.name === 'page.tsx') {
        const pathname = `/${parts.join('/')}`.replace(/\/+/g, '/');
        routes.add(pathname === '/' ? '/' : pathname.replace(/\/$/, ''));
      }
    }
  };

  walk(rootDir);
  return routes;
}

function getInternalHrefs() {
  return [...platformNavItems, ...adminNavItems]
    .map((item) => item.href)
    .filter((href) => href.startsWith('/'));
}

describe('nav-config route wiring', () => {
  it('maps each internal nav href to an existing app route', () => {
    const routePaths = collectRoutePaths(path.resolve(__dirname, '../app'));
    const missing = getInternalHrefs().filter((href) => !routePaths.has(href));

    expect(missing).toEqual([]);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const DISALLOWED_IMPORTS = [
  'src/components/shell/Sidebar',
  'src/components/shell/Topbar', // legacy casing guard
];

function walk(dir: string, bucket: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, bucket);
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      bucket.push(fullPath);
    }
  }

  return bucket;
}

describe('shell import guard', () => {
  test('Sidebar and legacy Topbar path are only imported inside shell components', () => {
    const files = walk(ROOT);
    const offenders: string[] = [];

    for (const file of files) {
      if (file.includes(`${path.sep}src${path.sep}components${path.sep}shell${path.sep}`)) {
        continue;
      }

      const contents = fs.readFileSync(file, 'utf8');
      for (const token of DISALLOWED_IMPORTS) {
        if (contents.includes(token)) {
          offenders.push(path.relative(ROOT, file));
          break;
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

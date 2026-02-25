import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'backend', 'src');
const OUTPUT = path.join(ROOT, 'artifacts', 'endpoint-manifest.json');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    if (entry.isFile() && entry.name.endsWith('.controller.ts')) files.push(full);
  }
  return files;
}

function combinePaths(controllerPath, methodPath) {
  const left = controllerPath ? `/${controllerPath}` : '';
  const right = methodPath ? `/${methodPath}` : '';
  return `${left}${right}`.replace(/\/+/g, '/');
}

const HTTP = ['Get', 'Post', 'Patch', 'Put', 'Delete'];
const controllers = await walk(SRC_DIR);
const manifest = [];

for (const file of controllers) {
  const text = await fs.readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const classMatch = text.match(/@Controller\(([^)]*)\)[\s\S]*?export class\s+(\w+)/m);
  const controllerPathRaw = classMatch?.[1]?.replace(/['"`]/g, '').trim() ?? '';
  const controllerPath = controllerPathRaw === '' ? '' : controllerPathRaw;
  const controllerName = classMatch?.[2] ?? path.basename(file, '.ts');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const hit = HTTP.map((verb) => ({ verb, regex: new RegExp(`^@${verb}\\(([^)]*)\\)`) })).find(({ regex }) => regex.test(line));
    if (!hit) continue;

    const methodPathRaw = line.match(hit.regex)?.[1]?.replace(/['"`]/g, '').trim();
    const methodPath = methodPathRaw && methodPathRaw !== '' ? methodPathRaw : '';

    const decoratorWindow = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
    const guards = [...decoratorWindow.matchAll(/UseGuards\(([^)]*)\)/g)]
      .flatMap((match) => match[1].split(',').map((token) => token.trim()).filter(Boolean));

    let methodName = 'unknown';
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j += 1) {
      const methodMatch = lines[j].match(/^\s*(\w+)\s*\(/);
      if (methodMatch) {
        methodName = methodMatch[1];
        break;
      }
    }

    manifest.push({
      method: hit.verb.toUpperCase(),
      path: combinePaths(controllerPath, methodPath),
      controller: controllerName,
      handler: methodName,
      sourceFile: path.relative(ROOT, file).replace(/\\/g, '/'),
      guards,
      dtos: [],
    });
  }
}

manifest.sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));
await fs.writeFile(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.length} endpoints to ${path.relative(ROOT, OUTPUT)}`);

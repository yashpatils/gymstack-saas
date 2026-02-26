/** @type {import('next').NextConfig} */
const fs = require('fs');
const path = require('path');

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isGitHubPagesExport = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "gh-pages";
const hasMiddleware = fs.existsSync(path.join(__dirname, 'middleware.ts'));

if (isGitHubPagesExport && hasMiddleware) {
  throw new Error('NEXT_PUBLIC_DEPLOY_TARGET=gh-pages is incompatible with middleware.ts. Disable export mode or remove middleware usage.');
}

if (basePath && hasMiddleware) {
  throw new Error('NEXT_PUBLIC_BASE_PATH is currently unsupported with middleware.ts in this project. Use root path deployment or disable middleware.');
}

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  ...(isGitHubPagesExport ? { output: "export" } : {}),
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isGitHubPagesExport = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "gh-pages";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  ...(isGitHubPagesExport ? { output: "export" } : {}),
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isGitHubPagesExport = process.env.NEXT_DEPLOY_TARGET === "github-pages";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  ...(isGitHubPagesExport ? { output: "export" } : {}),
};

module.exports = nextConfig;

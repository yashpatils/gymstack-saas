/** @type {import('next').NextConfig} */
<<<<<<< codex/complete-project-ui-and-landing-page-upmnu9
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
=======
const nextConfig = {
  reactStrictMode: true,
>>>>>>> main
};

module.exports = nextConfig;

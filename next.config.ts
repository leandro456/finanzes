import type { NextConfig } from "next";

const repo = 'finanzes'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  images: { unoptimized: true },
  distDir: "out",
};

export default nextConfig;

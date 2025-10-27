import type { NextConfig } from "next";

const repo = 'finanzes'

const nextConfig: NextConfig = {
  trailingSlash: true,
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  images: { unoptimized: true },
};

export default nextConfig;

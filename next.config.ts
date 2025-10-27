import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // ESTO ES CRÍTICO
  trailingSlash: true,
  basePath: '/mi-landing',
  images: { unoptimized: true },
};

export default nextConfig;

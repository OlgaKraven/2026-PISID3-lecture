import type { NextConfig } from 'next';

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: process.env.GITHUB_PAGES === 'true' ? 'export' : undefined,
  assetPrefix,
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;

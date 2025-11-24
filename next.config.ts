import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Exclude scripts directory from being watched
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/scripts/**', '**/.git'],
    };
    return config;
  },
};

export default nextConfig;

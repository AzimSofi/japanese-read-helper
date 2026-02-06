import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',

  webpack: (config, { isServer }) => {
    // Exclude scripts directory from being watched
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/scripts/**', '**/.git'],
    };
    return config;
  },

  // Optimize serverless function size by excluding unnecessary files
  outputFileTracingExcludes: {
    '*': [
      '.next/cache/**/*',
      'node_modules/@swc/core/**/*',
      'node_modules/esbuild/**/*',
      'node_modules/webpack/**/*',
      'node_modules/terser/**/*',
      'scripts/**/*',
    ],
  },

  // Prevent Prisma from being bundled multiple times in serverless functions
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
  env: {
    // Custom environment variables
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    API_VERSION: process.env.NEXT_PUBLIC_API_VERSION,
  },
  serverExternalPackages: ['@tanstack/react-query'],
  
  // Fix Turbopack workspace root issue (updated syntax)
  turbopack: {
    root: process.cwd(),
  },
  
  // Optimize for better testing compatibility
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce file system race conditions during development
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
};

export default nextConfig;

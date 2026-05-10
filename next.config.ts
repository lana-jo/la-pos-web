import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Add the new IP to the list (kept the old one just in case you switch back!)
  allowedDevOrigins: [
    '192.168.1.67', 
    '10.91.81.117'
  ],

  // 2. Add the new IP here as well to prevent Server Action CSRF errors
  experimental: {
    serverActions: {
      allowedOrigins: [
        '192.168.1.67:3000',
        '10.91.81.117:3000', 
      ],
    },
  },

  // Webpack path aliases for fallback
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './',
    };
    return config;
  },

  // Turbopack path aliases
  turbopack: {
    resolveAlias: {
       '@': './',
    },
  },
};

export default nextConfig;
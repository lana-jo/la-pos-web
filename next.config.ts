import type { NextConfig } from "next";
// import path from "path"; // Note: You can remove this if you aren't actively using `path` in this file

const nextConfig: NextConfig = {
  // 1. Allows requests from this specific IP to access the dev server
  allowedDevOrigins: ['192.168.1.67'],

  // 2. Explicitly allow Server Actions from your local network IP
  experimental: {
    serverActions: {
      allowedOrigins: [
        '192.168.1.67:3000', // Include the port you are running the dev server on
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
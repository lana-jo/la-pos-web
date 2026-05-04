import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.67'],
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

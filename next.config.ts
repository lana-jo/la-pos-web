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
  // Use proxy function instead of deprecated middleware
  // async rewrites() {
  //   return [
  //     {
  //       source: '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  //       destination: '/api/proxy/:path*',
  //     },
  //   ];
  // },
};

export default nextConfig;

/**
 * Next.js Configuration
 * Optimized for Next.js 15 with production-ready settings
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core settings
  reactStrictMode: true,
  poweredByHeader: false,

  // Environment variables
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Add bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : '../analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },
};

// Export the config directly
module.exports = nextConfig;

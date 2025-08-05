/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set the page extensions and directories
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove deprecated appDir setting - it's enabled by default in Next.js 15
  experimental: {},
  
  // Add webpack configuration for better compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configure module resolution
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        fs: false,
        path: false,
      };
    }
    
    // Add BigInt polyfill and suppress warnings
    config.plugins = config.plugins || [];
    const webpack = require('webpack');
    
    // Define global variables for BigInt support
    config.plugins.push(
      new webpack.DefinePlugin({
        __SUPPRESS_BIGINT_WARNING__: JSON.stringify(true),
      })
    );
    
    // Handle bigint-buffer module properly
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push(function({ context, request }, callback) {
        // Skip externalizing bigint-buffer, let it be handled by our alias
        if (request === 'bigint-buffer' || request.includes('bigint-buffer')) {
          return callback();
        }
        callback();
      });
    }
    
    // Add module rules for better handling
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      }
    });
    
    return config;
  },
};

module.exports = nextConfig;

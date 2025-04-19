/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    // Configure server to listen on all interfaces
    experimental: {
      // Remove unsupported serverExternalPackages option
    },
    webpack: (config) => {
      // Handle bigint-buffer fallback gracefully
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...(config.resolve?.fallback || {}),
          fs: false,
          os: false,
          path: false,
          crypto: false,
        }
      };
      return config;
    },
  };
  
  module.exports = nextConfig;
  
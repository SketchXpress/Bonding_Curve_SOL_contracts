import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configure server to listen on all interfaces
  experimental: {
    // Remove unsupported serverExternalPackages option
  },
  webpack: (config: WebpackConfig) => {
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

export default nextConfig;

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
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Force new chunk IDs to bust CDN cache
      config.optimization.moduleIds = 'named'
    }
    return config
  }
};
export default nextConfig;

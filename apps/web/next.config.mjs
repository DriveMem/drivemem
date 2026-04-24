/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.moduleIds = 'named'
    }
    return config
  },
  async redirects() {
    return [
      {
        source: '/lander',
        destination: '/',
        permanent: true,
      },
      {
        source: '/connect',
        destination: '/developers',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.drivemem.cloud https://*.drivemem.cloud https://api.github.com https://cloudflareinsights.com https://plausible.io; font-src 'self' data:; frame-src 'self'",
          },
        ],
      },
    ]
  },
};
export default nextConfig;

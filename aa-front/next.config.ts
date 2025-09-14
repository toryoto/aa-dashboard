import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://backend:4000/api/:path*',
        },
      ]
    }
    return []
  },
}

export default nextConfig

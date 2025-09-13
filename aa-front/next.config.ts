import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development' 
            ? 'http://backend:4000/api/:path*' 
            : 'https://backend-api-429781279541.asia-northeast1.run.app/api/:path*',
      },
    ]
  },
}

export default nextConfig
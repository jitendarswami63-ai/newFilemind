import type { NextConfig } from 'next'
import path from 'path'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com;
  style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com;
  style-src-elem 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://www.gstatic.com https://translate.google.com;
  media-src 'self' blob: data:;
  frame-src 'self' blob: data: https://*.supabase.co https://*.supabase.in;
  frame-ancestors 'self';
  connect-src 'self' https://*.supabase.co https://*.supabase.in https://translate.googleapis.com;
`.replace(/\s{2,}/g, ' ').trim()

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig

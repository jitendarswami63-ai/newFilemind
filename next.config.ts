import type { NextConfig } from 'next'
import path from 'path'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://*.googletagmanager.com https://*.google-analytics.com;
  style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com;
  style-src-elem 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://www.gstatic.com https://translate.google.com https://*.razorpay.com https://*.google-analytics.com https://*.googletagmanager.com;
  media-src 'self' blob: data:;
  frame-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://api.razorpay.com https://*.razorpay.com;
  frame-ancestors 'self';
  connect-src 'self' https://*.supabase.co https://*.supabase.in https://translate.googleapis.com https://api.razorpay.com https://*.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
`.replace(/\s{2,}/g, ' ').trim()

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=(), browsing-topics=()',
          },
        ],
      },
      {
        source: '/(.*).(png|jpg|jpeg|gif|webp|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig

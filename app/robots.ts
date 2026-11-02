import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://www.filemindhub.xyz'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/documents',
          '/documents/',
          '/search',
          '/search/',
          '/ask',
          '/ask/',
          '/settings',
          '/settings/',
          '/share',
          '/share/',
          '/api/',
          '/auth/',
          '/login',
          '/signup',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}

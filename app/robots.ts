import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://www.filemindhub.xyz'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup'],
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
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}

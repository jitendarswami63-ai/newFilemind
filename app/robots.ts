import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://www.filemindhub.xyz'

  const disallowedPrivateRoutes = [
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
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/about', '/contact', '/privacy', '/terms', '/llms.txt'],
        disallow: disallowedPrivateRoutes,
      },
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended'],
        allow: ['/', '/about', '/contact', '/privacy', '/terms', '/llms.txt'],
        disallow: disallowedPrivateRoutes,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}

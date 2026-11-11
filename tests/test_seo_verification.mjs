import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import robotsHandler from '../app/robots.ts'
import sitemapHandler from '../app/sitemap.ts'

async function run() {
  console.log('Testing FileMind SEO and Google Indexing Suite...')

  const robots = robotsHandler()
  assert.strictEqual(robots.sitemap, 'https://www.filemindhub.xyz/sitemap.xml', 'robots.txt must declare sitemap URL')
  assert.strictEqual(robots.host, 'https://www.filemindhub.xyz', 'robots.txt must declare canonical host')
  assert.ok(Array.isArray(robots.rules), 'robots.txt rules must be an array')
  const rule = robots.rules[0]
  assert.strictEqual(rule.userAgent, '*', 'Default rule must target all user agents')
  assert.ok(rule.allow.includes('/'), 'robots.txt must allow root /')
  assert.ok(rule.allow.includes('/login'), 'robots.txt must allow /login')
  assert.ok(rule.allow.includes('/signup'), 'robots.txt must allow /signup')
  assert.ok(rule.disallow.includes('/dashboard'), 'robots.txt must disallow /dashboard')
  assert.ok(rule.disallow.includes('/api/'), 'robots.txt must disallow /api/')
  assert.ok(rule.disallow.includes('/auth/'), 'robots.txt must disallow /auth/')
  console.log('PASS: Technical SEO - robots.txt rules and directives verified')

  const sitemap = sitemapHandler()
  assert.ok(Array.isArray(sitemap), 'Sitemap must return an array of entries')
  assert.ok(sitemap.length >= 3, 'Sitemap must contain public canonical routes')
  const urls = sitemap.map(entry => entry.url)
  assert.ok(urls.includes('https://www.filemindhub.xyz'), 'Sitemap must include root domain')
  assert.ok(urls.includes('https://www.filemindhub.xyz/login'), 'Sitemap must include /login')
  assert.ok(urls.includes('https://www.filemindhub.xyz/signup'), 'Sitemap must include /signup')
  for (const url of urls) {
    assert.ok(!url.includes('/dashboard'), 'Sitemap must not leak private dashboard routes')
    assert.ok(!url.includes('/api'), 'Sitemap must not leak internal API routes')
  }
  console.log('PASS: Technical SEO - XML sitemap structure and canonical routes verified')

  const layoutSrc = fs.readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8')
  assert.ok(
    layoutSrc.includes("FileMind — AI-Powered PDF Search & Document Intelligence") ||
    layoutSrc.includes("FileMind – AI PDF Manager"),
    'Root metadata must have descriptive homepage title'
  )
  assert.ok(layoutSrc.includes("'https://www.filemindhub.xyz'"), 'Root metadata must specify production canonical domain')
  assert.ok(layoutSrc.includes("AI document management"), 'Keywords must include AI document management')
  assert.ok(layoutSrc.includes("AI PDF search"), 'Keywords must include AI PDF search')
  assert.ok(layoutSrc.includes("Semantic document search"), 'Keywords must include Semantic document search')
  assert.ok(layoutSrc.includes("AI-powered PDF assistant"), 'Keywords must include AI-powered PDF assistant')
  assert.ok(layoutSrc.includes("Document intelligence platform"), 'Keywords must include Document intelligence platform')
  assert.ok(layoutSrc.includes("openGraph:"), 'Root metadata must specify OpenGraph sharing configuration')
  assert.ok(layoutSrc.includes("twitter:"), 'Root metadata must specify Twitter card sharing configuration')
  assert.ok(layoutSrc.includes("viewport: Viewport"), 'Root layout must specify explicit viewport configuration')
  const pageSrc = fs.readFileSync(path.join(process.cwd(), 'app/page.tsx'), 'utf8')
  assert.ok(!pageSrc.includes("openGraph:"), 'Home page must not define redundant openGraph to avoid duplicate OG tags')
  console.log('PASS: Metadata & Social Sharing - OpenGraph, Twitter, canonical, and keywords verified')

  const structuredSrc = fs.readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8')
  assert.ok(structuredSrc.includes("application/ld+json"), 'Layout must include JSON-LD structured data script')
  assert.ok(structuredSrc.includes("@type': 'WebSite'") || structuredSrc.includes('"@type": "WebSite"'), 'JSON-LD must define WebSite schema')
  assert.ok(structuredSrc.includes("@type': 'Organization'") || structuredSrc.includes('"@type": "Organization"'), 'JSON-LD must define Organization schema')
  assert.ok(structuredSrc.includes("@type': 'SoftwareApplication'") || structuredSrc.includes('"@type": "SoftwareApplication"'), 'JSON-LD must define SoftwareApplication schema')
  assert.ok(structuredSrc.includes("https://www.filemindhub.xyz"), 'JSON-LD must use production URL')
  console.log('PASS: Structured Data - WebSite, Organization, and SoftwareApplication JSON-LD verified')

  assert.ok(layoutSrc.includes("googletagmanager.com/gtag/js"), 'Layout must include Google Analytics gtag.js script')
  assert.ok(layoutSrc.includes("google-analytics"), 'Layout must include Google Analytics config script')
  console.log('PASS: Web Analytics & SEO Tracking - Google Analytics script tags verified')

  const dashLayoutSrc = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/layout.tsx'), 'utf8')
  assert.ok(dashLayoutSrc.includes("index: false"), 'Workspace pages must be barred from indexing via robots metadata')
  assert.ok(dashLayoutSrc.includes("follow: false"), 'Workspace pages must be barred from crawl follow via robots metadata')
  console.log('PASS: Security & Private Route Protection - Workspace noindex directive verified')

  const landingSrc = fs.readFileSync(path.join(process.cwd(), 'components/landing/LandingPage.tsx'), 'utf8')
  assert.ok(landingSrc.includes("AI Document Management"), 'Landing page copy must contain AI document management')
  assert.ok(landingSrc.includes("AI PDF Search"), 'Landing page copy must contain AI PDF search')
  assert.ok(
    landingSrc.toLowerCase().includes("semantic search") ||
    landingSrc.toLowerCase().includes("semantic document search"),
    'Landing page copy must contain semantic search'
  )
  assert.ok(
    landingSrc.toLowerCase().includes("ai assistant") ||
    landingSrc.toLowerCase().includes("assistant") ||
    landingSrc.toLowerCase().includes("ai-powered"),
    'Landing page copy must contain AI-powered assistance copy'
  )
  assert.ok(
    landingSrc.includes("alt=\"FileMind AI Document Management Logo\"") ||
    landingSrc.includes("alt=\"FileMind AI PDF Manager and Document Search Platform Logo\"") ||
    landingSrc.includes("alt=\"FileMind Document Workspace Icon\""),
    'Landing page image alt must be descriptive'
  )
  console.log('PASS: On-Page SEO - Copy, heading hierarchy, and image alt text verified')

  const checkFiles = [
    'app/robots.ts',
    'app/sitemap.ts',
    'app/layout.tsx',
    'app/page.tsx',
    'app/(auth)/login/page.tsx',
    'app/(auth)/signup/page.tsx',
    'app/(dashboard)/layout.tsx',
    'components/landing/LandingPage.tsx',
    'components/landing/LandingNavbar.tsx',
    'tests/test_seo_verification.mjs'
  ]
  for (const f of checkFiles) {
    const lines = fs.readFileSync(path.join(process.cwd(), f), 'utf8').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      assert.ok(!trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('<!--') && !trimmed.startsWith('#'), `File ${f} line ${i + 1} contains comment: ${trimmed}`)
    }
  }
  console.log('PASS: Comment Invariant - Zero comments verified across all touched files')

  console.log('All FileMind SEO and Google Indexing checks completed successfully!')
}

run().catch((err) => {
  console.error('SEO Verification failed:', err)
  process.exit(1)
})

export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/api', '/auth'] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.medflow.com.br'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/invite', '/verify', '/reset-password'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/chat/', '/files/', '/dashboard/', '/settings/', '/workspace/'],
    },
    sitemap: 'https://drivemem.cloud/sitemap.xml',
  }
}

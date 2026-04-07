import { MetadataRoute } from 'next';
import { siteConfig } from '../config/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/support'],
      disallow: [
        '/dashboard/',
        '/trades/',
        '/analytics/',
        '/admin/',
        '/login/',
        '/register/',
        '/forgot-password/',
        '/reset-password/',
        '/verify-otp/',
        '/upload/',
        '/upload-trade/',
        '/profile/',
        '/setups/',
        '/weekly-reports/',
        '/checklist/',
        '/add-trade/',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

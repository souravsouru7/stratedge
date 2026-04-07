import { MetadataRoute } from 'next';
import { siteConfig } from '../config/seo';

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/support',
    // Add additional public routes later (e.g. '/features/ocr', '/blog')
  ].map((route) => ({
    url: `${siteConfig.url}${route}`,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return [...routes];
}

import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { generateSiteConfig } from '../../../lib/seo/config';
import { getDynamicRoutes } from '../../../lib/seo/sitemap';

// Cache configuration
const CACHE_CONTROL =
  process.env.NODE_ENV === 'production'
    ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' // 5min browser, 1h CDN, 24h stale
    : 'no-cache, no-store, must-revalidate'; // No caching in development

export async function GET() {
  try {
    const { siteConfig } = await generateSiteConfig();
    const dynamicRoutes = await getDynamicRoutes();

    // Create a sitemap stream
    const stream = new SitemapStream({ hostname: siteConfig.url });

    // Generate the XML
    const sitemap = await streamToPromise(Readable.from(dynamicRoutes).pipe(stream)).then((data) =>
      data.toString()
    );

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

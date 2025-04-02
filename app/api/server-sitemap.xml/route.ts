import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { generateSiteConfig } from '../../../lib/seo/config';

// Get dynamic routes that change frequently and need server-side generation
async function getDynamicSitemapEntries() {
  // This function would typically fetch data from a database
  // or API to generate dynamic routes

  // Example structure - replace with actual data fetching logic
  return [
    {
      url: '/repositories/ethereum',
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    },
    {
      url: '/repositories/bitcoin',
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    },
    {
      url: '/repositories/solana',
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    },
    // In production, you would fetch all your dynamic routes
    // For example:
    // const repos = await prisma.repository.findMany({
    //   select: { name: true, updatedAt: true },
    //   where: { visibility: 'public' },
    //   orderBy: { stars: 'desc' },
    //   take: 1000,
    // });
    //
    // return repos.map(repo => ({
    //   url: `/repositories/${repo.name}`,
    //   changefreq: 'daily',
    //   priority: 0.8,
    //   lastmod: repo.updatedAt.toISOString(),
    // }));
  ];
}

export async function GET() {
  try {
    const { siteConfig } = await generateSiteConfig();
    const sitemapEntries = await getDynamicSitemapEntries();

    // Create a sitemap stream
    const stream = new SitemapStream({ hostname: siteConfig.url });

    // Generate the XML
    const sitemap = await streamToPromise(Readable.from(sitemapEntries).pipe(stream)).then((data) =>
      data.toString()
    );

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800, s-maxage=3600', // Cache for 30 min on edge, 1 hour on CDN
      },
    });
  } catch (error) {
    console.error('Error generating server sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}

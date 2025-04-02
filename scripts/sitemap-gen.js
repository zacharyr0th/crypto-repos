const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crypto-repos.com';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function generateSitemap() {
  try {
    // Get all page routes
    const pages = glob.sync('app/**/page.tsx', {
      ignore: ['app/api/**', 'app/**/components/**', 'app/**/layout.tsx'],
    });

    // Transform file paths to URLs
    const routes = pages
      .map((page) => {
        const route = page.replace('app/', '/').replace('/page.tsx', '').replace('/index', '');
        return route === '' ? '/' : route;
      })
      .filter((route) => !route.includes('[') && !route.includes('api'));

    // Create sitemap stream
    const stream = new SitemapStream({ hostname: SITE_URL });

    // Add routes to sitemap
    const links = routes.map((route) => ({
      url: route,
      changefreq: 'daily',
      priority: route === '/' ? 1.0 : 0.8,
    }));

    // Generate sitemap XML
    const sitemap = await streamToPromise(Readable.from(links).pipe(stream));

    // Write sitemap to public directory
    fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
    console.log('✅ Sitemap generated successfully');
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run directly if called as script
if (require.main === module) {
  generateSitemap();
}

// Export for use as module
module.exports = { generateSitemap };

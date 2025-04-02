// Export specific functions instead of everything
export {
  generateSiteConfig,
  getStructuredDataScript,
  generateMetadata,
  generateManifestContent,
  generateSitemapConfig,
} from './config';

export {
  generateSitemap,
  writeSitemap,
  getStaticRoutes,
  getDynamicRoutes,
  type SitemapEntry,
} from './sitemap';

// Main SEO object
export const SEO = {
  // Config methods
  generateSiteConfig: async () => {
    const { generateSiteConfig } = await import('./config');
    return generateSiteConfig();
  },
  generateMetadata: async (params: { params: any; searchParams?: any }) => {
    const { generateMetadata } = await import('./config');
    return generateMetadata(params);
  },
  generateManifestContent: async () => {
    const { generateManifestContent } = await import('./config');
    return generateManifestContent();
  },
  generateSitemapConfig: async () => {
    const { generateSitemapConfig } = await import('./config');
    return generateSitemapConfig();
  },
  getStructuredDataScript: (structuredData: any) => {
    const { getStructuredDataScript } = require('./config');
    return getStructuredDataScript(structuredData);
  },

  // Sitemap methods
  generateSitemap: async () => {
    const { generateSitemap } = await import('./sitemap');
    return generateSitemap();
  },
  writeSitemap: async () => {
    const { writeSitemap } = await import('./sitemap');
    return writeSitemap();
  },
  getStaticRoutes: async (excludePaths?: string[]) => {
    const { getStaticRoutes } = await import('./sitemap');
    return getStaticRoutes(excludePaths);
  },
  getDynamicRoutes: async () => {
    const { getDynamicRoutes } = await import('./sitemap');
    return getDynamicRoutes();
  },
};

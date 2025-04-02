import fs from 'fs';
import path from 'path';
import { generateSiteConfig } from './config';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { glob } from 'glob';
import { sql } from '@vercel/postgres';

// Types for sitemap entries
export type SitemapEntry = {
  url: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  lastmod?: string | Date;
  img?: Array<{
    url: string;
    caption?: string;
    title?: string;
    geoLocation?: string;
    license?: string;
  }>;
};

// Database types
interface Repository {
  full_name: string;
  updated_at: Date;
  stargazers_count: number;
}

interface EcosystemRow {
  ecosystem: string;
}

interface CategoryRow {
  category: string;
}

interface ContributorRow {
  contributor_login: string;
}

// Cache interface
interface SitemapCache {
  entries: SitemapEntry[];
  timestamp: number;
  lastDbUpdate: Date | null;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let sitemapCache: SitemapCache | null = null;

/**
 * Gets the latest update timestamp from the database
 */
async function getLatestDbUpdate(): Promise<Date | null> {
  try {
    const { rows } = await sql<{ latest_update: Date }>`
      SELECT MAX(updated_at) as latest_update 
      FROM (
        SELECT MAX(updated_at) as updated_at FROM repositories
        UNION ALL
        SELECT MAX(updated_in_db) as updated_at FROM repositories
        UNION ALL
        SELECT MAX(created_in_db) as updated_at FROM repositories
      ) updates
    `;
    return rows[0]?.latest_update || null;
  } catch (error) {
    console.error('Error getting latest DB update:', error);
    return null;
  }
}

/**
 * Checks if the cache is still valid
 */
async function isCacheValid(): Promise<boolean> {
  if (!sitemapCache) return false;

  // Check time-based expiration
  const age = Date.now() - sitemapCache.timestamp;
  if (age >= CACHE_TTL) return false;

  // Check if database has been updated
  const latestUpdate = await getLatestDbUpdate();
  if (!latestUpdate || !sitemapCache.lastDbUpdate) return false;

  return latestUpdate <= sitemapCache.lastDbUpdate;
}

/**
 * Gets static routes from app directory
 * Scan app directory for page.tsx files and extract routes
 */
export async function getStaticRoutes(excludePaths: string[] = []): Promise<SitemapEntry[]> {
  // Find all page.tsx files in the app directory
  const pageFiles = await glob('app/**/page.tsx', { ignore: ['app/**/\\[**\\]/**', 'app/api/**'] });

  // Extract routes from file paths
  const routes = pageFiles.map((file) => {
    // Convert file path to route
    let route = file
      .replace(/^app\//, '/') // Replace leading app/ with /
      .replace(/\/page\.tsx$/, '') // Remove trailing /page.tsx
      .replace(/^\/\((.*)\)\/(.*)/, '/$2'); // Handle route groups like (authenticated)/profile

    // If it's the root page, use /
    if (route === '') {
      route = '/';
    }

    return route;
  });

  // Filter out excluded paths
  const filteredRoutes = routes.filter((route) => !excludePaths.includes(route));

  // Convert routes to sitemap entries
  return filteredRoutes.map((route) => ({
    url: route,
    changefreq: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1.0 : 0.8,
    lastmod: new Date().toISOString(),
  }));
}

/**
 * Gets dynamic routes from specified data sources
 */
export async function getDynamicRoutes(): Promise<SitemapEntry[]> {
  try {
    // Check cache first
    if ((await isCacheValid()) && sitemapCache) {
      console.debug('Using cached sitemap entries');
      return sitemapCache.entries;
    }

    const { siteConfig } = await generateSiteConfig();

    // Fetch popular repositories from the database
    // We'll limit to repositories with significant stars to keep the sitemap focused
    const { rows } = await sql<Repository>`
      SELECT 
        full_name,
        updated_at,
        stargazers_count
      FROM repositories 
      WHERE fork = false 
        AND stargazers_count >= 100
      ORDER BY stargazers_count DESC 
      LIMIT 5000
    `;

    // Map database results to sitemap entries
    const dynamicRoutes: SitemapEntry[] = rows.map((repo) => ({
      url: `/repositories/${repo.full_name}`,
      changefreq: repo.stargazers_count >= 1000 ? 'daily' : 'weekly',
      // Higher priority for more popular repos
      priority: Math.min(0.9, 0.6 + Math.log10(repo.stargazers_count) / 10),
      lastmod: repo.updated_at.toISOString(),
    }));

    // Add ecosystem routes
    const { rows: ecosystems } = await sql<EcosystemRow>`
      SELECT DISTINCT ecosystem 
      FROM repositories 
      WHERE ecosystem IS NOT NULL
    `;

    // Add category routes
    const { rows: categories } = await sql<CategoryRow>`
      SELECT DISTINCT category 
      FROM repositories 
      WHERE category IS NOT NULL
    `;

    // Add ecosystem pages
    ecosystems.forEach(({ ecosystem }) => {
      if (ecosystem) {
        dynamicRoutes.push({
          url: `/ecosystem/${ecosystem.toLowerCase()}`,
          changefreq: 'daily',
          priority: 0.8,
          lastmod: new Date().toISOString(),
        });
      }
    });

    // Add category pages
    categories.forEach(({ category }) => {
      if (category) {
        dynamicRoutes.push({
          url: `/category/${category.toLowerCase()}`,
          changefreq: 'daily',
          priority: 0.8,
          lastmod: new Date().toISOString(),
        });
      }
    });

    // Add contributor routes for top repositories
    const { rows: topContributors } = await sql<ContributorRow>`
      SELECT DISTINCT c.contributor_login
      FROM repository_contributors c
      JOIN repositories r ON c.repository_id = r.id
      WHERE r.stargazers_count >= 1000
      LIMIT 1000
    `;

    // Add contributor pages
    topContributors.forEach(({ contributor_login }) => {
      dynamicRoutes.push({
        url: `/contributors/${contributor_login}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      });
    });

    // Update cache
    sitemapCache = {
      entries: dynamicRoutes,
      timestamp: Date.now(),
      lastDbUpdate: await getLatestDbUpdate(),
    };

    return dynamicRoutes;
  } catch (error) {
    console.error('Error generating dynamic routes:', error);
    // Return empty array on error to ensure sitemap generation doesn't fail completely
    return [];
  }
}

/**
 * Generates a sitemap XML as a string
 */
export async function generateSitemap(): Promise<string> {
  const { siteConfig } = await generateSiteConfig();

  try {
    // Get routes
    const staticRoutes = await getStaticRoutes();
    const dynamicRoutes = await getDynamicRoutes();
    const allRoutes = [...staticRoutes, ...dynamicRoutes];

    // Create a sitemap stream
    const stream = new SitemapStream({ hostname: siteConfig.url });

    // Return sitemap XML as a string
    const sitemap = await streamToPromise(Readable.from(allRoutes).pipe(stream)).then((data) =>
      data.toString()
    );

    return sitemap;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

/**
 * Generates and writes a sitemap.xml file to the public directory
 */
export async function writeSitemap(): Promise<void> {
  try {
    const sitemap = await generateSitemap();
    const publicDir = path.join(process.cwd(), 'public');

    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write sitemap.xml
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log('Sitemap generated successfully');
  } catch (error) {
    console.error('Error writing sitemap:', error);
    throw error;
  }
}

/**
 * API handler for sitemap.xml
 */
export async function GET() {
  try {
    const sitemap = await generateSitemap();

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error serving sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}

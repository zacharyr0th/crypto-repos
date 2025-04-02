// config.ts
import type { Metadata, Viewport } from 'next';
import fs from 'fs';
import path from 'path';

// Environment configuration
const ENV = process.env.NODE_ENV || 'development';
const IS_PROD = ENV === 'production';

// Function to load data from external sources
async function loadExternalData() {
  try {
    // Load manifest data from file
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
    const manifestData = JSON.parse(manifestRaw);

    // You could also fetch data from an API or CMS here
    // const apiData = await fetch('https://your-api.com/config').then(res => res.json());

    return {
      manifestData,
      // apiData
    };
  } catch (error) {
    console.error('Error loading external data:', error);
    // Fallback data
    return {
      manifestData: {
        name: 'Crypto-Repos',
        short_name: 'Crypto-Repos',
        description:
          'Explore and analyze the largest collection of open source blockchain repositories in the world',
        theme_color: '#000000',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
        lang: 'en-US',
        categories: ['technology', 'blockchain'],
      },
    };
  }
}

// Function to generate site configuration
export async function generateSiteConfig() {
  const { manifestData } = await loadExternalData();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://crypto-repos.com';

  const siteConfig = {
    url: siteUrl,
    name: process.env.NEXT_PUBLIC_SITE_NAME || manifestData.name || 'Crypto Repository Explorer',
    description:
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
      "Explore the World's Largest Open-Source Blockchain Repository Database and Developer Network",
    creator: process.env.NEXT_PUBLIC_CREATOR || '@cryptorepos',
    defaultLocale: manifestData.lang || 'en-US',
    themeColor: {
      light: process.env.NEXT_PUBLIC_THEME_LIGHT || 'white',
      dark: process.env.NEXT_PUBLIC_THEME_DARK || manifestData.theme_color || '#000000',
    },
  };

  const viewportConfig: Viewport = {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: siteConfig.themeColor.light },
      { media: '(prefers-color-scheme: dark)', color: siteConfig.themeColor.dark },
    ],
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  // Dynamic keywords generation
  const baseKeywords = [
    'cryptocurrency',
    'blockchain repositories',
    'open source crypto projects',
    'repository analysis',
  ];

  const allKeywords = [
    ...baseKeywords,
    ...(manifestData.categories || []),
    ...(process.env.NEXT_PUBLIC_ADDITIONAL_KEYWORDS?.split(',') || []),
  ];

  const metadataConfig: Metadata = {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    openGraph: {
      type: 'website',
      locale: siteConfig.defaultLocale,
      url: siteConfig.url,
      title: siteConfig.name,
      description: siteConfig.description,
      siteName: siteConfig.name,
      images: [
        {
          url: '/og-image.webp',
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - Analyze Blockchain Projects`,
          type: 'image/webp',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteConfig.name,
      description: siteConfig.description,
      images: [
        {
          url: '/twitter-image.webp',
          width: 1200,
          height: 675,
          alt: 'Explore Blockchain Repositories',
        },
      ],
      creator: siteConfig.creator,
    },
    keywords: allKeywords,
    authors: [{ name: `${siteConfig.name} Team`, url: siteConfig.url }],
    creator: `${siteConfig.name} Team`,
    publisher: siteConfig.name,
    category: 'Technology',
    robots: {
      index: IS_PROD, // Only index in production
      follow: IS_PROD,
      googleBot: {
        index: IS_PROD,
        follow: IS_PROD,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: siteConfig.url,
      languages: {
        'en-US': `${siteConfig.url}/en-US`,
        'es-ES': `${siteConfig.url}/es-ES`,
        'zh-CN': `${siteConfig.url}/zh-CN`,
      },
    },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: manifestData.icons?.[0]?.src || '/icon.svg',
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    applicationName: manifestData.name,
  };

  return {
    siteConfig,
    viewportConfig,
    structuredData,
    metadataConfig,
    manifestData,
  };
}

// Utility function to get structured data
export function getStructuredDataScript(structuredData: any): string {
  return JSON.stringify(structuredData);
}

// Function to generate metadata for specific pages
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { category?: string; id?: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const { metadataConfig, siteConfig } = await generateSiteConfig();

  // Dynamic page title and description based on parameters
  let pageTitle = siteConfig.name;
  let pageDescription = siteConfig.description;

  if (params.category) {
    pageTitle = `Explore ${params.category} Repositories`;
    pageDescription = `Analyze and discover trending ${params.category} blockchain projects and repositories.`;
  } else if (params.id) {
    // You could fetch specific repo data here
    pageTitle = `Repository Details: ${params.id}`;
    pageDescription = `In-depth analysis of the ${params.id} blockchain repository.`;
  } else if (searchParams?.q) {
    const query = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
    pageTitle = `Search Results for "${query}"`;
    pageDescription = `Blockchain repositories matching your search for "${query}".`;
  }

  return {
    ...metadataConfig,
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      ...metadataConfig.openGraph,
      title: pageTitle,
      description: pageDescription,
    },
    twitter: {
      ...metadataConfig.twitter,
      title: pageTitle,
      description: pageDescription,
    },
  };
}

// Function to dynamically generate manifest.webmanifest content
export async function generateManifestContent(): Promise<string> {
  const { manifestData } = await generateSiteConfig();
  return JSON.stringify(manifestData, null, 2);
}

// Function to generate sitemap configuration
export async function generateSitemapConfig() {
  const { siteConfig } = await generateSiteConfig();

  return {
    siteUrl: siteConfig.url,
    sitemapSize: 5000, // Split larger sitemaps into multiple files
    generateRobotsTxt: true,
    exclude: ['/api/*', '/admin/*', '/_*'], // Exclude routes
    robotsTxtOptions: {
      additionalSitemaps: [
        `${siteConfig.url}/sitemap.xml`,
        `${siteConfig.url}/server-sitemap.xml`, // For dynamic routes
      ],
      policies: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/*', '/admin/*', '/private/*'],
        },
      ],
    },
  };
}

// Usage example for API routes
export async function GET() {
  const { manifestData } = await generateSiteConfig();
  return new Response(JSON.stringify(manifestData), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

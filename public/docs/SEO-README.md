# SEO & Sitemap Technical Specification

## Architecture Overview

The SEO implementation uses a streamlined sitemap generation system that runs during build:

### Core Components

1. **Build Script** (`scripts/sitemap-gen.js`)

   - Handles static route discovery
   - Generates production sitemap
   - Integrated with build pipeline via postbuild

2. **Configuration Files**
   - `robots.txt`: Static search engine directives
   - `public/sitemap.xml`: Generated sitemap output

### Robots.txt Configuration

```
User-agent: *
Allow: /
Disallow: /api/*
Disallow: /admin/*
Sitemap: https://crypto-repos.com/sitemap.xml
```

## Implementation Details

### Static Route Generation

- Uses glob pattern matching for page component discovery
- Excludes:
  - Dynamic routes (`[param]`)
  - API routes (`/api/*`)
  - Component directories
  - Layout files
- Generates sitemap entries with:
  - URL: Derived from file path
  - Change frequency: Daily
  - Priority: 1.0 for homepage, 0.8 for other routes

### Build Pipeline Integration

- Runs automatically via `postbuild` script
- Environment-aware URL generation:
  - Uses `NEXT_PUBLIC_SITE_URL` from environment
  - Falls back to 'https://crypto-repos.com'
- Outputs to `public/sitemap.xml`

### Configuration

Environment variables:

- `NEXT_PUBLIC_SITE_URL`: Production URL for sitemap
- `NODE_ENV`: Environment detection

## Technical Implementation

```javascript
// Key configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crypto-repos.com';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Route discovery
glob.sync('app/**/page.tsx', {
  ignore: ['app/api/**', 'app/**/components/**', 'app/**/layout.tsx'],
});

// URL transformation
routes.map((route) => ({
  url: route,
  changefreq: 'daily',
  priority: route === '/' ? 1.0 : 0.8,
}));
```

## System Requirements

- Node.js environment
- File system access during build
- Environment configuration:
  - `.env.production` for deployment
  - `.env.local` for development

## Usage

The sitemap generator runs automatically:

1. During local build: `npm run build`
2. During deployment: Part of deployment pipeline
3. Manual generation: `npm run sitemap`

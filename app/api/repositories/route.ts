import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { Repository } from '@/lib/repository';
import { SearchFilters } from '@/lib/types';
import { ensureTablesExist } from '@/lib/db-utils';
import { sanitizeError } from '@/lib/utils/error';
import { withRateLimit } from '../middleware/rate-limit';
import { withCors } from '../middleware/cors';
import { sanitizeInput, sanitizeNumber, sanitizeSortParams } from '../utils/sanitize';

const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 1000;

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  try {
    await ensureTablesExist();

    const searchParams = request.nextUrl.searchParams;
    const ecosystem = sanitizeInput(searchParams.get('ecosystem') || '');
    const page = sanitizeNumber(searchParams.get('page')) || 1;
    const search = sanitizeInput(searchParams.get('search') || '');
    const perPage = Math.min(
      sanitizeNumber(searchParams.get('per_page')) || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    );

    const { sortBy, sortOrder } = sanitizeSortParams(
      searchParams.get('sortBy'),
      searchParams.get('sortOrder')
    );

    // Parse filters
    const filters: SearchFilters = {
      stars: sanitizeNumber(searchParams.get('stars')),
      language: sanitizeInput(searchParams.get('language') || ''),
      license: sanitizeInput(searchParams.get('license') || ''),
      sortBy: sortBy as SearchFilters['sortBy'],
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const offset = (page - 1) * perPage;

    // Build the query with proper topic handling
    let query = `
      SELECT 
        r.id::text as id,
        r.name,
        r.full_name,
        r.description,
        r.html_url,
        r.homepage,
        r.language,
        r.stargazers_count::integer as stargazers_count,
        r.watchers_count::integer as watchers_count,
        r.forks_count::integer as forks_count,
        r.fork,
        r.owner_html_url,
        r.created_at,
        r.updated_at,
        r.pushed_at,
        r.license_name,
        r.languages_url,
        r.ecosystem,
        r.category,
        r.created_in_db,
        r.updated_in_db,
        ARRAY_AGG(DISTINCT t.topic) FILTER (WHERE t.topic IS NOT NULL) as topics
      FROM repositories r
      LEFT JOIN repository_topics t ON r.id = t.repository_id
    `;
    const params: (string | number)[] = [];

    // Add WHERE clause only if there are conditions
    const conditions: string[] = [];

    // Only filter by ecosystem if a specific one is requested and it's not 'all'
    if (ecosystem && ecosystem !== 'all' && ecosystem !== '') {
      // Check if it's a comma-separated list
      const ecosystems = ecosystem.split(',');

      if (ecosystems.length === 1) {
        // Single ecosystem
        conditions.push('r.ecosystem = $' + (params.length + 1));
        params.push(ecosystem);
      } else {
        // Multiple ecosystems - use IN clause
        const placeholders = ecosystems
          .map((_, index: number) => `$${params.length + 1 + index}`)
          .join(', ');
        conditions.push(`r.ecosystem IN (${placeholders})`);
        ecosystems.forEach((eco: string) => params.push(eco));
      }
    }

    // Text search
    if (search) {
      conditions.push(`(
        r.name ILIKE $${params.length + 1} OR
        r.full_name ILIKE $${params.length + 1} OR
        r.description ILIKE $${params.length + 1} OR
        r.language ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    // Apply filters
    if (filters.stars) {
      conditions.push(`r.stargazers_count >= $${params.length + 1}`);
      params.push(filters.stars);
    }

    if (filters.language) {
      conditions.push(`r.language ILIKE $${params.length + 1}`);
      params.push(filters.language);
    }

    if (filters.license) {
      conditions.push(`r.license_name ILIKE $${params.length + 1}`);
      params.push(filters.license);
    }

    // Add WHERE clause to the main query if needed
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add GROUP BY to the main query
    query += `
      GROUP BY 
        r.id,
        r.name,
        r.full_name,
        r.description,
        r.html_url,
        r.homepage,
        r.language,
        r.stargazers_count,
        r.watchers_count,
        r.forks_count,
        r.fork,
        r.owner_html_url,
        r.created_at,
        r.updated_at,
        r.pushed_at,
        r.license_name,
        r.languages_url,
        r.ecosystem,
        r.category,
        r.created_in_db,
        r.updated_in_db
    `;

    // Add sorting
    const sortColumn =
      filters.sortBy === 'stars'
        ? 'stargazers_count'
        : filters.sortBy === 'forks'
          ? 'forks_count'
          : filters.sortBy === 'updated'
            ? 'updated_at'
            : 'stargazers_count';

    query += `
      ORDER BY ${sortColumn} ${filters.sortOrder}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    // Add the limit and offset params at the end
    params.push(perPage, offset);

    // Build count query correctly with the same structure
    let countQuery = `
      SELECT COUNT(DISTINCT r.id) 
      FROM repositories r
      LEFT JOIN repository_topics t ON r.id = t.repository_id
    `;
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Execute queries using @vercel/postgres
    const [repoResult, countResult] = await Promise.all([
      sql.query(query, params),
      sql.query(countQuery, params.slice(0, -2)), // Remove the limit/offset params for count
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / perPage);

    // Transform the data
    const repositories: Repository[] = repoResult.rows.map((row: any) => ({
      ...row,
      topics: row.topics || [],
      owner: {
        html_url: row.owner_html_url,
        login: row.owner_html_url.split('/').pop() || '',
      },
      license: row.license_name ? { name: row.license_name } : undefined,
    }));

    return NextResponse.json({
      repositories,
      totalPages,
      totalCount,
      page,
      pageSize: perPage,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    const { message, status } = sanitizeError(error, 'Failed to fetch repositories');
    return NextResponse.json({ error: message }, { status });
  }
}

// Apply middleware in order: rate limiting, then CORS
export const GET = withCors(withRateLimit(handler));

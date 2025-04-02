/**
 * Repository search and query operations with full-text search optimization
 */
import { Pool, QueryResult } from 'pg';
import pool from './config';
import { Repository } from '../repository';
import { logger } from '../utils/logger';

interface SearchParams {
  query?: string;
  ecosystem?: string;
  language?: string;
  category?: string;
  topic?: string;
  license?: string;
  stars?: number;
  updatedAfter?: Date;
  includeForks?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'stars' | 'updated' | 'forks' | 'created';
  sortOrder?: 'asc' | 'desc';
}

interface SearchResult {
  repositories: Repository[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchRepositories({
  query = '',
  ecosystem,
  language,
  category,
  topic,
  license,
  stars,
  updatedAfter,
  includeForks = false,
  page = 1,
  limit = 20,
  sortBy = 'stars',
  sortOrder = 'desc',
}: SearchParams): Promise<SearchResult> {
  try {
    const offset: number = (page - 1) * limit;
    const conditions: string[] = [];
    const params: Array<string | number | Date | boolean> = [];

    // Optimized full-text search using GIN index and ts_rank
    if (query) {
      conditions.push(`
        to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery($${params.length + 1})
      `);
      params.push(query);
    }

    // Apply filters with proper type handling
    if (ecosystem) conditions.push(`ecosystem = $${params.push(ecosystem)}`);
    if (language) conditions.push(`language = $${params.push(language)}`);
    if (category) conditions.push(`category = $${params.push(category)}`);
    if (license) conditions.push(`license_name = $${params.push(license)}`);
    if (stars) conditions.push(`stargazers_count >= $${params.push(stars)}`);
    if (updatedAfter) conditions.push(`updated_at >= $${params.push(updatedAfter)}`);
    if (!includeForks) conditions.push('fork = false');

    // Optimized topic subquery using EXISTS
    if (topic) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM repository_topics 
          WHERE repository_id = repositories.id 
          AND topic = $${params.push(topic)}
        )
      `);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Optimized sorting with index usage
    const orderByColumn =
      sortBy === 'stars'
        ? 'stargazers_count'
        : sortBy === 'forks'
          ? 'forks_count'
          : sortBy === 'created'
            ? 'created_at'
            : 'updated_at';

    const orderBy = `ORDER BY ${orderByColumn} ${sortOrder} NULLS LAST`;

    // Main query with rank calculation for full-text search
    const baseQuery = `
      SELECT 
        r.*,
        array_agg(DISTINCT t.topic) as topics
        ${query ? `, ts_rank(to_tsvector('english', r.name || ' ' || COALESCE(r.description, '')), plainto_tsquery($1)) AS rank` : ''}
      FROM repositories r
      LEFT JOIN repository_topics t ON r.id = t.repository_id
      ${whereClause}
      GROUP BY r.id
      ${query ? 'ORDER BY rank DESC, ' + orderByColumn + ' ' + sortOrder : orderBy}
      LIMIT $${params.push(limit)}
      OFFSET $${params.push(offset)}
    `;

    // Execute queries in parallel
    const [results, countResult]: [QueryResult<Repository>, QueryResult<{ count: string }>] =
      await Promise.all([
        pool.query(baseQuery, params),
        pool.query(
          `
        SELECT COUNT(DISTINCT r.id) 
        FROM repositories r
        LEFT JOIN repository_topics t ON r.id = t.repository_id
        ${whereClause}
      `,
          params.slice(0, -2)
        ), // Remove limit and offset params
      ]);

    const total = parseInt(countResult.rows[0].count);

    return {
      repositories: results.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Error in searchRepositories:', { error, params: arguments[0] });
    throw new Error('Failed to search repositories');
  }
}

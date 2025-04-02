import { sql } from '@vercel/postgres';
import { NextResponse, NextRequest } from 'next/server';
import { ensureTablesExist } from '@/lib/db-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // First check if tables exist and create them if needed
    await ensureTablesExist();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Build the base query
    const queryText = `
      SELECT 
        r.*,
        COALESCE(array_agg(t.topic) FILTER (WHERE t.topic IS NOT NULL), ARRAY[]::varchar[]) as topics
      FROM repositories r
      LEFT JOIN repository_topics t ON r.id = t.repository_id
      ${
        query.trim()
          ? `
        WHERE 
          name ILIKE $1 OR
          description ILIKE $1 OR
          full_name ILIKE $1
      `
          : ''
      }
      GROUP BY r.id
      ORDER BY 
        CASE WHEN name ILIKE $1 THEN 0
             WHEN full_name ILIKE $1 THEN 1
             WHEN description ILIKE $1 THEN 2
             ELSE 3
        END,
        stargazers_count DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Execute the query with parameters
    const values = query.trim() ? [`%${query.trim()}%`] : [];
    const results = await sql.query(queryText, values);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT r.id)
      FROM repositories r
      ${
        query.trim()
          ? `
        WHERE 
          name ILIKE $1 OR
          description ILIKE $1 OR
          full_name ILIKE $1
      `
          : ''
      }
    `;
    const countResult = await sql.query(countQuery, values);

    return NextResponse.json({
      repositories: results.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search repositories' }, { status: 500 });
  }
}

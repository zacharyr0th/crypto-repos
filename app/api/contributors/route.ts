import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Contributor } from '@/lib/types';

// Define validation schema for query parameters
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  ecosystem: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v || undefined),
  excludeForks: z.coerce.boolean().default(true),
  search: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const countOnly = searchParams.get('count') === 'total';
    const excludeForks = searchParams.get('excludeForks') !== 'false';

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(all_contributors.contributor_login ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const forkFilter = excludeForks ? 'AND r.fork = false' : '';

    if (countOnly) {
      const countSql = `
        WITH all_contributors AS (
          SELECT 
            rc.contributor_login,
            COUNT(DISTINCT rc.repository_id) as repository_count,
            SUM(rc.contributions_count) as total_contributions,
            STRING_AGG(DISTINCT r.ecosystem, ', ') as ecosystems
          FROM repository_contributors rc
          JOIN repositories r ON rc.repository_id = r.id
          ${forkFilter ? 'WHERE ' + forkFilter.substring(4) : ''}
          GROUP BY rc.contributor_login
        )
        SELECT COUNT(*) as total_count
        FROM all_contributors
        ${whereClause}
      `;

      console.log('Count SQL:', countSql);
      console.log('Count params:', params);

      const totalCountResult = await sql.query(countSql, params);

      const totalCount = parseInt(totalCountResult.rows[0]?.total_count || '0');
      return NextResponse.json({ totalCount });
    }

    const querySql = `
      WITH all_contributors AS (
        SELECT 
          rc.contributor_login,
          COUNT(DISTINCT rc.repository_id) as repository_count,
          SUM(rc.contributions_count) as total_contributions,
          STRING_AGG(DISTINCT r.ecosystem, ', ') as ecosystems,
          array_agg(DISTINCT r.id) as repo_ids,
          rc.contributor_html_url,
          rc.contributor_avatar_url,
          ROW_NUMBER() OVER (ORDER BY SUM(rc.contributions_count) DESC) as global_rank
        FROM repository_contributors rc
        JOIN repositories r ON rc.repository_id = r.id
        ${forkFilter ? 'WHERE ' + forkFilter.substring(4) : ''}
        GROUP BY rc.contributor_login, rc.contributor_html_url, rc.contributor_avatar_url
      )
      SELECT *
      FROM all_contributors
      ${whereClause}
      ORDER BY global_rank ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log('Query SQL:', querySql);
    console.log('Query params:', params);

    const results = await sql.query(querySql, params);

    const contributors = results.rows.map((row) => ({
      contributor_login: row.contributor_login,
      contributor_html_url: row.contributor_html_url,
      contributor_avatar_url: row.contributor_avatar_url,
      total_contributions: Number(row.total_contributions),
      repository_count: Number(row.repository_count),
      ecosystems: row.ecosystems,
      global_rank: Number(row.global_rank),
      repositories: [],
    }));

    // Calculate total pages
    const countSql = `
      WITH all_contributors AS (
        SELECT 
          rc.contributor_login,
          COUNT(DISTINCT rc.repository_id) as repository_count,
          SUM(rc.contributions_count) as total_contributions,
          STRING_AGG(DISTINCT r.ecosystem, ', ') as ecosystems
        FROM repository_contributors rc
        JOIN repositories r ON rc.repository_id = r.id
        ${forkFilter ? 'WHERE ' + forkFilter.substring(4) : ''}
        GROUP BY rc.contributor_login
      )
      SELECT COUNT(*) as total_count
      FROM all_contributors
      ${whereClause}
    `;
    const totalCountResult = await sql.query(countSql, params);
    const totalCount = parseInt(totalCountResult.rows[0]?.total_count || '0');
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      contributors,
      pagination: {
        totalPages,
        currentPage: page,
        totalCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching contributors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributors', details: error.message },
      { status: 500 }
    );
  }
}

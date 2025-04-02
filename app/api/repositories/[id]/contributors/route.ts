import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { Contributor } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const searchParams = new URL(request.url).searchParams;
    const excludeForks = searchParams.get('excludeForks') !== 'false';

    // First try to get contributors from our database
    const { rows } = await sql`
      SELECT 
        rc.contributor_login,
        rc.contributor_html_url,
        rc.contributor_avatar_url,
        rc.contributions_count as total_contributions
      FROM repository_contributors rc
      JOIN repositories r ON rc.repository_id = r.id
      WHERE rc.repository_id = ${id}
      ORDER BY rc.contributions_count DESC
    `;

    const contributors: Contributor[] = rows.map((row: any) => ({
      contributor_login: row.contributor_login,
      contributor_html_url: row.contributor_html_url,
      contributor_avatar_url: row.contributor_avatar_url,
      total_contributions: Number(row.total_contributions),
      repository_count: 1,
      ecosystems: '',
      repositories: [],
    }));

    return NextResponse.json({ contributors });
  } catch (error) {
    console.error('Error fetching repository contributors:', error);
    return NextResponse.json({ error: 'Failed to fetch contributors' }, { status: 500 });
  }
}

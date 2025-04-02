import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Dynamic response generation options (no caching for now)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { login: string } }) {
  try {
    const { login } = params;

    console.log(`Fetching repositories for contributor: ${login}, excludeForks: true (enforced)`);

    // Construct the query based on parameters with all required fields
    // Note: topics is fetched separately since it's in a different table
    let query = `
      SELECT 
        r.id,
        r.name,
        r.full_name,
        r.html_url,
        r.description,
        r.stargazers_count,
        r.watchers_count,
        r.forks_count,
        r.language,
        r.fork,
        r.owner_html_url,
        r.ecosystem,
        r.category,
        r.created_at,
        r.updated_at,
        r.pushed_at,
        r.homepage,
        r.license_name,
        r.languages_url,
        r.contributors_count,
        (
          SELECT ARRAY_AGG(topic) 
          FROM repository_topics 
          WHERE repository_id = r.id
        ) as topics,
        r.full_name = (
          -- Get the most starred repo with the same name but not a fork, if this repo is a fork
          SELECT original.full_name
          FROM repositories original
          WHERE original.name = r.name
            AND original.fork = FALSE
          ORDER BY original.stargazers_count DESC
          LIMIT 1
        ) as is_original_or_main
      FROM repositories r
      JOIN repository_contributors rc ON r.id = rc.repository_id
      WHERE rc.contributor_login = $1
      -- Only include repositories that aren't forks, or are the main/original version 
      -- with the highest star count for that repo name
      AND (
        r.fork = FALSE 
        OR 
        r.full_name = (
          SELECT original.full_name
          FROM repositories original
          WHERE original.name = r.name
            AND original.fork = FALSE
          ORDER BY original.stargazers_count DESC
          LIMIT 1
        )
      )
    `;

    // Add ordering and limit
    query += ' ORDER BY r.stargazers_count DESC LIMIT 100';

    console.log('Executing query:', query.replace(/\s+/g, ' '));

    // Execute the query with parameters
    const result = await sql.query(query, [login]);

    console.log(`Found ${result.rows.length} repositories for contributor ${login}`);

    // Transform results to match the expected Repository type structure
    const repositories = result.rows.map((repo) => {
      // Extract owner login from full_name (full_name format is "owner/repo")
      const ownerLogin = repo.full_name?.split('/')[0] || '';

      return {
        // Keep all original properties
        ...repo,

        // Ensure numeric types
        id: Number(repo.id),
        stargazers_count: Number(repo.stargazers_count),
        watchers_count: Number(repo.watchers_count),
        forks_count: Number(repo.forks_count),
        contributors_count: repo.contributors_count ? Number(repo.contributors_count) : undefined,

        // Rename properties to match expected frontend properties
        ecosystem_name: repo.ecosystem,
        category_name: repo.category,
        is_fork: repo.fork,
        is_original_or_main: repo.is_original_or_main,

        // Construct objects according to Repository interface
        owner: {
          html_url: repo.owner_html_url,
          login: ownerLogin,
        },

        // Only add license if license_name exists
        license: repo.license_name ? { name: repo.license_name } : undefined,

        // Ensure topics is always an array
        topics: Array.isArray(repo.topics) ? repo.topics : [],
      };
    });

    if (result.rows.length === 0) {
      console.log('No repositories found for this contributor');
    } else {
      // Log sample data for debugging
      console.log('Sample transformed repository:', JSON.stringify(repositories[0], null, 2));
    }

    return NextResponse.json(repositories);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch repositories',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

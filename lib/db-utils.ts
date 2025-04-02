import { sql } from '@vercel/postgres';

/**
 * Ensures all required database tables exist, creating them if necessary
 */
export async function ensureTablesExist() {
  try {
    // Check if repositories table exists
    const repoTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'repositories'
      );
    `;

    if (!repoTableExists.rows[0].exists) {
      // Create repositories table
      await sql`
        CREATE TABLE repositories (
          id BIGINT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          html_url VARCHAR(255) NOT NULL,
          homepage VARCHAR(255),
          language VARCHAR(100),
          stargazers_count INTEGER NOT NULL DEFAULT 0,
          watchers_count INTEGER NOT NULL DEFAULT 0,
          forks_count INTEGER NOT NULL DEFAULT 0,
          fork BOOLEAN NOT NULL DEFAULT FALSE,
          owner_html_url VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
          pushed_at TIMESTAMP WITH TIME ZONE,
          license_name VARCHAR(100),
          languages_url VARCHAR(255) NOT NULL,
          ecosystem VARCHAR(50) NOT NULL,
          category VARCHAR(50) NOT NULL,
          created_in_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_in_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          contributors_count INTEGER DEFAULT 0,
          language_bytes BIGINT,
          language_stats JSONB,
          is_accessible BOOLEAN
        );
        
        CREATE INDEX IF NOT EXISTS idx_repositories_ecosystem ON repositories(ecosystem);
        CREATE INDEX IF NOT EXISTS idx_repositories_category ON repositories(category);
        CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language);
      `;

      console.log('Created repositories table');
    }

    // Check if repository_topics table exists
    const topicsTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'repository_topics'
      );
    `;

    if (!topicsTableExists.rows[0].exists) {
      // Create repository_topics table
      await sql`
        CREATE TABLE repository_topics (
          repository_id BIGINT,
          topic VARCHAR(100) NOT NULL,
          PRIMARY KEY (repository_id, topic),
          FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
        );
      `;

      console.log('Created repository_topics table');
    }

    // Check if repository_contributors table exists
    const contributorsTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'repository_contributors'
      );
    `;

    if (!contributorsTableExists.rows[0].exists) {
      // Create repository_contributors table
      await sql`
        CREATE TABLE repository_contributors (
          repository_id BIGINT NOT NULL,
          contributor_login VARCHAR(255) NOT NULL,
          contributor_html_url VARCHAR(255) NOT NULL,
          contributions_count INTEGER NOT NULL DEFAULT 0,
          contributor_avatar_url VARCHAR(255),
          PRIMARY KEY (repository_id, contributor_login),
          FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
        );
      `;

      console.log('Created repository_contributors table');
    }

    return true;
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
}

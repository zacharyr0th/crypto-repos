import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { withAdminAuth } from '../../middleware/auth';

// This is a special route that will create the repository_topics table
// Access via: /api/admin/create-table
async function handler() {
  try {
    // Check if table already exists
    const tableExistsResult = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'repository_topics'
      );
    `;

    if (tableExistsResult.rows[0].exists) {
      return NextResponse.json({
        success: true,
        message: 'Table repository_topics already exists',
        status: 'exists',
      });
    }

    // Create the table
    await sql`
      CREATE TABLE repository_topics (
        repository_id BIGINT,
        topic VARCHAR(100) NOT NULL,
        PRIMARY KEY (repository_id, topic),
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
      );
    `;

    return NextResponse.json({
      success: true,
      message: 'Table repository_topics created successfully',
      status: 'created',
    });
  } catch (error: any) {
    // Sanitize error for production
    const message =
      process.env.NODE_ENV === 'production' ? 'Failed to create table' : error.message;

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = withAdminAuth(handler);

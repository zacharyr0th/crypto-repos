# Postgres Database Documentation

> **Source**: The actual schema implementation can be found in [`schema.sql`](./schema.sql)

## Table of Contents

- [Tables](#tables)
  - [repositories](#repositories)
  - [repository_contributors](#repository_contributors)
  - [repository_topics](#repository_topics)
- [Indexes](#indexes)
- [Triggers](#triggers)
  - [update_repositories_updated_in_db](#update_repositories_updated_in_db)
- [Notes](#notes)

## Tables

### repositories

Stores information about GitHub repositories.

| #   | Column Name        | Type                     | Constraints               | Description                                        |
| --- | ------------------ | ------------------------ | ------------------------- | -------------------------------------------------- |
| 1   | id                 | BIGINT                   | PRIMARY KEY               | GitHub repository ID                               |
| 2   | name               | VARCHAR(255)             | NOT NULL                  | Repository name                                    |
| 3   | full_name          | VARCHAR(255)             | NOT NULL, UNIQUE          | Full repository name (owner/repo)                  |
| 4   | description        | TEXT                     |                           | Repository description                             |
| 5   | html_url           | VARCHAR(255)             | NOT NULL                  | GitHub repository URL                              |
| 6   | homepage           | VARCHAR(255)             |                           | Project homepage URL                               |
| 7   | language           | VARCHAR(100)             |                           | Primary programming language                       |
| 8   | stargazers_count   | INTEGER                  | NOT NULL, DEFAULT 0       | Number of stars                                    |
| 9   | watchers_count     | INTEGER                  | NOT NULL, DEFAULT 0       | Number of watchers                                 |
| 10  | forks_count        | INTEGER                  | NOT NULL, DEFAULT 0       | Number of forks                                    |
| 11  | fork               | BOOLEAN                  | NOT NULL, DEFAULT FALSE   | Whether the repo is a fork                         |
| 12  | owner_html_url     | VARCHAR(255)             | NOT NULL                  | GitHub URL of repository owner                     |
| 13  | created_at         | TIMESTAMP WITH TIME ZONE | NOT NULL                  | Repository creation date                           |
| 14  | updated_at         | TIMESTAMP WITH TIME ZONE | NOT NULL                  | Last repository update                             |
| 15  | pushed_at          | TIMESTAMP WITH TIME ZONE |                           | Last push date                                     |
| 16  | license_name       | VARCHAR(100)             |                           | Repository license name                            |
| 17  | languages_url      | VARCHAR(255)             | NOT NULL                  | URL to repository languages data                   |
| 18  | ecosystem          | VARCHAR(50)              | NOT NULL                  | Cryptocurrency ecosystem (e.g., Bitcoin, Ethereum) |
| 19  | category           | VARCHAR(50)              | NOT NULL                  | Repository category                                |
| 20  | contributors_count | INTEGER                  |                           | Total number of contributors                       |
| 21  | created_in_db      | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp                          |
| 22  | updated_in_db      | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record update timestamp                            |

### repository_contributors

Stores detailed information about contributors to each repository.

| #   | Column Name            | Type         | Constraints                             | Description                       |
| --- | ---------------------- | ------------ | --------------------------------------- | --------------------------------- |
| 1   | repository_id          | BIGINT       | FOREIGN KEY REFERENCES repositories(id) | Reference to repository           |
| 2   | contributor_login      | VARCHAR(255) | NOT NULL                                | GitHub username of contributor    |
| 3   | contributor_html_url   | VARCHAR(255) | NOT NULL                                | GitHub profile URL of contributor |
| 4   | contributor_avatar_url | VARCHAR(255) | NOT NULL                                | URL to contributor's avatar       |
| 5   | contributions_count    | INTEGER      | NOT NULL                                | Number of contributions made      |

Primary Key: (repository_id, contributor_login)

### repository_topics

Stores topics/tags associated with repositories.

| #   | Column Name   | Type         | Constraints                             | Description             |
| --- | ------------- | ------------ | --------------------------------------- | ----------------------- |
| 1   | repository_id | BIGINT       | FOREIGN KEY REFERENCES repositories(id) | Reference to repository |
| 2   | topic         | VARCHAR(100) | NOT NULL                                | Topic/tag name          |

Primary Key: (repository_id, topic)

## Indexes

These are created to optimize query performance:

- `idx_repositories_ecosystem`: Index on repositories(ecosystem)
- `idx_repositories_category`: Index on repositories(category)
- `idx_repositories_language`: Index on repositories(language)

## Triggers

### update_repositories_updated_in_db

- **Table**: repositories
- **Timing**: BEFORE UPDATE
- **For Each**: ROW
- **Function**: update_updated_in_db_column()

Automatically updates the `updated_in_db` timestamp whenever a repository record is modified.

## Notes

- The schema uses PostgreSQL-specific features like `TIMESTAMP WITH TIME ZONE`
- Foreign key constraints include `ON DELETE CASCADE` to maintain referential integrity
- Contributors are tracked both at the summary level (contributors_count in repositories) and in detail (repository_contributors table)

Index Analysis

1. idx_repositories_combined_text (1064 kB)
   Purpose: Full-text search on combined name and description
   Definition: CREATE INDEX idx_repositories_combined_text ON public.repositories USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text))))
   Current Status: Unused (0 scans)
   Similar Indexes: Overlaps with idx_repositories_name_description_fts
   Used in Code: Yes, there are queries using this pattern in lib/db/queries.ts
2. idx_repositories_name_description_fts (1064 kB)
   Purpose: Full-text search with weighted columns (name has higher weight than description)
   Definition: CREATE INDEX idx_repositories_name_description_fts ON public.repositories USING gin (((setweight(to_tsvector('english'::regconfig, (name)::text), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(description, ''::text)), 'B'::"char"))))
   Current Status: Unused (0 scans)
   Similar Indexes: Overlaps with idx_repositories_combined_text
   Used in Code: No direct usage found
3. idx_repositories_description_lower (328 kB)
   Purpose: Case-insensitive search on the description column
   Definition: CREATE INDEX idx_repositories_description_lower ON public.repositories USING btree (lower(description))
   Current Status: Unused (0 scans)
   Similar Indexes: Similar pattern to other \*\_lower indexes
   Used in Code: No direct usage found
   Recommendations
   Immediate Actions:
   Remove idx_repositories_name_description_fts (1064 kB)
   This weighted index isn't being used in your code
   The simpler idx_repositories_combined_text covers the same functionality
   Savings: 1064 kB
   Remove idx_repositories_description_lower (328 kB)
   No evidence of case-insensitive searches specifically on description
   Savings: 328 kB
   Keep idx_repositories_combined_text for now
   Despite being unused in monitoring, your application code shows usage patterns
   This index supports text search queries in lib/db/queries.ts

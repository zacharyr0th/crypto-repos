// Base types for common properties
interface RepositoryOwner {
  html_url: string; // Owner's profile URL
  login: string; // Owner's username
}

interface RepositoryLicense {
  name: string; // License name (e.g., "MIT License", "Apache License 2.0")
}

interface RepositoryMetrics {
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  contributors_count?: number;
}

// Constants for type safety
export const SORT_FIELDS = ['stars', 'updated', 'forks', 'created'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export const SIZE_CATEGORIES = ['small', 'medium', 'large', 'very-large'] as const;
export const ACTIVITY_LEVELS = ['active', 'maintaining', 'inactive'] as const;

// github api response type
export interface GithubRepositoryStats extends RepositoryMetrics {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  homepage?: string;
  language?: string;
  topics?: string[];
  fork: boolean;
  owner: RepositoryOwner;
  created_at: string;
  updated_at: string;
  pushed_at?: string;
  license?: RepositoryLicense;
  languages_url: string;
}

export interface ExtendedRepositoryStats extends GithubRepositoryStats {
  ecosystem: string;
  category: string;
}

// Database repository type
export interface DatabaseRepository extends GithubRepositoryStats {
  ecosystem: string;
  category: string;
  created_in_db: string;
  updated_in_db: string;
  search_vector?: unknown; // Better than 'any' for tsvector type
  topics: string[]; // Required in DB (can be empty array)
}

// repository type for the UI
export interface Repository extends DatabaseRepository {
  contributors_count?: number;
  open_issues_count?: number;
  fork_count?: number;
  ecosystem_name?: string;
  category_name?: string;
  relevance_score?: number;
  last_activity_at?: string;
  size_category?: (typeof SIZE_CATEGORIES)[number];
  activity_level?: (typeof ACTIVITY_LEVELS)[number];
  community_score?: number;
}

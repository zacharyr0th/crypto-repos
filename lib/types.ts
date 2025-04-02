export interface SearchFilters {
  stars?: number;
  language?: string;
  license?: string;
  sortBy?:
    | 'stars'
    | 'updated'
    | 'forks'
    | 'watchers'
    | 'created'
    | 'name'
    | 'ecosystem'
    | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  homepage?: string;
  language?: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  fork: boolean;
  owner_html_url: string;
  created_at: string;
  updated_at: string;
  pushed_at?: string;
  license_name?: string;
  languages_url: string;
  ecosystem: string;
  category: string;
  topics: string[];
  owner: {
    html_url: string;
    login: string;
  };
  license?: {
    name: string;
  };
}

export interface RepositoriesResponse {
  repositories: Repository[];
  totalPages: number;
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface Contributor {
  contributor_login: string;
  contributor_html_url: string;
  contributor_avatar_url: string;
  total_contributions: number;
  repository_count: number;
  ecosystems: string;
  repositories?: Repository[];
  global_rank?: number;
}

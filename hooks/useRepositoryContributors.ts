/*
 * useRepositoryContributors.ts
 * Custom hook for fetching repository contributors using TanStack Query
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export interface Contributor {
  contributor_login: string;
  contributor_html_url: string;
  contributor_avatar_url: string | null;
  total_contributions: number;
}

// Query keys for repository contributors
export const repositoryContributorsKeys = {
  all: ['repositoryContributors'] as const,
  byId: (id: number) => [...repositoryContributorsKeys.all, id] as const,
};

const fetchRepositoryContributors = async (
  repositoryId: number,
  excludeForks: boolean = true
): Promise<Contributor[]> => {
  const params = new URLSearchParams();

  if (excludeForks === false) {
    params.append('excludeForks', 'false');
  }

  const url = `/api/repositories/${repositoryId}/contributors${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch repository contributors');
  }

  const data = await response.json();
  return data.contributors;
};

export function useRepositoryContributors(
  repositoryId: number | undefined,
  options?: Omit<UseQueryOptions<Contributor[], Error>, 'queryKey' | 'queryFn'> & {
    excludeForks?: boolean;
  }
) {
  const excludeForks = options?.excludeForks ?? true;

  return useQuery({
    queryKey: repositoryContributorsKeys.byId(repositoryId ?? 0),
    queryFn: () => {
      if (!repositoryId) throw new Error('Repository ID is required');
      return fetchRepositoryContributors(repositoryId, excludeForks);
    },
    enabled: !!repositoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

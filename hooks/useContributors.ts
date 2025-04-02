/**
 * useContributors.ts
 * Custom hook for optimized contributor data fetching using TanStack Query
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import type { Repository } from '@/lib/repository';

export interface Contributor {
  contributor_login: string;
  contributor_html_url: string;
  contributor_avatar_url: string | null;
  total_contributions: number;
  repository_count: number;
  ecosystems: string;
  repositories: Repository[];
  global_rank?: number;
  formattedContributions?: string;
  formattedRepoCount?: string;
}

export interface ContributorFilters {
  ecosystem?: string;
  excludeForks?: boolean;
  search?: string;
  // Add more filter types here as needed
}

interface ContributorsResponse {
  contributors: Contributor[];
  pagination: {
    totalPages: number;
    currentPage: number;
    totalCount: number;
  };
}

interface TotalContributorCountResponse {
  totalCount: number;
}

// Query keys as constants
export const contributorKeys = {
  all: ['contributors'] as const,
  lists: () => [...contributorKeys.all, 'list'] as const,
  list: (page: number) => [...contributorKeys.lists(), { page }] as const,
  details: (login: string) => [...contributorKeys.all, 'detail', login] as const,
  totalCount: ['contributorsCount'] as const,
};

// Cache control
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const GC_TIME = 5 * 60 * 1000; // 5 minutes

// Optimized fetch functions with caching
const fetchTotalContributorCount = async (
  ecosystem?: string,
  search?: string
): Promise<TotalContributorCountResponse> => {
  const params = new URLSearchParams({ count: 'total' });

  // Add ecosystem filter if provided
  if (ecosystem && ecosystem !== 'all') {
    params.append('ecosystem', ecosystem);
  }

  // Add search parameter if provided
  if (search && search.trim() !== '') {
    params.append('search', search);
  }

  const url = `/api/contributors?${params.toString()}`;
  console.log('Fetching total count with URL:', url);

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Total count error response:', errorText);
    throw new Error(errorText || 'Failed to fetch total contributor count');
  }
  return response.json();
};

// Optimized fetch function with caching
const fetchContributors = async (
  page: number,
  filters: ContributorFilters = {}
): Promise<ContributorsResponse> => {
  const { ecosystem, excludeForks, search } = filters;

  // Build URL with parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '50',
  });

  // Add ecosystem filter if provided
  if (ecosystem && ecosystem !== 'all') {
    params.append('ecosystem', ecosystem);
  }

  // Add excludeForks parameter if specified (defaults to true)
  if (excludeForks === false) {
    params.append('excludeForks', 'false');
  }

  // Add search parameter if provided
  if (search) {
    params.append('search', search);
  }

  const cacheKey = `contributors_page_${page}_${ecosystem || ''}_forks_${excludeForks !== false}_search_${search || ''}`;
  const url = `/api/contributors?${params.toString()}`;

  console.log('Fetching contributors with URL:', url);

  try {
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use cached data if less than cache duration
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('Using cached data for:', cacheKey);
        return data;
      }
    }
  } catch (err) {
    console.warn('Cache read error:', err);
    // Continue with fetch if cache fails
  }

  const response = await fetch(url, {
    // Add cache control to avoid browser caching issues
    cache: 'no-cache',
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch contributors';
    try {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.details?.message || errorData.error || errorMessage;
    } catch (e) {
      // If parsing fails, use default error message
      console.error('Error parsing error response:', e);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Pre-compute derived data once
  const enhancedData = {
    ...data,
    contributors: data.contributors.map((contributor: Contributor) => ({
      ...contributor,
      formattedContributions: contributor.total_contributions.toLocaleString(),
      formattedRepoCount: `${contributor.repository_count} repos`,
    })),
  };

  // Cache the result
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: enhancedData,
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    console.warn('Cache write error:', err);
    // Continue even if caching fails
  }

  return enhancedData;
};

export const useContributors = (
  page: number,
  filters?: ContributorFilters,
  options?: Omit<
    UseQueryOptions<ContributorsResponse, Error, ContributorsResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  const queryClient = useQueryClient();
  const ecosystem = filters?.ecosystem;
  const excludeForks = filters?.excludeForks;
  const search = filters?.search;

  // Memoize fetch function
  const fetchData = useCallback(() => fetchContributors(page, filters), [page, filters]);

  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(
    () => [...contributorKeys.list(page), { ecosystem, excludeForks, search }],
    [page, ecosystem, excludeForks, search]
  );

  const query = useQuery<ContributorsResponse, Error, ContributorsResponse>({
    queryKey,
    queryFn: fetchData,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: (prev) => prev, // Keep previous data while loading
    retry: 1,
    ...options,
  });

  // Prefetch adjacent pages
  useMemo(() => {
    const prefetchAdjacentPages = async () => {
      // Only prefetch if we have data about total pages
      if (!query.data?.pagination.totalPages) return;

      const totalPages = query.data.pagination.totalPages;
      const prefetchPromises = [];

      // Prefetch next page if available
      if (page < totalPages) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: [...contributorKeys.list(page + 1), { ecosystem, excludeForks, search }],
            queryFn: () => fetchContributors(page + 1, { ecosystem, excludeForks, search }),
          })
        );
      }

      // Prefetch previous page if not first page
      if (page > 1) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: [...contributorKeys.list(page - 1), { ecosystem, excludeForks, search }],
            queryFn: () => fetchContributors(page - 1, { ecosystem, excludeForks, search }),
          })
        );
      }

      // Execute prefetches in parallel
      await Promise.all(prefetchPromises);
    };

    if (query.isSuccess) {
      prefetchAdjacentPages();
    }
  }, [
    page,
    ecosystem,
    excludeForks,
    search,
    query.data?.pagination.totalPages,
    query.isSuccess,
    queryClient,
  ]);

  return query;
};

export const useTotalContributorCount = (
  ecosystemFilter?: string,
  searchQuery?: string,
  options?: Omit<UseQueryOptions<TotalContributorCountResponse>, 'queryKey' | 'queryFn'>
) => {
  // Memoize fetch function
  const fetchData = useCallback(
    () => fetchTotalContributorCount(ecosystemFilter, searchQuery),
    [ecosystemFilter, searchQuery]
  );

  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(
    () => [...contributorKeys.totalCount, { ecosystem: ecosystemFilter, search: searchQuery }],
    [ecosystemFilter, searchQuery]
  );

  return useQuery<TotalContributorCountResponse>({
    queryKey,
    queryFn: fetchData,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
};

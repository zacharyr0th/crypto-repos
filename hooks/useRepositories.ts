/*
 * useRepositories.ts
 * Custom hooks for optimized repository data fetching using TanStack Query
 */

import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import type { Repository } from '@/lib/repository';

interface RepositoriesResponse {
  repositories: Repository[];
  totalPages: number;
  totalCount: number;
}

interface TotalCountResponse {
  totalCount: number;
}

interface SearchFilters {
  stars?: number;
  language?: string;
  license?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface UseRepositoriesParams {
  ecosystem: string;
  page: number;
  searchTerm: string;
  filters?: SearchFilters;
  options?: Omit<UseQueryOptions<RepositoriesResponse>, 'queryKey' | 'queryFn'>;
}

// Query keys as constants for consistency
export const queryKeys = {
  repositories: (params: {
    ecosystem?: string;
    page?: number;
    searchTerm?: string;
    filters?: SearchFilters;
  }) => ['repositories', params.ecosystem, params.page, params.searchTerm, params.filters] as const,
  totalCount: ['repositoriesCount'] as const,
  prefetch: (params: { ecosystem: string; page: number; searchTerm: string }) =>
    ['repositories', 'prefetch', params] as const,
};

// Optimized fetch functions with error handling and typing
const fetchTotalCount = async (): Promise<TotalCountResponse> => {
  try {
    const response = await fetch('/api/repositories?count=total');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to fetch total count: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching total count:', error);
    return { totalCount: 0 };
  }
};

const fetchRepositories = async (
  ecosystem: string,
  page: number,
  searchTerm: string,
  filters?: SearchFilters
): Promise<RepositoriesResponse> => {
  // Build URL with proper query params
  const params = new URLSearchParams({
    page: page.toString(),
    search: searchTerm,
  });

  // Only add ecosystem param if it's not empty
  if (ecosystem) {
    params.append('ecosystem', ecosystem);
  }

  // Add filter params
  if (filters) {
    if (filters.stars) params.append('stars', filters.stars.toString());
    if (filters.language) params.append('language', filters.language);
    if (filters.license) params.append('license', filters.license);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  }

  const response = await fetch(`/api/repositories?${params.toString()}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to fetch repositories');
  }

  return response.json();
};

// Optimized hooks with proper typing and caching
export function useRepositories({
  ecosystem,
  page,
  searchTerm,
  filters,
  options,
}: UseRepositoriesParams) {
  const queryClient = useQueryClient();

  // Use consistent query key structure
  const queryKey = queryKeys.repositories({ ecosystem, page, searchTerm, filters });

  // Memoize fetch function to prevent unnecessary re-renders
  const fetchData = useCallback(
    () => fetchRepositories(ecosystem, page, searchTerm, filters),
    [ecosystem, page, searchTerm, filters]
  );

  const query = useQuery<RepositoriesResponse>({
    queryKey,
    queryFn: fetchData,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Better retry logic based on error type
      if (error instanceof Error && error.message.includes('404')) {
        return false; // Don't retry 404s
      }
      return failureCount < 2;
    },
    ...options,
  });

  // Parallel prefetching for next and previous pages with improved error handling
  useEffect(() => {
    // Only prefetch if we have valid data and aren't currently fetching
    if (query.isLoading || query.isFetching || !query.data) return;

    const prefetchPage = async (prefetchPage: number) => {
      try {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.repositories({ ecosystem, page: prefetchPage, searchTerm, filters }),
          queryFn: () => fetchRepositories(ecosystem, prefetchPage, searchTerm, filters),
          staleTime: 1000 * 30, // 30 seconds
        });
      } catch (error) {
        // Silent fail for prefetch errors
        console.warn(`Prefetching page ${prefetchPage} failed:`, error);
      }
    };

    // Track if component is still mounted
    let mounted = true;
    const controller = new AbortController();

    // Use a single setTimeout to batch prefetch operations
    const timeoutId = setTimeout(() => {
      if (!mounted) return;

      // Prefetch adjacent pages in parallel
      const prefetchPromises = [];
      if (page < query.data.totalPages) {
        prefetchPromises.push(prefetchPage(page + 1));
      }
      if (page > 1) {
        prefetchPromises.push(prefetchPage(page - 1));
      }

      Promise.all(prefetchPromises).catch(() => {
        // Handle any uncaught errors silently
      });
    }, 200); // Small delay to avoid prefetching during rapid navigation

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    queryClient,
    page,
    ecosystem,
    searchTerm,
    filters,
    query.data,
    query.isLoading,
    query.isFetching,
  ]);

  return query;
}

export const useTotalCount = (
  options?: Omit<UseQueryOptions<TotalCountResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TotalCountResponse>({
    queryKey: queryKeys.totalCount,
    queryFn: fetchTotalCount,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

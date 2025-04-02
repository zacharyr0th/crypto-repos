import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { Repository } from '@/lib/repository';

// Query keys for contributor repositories
export const contributorRepositoriesKeys = {
  all: ['contributorRepositories'] as const,
  byLogin: (login: string) => [...contributorRepositoriesKeys.all, login] as const,
};

const fetchContributorRepositories = async (login: string): Promise<Repository[]> => {
  const url = `/api/contributors/${encodeURIComponent(login)}/repositories`;

  console.log(`Fetching repositories for contributor ${login} with URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(
      `Error fetching contributor repositories: ${response.status} ${response.statusText}`,
      errorText
    );
    throw new Error(
      `Failed to fetch contributor repositories: ${response.status} ${response.statusText}`
    );
  }

  try {
    const data = await response.json();

    // Check if we received an array (good) or an error object
    if (Array.isArray(data)) {
      console.log(`Retrieved ${data.length} repositories for contributor ${login}`);
      return data;
    } else if (data && data.error) {
      console.error(`API returned error:`, data);
      throw new Error(data.error);
    } else {
      console.error(`Unexpected API response format:`, data);
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Error parsing API response:', error);
    throw new Error('Failed to parse repository data');
  }
};

export function useContributorRepositories(
  login: string | undefined,
  options?: Omit<UseQueryOptions<Repository[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: contributorRepositoriesKeys.byLogin(login ?? ''),
    queryFn: () => {
      if (!login) throw new Error('Contributor login is required');
      return fetchContributorRepositories(login);
    },
    enabled: !!login,
    ...options,
  });
}

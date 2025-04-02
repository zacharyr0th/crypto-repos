/**
 * Utility functions for interacting with Hasura GraphQL API
 */

/**
 * Function to make GraphQL requests to the Hasura endpoint
 * @param query GraphQL query or mutation string
 * @param variables Optional variables for the query
 * @returns Promise with the data from the response
 */
export async function fetchGraphQL(query: string, variables = {}) {
  // Get the endpoint from env vars or default to localhost
  const endpoint = process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
  const adminSecret = process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || 'crypto-repos-admin-secret';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  // Handle GraphQL errors
  if (result.errors) {
    console.error('GraphQL Error:', result.errors);
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

/**
 * Type definitions for repositories and related data
 */
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  fork: boolean;
  owner_html_url: string;
  ecosystem: string;
  category: string;
  contributors_count: number;
  language_stats: Record<string, number> | null;
  repository_topics: { topic: string }[];
}

export interface TopRepository {
  id: number;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  ecosystem: string;
  repository_topics: { topic: string }[];
}

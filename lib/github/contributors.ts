import { octokit } from './client';
import { rateLimiter } from './rate-limiter';
import pool from '../db/config';
import { dbQueue } from '../db/queue';
import path from 'path';
import fs from 'fs';

interface GitHubError {
  status: number;
  message: string;
}

function isGitHubError(error: unknown): error is GitHubError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as GitHubError).status === 'number'
  );
}

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

// Define the structure for raw contributor data from GitHub API
interface RawGitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  [key: string]: any; // For other properties from GitHub API
}

export async function fetchRepositoryContributors(
  owner: string,
  repo: string
): Promise<GitHubContributor[]> {
  console.debug(`Starting to fetch contributors for ${owner}/${repo}`);

  const cacheFile = path.join(CACHE_DIR, `${owner}_${repo}_contributors.json`);

  try {
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const age = Date.now() - stats.mtimeMs;

      if (age < CACHE_TTL) {
        console.debug(`Using cached contributors data for ${owner}/${repo}`);
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    }
  } catch (error) {
    console.warn(`Cache read error for ${owner}/${repo} contributors:`, error);
  }

  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 10000;

  while (retryCount < maxRetries) {
    try {
      await rateLimiter.acquire(`${owner}/${repo}/contributors`);

      let allContributors: GitHubContributor[] = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const { data, headers } = await octokit.repos.listContributors({
          owner,
          repo,
          per_page: 100,
          page,
        });

        const contributors = data
          .filter(
            (contributor) =>
              contributor &&
              typeof contributor.login === 'string' &&
              typeof contributor.avatar_url === 'string' &&
              typeof contributor.html_url === 'string'
          )
          .map(
            (contributor) =>
              ({
                login: contributor.login,
                avatar_url: contributor.avatar_url,
                html_url: contributor.html_url,
                contributions: contributor.contributions,
              }) as GitHubContributor
          );

        allContributors = [...allContributors, ...contributors];

        // Check rate limits
        const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
        const resetTime = parseInt(headers['x-ratelimit-reset'] || '0');
        rateLimiter.updateLimits(remaining, resetTime);

        // Check for next page
        const linkHeader = headers.link || '';
        hasNextPage = linkHeader.includes('rel="next"') && data.length === 100;

        if (hasNextPage) {
          page++;
          console.debug(
            `Fetching page ${page} for ${owner}/${repo} (${allContributors.length} contributors so far)`
          );
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Add delay between pages
        }
      }

      // Cache the successful response
      fs.writeFileSync(cacheFile, JSON.stringify(allContributors));
      console.debug(`Fetched ${allContributors.length} total contributors for ${owner}/${repo}`);

      return allContributors;
    } catch (error: unknown) {
      if (isGitHubError(error) && error.status === 403) {
        retryCount++;
        const delay = baseDelay * Math.pow(2, retryCount);
        console.warn(
          `Rate limit hit for ${owner}/${repo}, attempt ${retryCount}/${maxRetries}, waiting ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  throw new Error(`Failed to fetch contributors for ${owner}/${repo} after ${maxRetries} retries`);
}

export async function storeRepositoryContributors(
  repositoryId: number,
  contributors: GitHubContributor[]
) {
  // Add to database queue for batched processing
  await dbQueue.add(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update contributors_count in repositories table
      await client.query('UPDATE repositories SET contributors_count = $1 WHERE id = $2', [
        contributors.length,
        repositoryId,
      ]);

      // Delete existing contributors for this repository
      await client.query('DELETE FROM repository_contributors WHERE repository_id = $1', [
        repositoryId,
      ]);

      // Insert new contributors
      if (contributors.length > 0) {
        // Get the repository stargazers count
        const repoResult = await client.query(
          'SELECT stargazers_count FROM repositories WHERE id = $1',
          [repositoryId]
        );

        const stargazersCount = repoResult.rows[0]?.stargazers_count || 0;

        // Create values array with all parameters
        const values = [];
        const placeholders = [];

        for (let i = 0; i < contributors.length; i++) {
          const c = contributors[i];
          const startIdx = i * 6 + 1; // Each row has 6 parameters now

          values.push(
            repositoryId,
            c.login,
            c.html_url,
            c.avatar_url,
            c.contributions,
            stargazersCount // Add stargazers count as repository_stars
          );

          placeholders.push(
            `($${startIdx}, $${startIdx + 1}, $${startIdx + 2}, $${startIdx + 3}, $${startIdx + 4}, $${startIdx + 5})`
          );
        }

        const query = `
          INSERT INTO repository_contributors 
          (repository_id, contributor_login, contributor_html_url, contributor_avatar_url, contributions_count, repository_stars)
          VALUES ${placeholders.join(',')}
        `;
        await client.query(query, values);
      }

      await client.query('COMMIT');
      console.debug(`Stored ${contributors.length} contributors for repository ${repositoryId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error storing contributors for repository ${repositoryId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  });
}

export async function getRepositoryContributors(repositoryId: number) {
  const result = await pool.query(
    `
    SELECT 
      contributor_login as login,
      contributor_html_url as html_url,
      contributor_avatar_url as avatar_url,
      contributions_count as contributions
    FROM repository_contributors
    WHERE repository_id = $1
    ORDER BY contributions_count DESC
  `,
    [repositoryId]
  );
  return result.rows;
}

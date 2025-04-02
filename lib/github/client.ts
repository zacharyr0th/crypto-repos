/**
 * Unified GitHub API client for fetching repository data
 */
import 'dotenv/config'; // Ensure environment variables are loaded
import { Octokit } from '@octokit/rest';
import { GithubRepositoryStats } from '../repository';
import { rateLimiter } from './rate-limiter';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { GitHubError, RateLimitError, ValidationError, withErrorHandling } from '../utils/errors';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Track fetch count for logging
let fetchCount = 0;
// Track cache hits
let cachedCount = 0;
// Last time we reported cache status
let lastCacheReport = Date.now();
const CACHE_REPORT_INTERVAL = 3000; // 3 seconds

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Check GitHub token
if (!process.env.GITHUB_TOKEN) {
  logger.warn('GITHUB_TOKEN environment variable is not set');
}

// Single Octokit instance for all GitHub operations
export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'Crypto-Repos-Collector',
  retry: {
    enabled: true,
    retries: MAX_RETRIES,
    doNotRetry: [404, 422, 401, 400],
  },
  throttle: {
    onRateLimit: (retryAfter: number, options: any) => {
      logger.warn(`Rate limit hit, waiting ${retryAfter} seconds`);
      return true;
    },
    onSecondaryRateLimit: (retryAfter: number, options: any) => {
      logger.warn(`Secondary rate limit hit, waiting ${retryAfter} seconds`);
      return true;
    },
  },
});

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === retries - 1) throw error;

      const delay = RETRY_DELAY * Math.pow(2, i);
      logger.warn(`Operation failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}

export async function fetchRepositoryFromUrl(url: string): Promise<GithubRepositoryStats | null> {
  return withErrorHandling(async () => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (!match) {
      throw new ValidationError(`Invalid GitHub URL: ${url}`);
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace('.git', '');
    return fetchRepository(owner, cleanRepo);
  }, 'fetchRepositoryFromUrl');
}

export async function fetchRepository(
  owner: string,
  repo: string
): Promise<GithubRepositoryStats | null> {
  return withErrorHandling(async () => {
    if (!process.env.GITHUB_TOKEN) {
      throw new GitHubError('GITHUB_TOKEN environment variable is not set', 401);
    }

    const cacheFile = path.join(CACHE_DIR, `${owner}_${repo}.json`);

    try {
      if (fs.existsSync(cacheFile)) {
        const stats = fs.statSync(cacheFile);
        const age = Date.now() - stats.mtimeMs;

        if (age < CACHE_TTL) {
          cachedCount++;

          const now = Date.now();
          if (
            cachedCount % 20 === 0 ||
            (now - lastCacheReport > CACHE_REPORT_INTERVAL && cachedCount > 0)
          ) {
            logger.info(
              `[${new Date().toLocaleTimeString()}] CACHE: Using cached data for ${cachedCount} repositories (latest: ${owner}/${repo})`
            );
            lastCacheReport = now;
            cachedCount = 0;
          }

          return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        }
      }
    } catch (error) {
      logger.warn(`Cache read error for ${owner}/${repo}`, error);
    }

    await rateLimiter.acquire(`${owner}/${repo}`);

    fetchCount++;
    if (fetchCount % 50 === 0 || fetchCount === 1) {
      logger.info(`Fetched ${fetchCount} repositories (latest: ${owner}/${repo})`);
    }

    try {
      const repoData = await retryWithBackoff(async () => {
        const { data, headers } = await octokit.repos.get({ owner, repo });

        const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
        const reset = parseInt(headers['x-ratelimit-reset'] || '0');
        rateLimiter.updateLimits(remaining, reset);

        // Fetch contributors count with separate rate limit token
        await rateLimiter.acquire(`${owner}/${repo}/contributors`);
        const { data: contributorsData, headers: contributorsHeaders } =
          await octokit.repos.listContributors({
            owner,
            repo,
            per_page: 1,
          });

        let contributorsCount = 0;
        const linkHeader = contributorsHeaders.link;
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
          contributorsCount = match ? parseInt(match[1]) : contributorsData.length;
        } else {
          contributorsCount = contributorsData.length;
        }

        return {
          id: data.id,
          name: data.name,
          full_name: data.full_name,
          description: data.description || undefined,
          html_url: data.html_url,
          homepage: data.homepage || undefined,
          language: data.language || undefined,
          topics: data.topics || [],
          stargazers_count: data.stargazers_count,
          watchers_count: data.watchers_count,
          forks_count: data.forks_count,
          fork: data.fork,
          owner: {
            html_url: data.owner.html_url,
            login: data.owner.login,
          },
          created_at: data.created_at,
          updated_at: data.updated_at,
          pushed_at: data.pushed_at || undefined,
          license: data.license ? { name: data.license.name } : undefined,
          languages_url: data.languages_url,
          contributors_count: contributorsCount,
        };
      });

      // Only cache successful responses
      fs.writeFileSync(cacheFile, JSON.stringify(repoData));
      return repoData;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }

      if (error.status === 403 && error.response?.data?.message?.includes('rate limit')) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        throw new RateLimitError(`Rate limit exceeded for ${owner}/${repo}`, retryAfter);
      }

      throw new GitHubError(`Error fetching ${owner}/${repo}`, error.status || 500, {
        message: error.message,
      });
    }
  }, 'fetchRepository');
}

// Example usage:
// const repo = await fetchRepository('ethereum', 'go-ethereum');

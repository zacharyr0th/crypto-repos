import { Octokit } from '@octokit/rest';
import { rateLimiter } from './rate-limiter';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'Crypto-Repos-Collector',
  retry: {
    enabled: true,
    retries: 3,
    doNotRetry: [404, 422, 401, 400],
  },
});

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRepositoryContributors(
  owner: string,
  repo: string
): Promise<GitHubContributor[]> {
  logger.debug(`Starting to fetch contributors for ${owner}/${repo}`);

  // Check cache first
  const cacheFile = path.join(CACHE_DIR, `${owner}_${repo}_contributors.json`);

  try {
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const age = Date.now() - stats.mtimeMs;

      if (age < CACHE_TTL) {
        logger.debug(`Using cached contributors data for ${owner}/${repo}`);
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return cacheData;
      } else {
        logger.debug(`Cache expired for ${owner}/${repo}, fetching fresh data`);
      }
    }
  } catch (error) {
    logger.warn(`Cache read error for ${owner}/${repo} contributors:`, error);
  }

  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 10000; // Start with 10 second delay

  while (retryCount < maxRetries) {
    try {
      // Wait for rate limit to allow the request
      logger.debug(`Acquiring rate limit token for ${owner}/${repo}`);
      await rateLimiter.acquire(`${owner}/${repo}/contributors`);
      logger.debug(`Rate limit token acquired for ${owner}/${repo}`);

      logger.debug(`Making GitHub API request for ${owner}/${repo}`);
      let allContributors: GitHubContributor[] = [];
      let hasNextPage = true;
      let page = 1;

      while (hasNextPage) {
        // Get the next page of contributors
        const response = await octokit.repos.listContributors({
          owner,
          repo,
          per_page: 100,
          page,
        });

        const { data, headers } = response;

        // Parse the contributors from this page
        const contributors = data
          .map((contributor) => ({
            login: contributor.login || '',
            avatar_url: contributor.avatar_url || '',
            html_url: contributor.html_url || '',
            contributions: contributor.contributions || 0,
          }))
          .filter((c) => c.login && c.html_url);

        allContributors = [...allContributors, ...contributors];

        // Check if we need to handle rate limiting
        const remaining = parseInt(headers['x-ratelimit-remaining'] || '0', 10);
        const resetTime = parseInt(headers['x-ratelimit-reset'] || '0', 10) * 1000;
        const now = Date.now();

        if (remaining < 10 && resetTime > now) {
          const waitTime = resetTime - now + 1000; // Add 1 second buffer
          logger.debug(`Rate limit low (${remaining}), waiting ${waitTime}ms`);
          await sleep(waitTime);
        }

        // Handle secondary rate limit
        const retryAfter = headers['retry-after'];
        if (retryAfter) {
          const waitTime = parseInt(String(retryAfter), 10) * 1000;
          logger.debug(`Secondary rate limit hit, waiting ${waitTime}ms`);
          await sleep(waitTime);
        }

        // Check for next page using GitHub's link header
        const linkHeader = headers.link || '';
        hasNextPage = linkHeader.includes('rel="next"') && data.length === 100;

        if (hasNextPage) {
          page++;
          logger.debug(
            `Fetching page ${page} for ${owner}/${repo} (${allContributors.length} contributors so far)`
          );
          // Add delay between pages to avoid rate limits
          await sleep(5000);
        }
      }

      logger.debug(`Fetched ${allContributors.length} total contributors for ${owner}/${repo}`);

      // Cache the successful response
      try {
        logger.debug(`Caching contributors data for ${owner}/${repo}`);
        fs.writeFileSync(cacheFile, JSON.stringify(allContributors));
        logger.debug(`Successfully cached contributors data for ${owner}/${repo}`);
      } catch (cacheError) {
        logger.error(`Error caching contributors for ${owner}/${repo}:`, cacheError);
      }

      return allContributors;
    } catch (error: any) {
      if (error.status === 403) {
        retryCount++;
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        logger.warn(
          `Rate limit hit for ${owner}/${repo}, attempt ${retryCount}/${maxRetries}, waiting ${delay}ms`
        );
        await sleep(delay);
        continue;
      }

      logger.error(`Error fetching contributors for ${owner}/${repo}:`, error);
      if (error.response) {
        logger.error(`GitHub API response status: ${error.response.status}`);
        logger.error(`GitHub API response data:`, error.response.data);
      }
      throw error;
    }
  }

  throw new Error(`Failed to fetch contributors for ${owner}/${repo} after ${maxRetries} retries`);
}

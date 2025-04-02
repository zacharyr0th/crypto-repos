/**
 * Unified Repository Service
 * Handles all repository operations with support for batching and queuing
 */
import { GithubRepositoryStats, ExtendedRepositoryStats } from '../repository';
import pool from './config';
import { rateLimiter } from './rate-limiter';

export class RepositoryService {
  private static instance: RepositoryService;
  private batch: ExtendedRepositoryStats[] = [];
  private processedRepos: Set<string> = new Set();
  private processing: boolean = false;
  private readonly BATCH_SIZE = 50;
  private readonly MAX_CONCURRENT = 5;
  private activeOperations = 0;
  private lastProcessTime = 0;
  private readonly MIN_BATCH_INTERVAL = 5000; // Minimum 5s between batches

  private constructor() {
    // Set up error handling for uncaught errors
    process.on('uncaughtException', this.handleError.bind(this));
    process.on('unhandledRejection', this.handleError.bind(this));
  }

  private handleError(error: Error): void {
    console.error('Critical error in RepositoryService:', error);
    // Attempt to save current state and cleanup
    this.processing = false;
    this.activeOperations = 0;
  }

  static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  async initialize(ecosystem: string): Promise<void> {
    try {
      const query = 'SELECT full_name FROM repositories WHERE ecosystem = $1';
      const result = await pool.query(query, [ecosystem]);
      result.rows.forEach((row) => this.processedRepos.add(row.full_name));
      console.info(
        `Initialized with ${this.processedRepos.size} existing repositories for ${ecosystem}`
      );
    } catch (error) {
      console.error('Failed to initialize repository service:', error);
      throw error;
    }
  }

  async queueRepository(
    repo: GithubRepositoryStats,
    ecosystem: string,
    category: string = 'uncategorized'
  ): Promise<void> {
    if (this.processedRepos.has(repo.full_name)) {
      return;
    }

    const extendedRepo: ExtendedRepositoryStats = {
      ...repo,
      ecosystem,
      category,
    };

    this.batch.push(extendedRepo);

    if (this.batch.length >= this.BATCH_SIZE) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.batch.length === 0) return;

    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    if (timeSinceLastProcess < this.MIN_BATCH_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_BATCH_INTERVAL - timeSinceLastProcess)
      );
    }

    this.processing = true;
    const currentBatch = this.batch.splice(0, this.BATCH_SIZE);
    const client = await pool.connect();

    try {
      // Acquire rate limit token for batch
      await rateLimiter.acquire(`batch-${currentBatch[0].full_name}`);

      await client.query('BEGIN');

      // Bulk upsert repositories
      const repoValues = currentBatch
        .map((repo, i) => {
          const offset = i * 19;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, 
                $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, 
                $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19})`;
        })
        .join(',');

      const repoQuery = `
        INSERT INTO repositories (
          id, name, full_name, description, html_url, homepage,
          language, stargazers_count, watchers_count, forks_count,
          fork, owner_html_url, created_at, updated_at, pushed_at,
          license_name, languages_url, ecosystem, category
        ) VALUES ${repoValues}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          html_url = EXCLUDED.html_url,
          homepage = EXCLUDED.homepage,
          language = EXCLUDED.language,
          stargazers_count = EXCLUDED.stargazers_count,
          watchers_count = EXCLUDED.watchers_count,
          forks_count = EXCLUDED.forks_count,
          updated_at = EXCLUDED.updated_at,
          ecosystem = EXCLUDED.ecosystem,
          category = EXCLUDED.category,
          updated_in_db = CURRENT_TIMESTAMP
      `;

      const repoParams = currentBatch.flatMap((repo) => [
        repo.id,
        repo.name,
        repo.full_name,
        repo.description,
        repo.html_url,
        repo.homepage,
        repo.language,
        repo.stargazers_count,
        repo.watchers_count,
        repo.forks_count,
        repo.fork,
        repo.owner.html_url,
        repo.created_at,
        repo.updated_at,
        repo.pushed_at,
        repo.license?.name,
        repo.languages_url,
        repo.ecosystem,
        repo.category,
      ]);

      await client.query(repoQuery, repoParams);

      // Process topics with rate limiting
      await Promise.all(
        currentBatch.map(async (repo) => {
          if (repo.topics?.length) {
            await rateLimiter.acquire(`topics-${repo.full_name}`);
            await client.query('DELETE FROM repository_topics WHERE repository_id = $1', [repo.id]);
            const topicsQuery = `
            INSERT INTO repository_topics (repository_id, topic)
            VALUES ${repo.topics.map((_, i) => `($1, $${i + 2})`).join(',')}
          `;
            await client.query(topicsQuery, [repo.id, ...repo.topics]);
          }
        })
      );

      await client.query('COMMIT');
      currentBatch.forEach((repo) => this.processedRepos.add(repo.full_name));

      this.lastProcessTime = Date.now();
      console.debug(`Successfully processed batch of ${currentBatch.length} repositories`);
    } catch (error) {
      console.error('Error processing batch:', error);
      await client.query('ROLLBACK');
      // Re-queue failed items at the front of the batch
      this.batch.unshift(...currentBatch);

      // Add exponential backoff delay on error
      const backoffDelay = Math.min(5000 * Math.pow(2, this.batch.length / this.BATCH_SIZE), 30000);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    } finally {
      client.release();
      this.processing = false;
      if (this.batch.length >= this.BATCH_SIZE) {
        // Use setImmediate to prevent stack overflow on large queues
        setImmediate(() => this.processBatch());
      }
    }
  }

  async getRepository(id: number): Promise<ExtendedRepositoryStats | null> {
    try {
      await rateLimiter.acquire(`get-${id}`);
      const result = await pool.query(
        `
        SELECT r.*, array_agg(DISTINCT t.topic) as topics
        FROM repositories r
        LEFT JOIN repository_topics t ON r.id = t.repository_id
        WHERE r.id = $1
        GROUP BY r.id
      `,
        [id]
      );

      if (result.rows.length === 0) return null;

      const repo = result.rows[0];
      return {
        ...repo,
        owner: { html_url: repo.owner_html_url },
        license: repo.license_name ? { name: repo.license_name } : undefined,
        topics: repo.topics.filter(Boolean),
      };
    } catch (error) {
      console.error(`Error fetching repository ${id}:`, error);
      throw error;
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length > 0) {
      await this.processBatch();
    }
  }

  getProcessedCount(): number {
    return this.processedRepos.size;
  }

  getBatchSize(): number {
    return this.batch.length;
  }

  getStatus(): { processed: number; queued: number; processing: boolean } {
    return {
      processed: this.processedRepos.size,
      queued: this.batch.length,
      processing: this.processing,
    };
  }
}

// Export singleton instance
export const repositoryService = RepositoryService.getInstance();

/**
 * Unified Repository Service
 * Handles all repository operations with support for batching, queuing, and transaction management
 */
import { GithubRepositoryStats, ExtendedRepositoryStats } from '../repository';
import { logger } from '../utils/logger';
import pool from './config';
import { DatabaseError } from '../utils/errors';

export class RepositoryService {
  private static instance: RepositoryService;
  private batch: ExtendedRepositoryStats[] = [];
  private processedRepos: Set<string> = new Set();
  private processing: boolean = false;
  private readonly BATCH_SIZE = 50;
  private readonly MAX_CONCURRENT = 5;
  private activeOperations = 0;
  private transactionClient: any = null;

  private constructor() {}

  static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  private async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      this.transactionClient = client;
      const result = await operation();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new DatabaseError('Transaction failed', 500, { error });
    } finally {
      this.transactionClient = null;
      client.release();
    }
  }

  private getClient() {
    return this.transactionClient || pool;
  }

  async initialize(ecosystem: string): Promise<void> {
    try {
      const query = 'SELECT full_name FROM repositories WHERE ecosystem = $1';
      const result = await this.getClient().query(query, [ecosystem]);
      result.rows.forEach((row: { full_name: string }) => this.processedRepos.add(row.full_name));
      logger.info(`Loaded ${this.processedRepos.size} existing repositories for ${ecosystem}`);
    } catch (error) {
      logger.error('Failed to load existing repositories:', error);
      throw new DatabaseError('Failed to initialize repository service', 500, { error });
    }
  }

  async queueRepository(
    repo: GithubRepositoryStats,
    ecosystem: string,
    category: string = 'uncategorized'
  ): Promise<void> {
    if (this.processedRepos.has(repo.full_name)) {
      logger.debug(`Skipping ${repo.full_name} (already processed)`);
      return;
    }

    const extendedRepo: ExtendedRepositoryStats = {
      ...repo,
      ecosystem,
      category,
    };

    this.batch.push(extendedRepo);
    this.processedRepos.add(repo.full_name);

    if (this.batch.length >= this.BATCH_SIZE) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.batch.length === 0) {
      return;
    }

    this.processing = true;
    const batchToProcess = [...this.batch];
    this.batch = [];

    try {
      await this.withTransaction(async () => {
        for (const repo of batchToProcess) {
          await this.insertRepository(repo);
        }
      });
      logger.info(`Successfully processed batch of ${batchToProcess.length} repositories`);
    } catch (error) {
      // Restore failed items to batch
      this.batch = [...batchToProcess, ...this.batch];
      logger.error(`Failed to process batch: ${error}`);
      throw new DatabaseError('Failed to process repository batch', 500, { error });
    } finally {
      this.processing = false;
    }
  }

  private async insertRepository(repo: ExtendedRepositoryStats): Promise<void> {
    const client = this.getClient();
    try {
      const query = `
        INSERT INTO repositories (
          full_name, name, description, stargazers_count, forks_count, language,
          ecosystem, category, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (full_name) DO UPDATE SET
          stargazers_count = EXCLUDED.stargazers_count,
          forks_count = EXCLUDED.forks_count,
          description = EXCLUDED.description,
          language = EXCLUDED.language,
          category = EXCLUDED.category,
          updated_at = EXCLUDED.updated_at
      `;

      await client.query(query, [
        repo.full_name,
        repo.name,
        repo.description,
        repo.stargazers_count,
        repo.forks_count,
        repo.language,
        repo.ecosystem,
        repo.category,
        repo.created_at,
        repo.updated_at,
      ]);
    } catch (error) {
      logger.error(`Failed to insert repository ${repo.full_name}:`, error);
      throw new DatabaseError('Failed to insert repository', 500, { error, repo });
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.withTransaction(async () => {
        // Process any remaining items in the batch
        if (this.batch.length > 0) {
          await this.processBatch();
        }

        // Clean up any stale data
        const cleanupQuery = `
          DELETE FROM repositories 
          WHERE updated_at < NOW() - INTERVAL '30 days'
          AND stars < 100
        `;
        await this.getClient().query(cleanupQuery);
      });
      logger.info('Repository service cleanup completed successfully');
    } catch (error) {
      logger.error('Failed to cleanup repository service:', error);
      throw new DatabaseError('Failed to cleanup repository service', 500, { error });
    }
  }
}

// Export singleton instance
export const repositoryService = RepositoryService.getInstance();

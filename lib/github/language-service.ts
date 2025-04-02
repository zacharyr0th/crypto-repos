import { octokit } from './client';
import { rateLimiter } from './rate-limiter';
import { dbQueue } from '../db/queue';
import pool from '../db/config';

export interface LanguageStats {
  [language: string]: number; // language name -> bytes of code
}

export class LanguageService {
  private static instance: LanguageService;

  private constructor() {}

  static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  async fetchLanguageStats(owner: string, repo: string): Promise<LanguageStats | null> {
    try {
      await rateLimiter.acquire(`${owner}/${repo}/languages`);
      const { data } = await octokit.repos.listLanguages({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      console.error(`Error fetching language stats for ${owner}/${repo}:`, error);
      return null;
    }
  }

  async storeLanguageStats(repositoryId: number, stats: LanguageStats): Promise<void> {
    await dbQueue.add(async () => {
      const client = await pool.connect();
      try {
        // Find primary language (one with most bytes)
        const languages = Object.entries(stats);
        let primaryLanguage: string | null = null;
        let primaryBytes = 0;

        if (languages.length > 0) {
          languages.sort(([, a], [, b]) => b - a);
          [primaryLanguage, primaryBytes] = languages[0];
        }

        // Update repository with all language information
        await client.query(
          `UPDATE repositories 
           SET language = $1,
               language_bytes = $2,
               language_stats = $3
           WHERE id = $4`,
          [primaryLanguage, primaryBytes, JSON.stringify(stats), repositoryId]
        );

        console.debug(`Updated language stats for repository ${repositoryId}`);
      } catch (error) {
        console.error(`Error storing language stats for repository ${repositoryId}:`, error);
        throw error;
      } finally {
        client.release();
      }
    });
  }

  // Keep these methods for backward compatibility
  async fetchPrimaryLanguage(owner: string, repo: string): Promise<string | null> {
    const stats = await this.fetchLanguageStats(owner, repo);
    if (!stats || Object.keys(stats).length === 0) return null;

    const languages = Object.entries(stats);
    languages.sort(([, a], [, b]) => b - a);
    return languages[0][0];
  }

  async storePrimaryLanguage(repositoryId: number, language: string | null): Promise<void> {
    await dbQueue.add(async () => {
      const client = await pool.connect();
      try {
        await client.query('UPDATE repositories SET language = $1 WHERE id = $2', [
          language,
          repositoryId,
        ]);
        console.debug(`Updated primary language for repository ${repositoryId}`);
      } catch (error) {
        console.error(`Error storing language for repository ${repositoryId}:`, error);
        throw error;
      } finally {
        client.release();
      }
    });
  }
}

export const languageService = LanguageService.getInstance();

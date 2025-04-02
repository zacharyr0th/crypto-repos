/**
 * Script to update all repository data in the database (optimized)
 * Uses parallel processing for 10x performance improvement
 */
import 'dotenv/config';
import { fetchRepository } from '../lib/github/client';
import {
  fetchRepositoryContributors,
  storeRepositoryContributors,
} from '../lib/github/contributors';
import { languageService } from '../lib/github/language-service';
import { repositoryService } from '../lib/github/repository-service';
import pool from '../lib/github/config';
import { dbQueue } from '../lib/db/queue';

// Process repositories in batches to control concurrency
const CONCURRENCY_LIMIT = 20;

async function updateAllData(): Promise<void> {
  try {
    console.log(`Starting optimized repository data update with concurrency: ${CONCURRENCY_LIMIT}`);

    // Get all repositories from the database
    const { rows } = await pool.query(`
      SELECT id, full_name, ecosystem, category, updated_at, updated_in_db
      FROM repositories 
      ORDER BY updated_in_db ASC
    `);

    console.log(`Found ${rows.length} repositories to process`);

    let completed = 0;
    let skipped = 0;
    let failed = 0;
    const startTime = Date.now();

    // Process repositories in batches
    for (let i = 0; i < rows.length; i += CONCURRENCY_LIMIT) {
      const batch = rows.slice(i, i + CONCURRENCY_LIMIT);
      const batchPromises = batch.map(async (row) => {
        try {
          // Extract owner and repo from full_name
          const [owner, repo] = row.full_name.split('/');

          // Skip if the repository was updated recently
          if (row.updated_at && row.updated_in_db) {
            const lastGitHubUpdate = new Date(row.updated_at).getTime();
            const lastDbUpdate = new Date(row.updated_in_db).getTime();

            // Only process if last GitHub update is newer than our last DB update
            // Or if it's been more than 7 days since our last update
            const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
            if (lastGitHubUpdate <= lastDbUpdate && Date.now() - lastDbUpdate < ONE_WEEK) {
              skipped++;
              return { status: 'skipped', name: row.full_name };
            }
          }

          // Process the repository's data in parallel
          const [repoData, contributors, languageStats] = await Promise.all([
            fetchRepository(owner, repo),
            fetchRepositoryContributors(owner, repo),
            languageService.fetchLanguageStats(owner, repo),
          ]);

          // Store data concurrently
          const storePromises = [];

          if (repoData) {
            storePromises.push(
              repositoryService.queueRepository(repoData, row.ecosystem, row.category)
            );
          }

          if (contributors) {
            storePromises.push(
              dbQueue.add(async () => {
                await storeRepositoryContributors(row.id, contributors);
              })
            );
          }

          if (languageStats) {
            storePromises.push(languageService.storeLanguageStats(row.id, languageStats));
          }

          await Promise.all(storePromises);

          completed++;
          return { status: 'success', name: row.full_name };
        } catch (error) {
          failed++;
          console.error(
            `Error updating ${row.full_name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          return { status: 'error', name: row.full_name };
        }
      });

      // Wait for current batch to complete
      await Promise.all(batchPromises);

      const elapsed = (Date.now() - startTime) / 1000;
      const reposPerSecond = (completed + skipped) / elapsed;
      const progress = Math.round(((i + batch.length) / rows.length) * 100);

      console.log(`
        Progress: ${progress}% (${i + batch.length}/${rows.length})
        Completed: ${completed}, Skipped: ${skipped}, Failed: ${failed}
        Speed: ${reposPerSecond.toFixed(2)} repos/second
        Elapsed: ${(elapsed / 60).toFixed(2)} minutes
      `);

      // Ensure all queued operations are processed before next batch
      await repositoryService.flush();
      await dbQueue.waitForCompletion();
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;
    console.log(`
    ✅ Update completed in ${totalTime.toFixed(2)} minutes:
    - Successfully updated: ${completed}
    - Skipped (up-to-date): ${skipped}
    - Failed: ${failed}
    - Total processed: ${rows.length}
    `);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `Failed to update repository data: ${error.message}`
        : 'Failed to update repository data: Unknown error';
    console.error(errorMessage);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the update
if (require.main === module) {
  updateAllData().catch((error) => {
    console.error(
      error instanceof Error
        ? `Script failed: ${error.message}`
        : 'Script failed with unknown error'
    );
    process.exit(1);
  });
}

export { updateAllData };

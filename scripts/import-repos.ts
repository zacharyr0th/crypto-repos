#!/usr/bin/env ts-node

/**
 * Unified repository import script
 * Handles environment validation, repository imports, and chunk processing in a single file
 */
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { parseEcosystemFile } from '../lib/github/parser';
import { fetchRepositoryFromUrl, octokit } from '../lib/github/client';
import { repositoryService } from '../lib/github/repository-service';
import { logger } from '../lib/utils/logger';
import 'dotenv/config';

// ==== CONFIGURATION ====
const DEFAULT_CONCURRENCY_LIMIT = 5;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_MEMORY = '8GB';

// ==== COMMAND LINE ARGUMENT PARSING ====
interface ImportOptions {
  quiet: boolean;
  memory: string;
  batchSize: number;
  concurrency: number;
  skip: number;
  chunkSize: number;
  ecosystem: string;
  help: boolean;
  forceDirectMode: boolean;
}

function parseArgs(): ImportOptions {
  const options: ImportOptions = {
    quiet: false,
    memory: DEFAULT_MEMORY,
    batchSize: DEFAULT_BATCH_SIZE,
    concurrency: DEFAULT_CONCURRENCY_LIMIT,
    skip: 0,
    chunkSize: DEFAULT_CHUNK_SIZE,
    ecosystem: '',
    help: false,
    forceDirectMode: false,
  };

  // Skip 'node' and script name
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--direct') {
      options.forceDirectMode = true;
    } else if (arg.startsWith('--')) {
      // Handle options with values
      const [key, value] = arg.slice(2).split('=');
      switch (key) {
        case 'memory':
          options.memory = value;
          break;
        case 'batch':
          options.batchSize = parseInt(value);
          break;
        case 'concurrent':
          options.concurrency = parseInt(value);
          break;
        case 'skip':
          options.skip = parseInt(value);
          break;
        case 'chunk':
          options.chunkSize = parseInt(value);
          break;
        case 'ecosystem':
          options.ecosystem = value;
          break;
      }
    } else if (!arg.startsWith('-')) {
      // Treat non-flag arguments as ecosystem names
      options.ecosystem = arg;
    }
  }

  return options;
}

// ==== ENVIRONMENT VALIDATION ====
async function validateEnvironment(): Promise<boolean> {
  // Required environment variables
  const REQUIRED_VARS = {
    GITHUB_TOKEN: {
      description: 'GitHub Personal Access Token for API access',
      link: 'https://github.com/settings/tokens',
    },
    DATABASE_URL: {
      description: 'PostgreSQL connection string',
      example: 'postgres://user:password@localhost:5432/crypto_repos',
    },
  };

  // Check .env files
  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
    logger.error('No .env or .env.local file found. Please create one based on .env.example');
    return false;
  }

  // Check required environment variables
  const missingVars: string[] = [];

  Object.entries(REQUIRED_VARS).forEach(([key, info]) => {
    if (!process.env[key]) {
      missingVars.push(key);
      logger.error(`Missing required environment variable: ${key}`);
      logger.info(`  Description: ${info.description}`);

      if ('link' in info) {
        logger.info(`  Generate at: ${info.link}`);
      }

      if ('example' in info) {
        logger.info(`  Example: ${info.example}`);
      }
    }
  });

  if (missingVars.length > 0) {
    logger.error(`\nPlease add the missing environment variables to your .env or .env.local file.`);
    return false;
  }

  // Validate GitHub token
  if (process.env.GITHUB_TOKEN) {
    logger.info('Validating GitHub token...');

    try {
      const response = await octokit.users.getAuthenticated();
      logger.info(`✅ GitHub token is valid. Authenticated as: ${response.data.login}`);
      logger.info(
        `Rate limit: ${response.headers['x-ratelimit-remaining']}/${response.headers['x-ratelimit-limit']} requests remaining`
      );
      return true;
    } catch (error) {
      logger.error('❌ GitHub token validation failed:', error);
      return false;
    }
  }

  return true;
}

// ==== DIRECT IMPORT FUNCTION ====
async function importEcosystemReposDirectly(ecosystemName: string, options: ImportOptions) {
  try {
    const { quiet, batchSize, concurrency, skip } = options;

    logger.info(
      `Import configuration: concurrency=${concurrency}, batch=${batchSize}, quiet=${quiet}, skip=${skip}`
    );

    const startTime = Date.now();
    const ecosystemsDir = path.join(process.cwd(), 'lib/db/ecosystems');

    // Validate ecosystem name
    const filePath = path.join(ecosystemsDir, `${ecosystemName}.toml`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Ecosystem file not found: ${filePath}`);
    }

    logger.info(`Processing ecosystem: ${ecosystemName}`);

    // Stats for reporting
    const stats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    try {
      // Initialize repository service
      await repositoryService.initialize(ecosystemName);

      // Parse ecosystem file and get URLs
      const allUrls = await parseEcosystemFile(ecosystemName);

      // Apply skip parameter
      let urls = allUrls;
      if (skip > 0) {
        urls = allUrls.slice(skip);
        logger.info(`Skipping first ${skip} repositories (${skip}/${allUrls.length})`);
      }

      logger.info(
        `Found ${urls.length} repositories to process in ${ecosystemName} (total in file: ${allUrls.length})`
      );

      stats.total = urls.length;

      // Process repositories in batches with improved tracking
      let processedInBatch = 0;
      let failedRepositories: any[] = [];

      for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);

        const batchPromises = batch.map(async (url) => {
          try {
            // Check if repository is already processed
            const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
            if (!repoMatch) {
              logger.warn(`Invalid GitHub URL: ${url}`);
              stats.failed++;
              return { url, status: 'invalid_url' };
            }

            const [, owner, repo] = repoMatch;
            const repoFullName = `${owner}/${repo.replace('.git', '')}`;

            // Fetch repository data
            const repoData = await fetchRepositoryFromUrl(url);

            if (!repoData) {
              logger.warn(`Repository not found: ${url}`);
              stats.failed++;
              return { url, status: 'not_found' };
            }

            // Queue repository for processing
            await repositoryService.queueRepository(repoData, ecosystemName);

            stats.successful++;
            return { url, status: 'success', name: repoData.full_name };
          } catch (error) {
            logger.error(`Error processing repository ${url}:`, error);
            stats.failed++;
            return { url, status: 'error', error };
          }
        });

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);

        // Save failed repos from this batch
        const batchFailed = batchResults.filter((result) => result.status !== 'success');
        failedRepositories.push(...batchFailed);

        // Flush to DB occasionally to prevent memory buildup
        processedInBatch += batch.length;
        if (processedInBatch >= batchSize) {
          logger.info(`Flushing database queue after ${processedInBatch} repositories`);
          await repositoryService.flush();
          processedInBatch = 0;
        }

        // Report progress
        const progress = Math.round(((i + batch.length) / urls.length) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const reposPerSecond = (stats.successful + stats.failed) / elapsed;
        const estimatedTimeLeft = (urls.length - (i + batch.length)) / reposPerSecond;

        logger.info(`
          Ecosystem: ${ecosystemName}
          Progress: ${progress}% (${i + batch.length}/${urls.length})
          Successful: ${stats.successful}
          Failed: ${stats.failed}
          Speed: ${reposPerSecond.toFixed(2)} repos/second
          Elapsed: ${(elapsed / 60).toFixed(2)} minutes
          Est. time left: ${(estimatedTimeLeft / 60).toFixed(2)} minutes
        `);

        // Simple one-line progress in quiet mode
        if (!quiet) {
          console.log(
            `${ecosystemName}: ${progress}% | ${i + batch.length}/${urls.length} | ✅ ${stats.successful} | ❌ ${stats.failed}`
          );
        }
      }

      // Ensure all repositories for this ecosystem are processed
      await repositoryService.flush();
      logger.info(
        `Completed processing ${ecosystemName}: ${stats.successful} added, ${stats.failed} failed`
      );
    } catch (error) {
      logger.error(`Error processing ecosystem ${ecosystemName}:`, error);
      return false;
    }

    const totalTime = (Date.now() - startTime) / 1000 / 60;
    logger.info(`
      ✅ Import completed in ${totalTime.toFixed(2)} minutes:
      Total: ${stats.total}
      Successful: ${stats.successful}
      Failed: ${stats.failed}
      Skipped: ${stats.skipped}
    `);

    return true;
  } catch (error) {
    logger.error(`Error in importEcosystemReposDirectly:`, error);
    return false;
  }
}

// ==== CHUNKED IMPORT FUNCTION ====
async function importEcosystemReposInChunks(ecosystemName: string, options: ImportOptions) {
  const { quiet, memory, chunkSize, batchSize, concurrency, skip } = options;

  // Calculate node memory size from memory specification
  let nodeMemory = '4096';
  if (memory.match(/^([0-9]+)GB$/)) {
    nodeMemory = String(parseInt(memory.match(/^([0-9]+)GB$/)![1]) * 1024);
  } else if (memory.match(/^([0-9]+)MB$/)) {
    nodeMemory = memory.match(/^([0-9]+)MB$/)![1];
  }

  // Set environment variables - only set NODE_OPTIONS since we can't modify NODE_ENV directly
  process.env.NODE_OPTIONS = `--max-old-space-size=${nodeMemory}`;

  // Ensure clean environment
  if (fs.existsSync('./cache/tmp')) {
    fs.rmSync('./cache/tmp', { recursive: true, force: true });
  }
  fs.mkdirSync('./cache/tmp', { recursive: true });

  // Display configuration
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║ CRYPTO-REPOS IMPORTER - UNIFIED EDITION                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`• Memory limit:       ${memory} (${nodeMemory} MB)`);
  console.log(`• Concurrency:        ${concurrency} repositories at once`);
  console.log(`• Batch size:         ${batchSize} repositories per batch`);
  console.log(`• Chunk size:         ${chunkSize} repositories per chunk`);
  console.log(`• Quiet mode:         ${quiet}`);
  if (skip > 0) {
    console.log(`• Starting from:      Repository #${skip}`);
  }
  console.log(`• Ecosystem:          ${ecosystemName}`);

  // Validate ecosystem
  const repoFile = `lib/db/ecosystems/${ecosystemName}.toml`;
  if (!fs.existsSync(repoFile)) {
    console.error(`⚠️ TOML file not found: ${repoFile}`);
    console.log('Available ecosystems:');
    fs.readdirSync('lib/db/ecosystems')
      .filter((file) => file.endsWith('.toml'))
      .forEach((file) => console.log(`- ${path.basename(file, '.toml')}`));
    return false;
  }

  // Count repositories to process each chunk properly
  const fileContent = fs.readFileSync(repoFile, 'utf-8');
  const totalRepos = (fileContent.match(/url\s*=/g) || []).length;
  console.log(`Found ${totalRepos} repositories in ${ecosystemName} ecosystem`);

  // Calculate chunks
  const totalChunks = Math.ceil(totalRepos / chunkSize);
  const startChunk = Math.floor(skip / chunkSize);

  console.log(`Will process in ${totalChunks} chunks of ${chunkSize} repositories each`);
  console.log(`Starting from chunk #${startChunk + 1} (repository ${skip})`);

  // Process each chunk
  for (let i = startChunk; i < totalChunks; i++) {
    const chunkStart = i * chunkSize;

    // Skip chunks before our start point
    if (chunkStart < skip) {
      console.log(`Skipping chunk #${i + 1} (already processed)`);
      continue;
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      `⭐ Processing chunk #${i + 1}/${totalChunks} (repositories ${chunkStart}-${chunkStart + chunkSize - 1})`
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Process chunk using this script with direct mode
    // This replaces the need for a separate chunk-processor.js
    const args = [
      '--direct',
      `--ecosystem=${ecosystemName}`,
      `--skip=${chunkStart}`,
      `--batch=${batchSize}`,
      `--concurrent=${concurrency}`,
      `--chunk=${chunkSize}`,
    ];

    if (quiet) {
      args.push('--quiet');
    }

    // Execute this script in direct mode using cross-spawn for better cross-platform support
    const scriptPath = __filename;

    // Create environment for child process
    const childEnv = { ...process.env };
    childEnv.NODE_OPTIONS = `--max-old-space-size=${nodeMemory}`;
    // Safe cast as NODE_ENV can be any string in this context
    childEnv.NODE_ENV = 'production' as any;
    childEnv.UV_THREADPOOL_SIZE = '8';
    childEnv.CHUNK_ID = `${ecosystemName}_${chunkStart}_${Date.now()}`;

    const result = spawnSync('ts-node', [scriptPath, ...args], {
      stdio: 'inherit',
      env: childEnv,
    });

    if (result.status !== 0) {
      console.error(`❌ Failed to process chunk #${i + 1}`);
      return false;
    }

    console.log(`✅ Successfully completed chunk #${i + 1}`);

    // Short pause between chunks
    if (i < totalChunks - 1) {
      console.log('Pausing for 3 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('');
  console.log(`🎉 Successfully processed all chunks for ${ecosystemName} ecosystem!`);
  return true;
}

// ==== DISPLAY HELP ====
function showHelp() {
  console.log('Unified repository import script');
  console.log('Usage: ts-node scripts/import-repos.ts [options] [ecosystem-name]');
  console.log('');
  console.log('Options:');
  console.log('  --quiet, -q         Reduce output verbosity');
  console.log('  --memory=SIZE       Set memory limit (default: 8GB)');
  console.log('  --batch=SIZE        Set batch size (default: 50)');
  console.log('  --concurrent=NUM    Set concurrency (default: 5)');
  console.log('  --skip=NUM          Skip the first NUM repositories (useful for resuming)');
  console.log('  --chunk=NUM         Process repositories in chunks of NUM size (default: 100)');
  console.log('  --ecosystem=NAME    Specify ecosystem to process');
  console.log('  --direct            Force direct processing (no chunking)');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log(
    '  ts-node scripts/import-repos.ts --ecosystem=ethereum              # Import ethereum ecosystem'
  );
  console.log(
    '  ts-node scripts/import-repos.ts --ecosystem=solana -q             # Import solana with quiet output'
  );
  console.log(
    '  ts-node scripts/import-repos.ts --ecosystem=polygon --memory=16GB # Import polygon with 16GB memory'
  );
}

// ==== LIST AVAILABLE ECOSYSTEMS ====
function listAvailableEcosystems() {
  console.log('Available ecosystems:');
  const ecosystemsDir = path.join(process.cwd(), 'lib/db/ecosystems');
  fs.readdirSync(ecosystemsDir)
    .filter((file) => file.endsWith('.toml'))
    .forEach((file) => console.log(`- ${path.basename(file, '.toml')}`));
}

// ==== MAIN FUNCTION ====
async function main() {
  // Parse command line arguments
  const options = parseArgs();

  // Show help if requested
  if (options.help) {
    showHelp();
    return;
  }

  // Check environment variables only in chunked mode
  if (!options.forceDirectMode) {
    const environmentValid = await validateEnvironment();
    if (!environmentValid) {
      process.exit(1);
    }
  }

  // Check if ecosystem is specified
  if (!options.ecosystem) {
    console.error('No ecosystem specified. Please use --ecosystem=NAME to specify an ecosystem.');
    listAvailableEcosystems();
    process.exit(1);
  }

  // Run in appropriate mode
  let success;
  if (options.forceDirectMode) {
    // Direct mode - process a specific chunk (called by chunked mode)
    success = await importEcosystemReposDirectly(options.ecosystem, options);
  } else {
    // Chunked mode - break into smaller pieces for reliability
    success = await importEcosystemReposInChunks(options.ecosystem, options);
  }

  if (success) {
    console.log('🎉 Import process complete!');
    process.exit(0);
  } else {
    console.error('❌ Import process failed!');
    process.exit(1);
  }
}

// Execute main function
if (require.main === module) {
  main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

export { importEcosystemReposDirectly };

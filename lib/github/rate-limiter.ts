/**
 * Rate limiter with cross-process state sharing and enhanced error recovery
 */
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { RateLimitError, DatabaseError, withErrorHandling } from '../utils/errors';

interface QueueItem {
  resolve: (value?: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
  repoName?: string;
  queuedAt: number;
  retryCount?: number;
  timeout?: NodeJS.Timeout;
}

interface RateLimiterState {
  tokens: number;
  resetTime: number;
  totalRequestsThisHour: number;
  lastRequestTime: number;
  lastStatusLog: number;
  lastError?: {
    message: string;
    timestamp: number;
  };
  failedPromises: {
    count: number;
    lastReset: number;
  };
}

class RateLimiter {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private stateFile: string;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds timeout for requests

  // Adaptive configuration
  private readonly BASE_DELAY = 1000; // Base delay between requests (1s)
  private readonly MAX_DELAY = 5000; // Maximum delay between requests (5s)
  private readonly BURST_SIZE = 10; // Reduced burst size for better stability
  private readonly BURST_DELAY = 10000; // 10 second pause between bursts
  private readonly HOURLY_LIMIT = 4500; // Keep below GitHub's 5000 limit
  private readonly STATUS_LOG_INTERVAL = 30000; // Log status every 30 seconds

  constructor() {
    // Set up state file in cache directory
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    this.stateFile = path.join(cacheDir, 'rate-limiter-state.json');

    // Initialize state file if it doesn't exist
    if (!fs.existsSync(this.stateFile)) {
      this.saveState({
        tokens: 5000,
        resetTime: Date.now() + 3600000,
        totalRequestsThisHour: 0,
        lastRequestTime: 0,
        lastStatusLog: 0,
        failedPromises: {
          count: 0,
          lastReset: Date.now(),
        },
      });
    }

    // Reset state hourly
    setInterval(async () => {
      const state = await this.loadState();
      state.totalRequestsThisHour = 0;
      state.lastError = undefined;
      state.failedPromises = {
        count: 0,
        lastReset: Date.now(),
      };
      this.saveState(state);

      logger.info(`📊 Rate Limiter Stats:
        Tokens remaining: ${state.tokens}
        Queue size: ${this.queue.length}
        Failed promises: ${state.failedPromises.count}
      `);
    }, 3600000);

    // Monitor queue size and health
    setInterval(() => {
      if (this.queue.length > 0) {
        const oldestRequest = this.queue[0].queuedAt;
        const waitTime = (Date.now() - oldestRequest) / 1000;
        logger.debug(
          `⏳ Queue status: ${this.queue.length} requests waiting, oldest request waiting for ${waitTime.toFixed(1)}s`
        );
      }
    }, 30000);
  }

  private async loadState(): Promise<RateLimiterState> {
    return withErrorHandling(async () => {
      try {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));

        // Validate and recover state if needed
        if (!this.isValidState(state)) {
          logger.warn('Invalid state detected, recovering to default state');
          return this.getDefaultState();
        }

        return state;
      } catch (error) {
        logger.error('Failed to load rate limiter state:', error);
        return this.getDefaultState();
      }
    }, 'loadState');
  }

  private isValidState(state: any): boolean {
    return (
      typeof state === 'object' &&
      typeof state.tokens === 'number' &&
      typeof state.resetTime === 'number' &&
      typeof state.totalRequestsThisHour === 'number' &&
      typeof state.lastRequestTime === 'number' &&
      typeof state.lastStatusLog === 'number'
    );
  }

  private getDefaultState(): RateLimiterState {
    return {
      tokens: 5000,
      resetTime: Date.now() + 3600000,
      totalRequestsThisHour: 0,
      lastRequestTime: 0,
      lastStatusLog: 0,
      failedPromises: {
        count: 0,
        lastReset: Date.now(),
      },
    };
  }

  private async saveState(state: RateLimiterState): Promise<void> {
    return withErrorHandling(async () => {
      try {
        // Create a backup of the current state
        if (fs.existsSync(this.stateFile)) {
          const backupFile = `${this.stateFile}.bak`;
          fs.copyFileSync(this.stateFile, backupFile);
        }

        // Write new state
        fs.writeFileSync(this.stateFile, JSON.stringify(state));

        // Remove backup if write was successful
        const backupFile = `${this.stateFile}.bak`;
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
      } catch (error) {
        // Restore from backup if write failed
        const backupFile = `${this.stateFile}.bak`;
        if (fs.existsSync(backupFile)) {
          fs.copyFileSync(backupFile, this.stateFile);
          fs.unlinkSync(backupFile);
        }
        throw new DatabaseError('Failed to save rate limiter state', 500, { state });
      }
    }, 'saveState');
  }

  updateLimits(remaining: number, resetTime: number): void {
    withErrorHandling(async () => {
      const state = await this.loadState();
      state.tokens = remaining;
      state.resetTime = resetTime * 1000;

      const now = Date.now();
      const shouldLog = now - state.lastStatusLog > this.STATUS_LOG_INTERVAL || remaining < 1000;

      if (shouldLog) {
        state.lastStatusLog = now;
        const remainingTime = Math.max(0, state.resetTime - now) / 1000;
        if (remainingTime > 0) {
          const usagePercent = (
            ((this.HOURLY_LIMIT - remaining) / this.HOURLY_LIMIT) *
            100
          ).toFixed(1);
          logger.info(
            `Rate limit: ${remaining}/${this.HOURLY_LIMIT} remaining (${usagePercent}%), resets in ${Math.ceil(remainingTime / 60)}m, queue: ${this.queue.length}`
          );
        }
      }

      if (remaining < 1000) {
        logger.warn('⚠️ Rate limit running low, increasing delays');
      }

      this.saveState(state);

      if (remaining > 0 && !this.processing) {
        this.processQueue();
      }
    }, 'updateLimits');
  }

  async acquire(key: string): Promise<void> {
    return withErrorHandling(async () => {
      logger.debug(`🔍 DEBUG: Attempting to acquire lock for ${key}...`);

      return new Promise<void>((resolve, reject) => {
        const queueItem: QueueItem = {
          resolve,
          reject,
          repoName: key,
          queuedAt: Date.now(),
          timeout: setTimeout(() => {
            this.handleTimeout(queueItem);
          }, this.REQUEST_TIMEOUT),
        };

        this.queue.push(queueItem);

        if (!this.processing) {
          this.processQueue();
        }
      });
    }, 'acquire');
  }

  private handleTimeout(item: QueueItem): void {
    const index = this.queue.findIndex((queueItem) => queueItem === item);
    if (index >= 0) {
      this.queue.splice(index, 1);
      item.reject(new RateLimitError('Request timed out', 408));
      logger.warn(`⏰ Request timeout for ${item.repoName}`);

      // Update failed promises count
      this.updateFailedPromises();
    }
  }

  private async updateFailedPromises(): Promise<void> {
    const state = await this.loadState();
    state.failedPromises.count++;
    await this.saveState(state);

    // Log warning if too many failures
    if (state.failedPromises.count > 10) {
      logger.error(`⚠️ High number of failed promises: ${state.failedPromises.count}`);
    }
  }

  private async calculateDelay(): Promise<number> {
    return withErrorHandling(async () => {
      const state = await this.loadState();
      const timeSinceLastRequest = Date.now() - state.lastRequestTime;
      const usageRatio = state.totalRequestsThisHour / this.HOURLY_LIMIT;

      let delay = this.BASE_DELAY;
      if (usageRatio > 0.8) {
        delay *= 1.5;
      }
      if (usageRatio > 0.9) {
        delay *= 2;
      }
      if (usageRatio > 0.95) {
        delay = this.MAX_DELAY;
      }

      return Math.max(delay, this.BASE_DELAY - timeSinceLastRequest);
    }, 'calculateDelay');
  }

  private async processQueue(): Promise<void> {
    return withErrorHandling(async () => {
      if (this.processing) {
        logger.debug(`🔍 DEBUG: Process queue already running, queue size: ${this.queue.length}`);
        return;
      }

      logger.debug(`🔍 DEBUG: Starting to process queue, size: ${this.queue.length}`);
      this.processing = true;

      try {
        while (this.queue.length > 0) {
          const state = await this.loadState();
          const currentBurst = Math.min(
            this.BURST_SIZE,
            this.queue.length,
            Math.ceil((state.tokens / 100) * this.BURST_SIZE)
          );

          if (currentBurst === 0) {
            logger.warn('⚠️ Rate limit exhausted, pausing queue processing');
            await new Promise((resolve) => setTimeout(resolve, this.MAX_DELAY));
            continue;
          }

          logger.debug(
            `🔍 DEBUG: Processing burst of ${currentBurst} items, queue size: ${this.queue.length}`
          );

          for (let i = 0; i < currentBurst; i++) {
            const item = this.queue.shift();
            if (item) {
              try {
                // Clear timeout as we're processing the item
                if (item.timeout) {
                  clearTimeout(item.timeout);
                }

                const waitTime = (Date.now() - item.queuedAt) / 1000;
                if (waitTime > 30) {
                  logger.warn(`⏰ Long wait for ${item.repoName}: ${waitTime.toFixed(1)}s`);
                }

                state.totalRequestsThisHour++;
                state.lastRequestTime = Date.now();
                await this.saveState(state);

                item.resolve();

                logger.debug(
                  `🔍 DEBUG: Resolved item for ${item.repoName}, remaining queue: ${this.queue.length}`
                );

                const delay = await this.calculateDelay();
                await new Promise((resolve) => setTimeout(resolve, delay));
              } catch (error) {
                // Handle individual item errors
                logger.error(`Error processing item for ${item.repoName}:`, error);

                if ((item.retryCount || 0) < this.MAX_RETRIES) {
                  // Retry the item
                  item.retryCount = (item.retryCount || 0) + 1;
                  this.queue.push(item);
                  logger.info(
                    `Retrying item for ${item.repoName} (attempt ${item.retryCount}/${this.MAX_RETRIES})`
                  );

                  // Record error in state
                  state.lastError = {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now(),
                  };
                  await this.saveState(state);

                  // Wait before retrying
                  await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
                } else {
                  // Max retries reached, reject with error
                  logger.error(`Max retries reached for ${item.repoName}, rejecting with error`);
                  item.reject(error);
                  await this.updateFailedPromises();
                }
              }
            }
          }

          if (this.queue.length > 0) {
            const burstDelay = Math.min(
              this.BURST_DELAY * (this.queue.length / 100),
              this.BURST_DELAY * 2
            );
            logger.debug(
              `🔍 DEBUG: Adding burst delay of ${burstDelay}ms, queue size: ${this.queue.length}`
            );
            await new Promise((resolve) => setTimeout(resolve, burstDelay));
          }
        }
      } catch (error) {
        logger.error(`🔍 ERROR in processQueue: ${error}`);

        // Record error in state
        const state = await this.loadState();
        state.lastError = {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
        await this.saveState(state);

        // Emergency queue processing
        while (this.queue.length > 0) {
          const item = this.queue.shift();
          if (item) {
            logger.debug(`🔍 DEBUG: Emergency rejecting item for ${item.repoName} due to error`);
            item.reject(error);
            await this.updateFailedPromises();
          }
        }
      } finally {
        this.processing = false;
      }
    }, 'processQueue');
  }
}

export const rateLimiter = new RateLimiter();

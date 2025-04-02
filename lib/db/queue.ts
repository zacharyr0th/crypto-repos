/**
 * Database operation queue
 * Manages concurrent database operations with controlled concurrency
 */

class DatabaseQueue {
  private queue: (() => Promise<void>)[] = [];
  private processing: boolean = false;
  private concurrency: number = 5; // Process 5 operations concurrently
  private activeOperations: number = 0;

  /**
   * Add an operation to the queue
   */
  add(operation: () => Promise<void>): void {
    this.queue.push(operation);
    this.processQueue();
  }

  /**
   * Process queued operations with controlled concurrency
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0 && this.activeOperations < this.concurrency) {
      const operation = this.queue.shift();
      if (!operation) continue;

      this.activeOperations++;

      operation()
        .catch((error) => {})
        .finally(() => {
          this.activeOperations--;
          if (this.queue.length > 0) {
            this.processQueue();
          }
        });
    }

    this.processing = false;
  }

  /**
   * Wait for all queued operations to complete
   */
  async waitForCompletion(): Promise<void> {
    while (this.queue.length > 0 || this.activeOperations > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): { queued: number; active: number } {
    return {
      queued: this.queue.length,
      active: this.activeOperations,
    };
  }
}

// Export singleton instance
export const dbQueue = new DatabaseQueue();

/**
 * Offline Event Queue
 *
 * Queues analytics events when offline and syncs when connection is restored.
 * Uses AsyncStorage for persistence across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// Types
// =============================================================================

export interface QueuedEvent {
  event_name: string;
  params: Record<string, unknown>;
  timestamp: number; // When event occurred
  queued_at: number; // When added to queue
  retry_count: number;
}

interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  ttlDays: number;
  batchSize: number;
}

// =============================================================================
// Constants
// =============================================================================

const QUEUE_STORAGE_KEY = '@ishkul/analytics_queue';
const LAST_SYNC_KEY = '@ishkul/analytics_last_sync';

const DEFAULT_CONFIG: QueueConfig = {
  maxQueueSize: 1000,
  maxRetries: 3,
  ttlDays: 7,
  batchSize: 50,
};

// =============================================================================
// Offline Queue Class
// =============================================================================

class OfflineQueue {
  private queue: QueuedEvent[] = [];
  private config: QueueConfig;
  private isInitialized = false;
  private isSyncing = false;
  private sendBatch: ((events: QueuedEvent[]) => Promise<boolean>) | null =
    null;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the queue by loading persisted events
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedEvent[];
        // Filter out expired events
        const ttlMs = this.config.ttlDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        this.queue = parsed.filter((e) => now - e.queued_at < ttlMs);
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('[Analytics] Failed to load offline queue:', error);
      this.queue = [];
      this.isInitialized = true;
    }
  }

  /**
   * Set the function to send batched events
   */
  setSendBatch(fn: (events: QueuedEvent[]) => Promise<boolean>): void {
    this.sendBatch = fn;
  }

  /**
   * Add an event to the queue
   */
  async enqueue(
    eventName: string,
    params: Record<string, unknown>
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const event: QueuedEvent = {
      event_name: eventName,
      params,
      timestamp: Date.now(),
      queued_at: Date.now(),
      retry_count: 0,
    };

    // Enforce max queue size (remove oldest events)
    if (this.queue.length >= this.config.maxQueueSize) {
      this.queue = this.queue.slice(-this.config.maxQueueSize + 1);
    }

    this.queue.push(event);
    await this.persist();
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue has events
   */
  hasEvents(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Attempt to sync all queued events
   * Returns number of events successfully sent
   */
  async sync(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isSyncing || this.queue.length === 0 || !this.sendBatch) {
      return 0;
    }

    this.isSyncing = true;
    let totalSent = 0;

    try {
      while (this.queue.length > 0) {
        // Get batch of events
        const batch = this.queue.slice(0, this.config.batchSize);

        // Try to send
        const success = await this.sendBatch(batch);

        if (success) {
          // Remove sent events from queue
          this.queue = this.queue.slice(batch.length);
          totalSent += batch.length;
          await this.persist();
        } else {
          // Increment retry count for failed events
          batch.forEach((event) => {
            event.retry_count++;
          });

          // Remove events that exceeded max retries
          this.queue = this.queue.filter(
            (e) => e.retry_count < this.config.maxRetries
          );
          await this.persist();
          break; // Stop trying on failure
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.warn('[Analytics] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }

    return totalSent;
  }

  /**
   * Clear all queued events
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Persist queue to storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('[Analytics] Failed to persist queue:', error);
    }
  }
}

// =============================================================================
// Export Singleton Instance
// =============================================================================

export const offlineQueue = new OfflineQueue();

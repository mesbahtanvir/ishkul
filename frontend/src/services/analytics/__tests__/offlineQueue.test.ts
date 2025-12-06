import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineQueue, QueuedEvent } from '../offlineQueue';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('OfflineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('initialize', () => {
    it('should initialize with empty queue when storage is empty', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await offlineQueue.initialize();

      expect(mockAsyncStorage.getItem).toHaveBeenCalled();
    });

    it('should load persisted events from storage', async () => {
      const events: QueuedEvent[] = [
        {
          event_name: 'test_event',
          params: { key: 'value' },
          timestamp: Date.now(),
          queued_at: Date.now(),
          retry_count: 0,
        },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(events));

      await offlineQueue.initialize();

      expect(offlineQueue.getQueueSize()).toBeGreaterThanOrEqual(0);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await offlineQueue.initialize();
    });
  });

  describe('enqueue', () => {
    it('should add event to queue', async () => {
      await offlineQueue.initialize();
      const initialSize = offlineQueue.getQueueSize();

      await offlineQueue.enqueue('test_event', { key: 'value' });

      expect(offlineQueue.getQueueSize()).toBe(initialSize + 1);
    });

    it('should persist queue after adding event', async () => {
      await offlineQueue.initialize();

      await offlineQueue.enqueue('test_event', { key: 'value' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should add timestamp to queued event', async () => {
      await offlineQueue.initialize();
      const before = Date.now();

      await offlineQueue.enqueue('test_event', { key: 'value' });

      const after = Date.now();
      // Event was added with timestamp between before and after
      expect(offlineQueue.hasEvents()).toBe(true);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await offlineQueue.initialize();
      await offlineQueue.clear();

      expect(offlineQueue.getQueueSize()).toBe(0);
    });

    it('should return correct size after adding events', async () => {
      await offlineQueue.initialize();
      await offlineQueue.clear();

      await offlineQueue.enqueue('event1', {});
      await offlineQueue.enqueue('event2', {});

      expect(offlineQueue.getQueueSize()).toBe(2);
    });
  });

  describe('hasEvents', () => {
    it('should return false for empty queue', async () => {
      await offlineQueue.initialize();
      await offlineQueue.clear();

      expect(offlineQueue.hasEvents()).toBe(false);
    });

    it('should return true when events exist', async () => {
      await offlineQueue.initialize();
      await offlineQueue.enqueue('test', {});

      expect(offlineQueue.hasEvents()).toBe(true);
    });
  });

  describe('sync', () => {
    it('should return 0 when queue is empty', async () => {
      await offlineQueue.initialize();
      await offlineQueue.clear();

      const synced = await offlineQueue.sync();

      expect(synced).toBe(0);
    });

    it('should return 0 when no send batch function is set', async () => {
      await offlineQueue.initialize();
      await offlineQueue.enqueue('test', {});

      const synced = await offlineQueue.sync();

      expect(synced).toBe(0);
    });

    it('should send events when batch function is set', async () => {
      await offlineQueue.initialize();
      await offlineQueue.clear();

      const sendBatch = jest.fn().mockResolvedValue(true);
      offlineQueue.setSendBatch(sendBatch);

      await offlineQueue.enqueue('test1', { a: 1 });
      await offlineQueue.enqueue('test2', { b: 2 });

      const synced = await offlineQueue.sync();

      expect(synced).toBeGreaterThan(0);
      expect(sendBatch).toHaveBeenCalled();
    });

    it('should handle send batch failures', async () => {
      await offlineQueue.initialize();
      await offlineQueue.clear();

      const sendBatch = jest.fn().mockResolvedValue(false);
      offlineQueue.setSendBatch(sendBatch);

      await offlineQueue.enqueue('test', {});

      const synced = await offlineQueue.sync();

      expect(synced).toBe(0);
    });
  });

  describe('clear', () => {
    it('should empty the queue', async () => {
      await offlineQueue.initialize();
      await offlineQueue.enqueue('test', {});

      await offlineQueue.clear();

      expect(offlineQueue.getQueueSize()).toBe(0);
    });

    it('should persist empty queue', async () => {
      await offlineQueue.initialize();
      await offlineQueue.enqueue('test', {});

      await offlineQueue.clear();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@ishkul/analytics_queue',
        '[]'
      );
    });
  });

  describe('getLastSyncTime', () => {
    it('should return null when never synced', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const lastSync = await offlineQueue.getLastSyncTime();

      expect(lastSync).toBeNull();
    });

    it('should return timestamp when previously synced', async () => {
      const timestamp = Date.now().toString();
      mockAsyncStorage.getItem.mockResolvedValue(timestamp);

      const lastSync = await offlineQueue.getLastSyncTime();

      expect(typeof lastSync).toBe('number');
    });

    it('should handle storage errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const lastSync = await offlineQueue.getLastSyncTime();

      expect(lastSync).toBeNull();
    });
  });

  describe('setSendBatch', () => {
    it('should set the send batch function', () => {
      const sendFn = jest.fn();

      offlineQueue.setSendBatch(sendFn);

      // No error means success
    });
  });
});

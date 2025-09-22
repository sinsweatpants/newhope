/**
 * Cache Manager - Advanced caching system with TTL, LRU, and compression
 * Handles multiple cache strategies for optimal performance
 */

interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  metadata?: Record<string, any>;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  enableCompression: boolean;
  compressionThreshold: number; // Compress items larger than this (bytes)
  enablePersistence: boolean;
  persistenceKey: string;
  enableMetrics: boolean;
  cleanupInterval: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  compressionRate: number;
  avgAccessTime: number;
  evictions: number;
}

interface CacheStrategy {
  name: string;
  shouldEvict: (entries: Array<[string, CacheEntry]>) => string[];
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private accessTimes: number[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxEntries: 1000,
    enableCompression: true,
    compressionThreshold: 1024, // 1KB
    enablePersistence: true,
    persistenceKey: 'screenplay-cache',
    enableMetrics: true,
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  };

  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    totalSize: 0,
    compressionRate: 0,
    avgAccessTime: 0,
    evictions: 0
  };

  private strategies: CacheStrategy[] = [
    {
      name: 'LRU',
      shouldEvict: (entries) => this.lruEviction(entries)
    },
    {
      name: 'LFU',
      shouldEvict: (entries) => this.lfuEviction(entries)
    },
    {
      name: 'TTL',
      shouldEvict: (entries) => this.ttlEviction(entries)
    }
  ];

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startCleanupTimer();
    this.loadPersistedCache();
  }

  /**
   * Set item in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      compress?: boolean;
      metadata?: Record<string, any>;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const {
        ttl = this.config.defaultTTL,
        compress = this.config.enableCompression,
        metadata,
        priority = 'normal'
      } = options;

      // Serialize and optionally compress
      let serialized = JSON.stringify(value);
      let compressed = false;
      let size = new Blob([serialized]).size;

      if (compress && size > this.config.compressionThreshold) {
        serialized = await this.compress(serialized);
        compressed = true;
        size = new Blob([serialized]).size;
      }

      const entry: CacheEntry<string> = {
        value: serialized,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        compressed,
        metadata: {
          ...metadata,
          priority,
          originalSize: new Blob([JSON.stringify(value)]).size
        }
      };

      // Check if we need to make space
      await this.ensureSpace(size);

      // Set the entry
      this.cache.set(key, entry);

      // Update metrics
      this.updateMetrics();

      // Persist if enabled
      if (this.config.enablePersistence) {
        this.persistCache();
      }

    } finally {
      if (this.config.enableMetrics) {
        const accessTime = performance.now() - startTime;
        this.recordAccessTime(accessTime);
      }
    }
  }

  /**
   * Get item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      // Check TTL
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      // Decompress if needed
      let value = entry.value;
      if (entry.compressed) {
        value = await this.decompress(value);
      }

      // Parse and return
      const result = JSON.parse(value);

      this.metrics.hits++;
      this.updateHitRate();

      return result;

    } finally {
      if (this.config.enableMetrics) {
        const accessTime = performance.now() - startTime;
        this.recordAccessTime(accessTime);
      }
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMetrics();
      if (this.config.enablePersistence) {
        this.persistCache();
      }
    }
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.updateMetrics();
    if (this.config.enablePersistence) {
      this.clearPersistedCache();
    }
  }

  /**
   * Get multiple items from cache
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Set multiple items in cache
   */
  async setMultiple<T>(
    items: Map<string, T>,
    options: {
      ttl?: number;
      compress?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const promises = Array.from(items.entries()).map(([key, value]) =>
      this.set(key, value, options)
    );

    await Promise.all(promises);
  }

  /**
   * Ensure there's enough space in cache
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    while (
      this.metrics.totalSize + requiredSize > this.config.maxSize ||
      this.metrics.totalEntries >= this.config.maxEntries
    ) {
      await this.evictEntries();
    }
  }

  /**
   * Evict entries using configured strategies
   */
  private async evictEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());

    if (entries.length === 0) return;

    // Apply strategies in order
    for (const strategy of this.strategies) {
      const toEvict = strategy.shouldEvict(entries);

      if (toEvict.length > 0) {
        toEvict.forEach(key => {
          this.cache.delete(key);
          this.metrics.evictions++;
        });

        this.updateMetrics();
        break;
      }
    }
  }

  /**
   * LRU eviction strategy
   */
  private lruEviction(entries: Array<[string, CacheEntry]>): string[] {
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Evict oldest 10% or at least 1
    const evictCount = Math.max(1, Math.ceil(entries.length * 0.1));
    return entries.slice(0, evictCount).map(([key]) => key);
  }

  /**
   * LFU eviction strategy
   */
  private lfuEviction(entries: Array<[string, CacheEntry]>): string[] {
    // Sort by access count (least accessed first)
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);

    // Evict least accessed 10% or at least 1
    const evictCount = Math.max(1, Math.ceil(entries.length * 0.1));
    return entries.slice(0, evictCount).map(([key]) => key);
  }

  /**
   * TTL eviction strategy
   */
  private ttlEviction(entries: Array<[string, CacheEntry]>): string[] {
    const now = Date.now();
    return entries
      .filter(([_, entry]) => this.isExpired(entry, now))
      .map(([key]) => key);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry, now = Date.now()): boolean {
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Compress data using browser compression API or fallback
   */
  private async compress(data: string): Promise<string> {
    try {
      // Use CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(new TextEncoder().encode(data));
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) chunks.push(value);
        }

        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        return btoa(String.fromCharCode(...compressed));
      }

      // Fallback to simple encoding
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.warn('[CacheManager] Compression failed, using original data:', error);
      return data;
    }
  }

  /**
   * Decompress data
   */
  private async decompress(data: string): Promise<string> {
    try {
      // Use DecompressionStream if available
      if ('DecompressionStream' in window) {
        const compressed = new Uint8Array(
          atob(data).split('').map(char => char.charCodeAt(0))
        );

        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(compressed);
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) chunks.push(value);
        }

        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
      }

      // Fallback
      return decodeURIComponent(atob(data));
    } catch (error) {
      console.warn('[CacheManager] Decompression failed:', error);
      return data;
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.totalEntries = this.cache.size;
    this.metrics.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    // Calculate compression rate
    let originalSize = 0;
    let compressedSize = 0;

    for (const entry of this.cache.values()) {
      if (entry.compressed && entry.metadata?.originalSize) {
        originalSize += entry.metadata.originalSize;
        compressedSize += entry.size;
      }
    }

    this.metrics.compressionRate = originalSize > 0 ?
      (1 - compressedSize / originalSize) * 100 : 0;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Record access time for metrics
   */
  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);

    // Keep only recent access times
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-500);
    }

    // Calculate average
    this.metrics.avgAccessTime = this.accessTimes.reduce((sum, t) => sum + t, 0) / this.accessTimes.length;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      this.updateMetrics();
      if (this.config.enablePersistence) {
        this.persistCache();
      }
    }
  }

  /**
   * Persist cache to localStorage
   */
  private persistCache(): void {
    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        timestamp: Date.now()
      };

      localStorage.setItem(this.config.persistenceKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[CacheManager] Failed to persist cache:', error);
    }
  }

  /**
   * Load persisted cache from localStorage
   */
  private loadPersistedCache(): void {
    if (!this.config.enablePersistence) return;

    try {
      const cached = localStorage.getItem(this.config.persistenceKey);
      if (!cached) return;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Filter out expired entries
      const validEntries = cacheData.entries.filter(([_, entry]: [string, CacheEntry]) =>
        !this.isExpired(entry, now)
      );

      this.cache = new Map(validEntries);
      this.updateMetrics();

    } catch (error) {
      console.warn('[CacheManager] Failed to load persisted cache:', error);
    }
  }

  /**
   * Clear persisted cache
   */
  private clearPersistedCache(): void {
    try {
      localStorage.removeItem(this.config.persistenceKey);
    } catch (error) {
      console.warn('[CacheManager] Failed to clear persisted cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheMetrics & {
    config: CacheConfig;
    topKeys: Array<{ key: string; accessCount: number; size: number }>;
  } {
    // Get top accessed keys
    const topKeys = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: entry.size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      ...this.metrics,
      config: this.config,
      topKeys
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startCleanupTimer();
    }
  }

  /**
   * Export cache data
   */
  export(): string {
    const exportData = {
      entries: Array.from(this.cache.entries()),
      metrics: this.metrics,
      config: this.config,
      timestamp: Date.now()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import cache data
   */
  async import(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);

      this.clear();
      this.cache = new Map(importData.entries || []);

      if (importData.config) {
        this.updateConfig(importData.config);
      }

      this.updateMetrics();

      if (this.config.enablePersistence) {
        this.persistCache();
      }

    } catch (error) {
      throw new Error(`Failed to import cache data: ${error}`);
    }
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export default cacheManager;
/**
 * Dynamic Loader - Intelligent lazy loading system for heavy dependencies
 * Manages dynamic imports with caching, error handling, and performance optimization
 */

interface LoaderCache<T = any> {
  [key: string]: {
    promise: Promise<T>;
    timestamp: number;
    size?: number;
    usage: number;
  };
}

interface LoaderConfig {
  maxCacheSize: number;
  cacheExpiry: number;
  preloadThreshold: number;
  enablePreloading: boolean;
  enableCompression: boolean;
  retryAttempts: number;
  retryDelay: number;
}

interface LoaderStats {
  totalLoads: number;
  cacheHits: number;
  cacheMisses: number;
  failedLoads: number;
  averageLoadTime: number;
  memoryUsage: number;
  activeModules: string[];
}

class DynamicLoader {
  private cache: LoaderCache = {};
  private loadTimes: Record<string, number[]> = {};
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;
  private stats: LoaderStats = {
    totalLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    failedLoads: 0,
    averageLoadTime: 0,
    memoryUsage: 0,
    activeModules: []
  };

  private config: LoaderConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    cacheExpiry: 30 * 60 * 1000, // 30 minutes
    preloadThreshold: 3, // Preload after 3 uses
    enablePreloading: true,
    enableCompression: true,
    retryAttempts: 3,
    retryDelay: 1000
  };

  /**
   * Load module with intelligent caching and error handling
   */
  async loadModule<T = any>(
    moduleId: string,
    importFn: () => Promise<T>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      preload?: boolean;
      persist?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalLoads++;

    try {
      // Check cache first
      const cached = this.getCachedModule<T>(moduleId);
      if (cached) {
        this.stats.cacheHits++;
        this.updateUsageStats(moduleId);
        return cached;
      }

      this.stats.cacheMisses++;

      // Load module with timeout and retry logic
      const module = await this.loadWithRetry(
        moduleId,
        importFn,
        options.timeout || 10000
      );

      // Cache the module
      this.cacheModule(moduleId, module, options.persist);

      // Update statistics
      const loadTime = Date.now() - startTime;
      this.updateLoadTimeStats(moduleId, loadTime);

      // Consider for preloading
      if (this.config.enablePreloading && this.shouldPreload(moduleId)) {
        this.addToPreloadQueue(moduleId);
      }

      return module;

    } catch (error) {
      this.stats.failedLoads++;
      console.error(`[DynamicLoader] Failed to load module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Preload modules based on usage patterns
   */
  async preloadModules(moduleIds: string[]): Promise<void> {
    if (this.isPreloading) return;

    this.isPreloading = true;

    try {
      const preloadPromises = moduleIds.map(async (moduleId) => {
        try {
          const importFn = this.getImportFunction(moduleId);
          if (importFn) {
            await this.loadModule(moduleId, importFn, { priority: 'low' });
          }
        } catch (error) {
          console.warn(`[DynamicLoader] Preload failed for ${moduleId}:`, error);
        }
      });

      await Promise.allSettled(preloadPromises);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Load with retry logic and timeout
   */
  private async loadWithRetry<T>(
    moduleId: string,
    importFn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.loadWithTimeout(importFn, timeout);
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          console.warn(`[DynamicLoader] Retry ${attempt} for ${moduleId} after ${delay}ms`);
        }
      }
    }

    throw lastError;
  }

  /**
   * Load with timeout wrapper
   */
  private async loadWithTimeout<T>(
    importFn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Module load timeout after ${timeout}ms`));
      }, timeout);

      importFn()
        .then(module => {
          clearTimeout(timer);
          resolve(module);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get cached module if available and valid
   */
  private getCachedModule<T>(moduleId: string): T | null {
    const cached = this.cache[moduleId];
    if (!cached) return null;

    // Check expiry
    if (Date.now() - cached.timestamp > this.config.cacheExpiry) {
      delete this.cache[moduleId];
      return null;
    }

    return cached.promise as any;
  }

  /**
   * Cache module with memory management
   */
  private cacheModule<T>(moduleId: string, modulePromise: Promise<T>, persist = false): void {
    // Don't cache if memory limit exceeded (unless persistent)
    if (!persist && this.getCurrentCacheSize() > this.config.maxCacheSize) {
      this.cleanupCache();
    }

    this.cache[moduleId] = {
      promise: modulePromise,
      timestamp: Date.now(),
      usage: 1
    };

    this.stats.activeModules = Object.keys(this.cache);
    this.updateMemoryUsage();
  }

  /**
   * Clean up cache by removing least recently used items
   */
  private cleanupCache(): void {
    const entries = Object.entries(this.cache);

    // Sort by usage count and timestamp (LRU)
    entries.sort((a, b) => {
      const usageDiff = a[1].usage - b[1].usage;
      if (usageDiff === 0) {
        return a[1].timestamp - b[1].timestamp;
      }
      return usageDiff;
    });

    // Remove bottom 25% of entries
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      delete this.cache[entries[i][0]];
    }

    this.updateMemoryUsage();
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(moduleId: string): void {
    if (this.cache[moduleId]) {
      this.cache[moduleId].usage++;
    }
  }

  /**
   * Update load time statistics
   */
  private updateLoadTimeStats(moduleId: string, loadTime: number): void {
    if (!this.loadTimes[moduleId]) {
      this.loadTimes[moduleId] = [];
    }

    this.loadTimes[moduleId].push(loadTime);

    // Keep only last 10 load times
    if (this.loadTimes[moduleId].length > 10) {
      this.loadTimes[moduleId] = this.loadTimes[moduleId].slice(-10);
    }

    // Update average load time
    const allTimes = Object.values(this.loadTimes).flat();
    this.stats.averageLoadTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
  }

  /**
   * Determine if module should be preloaded
   */
  private shouldPreload(moduleId: string): boolean {
    const cached = this.cache[moduleId];
    return cached && cached.usage >= this.config.preloadThreshold;
  }

  /**
   * Add module to preload queue
   */
  private addToPreloadQueue(moduleId: string): void {
    this.preloadQueue.add(moduleId);

    // Process queue if not already processing
    if (!this.isPreloading && this.preloadQueue.size > 0) {
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  /**
   * Process preload queue
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) return;

    const moduleIds = Array.from(this.preloadQueue);
    this.preloadQueue.clear();

    await this.preloadModules(moduleIds);
  }

  /**
   * Get import function for known modules
   */
  private getImportFunction(moduleId: string): (() => Promise<any>) | null {
    const importMap: Record<string, () => Promise<any>> = {
      'tesseract.js': () => import('tesseract.js'),
      'pdfjs-dist': () => import('pdfjs-dist'),
      'mammoth': () => import('mammoth'),
      'scribe.js-ocr': () => this.safeImportScribe(),
      'sharp': () => import('sharp'),
      'html2canvas': () => import('html2canvas'),
      'jspdf': () => import('jspdf'),
      'xlsx': () => import('xlsx'),
      'marked': () => import('marked'),
      'highlight.js': () => import('highlight.js'),
      'prettier': () => import('prettier'),
      'monaco-editor': () => import('monaco-editor'),
      'chart.js': () => import('chart.js'),
      'date-fns': () => import('date-fns'),
      'lodash': () => import('lodash'),
      'rxjs': () => import('rxjs')
    };

    return importMap[moduleId] || null;
  }

  /**
   * Safely import scribe.js-ocr with fallback handling
   */
  async safeImportScribe(): Promise<any> {
    try {
      // Only import scribe.js-ocr when actually needed
      const module = await import('scribe.js-ocr');
      return module;
    } catch (error) {
      console.warn('[DynamicLoader] Scribe.js-ocr import failed, using fallback:', error);
      // Return a mock implementation for scribe.js-ocr
      return {
        recognize: async () => {
          throw new Error('Scribe.js-ocr is not available in this environment');
        }
      };
    }
  }

  /**
   * Calculate current cache size (estimated)
   */
  private getCurrentCacheSize(): number {
    // Rough estimation based on number of cached modules
    // In a real implementation, you'd measure actual memory usage
    return Object.keys(this.cache).length * 1024 * 1024; // 1MB per module estimate
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    this.stats.memoryUsage = this.getCurrentCacheSize();
    this.stats.activeModules = Object.keys(this.cache);
  }

  /**
   * Preload critical modules on app startup
   */
  async preloadCriticalModules(): Promise<void> {
    const criticalModules = [
      'tesseract.js',
      'pdfjs-dist',
      'mammoth'
    ];

    console.log('[DynamicLoader] Preloading critical modules...');
    await this.preloadModules(criticalModules);
    console.log('[DynamicLoader] Critical modules preloaded');
  }

  /**
   * Optimize cache based on usage patterns
   */
  optimizeCache(): void {
    const now = Date.now();
    const entries = Object.entries(this.cache);

    // Remove expired entries
    entries.forEach(([moduleId, cached]) => {
      if (now - cached.timestamp > this.config.cacheExpiry) {
        delete this.cache[moduleId];
      }
    });

    // Promote frequently used modules
    entries.forEach(([moduleId, cached]) => {
      if (cached.usage > this.config.preloadThreshold * 2) {
        cached.timestamp = now; // Refresh timestamp for frequently used modules
      }
    });

    this.updateMemoryUsage();
  }

  /**
   * Clear all cached modules
   */
  clearCache(): void {
    this.cache = {};
    this.loadTimes = {};
    this.preloadQueue.clear();
    this.updateMemoryUsage();
  }

  /**
   * Get performance statistics
   */
  getStats(): LoaderStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoaderConfig {
    return { ...this.config };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    cacheHealth: boolean;
    memoryUsage: number;
    activeModules: number;
    avgLoadTime: number;
    errorRate: number;
  }> {
    const errorRate = this.stats.totalLoads > 0
      ? this.stats.failedLoads / this.stats.totalLoads
      : 0;

    const cacheHealth = this.stats.memoryUsage < this.config.maxCacheSize;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (errorRate > 0.1 || !cacheHealth) {
      status = 'degraded';
    }

    if (errorRate > 0.3 || this.stats.memoryUsage > this.config.maxCacheSize * 1.5) {
      status = 'critical';
    }

    return {
      status,
      cacheHealth,
      memoryUsage: this.stats.memoryUsage,
      activeModules: this.stats.activeModules.length,
      avgLoadTime: this.stats.averageLoadTime,
      errorRate
    };
  }
}

// Utility functions for common dynamic imports
export const DynamicImports = {
  /**
   * Load Tesseract.js for OCR
   */
  async loadTesseract() {
    return await dynamicLoader.loadModule(
      'tesseract.js',
      () => import('tesseract.js'),
      { priority: 'high', preload: true }
    );
  },

  /**
   * Load PDF.js for PDF processing
   */
  async loadPdfjs() {
    return await dynamicLoader.loadModule(
      'pdfjs-dist',
      () => import('pdfjs-dist'),
      { priority: 'high', preload: true }
    );
  },

  /**
   * Load Mammoth for DOCX processing
   */
  async loadMammoth() {
    return await dynamicLoader.loadModule(
      'mammoth',
      () => import('mammoth'),
      { priority: 'normal', preload: true }
    );
  },

  /**
   * Load Scribe.js for advanced OCR
   */
  async loadScribe() {
    return await dynamicLoader.loadModule(
      'scribe.js-ocr',
      () => dynamicLoader.safeImportScribe(),
      { priority: 'normal' }
    );
  },

  /**
   * Load HTML2Canvas for screenshots
   */
  async loadHtml2Canvas() {
    return await dynamicLoader.loadModule(
      'html2canvas',
      () => import('html2canvas'),
      { priority: 'low' }
    );
  },

  /**
   * Load jsPDF for PDF export
   */
  async loadJsPDF() {
    return await dynamicLoader.loadModule(
      'jspdf',
      () => import('jspdf'),
      { priority: 'normal' }
    );
  },

  /**
   * Load Monaco Editor
   */
  async loadMonacoEditor() {
    return await dynamicLoader.loadModule(
      'monaco-editor',
      () => import('monaco-editor'),
      { priority: 'low', persist: true }
    );
  },

  /**
   * Load Prettier for code formatting
   */
  async loadPrettier() {
    return await dynamicLoader.loadModule(
      'prettier',
      () => import('prettier'),
      { priority: 'low' }
    );
  }
};

// Export singleton instance
export const dynamicLoader = new DynamicLoader();
export default dynamicLoader;
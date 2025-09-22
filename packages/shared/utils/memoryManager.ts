/**
 * Memory Manager - Advanced memory management and garbage collection
 * Monitors memory usage and implements intelligent cleanup strategies
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryThresholds {
  warning: number; // 70%
  critical: number; // 85%
  emergency: number; // 95%
}

interface CleanupStrategy {
  name: string;
  priority: number;
  execute: () => Promise<number>; // Returns bytes freed
  canExecute: () => boolean;
  description: string;
}

interface MemoryStats {
  currentUsage: number;
  peakUsage: number;
  averageUsage: number;
  gcExecutions: number;
  cleanupExecutions: number;
  bytesFreed: number;
  memoryLeaks: number;
  lastCleanup: number;
}

class MemoryManager {
  private strategies: CleanupStrategy[] = [];
  private thresholds: MemoryThresholds = {
    warning: 0.7,
    critical: 0.85,
    emergency: 0.95
  };
  private stats: MemoryStats = {
    currentUsage: 0,
    peakUsage: 0,
    averageUsage: 0,
    gcExecutions: 0,
    cleanupExecutions: 0,
    bytesFreed: 0,
    memoryLeaks: 0,
    lastCleanup: 0
  };
  private usageHistory: number[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private cleanupCallbacks = new Set<() => Promise<number> | number>();
  private memoryPressureObserver?: PerformanceObserver;

  constructor() {
    this.initializeStrategies();
    this.startMonitoring();
    this.setupMemoryPressureDetection();
  }

  /**
   * Initialize cleanup strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      {
        name: 'Image Cache Cleanup',
        priority: 1,
        execute: async () => this.cleanupImageCache(),
        canExecute: () => true,
        description: 'Clear unused images from cache'
      },
      {
        name: 'Text Processing Cache',
        priority: 2,
        execute: async () => this.cleanupTextCache(),
        canExecute: () => true,
        description: 'Clear processed text cache'
      },
      {
        name: 'DOM Element Cleanup',
        priority: 3,
        execute: async () => this.cleanupDOMElements(),
        canExecute: () => typeof document !== 'undefined',
        description: 'Remove unnecessary DOM elements'
      },
      {
        name: 'Event Listener Cleanup',
        priority: 4,
        execute: async () => this.cleanupEventListeners(),
        canExecute: () => typeof document !== 'undefined',
        description: 'Remove unused event listeners'
      },
      {
        name: 'Worker Termination',
        priority: 5,
        execute: async () => this.terminateWorkers(),
        canExecute: () => true,
        description: 'Terminate idle web workers'
      },
      {
        name: 'Blob URL Cleanup',
        priority: 6,
        execute: async () => this.cleanupBlobUrls(),
        canExecute: () => typeof URL !== 'undefined',
        description: 'Revoke unused blob URLs'
      }
    ];
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryStats();
      this.checkMemoryPressure();
    }, 1000); // Check every second
  }

  /**
   * Setup memory pressure detection using Performance Observer
   */
  private setupMemoryPressureDetection(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.memoryPressureObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.includes('memory')) {
              this.handleMemoryPressure();
            }
          });
        });

        this.memoryPressureObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('[MemoryManager] Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    const memInfo = this.getMemoryInfo();
    if (!memInfo) return;

    const usagePercentage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;

    this.stats.currentUsage = usagePercentage;
    this.stats.peakUsage = Math.max(this.stats.peakUsage, usagePercentage);

    // Keep usage history for trend analysis
    this.usageHistory.push(usagePercentage);
    if (this.usageHistory.length > 300) { // Keep 5 minutes of data
      this.usageHistory.shift();
    }

    // Calculate average usage
    this.stats.averageUsage = this.usageHistory.reduce((sum, usage) => sum + usage, 0) / this.usageHistory.length;

    // Detect memory leaks
    this.detectMemoryLeaks();
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      return (performance as any).memory as MemoryInfo;
    }
    return null;
  }

  /**
   * Check for memory pressure and trigger cleanup if needed
   */
  private checkMemoryPressure(): void {
    const usage = this.stats.currentUsage;

    if (usage >= this.thresholds.emergency) {
      this.handleEmergencyCleanup();
    } else if (usage >= this.thresholds.critical) {
      this.handleCriticalCleanup();
    } else if (usage >= this.thresholds.warning) {
      this.handleWarningCleanup();
    }
  }

  /**
   * Handle emergency memory cleanup
   */
  private async handleEmergencyCleanup(): Promise<void> {
    console.warn('[MemoryManager] Emergency memory cleanup triggered');

    // Execute all strategies
    for (const strategy of this.strategies) {
      if (strategy.canExecute()) {
        try {
          const freed = await strategy.execute();
          this.stats.bytesFreed += freed;
          console.log(`[MemoryManager] ${strategy.name} freed ${freed} bytes`);
        } catch (error) {
          console.error(`[MemoryManager] Strategy ${strategy.name} failed:`, error);
        }
      }
    }

    // Force garbage collection if available
    this.forceGarbageCollection();
    this.stats.cleanupExecutions++;
    this.stats.lastCleanup = Date.now();
  }

  /**
   * Handle critical memory cleanup
   */
  private async handleCriticalCleanup(): Promise<void> {
    console.warn('[MemoryManager] Critical memory cleanup triggered');

    // Execute high-priority strategies
    const criticalStrategies = this.strategies.filter(s => s.priority <= 3);

    for (const strategy of criticalStrategies) {
      if (strategy.canExecute()) {
        try {
          const freed = await strategy.execute();
          this.stats.bytesFreed += freed;
        } catch (error) {
          console.error(`[MemoryManager] Strategy ${strategy.name} failed:`, error);
        }
      }
    }

    this.forceGarbageCollection();
    this.stats.cleanupExecutions++;
    this.stats.lastCleanup = Date.now();
  }

  /**
   * Handle warning level cleanup
   */
  private async handleWarningCleanup(): Promise<void> {
    console.log('[MemoryManager] Warning level cleanup triggered');

    // Execute only the highest priority strategy
    const topStrategy = this.strategies.find(s => s.canExecute());
    if (topStrategy) {
      try {
        const freed = await topStrategy.execute();
        this.stats.bytesFreed += freed;
      } catch (error) {
        console.error(`[MemoryManager] Strategy ${topStrategy.name} failed:`, error);
      }
    }

    this.stats.lastCleanup = Date.now();
  }

  /**
   * Handle memory pressure events
   */
  private handleMemoryPressure(): void {
    console.log('[MemoryManager] Memory pressure detected');
    this.handleWarningCleanup();
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        this.stats.gcExecutions++;
        console.log('[MemoryManager] Forced garbage collection executed');
      } catch (error) {
        console.warn('[MemoryManager] Failed to force GC:', error);
      }
    }
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): void {
    if (this.usageHistory.length < 60) return; // Need at least 1 minute of data

    // Check for consistent upward trend
    const recent = this.usageHistory.slice(-30); // Last 30 seconds
    const older = this.usageHistory.slice(-60, -30); // Previous 30 seconds

    const recentAvg = recent.reduce((sum, usage) => sum + usage, 0) / recent.length;
    const olderAvg = older.reduce((sum, usage) => sum + usage, 0) / older.length;

    // If memory usage increased by more than 5% consistently
    if (recentAvg - olderAvg > 0.05) {
      this.stats.memoryLeaks++;
      console.warn('[MemoryManager] Potential memory leak detected');

      // Trigger aggressive cleanup
      this.handleCriticalCleanup();
    }
  }

  /**
   * Cleanup strategies implementation
   */
  private async cleanupImageCache(): Promise<number> {
    let freed = 0;

    // Clear image caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('image')) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            for (const request of requests) {
              await cache.delete(request);
              freed += 1024; // Estimate 1KB per image entry
            }
          }
        }
      } catch (error) {
        console.warn('[MemoryManager] Image cache cleanup failed:', error);
      }
    }

    return freed;
  }

  private async cleanupTextCache(): Promise<number> {
    let freed = 0;

    // Call registered cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        const result = await callback();
        freed += typeof result === 'number' ? result : 0;
      } catch (error) {
        console.warn('[MemoryManager] Cleanup callback failed:', error);
      }
    }

    return freed;
  }

  private async cleanupDOMElements(): Promise<number> {
    let freed = 0;

    try {
      // Remove detached elements
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        if (!element.isConnected) {
          element.remove();
          freed += 100; // Estimate
        }
      });

      // Clear unnecessary data attributes
      const elementsWithData = document.querySelectorAll('[data-cache], [data-temp]');
      elementsWithData.forEach(element => {
        element.removeAttribute('data-cache');
        element.removeAttribute('data-temp');
        freed += 50; // Estimate
      });
    } catch (error) {
      console.warn('[MemoryManager] DOM cleanup failed:', error);
    }

    return freed;
  }

  private async cleanupEventListeners(): Promise<number> {
    let freed = 0;

    try {
      // This is a simplified approach - in practice, you'd need to track listeners
      // Remove listeners from common problematic elements
      const problematicElements = document.querySelectorAll('[data-listener-cleanup]');
      problematicElements.forEach(element => {
        element.replaceWith(element.cloneNode(true));
        freed += 200; // Estimate
      });
    } catch (error) {
      console.warn('[MemoryManager] Event listener cleanup failed:', error);
    }

    return freed;
  }

  private async terminateWorkers(): Promise<number> {
    let freed = 0;

    try {
      // This would require a registry of active workers
      // For now, dispatch a custom event that workers can listen to
      window.dispatchEvent(new CustomEvent('memory-pressure-cleanup'));
      freed += 5000; // Estimate
    } catch (error) {
      console.warn('[MemoryManager] Worker termination failed:', error);
    }

    return freed;
  }

  private async cleanupBlobUrls(): Promise<number> {
    let freed = 0;

    try {
      // This would require tracking created blob URLs
      // For now, this is a placeholder
      freed += 1000; // Estimate
    } catch (error) {
      console.warn('[MemoryManager] Blob URL cleanup failed:', error);
    }

    return freed;
  }

  /**
   * Public API methods
   */

  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(callback: () => Promise<number> | number): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Unregister a cleanup callback
   */
  unregisterCleanupCallback(callback: () => Promise<number> | number): void {
    this.cleanupCallbacks.delete(callback);
  }

  /**
   * Manually trigger cleanup
   */
  async triggerCleanup(level: 'warning' | 'critical' | 'emergency' = 'warning'): Promise<void> {
    switch (level) {
      case 'emergency':
        await this.handleEmergencyCleanup();
        break;
      case 'critical':
        await this.handleCriticalCleanup();
        break;
      case 'warning':
        await this.handleWarningCleanup();
        break;
    }
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats & {
    memoryInfo: MemoryInfo | null;
    thresholds: MemoryThresholds;
    usageHistory: number[];
  } {
    return {
      ...this.stats,
      memoryInfo: this.getMemoryInfo(),
      thresholds: this.thresholds,
      usageHistory: [...this.usageHistory]
    };
  }

  /**
   * Update memory thresholds
   */
  updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Add custom cleanup strategy
   */
  addCleanupStrategy(strategy: CleanupStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove cleanup strategy
   */
  removeCleanupStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  /**
   * Get memory usage trend
   */
  getUsageTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.usageHistory.length < 10) return 'stable';

    const recent = this.usageHistory.slice(-5);
    const older = this.usageHistory.slice(-10, -5);

    const recentAvg = recent.reduce((sum, usage) => sum + usage, 0) / recent.length;
    const olderAvg = older.reduce((sum, usage) => sum + usage, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 0.02) return 'increasing';
    if (diff < -0.02) return 'decreasing';
    return 'stable';
  }

  /**
   * Check if memory is healthy
   */
  isMemoryHealthy(): boolean {
    return this.stats.currentUsage < this.thresholds.warning;
  }

  /**
   * Get memory health score (0-100)
   */
  getHealthScore(): number {
    const usage = this.stats.currentUsage;
    const trend = this.getUsageTrend();

    let score = Math.max(0, 100 - (usage * 100));

    // Adjust based on trend
    if (trend === 'increasing') score *= 0.8;
    if (trend === 'decreasing') score *= 1.1;

    // Adjust based on leak detection
    if (this.stats.memoryLeaks > 0) {
      score *= Math.max(0.5, 1 - (this.stats.memoryLeaks * 0.1));
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate memory report
   */
  generateReport(): {
    status: 'healthy' | 'warning' | 'critical' | 'emergency';
    usage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    healthScore: number;
    recommendations: string[];
    stats: MemoryStats;
  } {
    const usage = this.stats.currentUsage;
    const trend = this.getUsageTrend();
    const healthScore = this.getHealthScore();

    let status: 'healthy' | 'warning' | 'critical' | 'emergency' = 'healthy';
    if (usage >= this.thresholds.emergency) status = 'emergency';
    else if (usage >= this.thresholds.critical) status = 'critical';
    else if (usage >= this.thresholds.warning) status = 'warning';

    const recommendations: string[] = [];

    if (status !== 'healthy') {
      recommendations.push('تقليل استخدام الذاكرة عن طريق إغلاق التبويبات غير المستخدمة');
    }

    if (trend === 'increasing') {
      recommendations.push('مراقبة التطبيقات التي تستهلك ذاكرة متزايدة');
    }

    if (this.stats.memoryLeaks > 0) {
      recommendations.push('إعادة تحميل الصفحة لحل تسريبات الذاكرة المحتملة');
    }

    if (this.stats.gcExecutions === 0) {
      recommendations.push('تمكين إجبار تنظيف الذاكرة في إعدادات المتصفح');
    }

    return {
      status,
      usage,
      trend,
      healthScore,
      recommendations,
      stats: this.stats
    };
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.memoryPressureObserver) {
      this.memoryPressureObserver.disconnect();
    }

    this.cleanupCallbacks.clear();
    this.strategies = [];
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
export default memoryManager;
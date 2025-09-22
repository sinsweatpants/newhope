/**
 * Performance Optimizer - Advanced performance monitoring and optimization
 * Manages memory, processing, and rendering optimizations
 */

interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  renderingMetrics: {
    fps: number;
    frameDrops: number;
    averageFrameTime: number;
  };
  processingMetrics: {
    cpuUsage: number;
    taskQueueLength: number;
    averageTaskTime: number;
  };
  networkMetrics: {
    requestCount: number;
    averageLatency: number;
    failureRate: number;
  };
  userInteractionMetrics: {
    inputLatency: number;
    scrollPerformance: number;
    clickResponsiveness: number;
  };
}

interface OptimizationConfig {
  enableAutomaticGC: boolean;
  memoryThreshold: number;
  fpsTarget: number;
  taskBatchSize: number;
  renderThrottleMs: number;
  enableVirtualization: boolean;
  enableImageOptimization: boolean;
  enableTextOptimization: boolean;
  enableCacheOptimization: boolean;
  debugMode: boolean;
}

interface TaskQueueItem {
  id: string;
  task: () => Promise<any> | any;
  priority: 'high' | 'normal' | 'low';
  timeout?: number;
  retries: number;
  maxRetries: number;
  timestamp: number;
}

class PerformanceOptimizer {
  private config: OptimizationConfig = {
    enableAutomaticGC: true,
    memoryThreshold: 80, // 80% memory usage threshold
    fpsTarget: 60,
    taskBatchSize: 10,
    renderThrottleMs: 16, // ~60fps
    enableVirtualization: true,
    enableImageOptimization: true,
    enableTextOptimization: true,
    enableCacheOptimization: true,
    debugMode: false
  };

  private metrics: PerformanceMetrics = {
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    renderingMetrics: { fps: 0, frameDrops: 0, averageFrameTime: 0 },
    processingMetrics: { cpuUsage: 0, taskQueueLength: 0, averageTaskTime: 0 },
    networkMetrics: { requestCount: 0, averageLatency: 0, failureRate: 0 },
    userInteractionMetrics: { inputLatency: 0, scrollPerformance: 0, clickResponsiveness: 0 }
  };

  private taskQueue: TaskQueueItem[] = [];
  private isProcessingTasks = false;
  private frameTimeHistory: number[] = [];
  private networkRequests: { start: number; end?: number; success: boolean }[] = [];
  private renderCallbacks: Set<() => void> = new Set();
  private memoryCleanupCallbacks: Set<() => void> = new Set();
  private optimizationIntervals: NodeJS.Timeout[] = [];

  constructor() {
    this.initializeMonitoring();
    this.startOptimizationLoop();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    // Memory monitoring
    this.startMemoryMonitoring();

    // FPS monitoring
    this.startFPSMonitoring();

    // Network monitoring
    this.startNetworkMonitoring();

    // User interaction monitoring
    this.startInteractionMonitoring();

    // Task queue monitoring
    this.startTaskQueueMonitoring();
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    const updateMemoryStats = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        };

        // Trigger GC if memory usage is high
        if (this.config.enableAutomaticGC &&
            this.metrics.memoryUsage.percentage > this.config.memoryThreshold) {
          this.triggerMemoryCleanup();
        }
      }
    };

    const interval = setInterval(updateMemoryStats, 1000);
    this.optimizationIntervals.push(interval);
  }

  /**
   * Start FPS monitoring
   */
  private startFPSMonitoring(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let frameDrops = 0;

    const measureFrame = (currentTime: number) => {
      const frameTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      frameCount++;

      // Track frame time
      this.frameTimeHistory.push(frameTime);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }

      // Calculate average frame time
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.metrics.renderingMetrics.averageFrameTime = avgFrameTime;

      // Calculate FPS
      this.metrics.renderingMetrics.fps = 1000 / avgFrameTime;

      // Detect frame drops
      if (frameTime > (1000 / this.config.fpsTarget) * 1.5) {
        frameDrops++;
      }
      this.metrics.renderingMetrics.frameDrops = frameDrops;

      // Reset frame count every second
      if (frameCount >= 60) {
        frameCount = 0;
        frameDrops = 0;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const requestInfo = { start: startTime, success: false };
      this.networkRequests.push(requestInfo);

      try {
        const response = await originalFetch(...args);
        requestInfo.success = response.ok;
        requestInfo.end = performance.now();
        this.updateNetworkMetrics();
        return response;
      } catch (error) {
        requestInfo.success = false;
        requestInfo.end = performance.now();
        this.updateNetworkMetrics();
        throw error;
      }
    };
  }

  /**
   * Update network metrics
   */
  private updateNetworkMetrics(): void {
    const recentRequests = this.networkRequests.slice(-100); // Keep last 100 requests
    this.networkRequests = recentRequests;

    const completedRequests = recentRequests.filter(req => req.end !== undefined);

    this.metrics.networkMetrics.requestCount = recentRequests.length;

    if (completedRequests.length > 0) {
      const totalLatency = completedRequests.reduce((sum, req) =>
        sum + (req.end! - req.start), 0);
      this.metrics.networkMetrics.averageLatency = totalLatency / completedRequests.length;

      const failures = completedRequests.filter(req => !req.success).length;
      this.metrics.networkMetrics.failureRate = failures / completedRequests.length;
    }
  }

  /**
   * Start user interaction monitoring
   */
  private startInteractionMonitoring(): void {
    let lastInputTime = 0;

    // Input latency monitoring
    document.addEventListener('input', () => {
      const now = performance.now();
      if (lastInputTime > 0) {
        this.metrics.userInteractionMetrics.inputLatency = now - lastInputTime;
      }
      lastInputTime = now;
    });

    // Click responsiveness monitoring
    document.addEventListener('click', (event) => {
      const startTime = performance.now();

      requestAnimationFrame(() => {
        const endTime = performance.now();
        this.metrics.userInteractionMetrics.clickResponsiveness = endTime - startTime;
      });
    });

    // Scroll performance monitoring
    let lastScrollTime = 0;
    document.addEventListener('scroll', () => {
      const now = performance.now();
      if (lastScrollTime > 0) {
        this.metrics.userInteractionMetrics.scrollPerformance = now - lastScrollTime;
      }
      lastScrollTime = now;
    });
  }

  /**
   * Start task queue monitoring
   */
  private startTaskQueueMonitoring(): void {
    const updateTaskMetrics = () => {
      this.metrics.processingMetrics.taskQueueLength = this.taskQueue.length;

      // Estimate CPU usage based on task queue and processing time
      const queueLoad = Math.min(this.taskQueue.length / 100, 1);
      const processingLoad = this.isProcessingTasks ? 0.3 : 0;
      this.metrics.processingMetrics.cpuUsage = (queueLoad + processingLoad) * 100;
    };

    const interval = setInterval(updateTaskMetrics, 500);
    this.optimizationIntervals.push(interval);
  }

  /**
   * Start optimization loop
   */
  private startOptimizationLoop(): void {
    const optimizationLoop = () => {
      // Process task queue
      if (!this.isProcessingTasks && this.taskQueue.length > 0) {
        this.processTasks();
      }

      // Run render optimizations
      this.optimizeRendering();

      // Run memory optimizations
      this.optimizeMemory();

      // Schedule next optimization cycle
      setTimeout(optimizationLoop, 100);
    };

    optimizationLoop();
  }

  /**
   * Add task to processing queue
   */
  async addTask<T>(
    id: string,
    task: () => Promise<T> | T,
    options: {
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      };

      const taskItem: TaskQueueItem = {
        id,
        task: wrappedTask,
        priority: options.priority || 'normal',
        timeout: options.timeout,
        retries: 0,
        maxRetries: options.maxRetries || 3,
        timestamp: Date.now()
      };

      // Insert task based on priority
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      let insertIndex = this.taskQueue.length;

      for (let i = 0; i < this.taskQueue.length; i++) {
        if (priorityOrder[taskItem.priority] < priorityOrder[this.taskQueue[i].priority]) {
          insertIndex = i;
          break;
        }
      }

      this.taskQueue.splice(insertIndex, 0, taskItem);
    });
  }

  /**
   * Process tasks from queue
   */
  private async processTasks(): Promise<void> {
    if (this.isProcessingTasks || this.taskQueue.length === 0) return;

    this.isProcessingTasks = true;

    try {
      const batchSize = Math.min(this.config.taskBatchSize, this.taskQueue.length);
      const batch = this.taskQueue.splice(0, batchSize);

      const taskPromises = batch.map(async (taskItem) => {
        const startTime = performance.now();

        try {
          let result;
          if (taskItem.timeout) {
            result = await this.executeWithTimeout(taskItem.task, taskItem.timeout);
          } else {
            result = await taskItem.task();
          }

          const endTime = performance.now();
          this.updateTaskTimeMetrics(endTime - startTime);

          return { success: true, result };
        } catch (error) {
          taskItem.retries++;

          if (taskItem.retries < taskItem.maxRetries) {
            // Re-queue for retry
            this.taskQueue.unshift(taskItem);
          }

          return { success: false, error };
        }
      });

      await Promise.allSettled(taskPromises);

    } finally {
      this.isProcessingTasks = false;
    }
  }

  /**
   * Execute task with timeout
   */
  private async executeWithTimeout<T>(
    task: () => Promise<T> | T,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(task())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Update task time metrics
   */
  private updateTaskTimeMetrics(taskTime: number): void {
    // Simple moving average
    const currentAvg = this.metrics.processingMetrics.averageTaskTime;
    this.metrics.processingMetrics.averageTaskTime =
      currentAvg === 0 ? taskTime : (currentAvg + taskTime) / 2;
  }

  /**
   * Optimize rendering performance
   */
  private optimizeRendering(): void {
    if (!this.config.enableVirtualization) return;

    // Throttle render callbacks
    if (this.renderCallbacks.size > 0) {
      const callbacks = Array.from(this.renderCallbacks);
      this.renderCallbacks.clear();

      requestAnimationFrame(() => {
        callbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.warn('[PerformanceOptimizer] Render callback error:', error);
          }
        });
      });
    }
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemory(): void {
    if (this.metrics.memoryUsage.percentage > this.config.memoryThreshold) {
      this.triggerMemoryCleanup();
    }
  }

  /**
   * Trigger memory cleanup
   */
  private triggerMemoryCleanup(): void {
    if (this.config.debugMode) {
      console.log('[PerformanceOptimizer] Triggering memory cleanup');
    }

    // Run cleanup callbacks
    this.memoryCleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[PerformanceOptimizer] Memory cleanup callback error:', error);
      }
    });

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Register render callback
   */
  scheduleRender(callback: () => void): void {
    this.renderCallbacks.add(callback);
  }

  /**
   * Register memory cleanup callback
   */
  registerMemoryCleanup(callback: () => void): void {
    this.memoryCleanupCallbacks.add(callback);
  }

  /**
   * Unregister memory cleanup callback
   */
  unregisterMemoryCleanup(callback: () => void): void {
    this.memoryCleanupCallbacks.delete(callback);
  }

  /**
   * Optimize text processing
   */
  optimizeTextProcessing(text: string): string {
    if (!this.config.enableTextOptimization) return text;

    // Remove excessive whitespace
    let optimized = text.replace(/\s+/g, ' ').trim();

    // Limit very long lines
    const maxLineLength = 1000;
    const lines = optimized.split('\n');
    optimized = lines.map(line =>
      line.length > maxLineLength ? line.substring(0, maxLineLength) + '...' : line
    ).join('\n');

    return optimized;
  }

  /**
   * Optimize image processing
   */
  async optimizeImage(
    imageData: Blob | File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'webp' | 'png';
    } = {}
  ): Promise<Blob> {
    if (!this.config.enableImageOptimization) {
      return imageData;
    }

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Resize and compress
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Image optimization failed')),
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageData);
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const weights = {
      memory: 0.3,
      fps: 0.3,
      responsiveness: 0.2,
      network: 0.2
    };

    // Memory score (inverted - lower usage is better)
    const memoryScore = Math.max(0, 100 - this.metrics.memoryUsage.percentage);

    // FPS score
    const fpsScore = Math.min(100, (this.metrics.renderingMetrics.fps / this.config.fpsTarget) * 100);

    // Responsiveness score (inverted - lower latency is better)
    const responsivenessScore = Math.max(0, 100 - (this.metrics.userInteractionMetrics.inputLatency / 10));

    // Network score (inverted - lower failure rate is better)
    const networkScore = Math.max(0, 100 - (this.metrics.networkMetrics.failureRate * 100));

    return (
      memoryScore * weights.memory +
      fpsScore * weights.fps +
      responsivenessScore * weights.responsiveness +
      networkScore * weights.network
    );
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    score: number;
    metrics: PerformanceMetrics;
    recommendations: string[];
    alerts: string[];
  } {
    const score = this.getPerformanceScore();
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Memory recommendations
    if (this.metrics.memoryUsage.percentage > 80) {
      alerts.push('استخدام الذاكرة مرتفع');
      recommendations.push('قم بتنظيف البيانات غير المستخدمة');
    }

    // FPS recommendations
    if (this.metrics.renderingMetrics.fps < 30) {
      alerts.push('أداء الرسم منخفض');
      recommendations.push('قلل من تعقيد العناصر المرئية');
    }

    // Network recommendations
    if (this.metrics.networkMetrics.failureRate > 0.1) {
      alerts.push('معدل فشل الشبكة مرتفع');
      recommendations.push('تحقق من اتصال الإنترنت');
    }

    // Responsiveness recommendations
    if (this.metrics.userInteractionMetrics.inputLatency > 100) {
      alerts.push('استجابة التفاعل بطيئة');
      recommendations.push('قلل من العمليات الثقيلة أثناء الإدخال');
    }

    return {
      score,
      metrics: this.getMetrics(),
      recommendations,
      alerts
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    // Clear all intervals
    this.optimizationIntervals.forEach(interval => clearInterval(interval));
    this.optimizationIntervals = [];

    // Clear queues and callbacks
    this.taskQueue = [];
    this.renderCallbacks.clear();
    this.memoryCleanupCallbacks.clear();
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
export default performanceOptimizer;
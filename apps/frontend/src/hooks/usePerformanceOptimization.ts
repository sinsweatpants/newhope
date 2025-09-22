/**
 * Performance Optimization Hook - React hook for managing performance optimizations
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { performanceOptimizer } from '@shared/utils/performanceOptimizer';
import { memoryManager } from '@shared/utils/memoryManager';
import { dynamicLoader } from '@shared/utils/dynamicLoader';
import { cacheManager } from '@shared/utils/cacheManager';

interface PerformanceConfig {
  enableMemoryMonitoring: boolean;
  enableRenderOptimization: boolean;
  enableTaskQueuing: boolean;
  enableCaching: boolean;
  memoryThreshold: number;
  renderThrottleMs: number;
}

interface PerformanceMetrics {
  memoryUsage: number;
  fps: number;
  taskQueueLength: number;
  cacheHitRate: number;
  healthScore: number;
}

interface PerformanceActions {
  optimizeImage: (file: File) => Promise<Blob>;
  optimizeText: (text: string) => string;
  scheduleTask: <T>(id: string, task: () => Promise<T> | T, priority?: 'high' | 'normal' | 'low') => Promise<T>;
  scheduleRender: (callback: () => void) => void;
  triggerCleanup: (level?: 'warning' | 'critical' | 'emergency') => Promise<void>;
  preloadModule: (moduleId: string) => Promise<void>;
}

export function usePerformanceOptimization(config?: Partial<PerformanceConfig>) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    fps: 0,
    taskQueueLength: 0,
    cacheHitRate: 0,
    healthScore: 100
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const cleanupCallbackRef = useRef<() => number>();

  const defaultConfig: PerformanceConfig = {
    enableMemoryMonitoring: true,
    enableRenderOptimization: true,
    enableTaskQueuing: true,
    enableCaching: true,
    memoryThreshold: 80,
    renderThrottleMs: 16,
    ...config
  };

  /**
   * Update performance metrics
   */
  const updateMetrics = useCallback(() => {
    const perfMetrics = performanceOptimizer.getMetrics();
    const memoryStats = memoryManager.getStats();
    const cacheStats = cacheManager.getStats();

    setMetrics({
      memoryUsage: perfMetrics.memoryUsage.percentage,
      fps: perfMetrics.renderingMetrics.fps,
      taskQueueLength: perfMetrics.processingMetrics.taskQueueLength,
      cacheHitRate: cacheStats.hitRate,
      healthScore: memoryManager.getHealthScore()
    });
  }, []);

  /**
   * Initialize performance monitoring
   */
  useEffect(() => {
    if (!defaultConfig.enableMemoryMonitoring) return;

    // Update configuration
    performanceOptimizer.updateConfig({
      memoryThreshold: defaultConfig.memoryThreshold,
      renderThrottleMs: defaultConfig.renderThrottleMs,
      enableVirtualization: defaultConfig.enableRenderOptimization,
      enableCacheOptimization: defaultConfig.enableCaching
    });

    // Start metrics collection
    updateMetrics();
    metricsIntervalRef.current = setInterval(updateMetrics, 1000);

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [defaultConfig, updateMetrics]);

  /**
   * Register component cleanup callback
   */
  useEffect(() => {
    cleanupCallbackRef.current = () => {
      // Component-specific cleanup
      return 1024; // Estimate bytes freed
    };

    if (defaultConfig.enableMemoryMonitoring) {
      memoryManager.registerCleanupCallback(cleanupCallbackRef.current);
    }

    return () => {
      if (cleanupCallbackRef.current && defaultConfig.enableMemoryMonitoring) {
        memoryManager.unregisterCleanupCallback(cleanupCallbackRef.current);
      }
    };
  }, [defaultConfig.enableMemoryMonitoring]);

  /**
   * Optimize image files
   */
  const optimizeImage = useCallback(async (file: File): Promise<Blob> => {
    setIsOptimizing(true);
    try {
      return await performanceOptimizer.optimizeImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'jpeg'
      });
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  /**
   * Optimize text content
   */
  const optimizeText = useCallback((text: string): string => {
    return performanceOptimizer.optimizeTextProcessing(text);
  }, []);

  /**
   * Schedule a task with priority
   */
  const scheduleTask = useCallback(async <T>(
    id: string,
    task: () => Promise<T> | T,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> => {
    if (!defaultConfig.enableTaskQueuing) {
      return await task();
    }

    return await performanceOptimizer.addTask(id, task, {
      priority,
      timeout: 30000,
      maxRetries: 3
    });
  }, [defaultConfig.enableTaskQueuing]);

  /**
   * Schedule a render operation
   */
  const scheduleRender = useCallback((callback: () => void) => {
    if (!defaultConfig.enableRenderOptimization) {
      callback();
      return;
    }

    performanceOptimizer.scheduleRender(callback);
  }, [defaultConfig.enableRenderOptimization]);

  /**
   * Trigger memory cleanup
   */
  const triggerCleanup = useCallback(async (
    level: 'warning' | 'critical' | 'emergency' = 'warning'
  ) => {
    setIsOptimizing(true);
    try {
      await memoryManager.triggerCleanup(level);
      updateMetrics();
    } finally {
      setIsOptimizing(false);
    }
  }, [updateMetrics]);

  /**
   * Preload a module
   */
  const preloadModule = useCallback(async (moduleId: string) => {
    try {
      await dynamicLoader.preloadModules([moduleId]);
    } catch (error) {
      console.warn(`Failed to preload module ${moduleId}:`, error);
    }
  }, []);

  /**
   * Get performance recommendations
   */
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.memoryUsage > 80) {
      recommendations.push('استخدام الذاكرة مرتفع - قم بتنظيف البيانات');
    }

    if (metrics.fps < 30) {
      recommendations.push('أداء الرسم منخفض - قلل من تعقيد العناصر');
    }

    if (metrics.taskQueueLength > 50) {
      recommendations.push('طابور المهام مكتظ - قلل من العمليات المتزامنة');
    }

    if (metrics.cacheHitRate < 50) {
      recommendations.push('معدل إصابة التخزين المؤقت منخفض - راجع استراتيجية التخزين');
    }

    return recommendations;
  }, [metrics]);

  /**
   * Performance actions object
   */
  const actions: PerformanceActions = {
    optimizeImage,
    optimizeText,
    scheduleTask,
    scheduleRender,
    triggerCleanup,
    preloadModule
  };

  /**
   * Auto-optimization effect
   */
  useEffect(() => {
    if (!defaultConfig.enableMemoryMonitoring) return;

    // Auto cleanup when memory usage is high
    if (metrics.memoryUsage > defaultConfig.memoryThreshold) {
      triggerCleanup('warning');
    }

    // Auto cleanup when health score is low
    if (metrics.healthScore < 50) {
      triggerCleanup('critical');
    }
  }, [metrics, defaultConfig, triggerCleanup]);

  return {
    metrics,
    actions,
    isOptimizing,
    config: defaultConfig,
    recommendations: getRecommendations()
  };
}

/**
 * Hook for caching with performance optimization
 */
export function useOptimizedCache<T>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Get value from cache
   */
  const get = useCallback(async (): Promise<T | undefined> => {
    setIsLoading(true);
    try {
      const cached = await cacheManager.get<T>(key);
      if (cached !== null) {
        setValue(cached);
        return cached;
      }
      return defaultValue;
    } finally {
      setIsLoading(false);
    }
  }, [key, defaultValue]);

  /**
   * Set value in cache
   */
  const set = useCallback(async (
    newValue: T,
    options?: {
      ttl?: number;
      compress?: boolean;
      priority?: 'high' | 'normal' | 'low';
    }
  ) => {
    setIsLoading(true);
    try {
      await cacheManager.set(key, newValue, options);
      setValue(newValue);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  /**
   * Remove value from cache
   */
  const remove = useCallback(() => {
    cacheManager.delete(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  /**
   * Load value on mount
   */
  useEffect(() => {
    get();
  }, [get]);

  return {
    value,
    isLoading,
    get,
    set,
    remove
  };
}

/**
 * Hook for dynamic module loading with performance optimization
 */
export function useDynamicModule<T>(moduleId: string, importFn: () => Promise<T>) {
  const [module, setModule] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load module
   */
  const load = useCallback(async () => {
    if (module || isLoading) return module;

    setIsLoading(true);
    setError(null);

    try {
      const loadedModule = await dynamicLoader.loadModule(
        moduleId,
        importFn,
        { priority: 'normal', preload: true }
      );

      setModule(loadedModule);
      return loadedModule;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Module loading failed');
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, importFn, module, isLoading]);

  /**
   * Preload module
   */
  const preload = useCallback(async () => {
    if (module) return;

    try {
      await dynamicLoader.loadModule(
        moduleId,
        importFn,
        { priority: 'low', preload: true }
      );
    } catch (error) {
      console.warn(`Failed to preload module ${moduleId}:`, error);
    }
  }, [moduleId, importFn, module]);

  return {
    module,
    isLoading,
    error,
    load,
    preload
  };
}

/**
 * Hook for performance monitoring in components
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(0);
  const [renderMetrics, setRenderMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    mountTime: 0
  });

  /**
   * Track component mount
   */
  useEffect(() => {
    mountTimeRef.current = performance.now();
    performance.mark(`${componentName}-mount-start`);

    return () => {
      const mountTime = performance.now() - mountTimeRef.current;
      performance.mark(`${componentName}-mount-end`);
      performance.measure(
        `${componentName}-mount`,
        `${componentName}-mount-start`,
        `${componentName}-mount-end`
      );

      console.log(`[Performance] ${componentName} mount time: ${mountTime.toFixed(2)}ms`);
    };
  }, [componentName]);

  /**
   * Track renders
   */
  useEffect(() => {
    const renderStart = performance.now();
    renderCountRef.current++;

    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStart;

      setRenderMetrics(prev => {
        const newAverageRenderTime = prev.averageRenderTime === 0
          ? renderTime
          : (prev.averageRenderTime + renderTime) / 2;

        return {
          renderCount: renderCountRef.current,
          averageRenderTime: newAverageRenderTime,
          mountTime: performance.now() - mountTimeRef.current
        };
      });

      if (renderTime > 16) { // More than one frame
        console.warn(`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`);
      }
    });
  });

  return renderMetrics;
}
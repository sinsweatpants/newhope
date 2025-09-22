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
  const scheduleTask = useCallback(async <T>(\n    id: string,\n    task: () => Promise<T> | T,\n    priority: 'high' | 'normal' | 'low' = 'normal'\n  ): Promise<T> => {\n    if (!defaultConfig.enableTaskQueuing) {\n      return await task();\n    }\n\n    return await performanceOptimizer.addTask(id, task, {\n      priority,\n      timeout: 30000,\n      maxRetries: 3\n    });\n  }, [defaultConfig.enableTaskQueuing]);\n\n  /**\n   * Schedule a render operation\n   */\n  const scheduleRender = useCallback((callback: () => void) => {\n    if (!defaultConfig.enableRenderOptimization) {\n      callback();\n      return;\n    }\n\n    performanceOptimizer.scheduleRender(callback);\n  }, [defaultConfig.enableRenderOptimization]);\n\n  /**\n   * Trigger memory cleanup\n   */\n  const triggerCleanup = useCallback(async (\n    level: 'warning' | 'critical' | 'emergency' = 'warning'\n  ) => {\n    setIsOptimizing(true);\n    try {\n      await memoryManager.triggerCleanup(level);\n      updateMetrics();\n    } finally {\n      setIsOptimizing(false);\n    }\n  }, [updateMetrics]);\n\n  /**\n   * Preload a module\n   */\n  const preloadModule = useCallback(async (moduleId: string) => {\n    try {\n      await dynamicLoader.preloadModules([moduleId]);\n    } catch (error) {\n      console.warn(`Failed to preload module ${moduleId}:`, error);\n    }\n  }, []);\n\n  /**\n   * Get performance recommendations\n   */\n  const getRecommendations = useCallback(() => {\n    const recommendations: string[] = [];\n\n    if (metrics.memoryUsage > 80) {\n      recommendations.push('استخدام الذاكرة مرتفع - قم بتنظيف البيانات');\n    }\n\n    if (metrics.fps < 30) {\n      recommendations.push('أداء الرسم منخفض - قلل من تعقيد العناصر');\n    }\n\n    if (metrics.taskQueueLength > 50) {\n      recommendations.push('طابور المهام مكتظ - قلل من العمليات المتزامنة');\n    }\n\n    if (metrics.cacheHitRate < 50) {\n      recommendations.push('معدل إصابة التخزين المؤقت منخفض - راجع استراتيجية التخزين');\n    }\n\n    return recommendations;\n  }, [metrics]);\n\n  /**\n   * Performance actions object\n   */\n  const actions: PerformanceActions = {\n    optimizeImage,\n    optimizeText,\n    scheduleTask,\n    scheduleRender,\n    triggerCleanup,\n    preloadModule\n  };\n\n  /**\n   * Auto-optimization effect\n   */\n  useEffect(() => {\n    if (!defaultConfig.enableMemoryMonitoring) return;\n\n    // Auto cleanup when memory usage is high\n    if (metrics.memoryUsage > defaultConfig.memoryThreshold) {\n      triggerCleanup('warning');\n    }\n\n    // Auto cleanup when health score is low\n    if (metrics.healthScore < 50) {\n      triggerCleanup('critical');\n    }\n  }, [metrics, defaultConfig, triggerCleanup]);\n\n  return {\n    metrics,\n    actions,\n    isOptimizing,\n    config: defaultConfig,\n    recommendations: getRecommendations()\n  };\n}\n\n/**\n * Hook for caching with performance optimization\n */\nexport function useOptimizedCache<T>(key: string, defaultValue?: T) {\n  const [value, setValue] = useState<T | undefined>(defaultValue);\n  const [isLoading, setIsLoading] = useState(false);\n\n  /**\n   * Get value from cache\n   */\n  const get = useCallback(async (): Promise<T | undefined> => {\n    setIsLoading(true);\n    try {\n      const cached = await cacheManager.get<T>(key);\n      if (cached !== null) {\n        setValue(cached);\n        return cached;\n      }\n      return defaultValue;\n    } finally {\n      setIsLoading(false);\n    }\n  }, [key, defaultValue]);\n\n  /**\n   * Set value in cache\n   */\n  const set = useCallback(async (\n    newValue: T,\n    options?: {\n      ttl?: number;\n      compress?: boolean;\n      priority?: 'high' | 'normal' | 'low';\n    }\n  ) => {\n    setIsLoading(true);\n    try {\n      await cacheManager.set(key, newValue, options);\n      setValue(newValue);\n    } finally {\n      setIsLoading(false);\n    }\n  }, [key]);\n\n  /**\n   * Remove value from cache\n   */\n  const remove = useCallback(() => {\n    cacheManager.delete(key);\n    setValue(defaultValue);\n  }, [key, defaultValue]);\n\n  /**\n   * Load value on mount\n   */\n  useEffect(() => {\n    get();\n  }, [get]);\n\n  return {\n    value,\n    isLoading,\n    get,\n    set,\n    remove\n  };\n}\n\n/**\n * Hook for dynamic module loading with performance optimization\n */\nexport function useDynamicModule<T>(moduleId: string, importFn: () => Promise<T>) {\n  const [module, setModule] = useState<T | null>(null);\n  const [isLoading, setIsLoading] = useState(false);\n  const [error, setError] = useState<Error | null>(null);\n\n  /**\n   * Load module\n   */\n  const load = useCallback(async () => {\n    if (module || isLoading) return module;\n\n    setIsLoading(true);\n    setError(null);\n\n    try {\n      const loadedModule = await dynamicLoader.loadModule(\n        moduleId,\n        importFn,\n        { priority: 'normal', preload: true }\n      );\n\n      setModule(loadedModule);\n      return loadedModule;\n    } catch (err) {\n      const error = err instanceof Error ? err : new Error('Module loading failed');\n      setError(error);\n      return null;\n    } finally {\n      setIsLoading(false);\n    }\n  }, [moduleId, importFn, module, isLoading]);\n\n  /**\n   * Preload module\n   */\n  const preload = useCallback(async () => {\n    if (module) return;\n\n    try {\n      await dynamicLoader.loadModule(\n        moduleId,\n        importFn,\n        { priority: 'low', preload: true }\n      );\n    } catch (error) {\n      console.warn(`Failed to preload module ${moduleId}:`, error);\n    }\n  }, [moduleId, importFn, module]);\n\n  return {\n    module,\n    isLoading,\n    error,\n    load,\n    preload\n  };\n}\n\n/**\n * Hook for performance monitoring in components\n */\nexport function usePerformanceMonitor(componentName: string) {\n  const renderCountRef = useRef(0);\n  const mountTimeRef = useRef(0);\n  const [renderMetrics, setRenderMetrics] = useState({\n    renderCount: 0,\n    averageRenderTime: 0,\n    mountTime: 0\n  });\n\n  /**\n   * Track component mount\n   */\n  useEffect(() => {\n    mountTimeRef.current = performance.now();\n    performance.mark(`${componentName}-mount-start`);\n\n    return () => {\n      const mountTime = performance.now() - mountTimeRef.current;\n      performance.mark(`${componentName}-mount-end`);\n      performance.measure(\n        `${componentName}-mount`,\n        `${componentName}-mount-start`,\n        `${componentName}-mount-end`\n      );\n\n      console.log(`[Performance] ${componentName} mount time: ${mountTime.toFixed(2)}ms`);\n    };\n  }, [componentName]);\n\n  /**\n   * Track renders\n   */\n  useEffect(() => {\n    const renderStart = performance.now();\n    renderCountRef.current++;\n\n    requestAnimationFrame(() => {\n      const renderTime = performance.now() - renderStart;\n      \n      setRenderMetrics(prev => {\n        const newAverageRenderTime = prev.averageRenderTime === 0\n          ? renderTime\n          : (prev.averageRenderTime + renderTime) / 2;\n\n        return {\n          renderCount: renderCountRef.current,\n          averageRenderTime: newAverageRenderTime,\n          mountTime: performance.now() - mountTimeRef.current\n        };\n      });\n\n      if (renderTime > 16) { // More than one frame\n        console.warn(`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`);\n      }\n    });\n  });\n\n  return renderMetrics;\n}"
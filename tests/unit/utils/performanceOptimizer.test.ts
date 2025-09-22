import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceOptimizer } from '@shared/utils/performanceOptimizer';

const advanceAsync = async (ms: number) => {
  // Vitest's modern fake timers expose advanceTimersByTimeAsync
  if (typeof (vi as any).advanceTimersByTimeAsync === 'function') {
    await (vi as any).advanceTimersByTimeAsync(ms);
  } else {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  }
};

describe('performanceOptimizer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes queued tasks with priority ordering', async () => {
    const executionOrder: string[] = [];

    const lowTask = performanceOptimizer.addTask('low', async () => {
      executionOrder.push('low');
      return 'low';
    }, { priority: 'low' });

    const highTask = performanceOptimizer.addTask('high', async () => {
      executionOrder.push('high');
      return 'high';
    }, { priority: 'high' });

    await advanceAsync(250);
    await Promise.all([lowTask, highTask]);

    expect(executionOrder[0]).toBe('high');
    expect(executionOrder).toHaveLength(2);
  });

  it('invokes registered memory cleanup callbacks', async () => {
    const cleanup = vi.fn().mockResolvedValue(1024);
    (performanceOptimizer as any).registerMemoryCleanup(cleanup);

    await (performanceOptimizer as any).triggerMemoryCleanup();

    expect(cleanup).toHaveBeenCalled();

    (performanceOptimizer as any).unregisterMemoryCleanup(cleanup);
  });

  it('optimizes text payloads by trimming whitespace', () => {
    const optimized = performanceOptimizer.optimizeTextProcessing('Hello    World\n\nThis   is   text');

    expect(optimized).toContain('Hello World');
    expect(optimized).not.toMatch(/\s{3,}/);
  });
});

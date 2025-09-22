import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryManager } from '@shared/utils/memoryManager';

describe('memoryManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn()
      })
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('invokes registered cleanup callbacks during critical cleanup', async () => {
    const callback = vi.fn().mockResolvedValue(4096);
    memoryManager.registerCleanupCallback(callback);

    await memoryManager.triggerCleanup('critical');

    expect(callback).toHaveBeenCalled();

    memoryManager.unregisterCleanupCallback(callback);
  });

  it('updates thresholds and reports stats', () => {
    const statsBefore = memoryManager.getStats();
    memoryManager.updateThresholds({ warning: 0.55 });
    const statsAfter = memoryManager.getStats();

    expect(statsAfter.thresholds.warning).toBeCloseTo(0.55);

    memoryManager.updateThresholds({ warning: statsBefore.thresholds.warning });
  });

  it('detects increasing usage trends', () => {
    (memoryManager as any).usageHistory = [
      0.1, 0.12, 0.13, 0.14, 0.15,
      0.2, 0.22, 0.24, 0.26, 0.28
    ];

    expect(memoryManager.getUsageTrend()).toBe('increasing');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cacheManager } from '@shared/utils/cacheManager';

describe('cacheManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cacheManager.clear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    });
  });

  afterEach(() => {
    cacheManager.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('stores and retrieves values with compression', async () => {
    await cacheManager.set('greeting', { text: 'hello world' }, { ttl: 1000, compress: true });
    const result = await cacheManager.get<{ text: string }>('greeting');

    expect(result?.text).toBe('hello world');

    const stats = cacheManager.getStats();
    expect(stats.hits + stats.misses).toBeGreaterThan(0);
  });

  it('expires entries based on ttl', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);
    await cacheManager.set('ephemeral', 'value', { ttl: 50, compress: false });

    nowSpy.mockReturnValue(100);
    const result = await cacheManager.get('ephemeral');

    expect(result).toBeNull();
    nowSpy.mockRestore();
  });

  it('respects manual eviction when capacity exceeded', async () => {
    cacheManager.updateConfig({ maxEntries: 1, maxSize: 2048 });
    await cacheManager.set('a', 'one', { ttl: 1000, compress: false });
    await cacheManager.set('b', 'two', { ttl: 1000, compress: false });

    const stats = cacheManager.getStats();
    expect(stats.totalEntries).toBeLessThanOrEqual(1);

    cacheManager.updateConfig({ maxEntries: 1000 });
  });
});

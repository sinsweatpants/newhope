import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Mock implementations for common services
export const mockFileReaderService = {
  readFile: vi.fn().mockResolvedValue({
    content: 'mock file content',
    metadata: { size: 100, type: 'text/plain', name: 'test.txt' }
  }),
  extractText: vi.fn().mockResolvedValue('extracted text'),
  validateFile: vi.fn().mockReturnValue({ isValid: true, errors: [] })
};

export const mockOcrService = {
  extractText: vi.fn().mockResolvedValue({
    text: 'extracted text from OCR',
    confidence: 0.95,
    metadata: { language: 'ara', processingTime: 1000 }
  }),
  processImage: vi.fn().mockResolvedValue('processed image text'),
  processPDF: vi.fn().mockResolvedValue('processed PDF text')
};

export const mockGeminiService = {
  classifyText: vi.fn().mockResolvedValue({
    classification: 'CHARACTER',
    confidence: 0.9,
    suggestions: []
  }),
  generateSuggestions: vi.fn().mockResolvedValue([
    { text: 'suggestion 1', confidence: 0.8 },
    { text: 'suggestion 2', confidence: 0.7 }
  ]),
  auditDocument: vi.fn().mockResolvedValue({
    issues: [],
    score: 95,
    suggestions: []
  })
};

export const mockClassificationService = {
  classifyText: vi.fn().mockResolvedValue({
    classification: 'CHARACTER',
    confidence: 0.9,
    metadata: {}
  }),
  trainModel: vi.fn().mockResolvedValue({ success: true }),
  updatePatterns: vi.fn().mockResolvedValue({ success: true })
};

// Test data factories
export const createMockFile = (overrides: Partial<File> = {}): File => {
  const defaults = {
    name: 'test.txt',
    size: 100,
    type: 'text/plain',
    lastModified: Date.now()
  };

  return new File(['test content'], defaults.name, {
    type: defaults.type,
    lastModified: defaults.lastModified,
    ...overrides
  });
};

export const createMockClassificationResult = (overrides = {}) => ({
  classification: 'CHARACTER',
  confidence: 0.9,
  metadata: {},
  suggestions: [],
  ...overrides
});

export const createMockScreenplayElement = (overrides = {}) => ({
  id: 'element-1',
  type: 'CHARACTER',
  content: 'JOHN',
  position: { line: 1, column: 1 },
  formatting: { bold: false, italic: false, underline: false },
  metadata: {},
  ...overrides
});

export const createMockPerformanceMetrics = (overrides = {}) => ({
  fps: 60,
  memoryUsage: {
    used: 50,
    total: 100,
    percentage: 50
  },
  renderTime: 16,
  taskQueueSize: 0,
  ...overrides
});

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, {
    ...options
  });
};

// Test utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockTimers = () => {
  vi.useFakeTimers();
  return {
    advanceBy: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers()
  };
};

export const mockLocalStorage = () => {
  const storage = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get size() { return storage.size; }
  };
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectPerformance = (actualTime: number, expectedMaxTime: number) => {
  if (actualTime > expectedMaxTime) {
    throw new Error(`Performance expectation failed: ${actualTime}ms > ${expectedMaxTime}ms`);
  }
};

// Memory testing utilities
export const mockMemoryInfo = (overrides = {}) => ({
  usedJSHeapSize: 10000000,
  totalJSHeapSize: 50000000,
  jsHeapSizeLimit: 100000000,
  ...overrides
});

// Error boundary testing
export const ThrowError = ({ shouldThrow = false, children }: { shouldThrow?: boolean; children: React.ReactNode }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <>{children}</>;
};
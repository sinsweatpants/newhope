import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ocrService } from '@shared/services/ocrService';

const createMockImage = () => new File(['dummy'], 'page.png', { type: 'image/png' });

describe('ocrService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processes image files through the OCR pipeline', async () => {
    const initializeSpy = vi.spyOn(ocrService as any, 'initializeEngines').mockResolvedValue(undefined);
    const processSpy = vi.spyOn(ocrService as any, 'processImageWithOCR').mockResolvedValue({
      text: 'Hello World',
      confidence: 0.92,
      engine: 'tesseract',
      processingTime: 120,
      metadata: { language: 'eng' }
    });

    const result = await ocrService.processFile(createMockImage(), { language: 'eng' });

    expect(initializeSpy).toHaveBeenCalledOnce();
    expect(processSpy).toHaveBeenCalledOnce();
    expect(result.text).toBe('Hello World');
    expect(result.engine).toBe('tesseract');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('returns a safe fallback when OCR engines fail', async () => {
    vi.spyOn(ocrService as any, 'initializeEngines').mockResolvedValue(undefined);
    vi.spyOn(ocrService as any, 'processImageWithOCR').mockImplementation(async () => {
      throw new Error('OCR engine error');
    });

    const result = await ocrService.processFile(createMockImage(), { language: 'eng' });

    expect(result.text).toBe('');
    expect(result.confidence).toBe(0);
    expect(result.metadata.warnings?.[0]).toContain('All OCR engines failed');
  });

  it('invokes backend fallback when Scribe is unavailable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          text: 'Fallback text',
          confidence: 0.82,
          engine: 'scribe',
          processingTime: 123,
          metadata: { warnings: ['backend'] }
        }
      })
    } as any);

    vi.spyOn(ocrService as any, 'loadScribe').mockResolvedValue({
      recognize: async () => {
        throw new Error('Local scribe failure');
      }
    });

    const result = await (ocrService as any).processWithScribe(createMockImage(), { language: 'eng' });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.text).toBe('Fallback text');
    expect(result.engine).toBe('scribe');
    expect(result.metadata.warnings).toContainEqual(expect.stringContaining('Local Scribe unavailable'));

    fetchSpy.mockRestore();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { classificationService } from '@shared/services/classificationService';

describe('classificationService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses local classification when AI usage is disabled', async () => {
    const localResult = {
      classification: 'action',
      confidence: 0.76,
      source: 'local' as const,
      alternatives: [] as any
    };

    const localSpy = vi.spyOn(classificationService as any, 'classifyLocally').mockReturnValue(localResult);
    vi.spyOn(classificationService as any, 'shouldUseAI').mockReturnValue(false);

    const result = await classificationService.classify({
      text: 'INT. STUDIO - DAY',
      options: { useAI: false }
    });

    expect(localSpy).toHaveBeenCalledOnce();
    expect(result.source).toBe('local');
    expect(result.classification).toBe('action');
  });

  it('falls back to the local result when AI classification fails', async () => {
    const localResult = {
      classification: 'dialogue',
      confidence: 0.6,
      source: 'local' as const,
      alternatives: [] as any
    };

    vi.spyOn(classificationService as any, 'classifyLocally').mockReturnValue(localResult);
    vi.spyOn(classificationService as any, 'shouldUseAI').mockReturnValue(true);
    vi.spyOn(classificationService as any, 'classifyWithAI').mockRejectedValue(new Error('AI down'));

    const result = await classificationService.classify({
      text: 'JOHN\nHello there!',
      options: { useAI: true }
    });

    expect(result.source).toBe('fallback');
    expect(result.classification).toBe('dialogue');
  });

  it('combines local and AI results when both are available', async () => {
    const localResult = {
      classification: 'action',
      confidence: 0.6,
      source: 'local' as const,
      alternatives: [] as any
    };
    const aiResult = {
      classification: 'action',
      confidence: 0.9,
      source: 'ai' as const,
      alternatives: [] as any,
      metadata: {}
    };

    vi.spyOn(classificationService as any, 'classifyLocally').mockReturnValue(localResult);
    vi.spyOn(classificationService as any, 'shouldUseAI').mockReturnValue(true);
    vi.spyOn(classificationService as any, 'classifyWithAI').mockResolvedValue(aiResult);
    const combineSpy = vi.spyOn(classificationService as any, 'combineResults').mockReturnValue({
      classification: 'action',
      confidence: 0.85,
      source: 'hybrid',
      alternatives: []
    });

    const result = await classificationService.classify({
      text: 'The car speeds away.',
      options: { useAI: true }
    });

    expect(combineSpy).toHaveBeenCalledWith(localResult, aiResult, expect.any(Object));
    expect(result.source).toBe('hybrid');
    expect(result.confidence).toBeCloseTo(0.85);
  });
});

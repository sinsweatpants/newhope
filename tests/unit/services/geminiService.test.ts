import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiService } from '@shared/services/geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    (geminiService as any).config.apiKey = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (geminiService as any).config.apiKey = '';
  });

  it('parses successful classification responses', async () => {
    const payload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  classification: 'action',
                  confidence: 0.88,
                  reasoning: 'Strong action cues'
                })
              }
            ]
          }
        }
      ]
    };

    const makeRequestSpy = vi.spyOn(geminiService as any, 'makeRequest').mockResolvedValue(payload);

    const result = await geminiService.classifyLine({ text: 'INT. HOUSE - DAY' });

    expect(makeRequestSpy).toHaveBeenCalledOnce();
    expect(result.classification).toBe('action');
    expect(result.confidence).toBeCloseTo(0.88);
    expect(result.source).toBe('gemini');
  });

  it('returns fallback metadata when the API request fails', async () => {
    vi.spyOn(geminiService as any, 'makeRequest').mockRejectedValue(new Error('network error'));

    const result = await geminiService.classifyLine({ text: 'Hello there' });

    expect(result.source).toBe('error-fallback');
    expect(result.classification).toBeDefined();
    expect(result.confidence).toBe(0.5);
  });

  it('rejects classification when API key is missing', async () => {
    (geminiService as any).config.apiKey = '';

    await expect(geminiService.classifyLine({ text: 'Test line' }))
      .rejects.toThrow('Gemini API key not configured');
  });
});

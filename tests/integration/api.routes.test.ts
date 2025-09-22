// @vitest-environment node

import express from 'express';
import type { Server } from 'http';
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { registerRoutes } from '@backend/routes';
import { ocrService } from '@shared/services/ocrService';
import { classificationService } from '@shared/services/classificationService';

describe('API routes integration', () => {
  const app = express();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (address && typeof address !== 'string') {
      baseUrl = `http://127.0.0.1:${address.port}`;
    } else {
      throw new Error('Failed to determine server address');
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('delegates OCR processing to ocrService', async () => {
    const mockResult = {
      text: 'Sample OCR Text',
      confidence: 0.91,
      engine: 'tesseract' as const,
      processingTime: 250,
      metadata: { language: 'eng' }
    };

    const ocrSpy = vi.spyOn(ocrService, 'processFile').mockResolvedValue(mockResult);

    const response = await fetch(`${baseUrl}/api/ocr/process`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileData: Buffer.from('dummy').toString('base64'),
        originalName: 'image.png',
        mimetype: 'image/png',
        options: { language: 'eng' }
      })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.text).toBe('Sample OCR Text');
    expect(ocrSpy).toHaveBeenCalledOnce();
  });

  it('classifies screenplay lines through classificationService', async () => {
    const mockClassification = {
      classification: 'action',
      confidence: 0.87,
      source: 'local' as const,
      processingTime: 12
    };

    const classifySpy = vi.spyOn(classificationService, 'classify').mockResolvedValue(mockClassification as any);

    const response = await fetch(`${baseUrl}/api/screenplay/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'INT. STUDIO - DAY' })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.classification).toBe('action');
    expect(classifySpy).toHaveBeenCalledOnce();
  });
});

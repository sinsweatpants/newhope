// @vitest-environment node

import express from 'express';
import type { Server } from 'http';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { registerRoutes } from '@backend/routes';

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

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('delegates OCR processing to ocrService', async () => {
    const imageBuffer = await sharp({
      text: {
        text: 'SCENE 1',
        font: 'sans',
        align: 'center',
        width: 512,
        height: 128,
        rgba: true
      }
    })
      .png()
      .toBuffer();

    const response = await fetch(`${baseUrl}/api/ocr/process`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileData: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        originalName: 'scene.png',
        mimetype: 'image/png',
        options: { language: 'eng', preprocessImage: true }
      })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.text).toContain('SCENE');
    expect(payload.data.confidence).toBeGreaterThan(0);
  });

  it('classifies screenplay lines through classificationService', async () => {
    const response = await fetch(`${baseUrl}/api/screenplay/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'مشهد 1 - نهار',
        options: { useAI: false }
      })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.classification).toBe('scene-header-2');
    expect(payload.data.source).toBeDefined();
  });
});

import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test.describe('Screenplay editor flows', () => {
  test('allows typing screenplay content directly in the editor', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('[data-testid="screenplay-editor"]');
    await editor.click();
    await editor.type('INT. DESERT - NIGHT');

    await expect(editor).toContainText('INT. DESERT - NIGHT');
  });

  test('imports screenplay text files into the editor', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('#file-import');
    await fileInput.setInputFiles({
      name: 'scene.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('EXT. MARKET - DAY\nVendors fill the square.')
    });

    const editor = page.locator('[data-testid="screenplay-editor"]');
    await expect(editor).toContainText('EXT. MARKET - DAY');
  });

  test('toggles AI assistance for classification', async ({ page }) => {
    await page.goto('/');

    const aiToggle = page.locator('input[type="checkbox"]').first();
    const initialState = await aiToggle.isChecked();
    await aiToggle.click();
    await expect(aiToggle).not.toHaveJSProperty('checked', initialState);
  });

  test('processes OCR upload and classifies via backend APIs', async ({ request }) => {
    const imageBuffer = await sharp({
      text: {
        text: 'INT. LAB - NIGHT',
        font: 'sans',
        align: 'center',
        width: 512,
        height: 128,
        rgba: true
      }
    })
      .png()
      .toBuffer();

    const ocrResponse = await request.post('/api/ocr/process', {
      data: {
        fileData: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        originalName: 'lab.png',
        mimetype: 'image/png',
        options: { language: 'eng' }
      }
    });

    expect(ocrResponse.ok()).toBeTruthy();
    const ocrPayload = await ocrResponse.json();
    expect(ocrPayload.success).toBeTruthy();
    expect(ocrPayload.data.text).toContain('INT');

    const classifyResponse = await request.post('/api/screenplay/classify', {
      data: {
        text: ocrPayload.data.text,
        options: { useAI: false }
      }
    });

    expect(classifyResponse.ok()).toBeTruthy();
    const classifyPayload = await classifyResponse.json();
    expect(classifyPayload.success).toBeTruthy();
    expect(classifyPayload.data.classification).toBeDefined();
  });
});

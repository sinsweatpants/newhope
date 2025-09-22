import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const cssPath = resolve(__dirname, '..', '..', 'apps', 'frontend', 'src', 'styles', 'index.css');
const screenplayCss = readFileSync(cssPath, 'utf-8');

test('scene-header-3 is visually centered', async ({ page }) => {
  await page.setContent(`
    <html dir="rtl">
      <head>
        <style>${screenplayCss}</style>
        <style>
          body { margin: 0; }
          .script-page { width: 600px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="script-page">
          <div class="scene-header-3">مستشفى المدينة - الطابق الثالث</div>
        </div>
      </body>
    </html>
  `);

  const header = page.locator('.scene-header-3');
  await expect(header).toHaveCSS('text-align', 'center');

  const headerBox = await header.boundingBox();
  const containerBox = await page.locator('.script-page').boundingBox();
  if (!headerBox || !containerBox) {
    throw new Error('Failed to measure layout boxes');
  }

  const leftOffset = headerBox.x - containerBox.x;
  const expectedOffset = (containerBox.width - headerBox.width) / 2;
  expect(Math.abs(leftOffset - expectedOffset)).toBeLessThanOrEqual(2);
});

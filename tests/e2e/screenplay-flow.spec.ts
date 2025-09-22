import { test, expect } from '@playwright/test';

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
});

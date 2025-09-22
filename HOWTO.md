# Reproducing and Verifying the Scene Header Fix

## Prerequisites
- Node.js ≥ 18.17
- npm ≥ 9
- Playwright browsers installed (`npx playwright install`)

## 1. Install dependencies
```bash
npm install
```
> ⚠️ If your environment enforces a private registry, make sure `@types/*` packages are accessible; otherwise configure the registry before installing.

## 2. Reproduce the original misalignment
1. Start the frontend sandbox:
   ```bash
   npm run dev:frontend
   ```
2. Visit the screenplay editor (default `http://localhost:5173`).
3. Switch to **الوضع المتقدم** to expose the advanced clipboard toolbar.
4. Paste sample lines such as:
   ```
   مشهد 1 - ليل - داخلي - مستشفى
   مستشفى المدينة - الطابق الثالث
   ```
5. **Before** applying the fix you will see `مستشفى المدينة - الطابق الثالث` hugging the right margin because the advanced importer skipped the styling pass.

## 3. Apply the fix (current branch)
- The updated code introduces a shared `setEditorContent` helper and global CSS. After pulling the changes or checking out this branch, reload the editor.
- Repeating the steps above now shows `scene-header-3` centered with underline/background, matching the “right” reference.

## 4. Run automated checks
```bash
# Unit & component tests (Vitest)
npm test

# Playwright regression for visual centering
npm run test:e2e -- tests/e2e/scene-header.spec.ts
```
> Ensure Playwright browsers are installed before running the E2E test.

## 5. Production confidence
- Build assets to confirm Tailwind keeps the safelisted classes:
  ```bash
  npm run build:frontend
  ```
- Open the generated HTML in `dist/public` to confirm the headers remain centered in production output.

import { describe, it, expect } from 'vitest';
import { applySceneHeaderStyles } from './applySceneHeaderStyles';
import { getFormatStyles } from '@shared/screenplay/formatStyles';

describe('applySceneHeaderStyles', () => {
  it('applies computed styles to scene headers', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="scene-header-container">
        <div class="scene-header-3">موقع التصوير</div>
      </div>
    `;

    applySceneHeaderStyles(root, (cls) => getFormatStyles(cls));
    const header = root.querySelector<HTMLElement>('.scene-header-3');

    expect(header).not.toBeNull();
    expect(header?.style.textAlign).toBe('center');
    expect(header?.style.display).toBe('block');
  });
});

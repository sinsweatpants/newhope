import { describe, it, expect } from 'vitest';
import { getFormatStyles } from '../formatStyles';

describe('getFormatStyles', () => {
  it('returns centering rules for scene-header-3', () => {
    const styles = getFormatStyles('scene-header-3');
    expect(styles.textAlign).toBe('center');
    expect(styles.display).toBe('block');
    expect(styles.whiteSpace).toBe('pre-wrap');
  });

  it('keeps rtl direction for all scene headers', () => {
    expect(getFormatStyles('scene-header-1').direction).toBe('rtl');
    expect(getFormatStyles('scene-header-2').direction).toBe('rtl');
    expect(getFormatStyles('scene-header-3').direction).toBe('rtl');
  });
});

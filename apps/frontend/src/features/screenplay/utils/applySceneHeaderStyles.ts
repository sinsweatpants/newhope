import type { CSSProperties } from 'react';

const SCENE_HEADER_CLASS_PREFIX = 'scene-header';

/**
 * Applies the screenplay header styles that depend on runtime font/size
 * choices to every scene header block inside the provided root element.
 *
 * The function iterates over all div/span nodes whose class names start with
 * `scene-header` and merges the computed styles with the DOM element inline
 * styles to make sure the formatting survives contentEditable mutations and
 * HTML imports.
 */
export function applySceneHeaderStyles(
  root: HTMLElement,
  getStyles: (className: string) => CSSProperties
): void {
  const elements = root.querySelectorAll<HTMLElement>('div, span');

  elements.forEach((element) => {
    if (!element.className) {
      return;
    }

    const baseClass = element.className.trim().split(/\s+/)[0];
    if (!baseClass.startsWith(SCENE_HEADER_CLASS_PREFIX)) {
      return;
    }

    const styles = getStyles(baseClass) ?? {};
    Object.assign(element.style, styles);

    if (baseClass === 'scene-header-1') {
      element.style.borderTop = element.style.borderTop || '2px solid #333';
      element.style.borderBottom = element.style.borderBottom || '1px solid #999';
    }

    if (baseClass === 'scene-header-3') {
      element.style.alignSelf = element.style.alignSelf || 'stretch';
    }
  });
}

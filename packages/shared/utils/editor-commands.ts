import type { CSSProperties } from "react";

/**
 * Ensures the current selection resides within the editor element.
 * Returns the active selection and range when valid, otherwise null.
 */
export const getEditorSelection = (
  editor: HTMLDivElement | null
): { selection: Selection; range: Range } | null => {
  if (!editor) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  if (!editor.contains(container)) return null;
  return { selection, range };
};

/**
 * Focuses the editor element ensuring subsequent commands work correctly.
 */
export const focusEditor = (editor: HTMLDivElement | null) => {
  if (!editor) return;
  if (document.activeElement !== editor) {
    editor.focus();
  }
};

/**
 * Applies inline CSS styles to the current selection. Returns true when
 * formatting was applied, otherwise false (for example when the selection
 * is outside of the editor).
 */
export const applyInlineStyles = (
  editor: HTMLDivElement | null,
  styles: CSSProperties
): boolean => {
  focusEditor(editor);
  const result = getEditorSelection(editor);
  if (!result) return false;
  const { selection, range } = result;

  const span = document.createElement("span");
  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // @ts-expect-error allow assigning arbitrary CSS properties
      span.style[key] = value;
    }
  });

  if (range.collapsed) {
    span.appendChild(document.createTextNode("\u200B"));
    range.insertNode(span);
    const collapsed = document.createRange();
    collapsed.setStart(span.firstChild as Text, 0);
    collapsed.setEnd(span.firstChild as Text, 1);
    selection.removeAllRanges();
    selection.addRange(collapsed);
  } else {
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    const formattedRange = document.createRange();
    formattedRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(formattedRange);
  }

  span.normalize();
  return true;
};

/**
 * Determines the closest block level element for the current selection.
 */
export const getCurrentBlockElement = (
  editor: HTMLDivElement | null
): HTMLElement | null => {
  const result = getEditorSelection(editor);
  if (!result) return null;
  const { range } = result;
  let node = range.startContainer as HTMLElement | null;

  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      const display = window.getComputedStyle(node).display;
      if (display === "block" || display === "list-item" || node.tagName === "LI") {
        return node;
      }
    }
    node = node.parentElement;
  }

  return editor;
};

/**
 * Applies block level styles (for example alignment or spacing) to the
 * currently active block element within the editor.
 */
export const applyBlockStyles = (
  editor: HTMLDivElement | null,
  styles: CSSProperties
): boolean => {
  const block = getCurrentBlockElement(editor);
  if (!block) return false;
  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // @ts-expect-error allow assigning arbitrary CSS properties
      block.style[key] = value;
    }
  });
  return true;
};

/**
 * Executes a document command (deprecated but still widely supported) after
 * ensuring the selection is inside the editor.
 */
export const execEditorCommand = (
  editor: HTMLDivElement | null,
  command: string,
  value?: string
): boolean => {
  focusEditor(editor);
  const selection = getEditorSelection(editor);
  if (!selection) return false;
  return document.execCommand(command, false, value);
};

/**
 * Removes inline formatting from the current selection and resets common
 * block level overrides back to the editor defaults.
 */
export const clearFormatting = (editor: HTMLDivElement | null) => {
  execEditorCommand(editor, "removeFormat");
  const block = getCurrentBlockElement(editor);
  if (block && block !== editor) {
    block.style.removeProperty("text-align");
    block.style.removeProperty("line-height");
    block.style.removeProperty("margin-top");
    block.style.removeProperty("margin-bottom");
    block.style.removeProperty("border");
    block.style.removeProperty("background-color");
    block.style.removeProperty("box-shadow");
  }
};

export interface CapturedFormatting {
  inline: CSSProperties;
  block: CSSProperties;
}

/**
 * Captures the current inline and block level formatting from the selection.
 */
export const captureFormatting = (
  editor: HTMLDivElement | null
): CapturedFormatting | null => {
  const result = getEditorSelection(editor);
  if (!result) return null;
  const { range } = result;
  const node =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
  if (!node) return null;

  const inlineComputed = window.getComputedStyle(node);
  const inline: CSSProperties = {
    fontFamily: inlineComputed.fontFamily,
    fontSize: inlineComputed.fontSize,
    fontWeight: inlineComputed.fontWeight,
    fontStyle: inlineComputed.fontStyle,
    textDecoration: inlineComputed.textDecoration,
    color: inlineComputed.color,
    backgroundColor: inlineComputed.backgroundColor,
    textShadow: inlineComputed.textShadow,
    filter: inlineComputed.filter,
    verticalAlign: inlineComputed.verticalAlign,
  };

  const blockElement = getCurrentBlockElement(editor);
  const blockComputed = blockElement ? window.getComputedStyle(blockElement) : null;
  const block: CSSProperties = blockComputed
    ? ({
        textAlign: blockComputed.textAlign,
        lineHeight: blockComputed.lineHeight,
        marginTop: blockComputed.marginTop,
        marginBottom: blockComputed.marginBottom,
        border: blockComputed.border,
        backgroundColor: blockComputed.backgroundColor,
        boxShadow: blockComputed.boxShadow,
      } as CSSProperties)
    : {};

  return { inline, block };
};

/**
 * Applies captured formatting back to the current selection.
 */
export const applyCapturedFormatting = (
  editor: HTMLDivElement | null,
  captured: CapturedFormatting | null
): boolean => {
  if (!captured) return false;
  const appliedInline = applyInlineStyles(editor, captured.inline);
  if (captured.block) {
    applyBlockStyles(editor, captured.block);
  }
  return appliedInline;
};

interface NodePosition {
  node: Node;
  offset: number;
}

const locatePosition = (
  editor: HTMLDivElement,
  index: number
): NodePosition | null => {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
  let current: Node | null = walker.nextNode();
  let traversed = 0;

  while (current) {
    const length = current.textContent?.length ?? 0;
    if (index <= traversed + length) {
      return { node: current, offset: index - traversed };
    }
    traversed += length;
    current = walker.nextNode();
  }

  return null;
};

export interface FindResult {
  range: Range;
  startIndex: number;
  endIndex: number;
}

/**
 * Finds the next occurrence of the provided query within the editor.
 */
export const findNext = (
  editor: HTMLDivElement | null,
  query: string,
  fromIndex = 0,
  matchCase = false
): FindResult | null => {
  if (!editor || !query) return null;
  const text = editor.textContent ?? "";
  const haystack = matchCase ? text : text.toLowerCase();
  const needle = matchCase ? query : query.toLowerCase();
  const index = haystack.indexOf(needle, fromIndex);
  if (index === -1) return null;

  const startPosition = locatePosition(editor, index);
  const endPosition = locatePosition(editor, index + needle.length);
  if (!startPosition || !endPosition) return null;

  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }

  (range.startContainer.parentElement ?? editor).scrollIntoView({
    block: "center",
    behavior: "smooth",
  });

  return { range, startIndex: index, endIndex: index + needle.length };
};

/**
 * Replaces the contents of a range with plain text.
 */
export const replaceRangeWithText = (range: Range, replacement: string) => {
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
};

/**
 * Selects the current block element in the editor.
 */
export const selectCurrentBlock = (editor: HTMLDivElement | null): boolean => {
  const block = getCurrentBlockElement(editor);
  if (!block) return false;
  const range = document.createRange();
  range.selectNodeContents(block);
  const selection = window.getSelection();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
};

/**
 * Highlights elements sharing the same inline formatting as the selection.
 */
export const highlightSimilarFormatting = (
  editor: HTMLDivElement | null,
  captured: CapturedFormatting | null
): HTMLElement[] => {
  if (!editor || !captured) return [];
  const elements = Array.from(editor.querySelectorAll<HTMLElement>("span, div, p, li"));
  const matches = elements.filter((element) => {
    const computed = window.getComputedStyle(element);
    return (
      (!captured.inline.fontFamily || computed.fontFamily === captured.inline.fontFamily) &&
      (!captured.inline.fontSize || computed.fontSize === captured.inline.fontSize) &&
      (!captured.inline.fontWeight || computed.fontWeight === captured.inline.fontWeight) &&
      (!captured.inline.fontStyle || computed.fontStyle === captured.inline.fontStyle) &&
      (!captured.inline.color || computed.color === captured.inline.color) &&
      (!captured.inline.backgroundColor || computed.backgroundColor === captured.inline.backgroundColor)
    );
  });

  matches.forEach((match) => match.classList.add("format-match"));
  return matches;
};

/**
 * Clears any highlight class previously added by highlightSimilarFormatting.
 */
export const clearFormattingHighlights = (elements: HTMLElement[]) => {
  elements.forEach((element) => element.classList.remove("format-match"));
};

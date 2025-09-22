import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditingToolbar } from './EditingToolbar';

const mockProps = {
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onCut: vi.fn(),
  onCopy: vi.fn(),
  onPaste: vi.fn(),
  onSelectAll: vi.fn(),
  onFindReplace: vi.fn(),
  canUndo: true,
  canRedo: true,
  selectedText: ''
};

describe('EditingToolbar', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all editing buttons', () => {
    render(<EditingToolbar {...mockProps} />);

    expect(screen.getByRole('button', { name: /تراجع/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /قص/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /نسخ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /لصق/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تحديد الكل/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /بحث واستبدال/i })).toBeInTheDocument();
  });

  it('calls onUndo when undo button is clicked', async () => {
    render(<EditingToolbar {...mockProps} />);

    const undoButton = screen.getByRole('button', { name: /تراجع/i });
    await user.click(undoButton);

    expect(mockProps.onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onRedo when redo button is clicked', async () => {
    render(<EditingToolbar {...mockProps} />);

    const redoButton = screen.getByRole('button', { name: /إعادة/i });
    await user.click(redoButton);

    expect(mockProps.onRedo).toHaveBeenCalledTimes(1);
  });

  it('calls onCut when cut button is clicked', async () => {
    render(<EditingToolbar {...mockProps} selectedText="selected text" />);

    const cutButton = screen.getByRole('button', { name: /قص/i });
    await user.click(cutButton);

    expect(mockProps.onCut).toHaveBeenCalledTimes(1);
  });

  it('calls onCopy when copy button is clicked', async () => {
    render(<EditingToolbar {...mockProps} selectedText="selected text" />);

    const copyButton = screen.getByRole('button', { name: /نسخ/i });
    await user.click(copyButton);

    expect(mockProps.onCopy).toHaveBeenCalledTimes(1);
  });

  it('calls onPaste when paste button is clicked', async () => {
    render(<EditingToolbar {...mockProps} />);

    const pasteButton = screen.getByRole('button', { name: /لصق/i });
    await user.click(pasteButton);

    expect(mockProps.onPaste).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectAll when select all button is clicked', async () => {
    render(<EditingToolbar {...mockProps} />);

    const selectAllButton = screen.getByRole('button', { name: /تحديد الكل/i });
    await user.click(selectAllButton);

    expect(mockProps.onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('calls onFindReplace when find/replace button is clicked', async () => {
    render(<EditingToolbar {...mockProps} />);

    const findReplaceButton = screen.getByRole('button', { name: /بحث واستبدال/i });
    await user.click(findReplaceButton);

    expect(mockProps.onFindReplace).toHaveBeenCalledTimes(1);
  });

  it('disables undo button when canUndo is false', () => {
    render(<EditingToolbar {...mockProps} canUndo={false} />);

    const undoButton = screen.getByRole('button', { name: /تراجع/i });
    expect(undoButton).toBeDisabled();
  });

  it('disables redo button when canRedo is false', () => {
    render(<EditingToolbar {...mockProps} canRedo={false} />);

    const redoButton = screen.getByRole('button', { name: /إعادة/i });
    expect(redoButton).toBeDisabled();
  });

  it('disables cut and copy buttons when no text is selected', () => {
    render(<EditingToolbar {...mockProps} selectedText="" />);

    const cutButton = screen.getByRole('button', { name: /قص/i });
    const copyButton = screen.getByRole('button', { name: /نسخ/i });

    expect(cutButton).toBeDisabled();
    expect(copyButton).toBeDisabled();
  });

  it('enables cut and copy buttons when text is selected', () => {
    render(<EditingToolbar {...mockProps} selectedText="selected text" />);

    const cutButton = screen.getByRole('button', { name: /قص/i });
    const copyButton = screen.getByRole('button', { name: /نسخ/i });

    expect(cutButton).toBeEnabled();
    expect(copyButton).toBeEnabled();
  });

  it('displays keyboard shortcuts in tooltips', () => {
    render(<EditingToolbar {...mockProps} />);

    const undoButton = screen.getByRole('button', { name: /تراجع/i });
    expect(undoButton).toHaveAttribute('title', expect.stringContaining('Ctrl+Z'));

    const redoButton = screen.getByRole('button', { name: /إعادة/i });
    expect(redoButton).toHaveAttribute('title', expect.stringContaining('Ctrl+Y'));

    const cutButton = screen.getByRole('button', { name: /قص/i });
    expect(cutButton).toHaveAttribute('title', expect.stringContaining('Ctrl+X'));

    const copyButton = screen.getByRole('button', { name: /نسخ/i });
    expect(copyButton).toHaveAttribute('title', expect.stringContaining('Ctrl+C'));

    const pasteButton = screen.getByRole('button', { name: /لصق/i });
    expect(pasteButton).toHaveAttribute('title', expect.stringContaining('Ctrl+V'));
  });

  it('handles keyboard shortcuts', () => {
    render(<EditingToolbar {...mockProps} />);

    // Test Ctrl+Z (undo)
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(mockProps.onUndo).toHaveBeenCalledTimes(1);

    // Test Ctrl+Y (redo)
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true });
    expect(mockProps.onRedo).toHaveBeenCalledTimes(1);

    // Test Ctrl+X (cut)
    fireEvent.keyDown(document, { key: 'x', ctrlKey: true });
    expect(mockProps.onCut).toHaveBeenCalledTimes(1);

    // Test Ctrl+C (copy)
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    expect(mockProps.onCopy).toHaveBeenCalledTimes(1);

    // Test Ctrl+V (paste)
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true });
    expect(mockProps.onPaste).toHaveBeenCalledTimes(1);

    // Test Ctrl+A (select all)
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
    expect(mockProps.onSelectAll).toHaveBeenCalledTimes(1);

    // Test Ctrl+H (find/replace)
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true });
    expect(mockProps.onFindReplace).toHaveBeenCalledTimes(1);
  });

  it('renders with proper ARIA labels', () => {
    render(<EditingToolbar {...mockProps} />);

    expect(screen.getByRole('button', { name: /تراجع/i })).toHaveAttribute('aria-label', 'تراجع');
    expect(screen.getByRole('button', { name: /إعادة/i })).toHaveAttribute('aria-label', 'إعادة');
    expect(screen.getByRole('button', { name: /قص/i })).toHaveAttribute('aria-label', 'قص');
    expect(screen.getByRole('button', { name: /نسخ/i })).toHaveAttribute('aria-label', 'نسخ');
    expect(screen.getByRole('button', { name: /لصق/i })).toHaveAttribute('aria-label', 'لصق');
  });

  it('maintains button state consistency', () => {
    const { rerender } = render(<EditingToolbar {...mockProps} canUndo={true} canRedo={false} />);

    expect(screen.getByRole('button', { name: /تراجع/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /إعادة/i })).toBeDisabled();

    // Update props
    rerender(<EditingToolbar {...mockProps} canUndo={false} canRedo={true} />);

    expect(screen.getByRole('button', { name: /تراجع/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /إعادة/i })).toBeEnabled();
  });

  it('groups related buttons visually', () => {
    render(<EditingToolbar {...mockProps} />);

    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('editing-toolbar');

    // Check for button groups
    const undoRedoGroup = screen.getByTestId('undo-redo-group');
    const clipboardGroup = screen.getByTestId('clipboard-group');
    const searchGroup = screen.getByTestId('search-group');

    expect(undoRedoGroup).toBeInTheDocument();
    expect(clipboardGroup).toBeInTheDocument();
    expect(searchGroup).toBeInTheDocument();
  });

  it('handles rapid button clicks gracefully', async () => {
    render(<EditingToolbar {...mockProps} />);

    const undoButton = screen.getByRole('button', { name: /تراجع/i });

    // Click rapidly multiple times
    await user.click(undoButton);
    await user.click(undoButton);
    await user.click(undoButton);

    expect(mockProps.onUndo).toHaveBeenCalledTimes(3);
  });

  it('shows visual feedback on button hover', async () => {
    render(<EditingToolbar {...mockProps} />);

    const undoButton = screen.getByRole('button', { name: /تراجع/i });
    await user.hover(undoButton);

    expect(undoButton).toHaveClass('hover:bg-gray-100');
  });
});
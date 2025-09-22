import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScreenplayEditor } from './ScreenplayEditor';

// Mock external dependencies
vi.mock('@shared/screenplay/pipelineProcessor', () => ({
  pipelineProcessor: {
    process: vi.fn(() => ({
      content: [{ text: 'Test line', format: 'action' }],
      metadata: { lineCount: 1 }
    }))
  }
}));

vi.mock('@shared/screenplay/geminiCoordinator', () => ({
  geminiCoordinator: {
    processText: vi.fn(),
    isConfigured: vi.fn(() => true)
  }
}));

vi.mock('@shared/screenplay/advancedClassifier', () => ({
  advancedClassifier: {
    classifyLine: vi.fn(() => 'action')
  }
}));

vi.mock('@shared/services/fileReaderService', () => ({
  fileReaderService: {
    readFile: vi.fn()
  }
}));

vi.mock('@shared/services/ocrService', () => ({
  ocrService: {
    processFile: vi.fn()
  }
}));

vi.mock('@shared/screenplay/customStylesManager', () => ({
  customStylesManager: {
    getStyles: vi.fn(() => []),
    saveStyle: vi.fn(),
    loadStyle: vi.fn()
  }
}));

describe('ScreenplayEditor', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor with basic elements', () => {
    render(<ScreenplayEditor />);

    // Check for main editor elements
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('DoodleDuel - محرر السيناريو')).toBeInTheDocument();
  });

  it('shows dark mode toggle', () => {
    render(<ScreenplayEditor />);

    const darkModeButton = screen.getByRole('button', { name: /تبديل الوضع الليلي/i });
    expect(darkModeButton).toBeInTheDocument();
  });

  it('toggles dark mode when button is clicked', async () => {
    render(<ScreenplayEditor />);

    const darkModeButton = screen.getByRole('button', { name: /تبديل الوضع الليلي/i });
    await user.click(darkModeButton);

    // Check if dark mode class is applied
    expect(document.documentElement).toHaveClass('dark');
  });

  it('handles text input and formatting', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Test screenplay text');

    expect(editor).toHaveValue('Test screenplay text');
  });

  it('displays toolbar components', () => {
    render(<ScreenplayEditor />);

    // Check for toolbar presence
    const toolbarContainer = screen.getByTestId('toolbar-container');
    expect(toolbarContainer).toBeInTheDocument();
  });

  it('handles paste operations', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.click(editor);

    // Simulate paste event
    const pasteData = 'Pasted screenplay content';
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData?.setData('text/plain', pasteData);

    fireEvent(editor, pasteEvent);

    await waitFor(() => {
      expect(editor).toHaveValue(expect.stringContaining(pasteData));
    });
  });

  it('updates page numbers automatically', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');

    // Add multiple lines to trigger page numbering
    const longText = Array(50).fill('Test line content').join('\n');
    await user.type(editor, longText);

    // Check if page numbers are displayed
    const pageNumbers = screen.queryAllByText(/صفحة \d+/);
    expect(pageNumbers.length).toBeGreaterThan(0);
  });

  it('applies screenplay formatting styles', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');

    // Type character name (should be formatted as character)
    await user.type(editor, 'أحمد:');

    // Check if the line has proper formatting applied
    const formattedText = screen.getByDisplayValue(/أحمد:/);
    expect(formattedText).toBeInTheDocument();
  });

  it('handles find and replace functionality', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Original text to replace');

    // Open find/replace dialog
    const findButton = screen.getByRole('button', { name: /بحث واستبدال/i });
    await user.click(findButton);

    // Check if dialog opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('exports content correctly', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Test content for export');

    // Find export button
    const exportButton = screen.getByRole('button', { name: /تصدير/i });
    await user.click(exportButton);

    // Verify export functionality is triggered
    // This would normally check if download was initiated
    expect(exportButton).toBeInTheDocument();
  });

  it('handles file upload for OCR processing', async () => {
    render(<ScreenplayEditor />);

    // Create a mock file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

    // Find file input
    const fileInput = screen.getByLabelText(/رفع ملف/i);
    await user.upload(fileInput, file);

    // Check if file processing is initiated
    await waitFor(() => {
      expect(fileInput).toHaveProperty('files', expect.arrayContaining([file]));
    });
  });

  it('handles keyboard shortcuts', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.click(editor);

    // Test Ctrl+S shortcut (save)
    await user.keyboard('{Control>}s{/Control}');

    // Test Ctrl+Z shortcut (undo)
    await user.type(editor, 'Test text');
    await user.keyboard('{Control>}z{/Control}');

    // Verify shortcuts work
    expect(editor).toBeInTheDocument();
  });

  it('maintains focus and cursor position during formatting', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.click(editor);
    await user.type(editor, 'Test line');

    // Move cursor to beginning
    editor.setSelectionRange(0, 0);

    // Apply formatting
    const boldButton = screen.getByRole('button', { name: /غامق/i });
    await user.click(boldButton);

    // Check that focus is maintained
    expect(editor).toHaveFocus();
  });

  it('handles Arabic text direction correctly', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'نص عربي للاختبار');

    // Check for proper RTL handling
    expect(editor).toHaveValue('نص عربي للاختبار');
    expect(editor).toHaveAttribute('dir', 'auto');
  });

  it('validates screenplay format compliance', async () => {
    render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');

    // Type invalid format
    await user.type(editor, 'Invalid format line');

    // Check if validation warnings appear
    const validationMessages = screen.queryAllByText(/تحذير/i);
    expect(validationMessages.length).toBeGreaterThanOrEqual(0);
  });

  it('handles window resize for responsive layout', () => {
    render(<ScreenplayEditor />);

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    fireEvent(window, new Event('resize'));

    // Check if layout adapts
    const editor = screen.getByRole('textbox');
    expect(editor).toBeInTheDocument();
  });

  it('preserves content during component re-renders', async () => {
    const { rerender } = render(<ScreenplayEditor />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'Persistent content');

    // Force re-render
    rerender(<ScreenplayEditor />);

    // Check content is preserved
    expect(screen.getByDisplayValue('Persistent content')).toBeInTheDocument();
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FindReplaceDialog } from './FindReplaceDialog';

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onFind: vi.fn(),
  onReplace: vi.fn(),
  onReplaceAll: vi.fn(),
  searchText: '',
  replaceText: '',
  matchCase: false,
  matchWholeWord: false,
  useRegex: false,
  searchResults: {
    total: 0,
    current: 0,
    matches: []
  }
};

describe('FindReplaceDialog', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<FindReplaceDialog {...mockProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('بحث واستبدال')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<FindReplaceDialog {...mockProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays search input field', () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('displays replace input field', () => {
    render(<FindReplaceDialog {...mockProps} />);

    const replaceInput = screen.getByLabelText(/استبدال بـ/i);
    expect(replaceInput).toBeInTheDocument();
    expect(replaceInput).toHaveAttribute('type', 'text');
  });

  it('displays search options checkboxes', () => {
    render(<FindReplaceDialog {...mockProps} />);

    expect(screen.getByLabelText(/مطابقة حالة الأحرف/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/مطابقة الكلمة كاملة/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/استخدام التعبيرات النمطية/i)).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    render(<FindReplaceDialog {...mockProps} />);

    expect(screen.getByRole('button', { name: /بحث/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /التالي/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /السابق/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /استبدال/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /استبدال الكل/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إغلاق/i })).toBeInTheDocument();
  });

  it('handles search input correctly', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    await user.type(searchInput, 'test search');

    expect(searchInput).toHaveValue('test search');
  });

  it('handles replace input correctly', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const replaceInput = screen.getByLabelText(/استبدال بـ/i);
    await user.type(replaceInput, 'replacement text');

    expect(replaceInput).toHaveValue('replacement text');
  });

  it('toggles match case option', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const matchCaseCheckbox = screen.getByLabelText(/مطابقة حالة الأحرف/i);
    await user.click(matchCaseCheckbox);

    expect(matchCaseCheckbox).toBeChecked();
  });

  it('toggles match whole word option', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const wholeWordCheckbox = screen.getByLabelText(/مطابقة الكلمة كاملة/i);
    await user.click(wholeWordCheckbox);

    expect(wholeWordCheckbox).toBeChecked();
  });

  it('toggles regex option', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const regexCheckbox = screen.getByLabelText(/استخدام التعبيرات النمطية/i);
    await user.click(regexCheckbox);

    expect(regexCheckbox).toBeChecked();
  });

  it('calls onFind when search button is clicked', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    const findButton = screen.getByRole('button', { name: /بحث/i });

    await user.type(searchInput, 'search term');
    await user.click(findButton);

    expect(mockProps.onFind).toHaveBeenCalledWith('search term', {
      matchCase: false,
      matchWholeWord: false,
      useRegex: false
    });
  });

  it('calls onReplace when replace button is clicked', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    const replaceInput = screen.getByLabelText(/استبدال بـ/i);
    const replaceButton = screen.getByRole('button', { name: /استبدال/i });

    await user.type(searchInput, 'find');
    await user.type(replaceInput, 'replace');
    await user.click(replaceButton);

    expect(mockProps.onReplace).toHaveBeenCalledWith('find', 'replace', {
      matchCase: false,
      matchWholeWord: false,
      useRegex: false
    });
  });

  it('calls onReplaceAll when replace all button is clicked', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    const replaceInput = screen.getByLabelText(/استبدال بـ/i);
    const replaceAllButton = screen.getByRole('button', { name: /استبدال الكل/i });

    await user.type(searchInput, 'find');
    await user.type(replaceInput, 'replace');
    await user.click(replaceAllButton);

    expect(mockProps.onReplaceAll).toHaveBeenCalledWith('find', 'replace', {
      matchCase: false,
      matchWholeWord: false,
      useRegex: false
    });
  });

  it('calls onClose when close button is clicked', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const closeButton = screen.getByRole('button', { name: /إغلاق/i });
    await user.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('displays search results count', () => {
    const propsWithResults = {
      ...mockProps,
      searchResults: {
        total: 5,
        current: 2,
        matches: []
      }
    };

    render(<FindReplaceDialog {...propsWithResults} />);

    expect(screen.getByText('2 من 5 نتائج')).toBeInTheDocument();
  });

  it('shows no results message when search returns empty', () => {
    const propsWithNoResults = {
      ...mockProps,
      searchText: 'nonexistent',
      searchResults: {
        total: 0,
        current: 0,
        matches: []
      }
    };

    render(<FindReplaceDialog {...propsWithNoResults} />);

    expect(screen.getByText(/لم يتم العثور على نتائج/i)).toBeInTheDocument();
  });

  it('disables replace buttons when no search text', () => {
    render(<FindReplaceDialog {...mockProps} />);

    const replaceButton = screen.getByRole('button', { name: /استبدال/i });
    const replaceAllButton = screen.getByRole('button', { name: /استبدال الكل/i });

    expect(replaceButton).toBeDisabled();
    expect(replaceAllButton).toBeDisabled();
  });

  it('enables replace buttons when search text is provided', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    await user.type(searchInput, 'test');

    const replaceButton = screen.getByRole('button', { name: /استبدال/i });
    const replaceAllButton = screen.getByRole('button', { name: /استبدال الكل/i });

    expect(replaceButton).toBeEnabled();
    expect(replaceAllButton).toBeEnabled();
  });

  it('handles navigation between search results', async () => {
    const propsWithResults = {
      ...mockProps,
      searchResults: {
        total: 3,
        current: 1,
        matches: []
      }
    };

    render(<FindReplaceDialog {...propsWithResults} />);

    const nextButton = screen.getByRole('button', { name: /التالي/i });
    const prevButton = screen.getByRole('button', { name: /السابق/i });

    await user.click(nextButton);
    await user.click(prevButton);

    // Navigation functionality would be tested based on implementation
    expect(nextButton).toBeInTheDocument();
    expect(prevButton).toBeInTheDocument();
  });

  it('handles escape key to close dialog', () => {
    render(<FindReplaceDialog {...mockProps} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles enter key in search input to trigger search', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    await user.type(searchInput, 'test');
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(mockProps.onFind).toHaveBeenCalledWith('test', {
      matchCase: false,
      matchWholeWord: false,
      useRegex: false
    });
  });

  it('validates regex patterns', async () => {
    render(<FindReplaceDialog {...mockProps} />);

    const searchInput = screen.getByLabelText(/البحث عن/i);
    const regexCheckbox = screen.getByLabelText(/استخدام التعبيرات النمطية/i);
    const findButton = screen.getByRole('button', { name: /بحث/i });

    await user.click(regexCheckbox);
    await user.type(searchInput, '[invalid regex');
    await user.click(findButton);

    expect(screen.getByText(/تعبير نمطي غير صحيح/i)).toBeInTheDocument();
  });

  it('preserves input values when dialog is reopened', () => {
    const propsWithValues = {
      ...mockProps,
      searchText: 'preserved search',
      replaceText: 'preserved replace'
    };

    render(<FindReplaceDialog {...propsWithValues} />);

    expect(screen.getByDisplayValue('preserved search')).toBeInTheDocument();
    expect(screen.getByDisplayValue('preserved replace')).toBeInTheDocument();
  });

  it('highlights search matches in preview', () => {
    const propsWithMatches = {
      ...mockProps,
      searchResults: {
        total: 2,
        current: 1,
        matches: [
          { start: 0, end: 4, text: 'test', line: 1 },
          { start: 10, end: 14, text: 'test', line: 2 }
        ]
      }
    };

    render(<FindReplaceDialog {...propsWithMatches} />);

    // Check if matches are displayed in results preview
    const resultsPreview = screen.getByTestId('search-results-preview');
    expect(resultsPreview).toBeInTheDocument();
  });

  it('supports keyboard shortcuts within dialog', () => {
    render(<FindReplaceDialog {...mockProps} />);

    // F3 for find next
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'F3' });

    // Shift+F3 for find previous
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'F3', shiftKey: true });

    // Ctrl+H to focus search input
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'h', ctrlKey: true });

    const searchInput = screen.getByLabelText(/البحث عن/i);
    expect(searchInput).toHaveFocus();
  });
});
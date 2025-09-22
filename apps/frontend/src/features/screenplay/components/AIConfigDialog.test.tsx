import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIConfigDialog } from './AIConfigDialog';

// Mock external dependencies
vi.mock('@shared/screenplay/geminiCoordinator', () => ({
  geminiCoordinator: {
    updateConfig: vi.fn(),
    getConfig: vi.fn(() => ({
      apiKey: '',
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 1000,
      enabled: false
    })),
    testConnection: vi.fn(),
    isConfigured: vi.fn(() => false)
  }
}));

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn()
};

describe('AIConfigDialog', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<AIConfigDialog {...mockProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('إعدادات الذكاء الاصطناعي')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AIConfigDialog {...mockProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays API key input field', () => {
    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    expect(apiKeyInput).toBeInTheDocument();
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('displays model selection dropdown', () => {
    render(<AIConfigDialog {...mockProps} />);

    const modelSelect = screen.getByLabelText(/نموذج الذكاء الاصطناعي/i);
    expect(modelSelect).toBeInTheDocument();
  });

  it('displays temperature slider', () => {
    render(<AIConfigDialog {...mockProps} />);

    const temperatureSlider = screen.getByLabelText(/درجة الحرارة/i);
    expect(temperatureSlider).toBeInTheDocument();
    expect(temperatureSlider).toHaveAttribute('type', 'range');
  });

  it('displays max tokens input', () => {
    render(<AIConfigDialog {...mockProps} />);

    const maxTokensInput = screen.getByLabelText(/الحد الأقصى للرموز/i);
    expect(maxTokensInput).toBeInTheDocument();
    expect(maxTokensInput).toHaveAttribute('type', 'number');
  });

  it('handles API key input correctly', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    await user.type(apiKeyInput, 'test-api-key');

    expect(apiKeyInput).toHaveValue('test-api-key');
  });

  it('validates API key format', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    const saveButton = screen.getByRole('button', { name: /حفظ/i });

    // Test invalid API key
    await user.type(apiKeyInput, 'invalid-key');
    await user.click(saveButton);

    // Check for validation error
    expect(screen.getByText(/مفتاح API غير صحيح/i)).toBeInTheDocument();
  });

  it('updates model selection', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const modelSelect = screen.getByLabelText(/نموذج الذكاء الاصطناعي/i);
    await user.selectOptions(modelSelect, 'gemini-pro-vision');

    expect(modelSelect).toHaveValue('gemini-pro-vision');
  });

  it('updates temperature with slider', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const temperatureSlider = screen.getByLabelText(/درجة الحرارة/i);
    fireEvent.change(temperatureSlider, { target: { value: '0.9' } });

    expect(temperatureSlider).toHaveValue('0.9');
  });

  it('updates max tokens input', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const maxTokensInput = screen.getByLabelText(/الحد الأقصى للرموز/i);
    await user.clear(maxTokensInput);
    await user.type(maxTokensInput, '2000');

    expect(maxTokensInput).toHaveValue(2000);
  });

  it('tests connection when button is clicked', async () => {
    const { geminiCoordinator } = await import('@shared/screenplay/geminiCoordinator');
    geminiCoordinator.testConnection = vi.fn().mockResolvedValue({ success: true });

    render(<AIConfigDialog {...mockProps} />);

    const testButton = screen.getByRole('button', { name: /اختبار الاتصال/i });
    await user.click(testButton);

    expect(geminiCoordinator.testConnection).toHaveBeenCalled();
  });

  it('shows connection success message', async () => {
    const { geminiCoordinator } = await import('@shared/screenplay/geminiCoordinator');
    geminiCoordinator.testConnection = vi.fn().mockResolvedValue({ success: true });

    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    await user.type(apiKeyInput, 'valid-api-key');

    const testButton = screen.getByRole('button', { name: /اختبار الاتصال/i });
    await user.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/تم الاتصال بنجاح/i)).toBeInTheDocument();
    });
  });

  it('shows connection error message', async () => {
    const { geminiCoordinator } = await import('@shared/screenplay/geminiCoordinator');
    geminiCoordinator.testConnection = vi.fn().mockRejectedValue(new Error('Connection failed'));

    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    await user.type(apiKeyInput, 'invalid-api-key');

    const testButton = screen.getByRole('button', { name: /اختبار الاتصال/i });
    await user.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/فشل في الاتصال/i)).toBeInTheDocument();
    });
  });

  it('saves configuration when save button is clicked', async () => {
    const { geminiCoordinator } = await import('@shared/screenplay/geminiCoordinator');

    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    const saveButton = screen.getByRole('button', { name: /حفظ/i });

    await user.type(apiKeyInput, 'test-api-key');
    await user.click(saveButton);

    expect(geminiCoordinator.updateConfig).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 1000,
      enabled: true
    });
    expect(mockProps.onSave).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /إلغاء/i });
    await user.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when dialog overlay is clicked', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const dialogOverlay = screen.getByTestId('dialog-overlay');
    await user.click(dialogOverlay);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles escape key to close dialog', async () => {
    render(<AIConfigDialog {...mockProps} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows loading state during connection test', async () => {
    const { geminiCoordinator } = await import('@shared/screenplay/geminiCoordinator');
    geminiCoordinator.testConnection = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<AIConfigDialog {...mockProps} />);

    const testButton = screen.getByRole('button', { name: /اختبار الاتصال/i });
    await user.click(testButton);

    expect(screen.getByText(/جاري الاختبار/i)).toBeInTheDocument();
  });

  it('disables save button when API key is empty', () => {
    render(<AIConfigDialog {...mockProps} />);

    const saveButton = screen.getByRole('button', { name: /حفظ/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when API key is provided', async () => {
    render(<AIConfigDialog {...mockProps} />);

    const apiKeyInput = screen.getByLabelText(/مفتاح API/i);
    const saveButton = screen.getByRole('button', { name: /حفظ/i });

    await user.type(apiKeyInput, 'test-api-key');

    expect(saveButton).toBeEnabled();
  });

  it('loads existing configuration on mount', () => {
    const { geminiCoordinator } = require('@shared/screenplay/geminiCoordinator');
    geminiCoordinator.getConfig.mockReturnValue({
      apiKey: 'existing-key',
      model: 'gemini-pro-vision',
      temperature: 0.5,
      maxTokens: 1500,
      enabled: true
    });

    render(<AIConfigDialog {...mockProps} />);

    expect(screen.getByDisplayValue('existing-key')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gemini-pro-vision')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1500')).toBeInTheDocument();
  });

  it('shows help text for each configuration option', () => {
    render(<AIConfigDialog {...mockProps} />);

    expect(screen.getByText(/أدخل مفتاح API الخاص بـ Gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/اختر نموذج الذكاء الاصطناعي/i)).toBeInTheDocument();
    expect(screen.getByText(/تحكم في عشوائية النتائج/i)).toBeInTheDocument();
    expect(screen.getByText(/الحد الأقصى لطول الاستجابة/i)).toBeInTheDocument();
  });
});
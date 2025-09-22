/**
 * Advanced Clipboard Toolbar - Enhanced clipboard operations with AI processing
 */

import React, { useState, useRef } from 'react';
import {
  Clipboard, ClipboardPaste, ClipboardCopy, FileText,
  Upload, Download, Settings, Wand2, Brain, Zap,
  FileImage, FileType, AlertCircle, CheckCircle
} from 'lucide-react';
import { fileReaderService } from '@shared/services/fileReaderService';
import { ocrService } from '@shared/services/ocrService';
import { pipelineProcessor } from '@shared/screenplay/pipelineProcessor';

interface AdvancedClipboardToolbarProps {
  onImport: (content: string, metadata?: any) => void;
  onExport: (format: 'txt' | 'html' | 'pdf') => void;
  isProcessing?: boolean;
  className?: string;
}

interface ImportOptions {
  enableOCR: boolean;
  preserveFormatting: boolean;
  useAI: boolean;
  targetLanguage: 'ar' | 'en' | 'auto';
  confidenceThreshold: number;
}

interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const AdvancedClipboardToolbar: React.FC<AdvancedClipboardToolbarProps> = ({
  onImport,
  onExport,
  isProcessing = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    enableOCR: true,
    preserveFormatting: true,
    useAI: true,
    targetLanguage: 'ar',
    confidenceThreshold: 0.8
  });
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [lastImportStats, setLastImportStats] = useState<any>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);

    // Reset input for subsequent uploads
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Process uploaded file
   */
  const processFile = async (file: File) => {
    setProcessingStatus({
      stage: 'initializing',
      progress: 0,
      message: 'بدء معالجة الملف...',
      type: 'info'
    });

    try {
      // Stage 1: File type detection
      setProcessingStatus({
        stage: 'detection',
        progress: 10,
        message: `تحليل نوع الملف: ${file.name}`,
        type: 'info'
      });

      const isSupported = fileReaderService.isSupported(file);
      if (!isSupported) {
        throw new Error(`نوع الملف غير مدعوم: ${file.type}`);
      }

      // Stage 2: Text extraction
      setProcessingStatus({
        stage: 'extraction',
        progress: 30,
        message: 'استخراج النص من الملف...',
        type: 'info'
      });

      const extractionResult = await fileReaderService.processFile(file, {
        enableOCR: importOptions.enableOCR,
        preserveFormatting: importOptions.preserveFormatting,
        targetLanguage: importOptions.targetLanguage
      });

      if (!extractionResult.success || !extractionResult.text) {
        throw new Error(extractionResult.error || 'فشل في استخراج النص');
      }

      setProcessingStatus({
        stage: 'extraction',
        progress: 50,
        message: `تم استخراج ${extractionResult.text.length} حرف`,
        type: 'success'
      });

      // Stage 3: Text processing with pipeline
      setProcessingStatus({
        stage: 'processing',
        progress: 70,
        message: 'معالجة النص بنظام الذكاء الاصطناعي...',
        type: 'info'
      });

      const lines = extractionResult.text.split('\n').filter(line => line.trim());
      const pipelineResult = await pipelineProcessor.process(lines, {
        importType: 'file',
        filename: file.name,
        useAI: importOptions.useAI,
        batchMode: lines.length > 10,
        preserveFormatting: importOptions.preserveFormatting
      });

      setProcessingStatus({
        stage: 'finalizing',
        progress: 90,
        message: 'إنهاء المعالجة...',
        type: 'info'
      });

      // Store import statistics
      const stats = {
        filename: file.name,
        fileSize: file.size,
        extractionMethod: extractionResult.metadata.extractionMethod,
        extractionConfidence: extractionResult.metadata.confidence,
        totalLines: lines.length,
        pipelineSuccess: pipelineResult.success,
        averageConfidence: pipelineResult.metadata?.averageConfidence || 0,
        classificationsUsed: pipelineResult.metadata?.classificationsUsed || {},
        processingTime: pipelineResult.totalDuration,
        stages: pipelineResult.stages
      };

      setLastImportStats(stats);

      // Final result
      const finalContent = pipelineResult.success && pipelineResult.output
        ? pipelineResult.output.html
        : extractionResult.text;

      setProcessingStatus({
        stage: 'complete',
        progress: 100,
        message: `تم بنجاح! معالجة ${stats.totalLines} سطر بمتوسط دقة ${Math.round(stats.averageConfidence * 100)}%`,
        type: 'success'
      });

      // Call import handler
      onImport(finalContent, stats);

      // Clear status after delay
      setTimeout(() => setProcessingStatus(null), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: `فشل في المعالجة: ${errorMessage}`,
        type: 'error'
      });

      setTimeout(() => setProcessingStatus(null), 5000);
    }
  };

  /**
   * Handle clipboard paste with advanced processing
   */
  const handleSmartPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;

      setProcessingStatus({
        stage: 'processing',
        progress: 50,
        message: 'معالجة النص المنسوخ...',
        type: 'info'
      });

      const lines = text.split('\n').filter(line => line.trim());
      const result = await pipelineProcessor.process(lines, {
        importType: 'paste',
        useAI: importOptions.useAI,
        batchMode: lines.length > 5,
        preserveFormatting: importOptions.preserveFormatting
      });

      const finalContent = result.success && result.output
        ? result.output.html
        : text;

      setProcessingStatus({
        stage: 'complete',
        progress: 100,
        message: `تم لصق ${lines.length} سطر بنجاح`,
        type: 'success'
      });

      onImport(finalContent, result.metadata);
      setTimeout(() => setProcessingStatus(null), 2000);

    } catch (error) {
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: 'فشل في لصق النص',
        type: 'error'
      });
      setTimeout(() => setProcessingStatus(null), 3000);
    }
  };

  /**
   * Render processing status
   */
  const renderProcessingStatus = () => {
    if (!processingStatus) return null;

    const statusIcons = {
      info: <AlertCircle size={16} className="text-blue-500" />,
      success: <CheckCircle size={16} className="text-green-500" />,
      warning: <AlertCircle size={16} className="text-yellow-500" />,
      error: <AlertCircle size={16} className="text-red-500" />
    };

    return (
      <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          {statusIcons[processingStatus.type]}
          <span className="text-sm font-medium">{processingStatus.message}</span>
        </div>
        {processingStatus.progress > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                processingStatus.type === 'error' ? 'bg-red-500' :
                processingStatus.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${processingStatus.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  /**
   * Render import statistics
   */
  const renderImportStats = () => {
    if (!lastImportStats) return null;

    return (
      <div className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 min-w-64">
        <h4 className="font-medium mb-2">إحصائيات آخر استيراد</h4>
        <div className="space-y-1 text-sm">
          <div>الملف: {lastImportStats.filename}</div>
          <div>الأسطر: {lastImportStats.totalLines}</div>
          <div>الدقة: {Math.round(lastImportStats.averageConfidence * 100)}%</div>
          <div>الوقت: {lastImportStats.processingTime}ms</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            التصنيفات: {Object.entries(lastImportStats.classificationsUsed || {})
              .map(([type, count]) => `${type}:${count}`)
              .join(', ')
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.rtf,.png,.jpg,.jpeg,.gif,.bmp"
        onChange={handleFileSelect}
        className="hidden"
        multiple={false}
      />

      {/* Import from File */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        title="استيراد من ملف (PDF, DOCX, صور)"
      >
        <Upload size={18} />
      </button>

      {/* Smart Paste */}
      <button
        onClick={handleSmartPaste}
        disabled={isProcessing}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        title="لصق ذكي مع معالجة AI"
      >
        <div className="relative">
          <ClipboardPaste size={18} />
          {importOptions.useAI && (
            <Brain size={10} className="absolute -top-1 -right-1 text-blue-500" />
          )}
        </div>
      </button>

      {/* OCR Processing */}
      <button
        onClick={() => {
          // Trigger file input with OCR focus
          if (fileInputRef.current) {
            fileInputRef.current.setAttribute('accept', 'image/*,.pdf');
            fileInputRef.current.click();
          }
        }}
        disabled={isProcessing}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        title="معالجة الصور بـ OCR"
      >
        <div className="relative">
          <FileImage size={18} />
          <Zap size={10} className="absolute -top-1 -right-1 text-yellow-500" />
        </div>
      </button>

      {/* Export Options */}
      <div className="relative group">
        <button
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          title="تصدير"
        >
          <Download size={18} />
        </button>
        <div className="absolute top-full mt-1 right-0 hidden group-hover:block z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg py-2 min-w-32">
          <button
            onClick={() => onExport('txt')}
            className="w-full px-3 py-2 text-right hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            نص عادي
          </button>
          <button
            onClick={() => onExport('html')}
            className="w-full px-3 py-2 text-right hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            HTML
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="w-full px-3 py-2 text-right hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            PDF
          </button>
        </div>
      </div>

      {/* Settings */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 ${showOptions ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
        title="إعدادات الاستيراد"
      >
        <Settings size={18} />
      </button>

      {/* Options Panel */}
      {showOptions && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 min-w-80">
          <h4 className="font-medium mb-3">إعدادات الاستيراد المتقدم</h4>

          <div className="space-y-3">
            {/* AI Processing */}
            <label className="flex items-center justify-between">
              <span>معالجة بالذكاء الاصطناعي</span>
              <input
                type="checkbox"
                checked={importOptions.useAI}
                onChange={(e) => setImportOptions(prev => ({ ...prev, useAI: e.target.checked }))}
                className="rounded"
              />
            </label>

            {/* OCR */}
            <label className="flex items-center justify-between">
              <span>تفعيل OCR للصور</span>
              <input
                type="checkbox"
                checked={importOptions.enableOCR}
                onChange={(e) => setImportOptions(prev => ({ ...prev, enableOCR: e.target.checked }))}
                className="rounded"
              />
            </label>

            {/* Preserve Formatting */}
            <label className="flex items-center justify-between">
              <span>الحفاظ على التنسيق</span>
              <input
                type="checkbox"
                checked={importOptions.preserveFormatting}
                onChange={(e) => setImportOptions(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
                className="rounded"
              />
            </label>

            {/* Language */}
            <div>
              <label className="block text-sm mb-1">اللغة المستهدفة</label>
              <select
                value={importOptions.targetLanguage}
                onChange={(e) => setImportOptions(prev => ({ ...prev, targetLanguage: e.target.value as any }))}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="auto">تلقائي</option>
              </select>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm mb-1">
                حد الثقة ({Math.round(importOptions.confidenceThreshold * 100)}%)
              </label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={importOptions.confidenceThreshold}
                onChange={(e) => setImportOptions(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={() => setShowOptions(false)}
            className="mt-3 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            تطبيق
          </button>
        </div>
      )}

      {/* Import Stats */}
      {lastImportStats && (
        <button
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 relative group"
          title="إحصائيات آخر استيراد"
        >
          <FileText size={18} />
          <div className="hidden group-hover:block">
            {renderImportStats()}
          </div>
        </button>
      )}

      {/* Processing Status */}
      {renderProcessingStatus()}
    </div>
  );
};

export default AdvancedClipboardToolbar;
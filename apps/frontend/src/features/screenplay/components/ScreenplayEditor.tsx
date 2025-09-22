import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sun, Moon, Brain
} from 'lucide-react';

import { pipelineProcessor } from '@shared/screenplay/pipelineProcessor';
import { geminiCoordinator } from '@shared/screenplay/geminiCoordinator';
import { advancedClassifier } from '@shared/screenplay/advancedClassifier';
import { fileReaderService } from '@shared/services/fileReaderService';
import { ocrService } from '@shared/services/ocrService';
import { getFormatStyles } from '@shared/screenplay/formatStyles';
import { ClipboardToolbar } from './ClipboardToolbar';
import { EditingToolbar } from './EditingToolbar';
import { FontToolbar } from './FontToolbar';
import { ParagraphToolbar } from './ParagraphToolbar';
import { StylesToolbar } from './StylesToolbar';
import { FindReplaceDialog } from './FindReplaceDialog';
import { StylesDialog } from './StylesDialog';
import { AdvancedClipboardToolbar } from './AdvancedClipboardToolbar';
import { SmartEditingToolbar } from './SmartEditingToolbar';
import { AIConfigDialog } from './AIConfigDialog';
import { CustomStyle, customStylesManager } from '@shared/screenplay/customStylesManager';
import { applySceneHeaderStyles } from '../utils/applySceneHeaderStyles';

// ============================================================================
// Constants
// ============================================================================
const PIXELS_PER_CM = 96 / 2.54; // Standard DPI conversion

// ============================================================================
// Ruler Component
// ============================================================================
interface RulerProps {
  orientation?: 'horizontal' | 'vertical';
  isDarkMode: boolean;
}

const Ruler: React.FC<RulerProps> = ({ orientation = 'horizontal', isDarkMode }) => {
  const lengthInCm = Math.floor(orientation === 'horizontal' ? 21 : 29.7);
  const numbers = [];
  for (let i = 1; i <= lengthInCm; i++) {
    const style = orientation === 'horizontal'
      ? { right: `${i * PIXELS_PER_CM}px`, transform: 'translateX(50%)' }
      : { top: `${i * PIXELS_PER_CM}px`, transform: 'translateY(-50%)' };
    numbers.push(<span key={i} className="ruler-number" style={style}>{i}</span>);
  }
  return (
    <div className={`ruler-container ${orientation} ${isDarkMode ? 'dark' : ''}`}>
      {numbers}
    </div>
  );
};


// ============================================================================
// Main ScreenplayEditor Component
// ============================================================================
const ScreenplayEditor = () => {
  // State and Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Amiri');
  const [selectedSize] = useState('12pt');
  const [documentStats, setDocumentStats] = useState({ pages: 1, words: 0 });
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toolbar states
  const [isFindReplaceOpen, setFindReplaceOpen] = useState(false);
  const [isFormatPainterActive, setFormatPainterActive] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [isStylesDialogOpen, setStylesDialogOpen] = useState(false);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    totalLines: number;
    averageConfidence: number;
    classificationsUsed: Record<string, number>;
  } | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [currentMode, setCurrentMode] = useState<'basic' | 'advanced'>('basic');
  const [selectedText, setSelectedText] = useState('');

  // Initialize AI coordinator
  useEffect(() => {
    const apiKey = localStorage.getItem('gemini-api-key');
    if (apiKey) {
      setGeminiApiKey(apiKey);
      geminiCoordinator.setApiKey(apiKey);
    }
  }, []);

  const coordinator = useMemo(() => ({
    processScript: async (lines: string[], options = {}) => {
      const context = {
        importType: 'paste' as const,
        useAI,
        batchMode: lines.length > 10,
        preserveFormatting: true,
        ...options
      };

      const result = await pipelineProcessor.process(lines, context);

      if (result.success && result.output) {
        return {
          results: result.output.elements?.map((element: any) => ({
            html: `<div class="${element.className}" ${Object.entries(element.attributes).map(([k, v]) => `${k}="${v}"`).join(' ')}>${element.content}</div>`,
            classification: element.className,
            confidence: 0.9
          })) || [],
          metadata: result.metadata
        };
      }

      // Fallback to simple processing
      const simpleResults = await Promise.all(
        lines.map(async (line) => {
          const agentResult = await advancedClassifier.classify(line);
          return {
            html: agentResult.html,
            classification: agentResult.elementType,
            confidence: agentResult.confidence
          };
        })
      );

      return { results: simpleResults, metadata: {} };
    }
  }), [useAI]);

  const updateStats = useCallback((pageCount: number) => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setDocumentStats({ pages: pageCount, words });
    }
  }, []);

  const layoutAndPaginate = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    // 1. Remove old page breaks to recalculate
    editor.querySelectorAll('.page-break').forEach(el => el.remove());

    const A4_HEIGHT_PX = 29.7 * PIXELS_PER_CM;
    const TOP_MARGIN_PX = 1.9 * PIXELS_PER_CM;
    const BOTTOM_MARGIN_PX = 1.9 * PIXELS_PER_CM;
    const AVAILABLE_HEIGHT = A4_HEIGHT_PX - TOP_MARGIN_PX - BOTTOM_MARGIN_PX;
    
    let currentPageHeight = 0;
    let pageCounter = 1;
    const children = Array.from(editor.children);

    for (const child of children) {
      const el = child as HTMLElement;
      if (el.classList.contains('page-break')) continue;

      const style = window.getComputedStyle(el);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      const elementHeight = el.offsetHeight + marginTop + marginBottom;

      if (currentPageHeight + elementHeight > AVAILABLE_HEIGHT && currentPageHeight > 0) {
        const pageBreak = document.createElement('div');
        pageBreak.className = 'page-break';
        pageBreak.setAttribute('data-page-number', `${pageCounter + 1}`);
        
        editor.insertBefore(pageBreak, el);
        
        pageCounter++;
        currentPageHeight = elementHeight;
      } else {
        currentPageHeight += elementHeight;
      }
    }
    updateStats(pageCounter);
  }, [updateStats]);

  const applySceneHeaderFormatting = useCallback(() => {
    if (!editorRef.current) return;
    applySceneHeaderStyles(
      editorRef.current,
      (baseClass) => getFormatStyles(baseClass, selectedFont, selectedSize)
    );
  }, [selectedFont, selectedSize]);

  const setEditorContent = useCallback(
    (html: string) => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = html;
      applySceneHeaderFormatting();
      layoutAndPaginate();
    },
    [applySceneHeaderFormatting, layoutAndPaginate]
  );

  useEffect(() => {
    applySceneHeaderFormatting();
  }, [applySceneHeaderFormatting]);


  // Enhanced paste handler with AI processing
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!editorRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const textData = e.clipboardData.getData('text/plain');
      if (!textData) return;

      const lines = textData.split('\n').filter(line => line.trim());
      if (lines.length === 0) return;

      setProcessingProgress(25);

      // Process with advanced pipeline
      const context = {
        importType: 'paste' as const,
        useAI,
        batchMode: lines.length > 10,
        preserveFormatting: true
      };

      setProcessingProgress(50);
      const result = await pipelineProcessor.process(lines, context);

      setProcessingProgress(75);

      if (result.success && result.output) {
        setEditorContent(result.output.html);
        setImportStats({
          totalLines: result.metadata.linesProcessed,
          averageConfidence: result.metadata.averageConfidence,
          classificationsUsed: result.metadata.classificationsUsed
        });
      } else {
        // Fallback processing
        const { results } = await coordinator.processScript(lines);
        const formattedHTML = results.map(r => r.html).join('');
        setEditorContent(formattedHTML);
      }

      setProcessingProgress(100);

    } catch (error) {
      console.error('Paste processing failed:', error);
      // Fallback to simple paste
      const textData = e.clipboardData.getData('text/plain');
      if (textData) {
        setEditorContent(
          textData
            .split('\n')
            .map(line => `<div class="action">${line}</div>`)
            .join('')
        );
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(0), 1000);
    }
  }, [coordinator, setEditorContent, useAI]);

  // File import handler
  const handleFileImport = useCallback(async (file: File) => {
    if (!editorRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      setProcessingProgress(20);

      // Extract text from file
      const extractedText = await fileReaderService.extractTextFromFile(file, {
        enableOCR: true,
        preserveFormatting: true,
        targetLanguage: 'ar'
      });

      setProcessingProgress(40);

      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file');
      }

      const lines = extractedText.split('\n').filter(line => line.trim());

      setProcessingProgress(60);

      // Process with pipeline
      const context = {
        importType: 'file' as const,
        filename: file.name,
        useAI,
        batchMode: true,
        preserveFormatting: true
      };

      const result = await pipelineProcessor.process(lines, context);

      setProcessingProgress(90);

      if (result.success && result.output) {
        setEditorContent(result.output.html);
        setImportStats({
          totalLines: result.metadata.linesProcessed,
          averageConfidence: result.metadata.averageConfidence,
          classificationsUsed: result.metadata.classificationsUsed
        });
      }

      setProcessingProgress(100);

    } catch (error) {
      console.error('File import failed:', error);
      alert(`فشل في استيراد الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(0), 1000);
    }
  }, [selectedFont, setEditorContent, useAI]);

  // Live typing handler
  const handleInput = useCallback(async (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target || target.tagName !== 'DIV') return;

    const text = target.textContent || '';
    if (text.trim().length === 0) return;

    // Only classify on Enter or when line seems complete
    if (text.endsWith('\n') || text.length > 50) {
      try {
        const context = {
          linePosition: 'middle' as const,
          isTyping: true,
          isInstant: true
        };

        const result = await advancedClassifier.classify(text.trim(), context);

        // Update element class and styles
        target.className = result.elementType;
        const styles = getFormatStyles(result.elementType, selectedFont, selectedSize);
        Object.assign(target.style, styles);
        if (result.elementType.startsWith('scene-header')) {
          applySceneHeaderFormatting();
        }

      } catch (error) {
        console.warn('Live classification failed:', error);
      }
    }
  }, [applySceneHeaderFormatting, selectedFont, selectedSize]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const observer = new MutationObserver(() => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
      layoutTimeoutRef.current = setTimeout(layoutAndPaginate, 300);
    });

    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
    };
  }, [layoutAndPaginate]);

  // Toolbar handlers
  const toggleFormatPainter = () => setFormatPainterActive(prev => !prev);
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => document.execCommand('foreColor', false, e.target.value);
  const handleHighlightChange = (e: React.ChangeEvent<HTMLInputElement>) => document.execCommand('hiliteColor', false, e.target.value);
  const toggleShowFormatting = () => setShowFormatting(prev => !prev);
  const applyStyle = (styleName: string) => document.execCommand('formatBlock', false, styleName);
  const onStylesUpdate = (newStyles: CustomStyle[]) => setCustomStyles(newStyles);


  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-200 text-gray-800'}`} dir="rtl">
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Courier+Prime&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{ __html: `
        .scroll-container {
            padding: 2rem;
            width: 100%;
            overflow: auto;
            flex-grow: 1;
            display: flex;
            justify-content: center;
        }
        .editor-area-wrapper {
          position: relative;
          padding-top: 30px;
          padding-right: 30px;
          margin: 0 auto;
        }
        .ruler-container {
          position: absolute;
          background: ${isDarkMode ? '#2d3748' : '#ffffff'};
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          z-index: 10;
        }
        .ruler-container.horizontal {
          top: 0;
          left: 0;
          right: 30px;
          height: 30px;
          border-bottom: 1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'};
        }
        .ruler-container.vertical {
          top: 30px;
          right: 0;
          bottom: 0;
          width: 30px;
          border-left: 1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'};
        }
        .ruler-number {
          position: absolute;
          font-size: 10px;
          color: ${isDarkMode ? '#a0aec0' : '#718096'};
        }
        .page-background {
          width: 21cm;
          min-height: 29.7cm;
          background: ${isDarkMode ? '#1a202c' : '#ffffff'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .page-content {
          outline: none;
          direction: rtl;
          padding: 1.9cm 3.17cm 1.9cm 2.5cm;
          font-family: '${selectedFont}', monospace;
          font-size: ${selectedSize};
        }
        .bismillah {
          text-align: center;
        }
        .page-break {
            height: 3.8cm;
            position: relative;
            background-color: ${isDarkMode ? '#2d3748' : '#e5e7eb'};
            margin: 0 -3.17cm 0 -2.5cm;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 -4px 12px rgba(0,0,0,0.15);
            page-break-before: always;
        }
        .page-break::after {
            content: attr(data-page-number);
            position: absolute;
            bottom: calc(1.9cm - 0.25in);
            left: 2.5cm;
            font-size: 10pt;
        }

        /* تعتمد أنماط scene-header على CSS الأساسي في index.css */
      `}} />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 shadow-sm z-30 bg-gray-100 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold" style={{fontFamily: 'Amiri'}}>محرر السيناريو المتقدم</h1>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm">AI:</label>
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="rounded"
                  />
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.rtf,.png,.jpg,.jpeg"
                  onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])}
                  className="hidden"
                  id="file-import"
                />
                <label
                  htmlFor="file-import"
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                >
                  استيراد ملف
                </label>
                <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="p-1 border rounded bg-white dark:bg-gray-600">
                    <option value="Amiri">Amiri</option>
                    <option value="Courier Prime">Courier Prime</option>
                </select>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label="تبديل الوضع الليلي"
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </div>
        <div className="flex items-center justify-between" data-testid="toolbar-container">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMode('basic')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentMode === 'basic'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              أساسي
            </button>
            <button
              onClick={() => setCurrentMode('advanced')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentMode === 'advanced'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              متقدم
            </button>
          </div>

          {/* Toolbars */}
          <div className="flex items-center space-x-2">
            {currentMode === 'basic' ? (
              <>
                <ClipboardToolbar isFormatPainterActive={isFormatPainterActive} toggleFormatPainter={toggleFormatPainter} />
                <FontToolbar handleColorChange={handleColorChange} handleHighlightChange={handleHighlightChange} />
                <ParagraphToolbar showFormatting={showFormatting} toggleShowFormatting={toggleShowFormatting} />
                <StylesToolbar
                    customStyles={customStyles}
                    applyStyle={applyStyle}
                    setStylesDialogOpen={setStylesDialogOpen}
                    isStylesDialogOpen={isStylesDialogOpen}
                    onStylesUpdate={onStylesUpdate}
                />
                <EditingToolbar setFindReplaceOpen={setFindReplaceOpen} />
              </>
            ) : (
              <>
                <AdvancedClipboardToolbar
                  onImport={(content, metadata) => {
                    setEditorContent(content);
                    if (metadata) {
                      setImportStats({
                        totalLines: metadata.totalLines || 0,
                        averageConfidence: metadata.averageConfidence || 0,
                        classificationsUsed: metadata.classificationsUsed || {}
                      });
                    }
                  }}
                  onExport={(format) => {
                    // Handle export
                    console.log('Export to:', format);
                  }}
                  isProcessing={isProcessing}
                />
                <SmartEditingToolbar
                  editorRef={editorRef}
                  selectedText={selectedText}
                  onTextUpdate={(newText) => {
                    setEditorContent(newText);
                  }}
                />
                <button
                  onClick={() => setShowAIConfig(true)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="إعدادات الذكاء الاصطناعي"
                >
                  <Brain size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="scroll-container">
        <div className="editor-area-wrapper">
          <Ruler orientation="horizontal" isDarkMode={isDarkMode} />
          <Ruler orientation="vertical" isDarkMode={isDarkMode} />
          <div className="page-background">
              <div
                  ref={editorRef}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onPaste={handlePaste}
                  onInput={handleInput}
                  className="page-content"
                  data-testid="screenplay-editor"
              >
                <div className="bismillah">بسم الله الرحمن الرحيم</div>
                <div className="bismillah">{'{'}بسم الله الرحمن الرحيم {'}'}</div>
              </div>
          </div>
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 h-1">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      )}

      {/* Stats and Status */}
      <div className="flex-shrink-0 px-4 py-1.5 text-sm border-t bg-gray-100 dark:bg-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <span>{documentStats.pages} صفحة</span> | <span>{documentStats.words} كلمة</span>
            {isProcessing && <span className="text-blue-500 mr-2">جاري المعالجة...</span>}
          </div>
          {importStats && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {importStats.totalLines} سطر | دقة {Math.round(importStats.averageConfidence * 100)}% |
              {Object.entries(importStats.classificationsUsed).map(([type, count]) =>
                ` ${type}: ${count}`
              ).join(' |')}
            </div>
          )}
        </div>
      </div>

      <FindReplaceDialog 
        isOpen={isFindReplaceOpen} 
        onClose={() => setFindReplaceOpen(false)} 
        onFind={(_term) => {
          // Implement find logic
        }}
        onReplace={(_term, _replacement) => {
          // Implement replace logic
        }}
        onReplaceAll={(_term, _replacement) => {
          // Implement replace all logic
        }}
      />
      <StylesDialog
        isOpen={isStylesDialogOpen}
        onClose={() => setStylesDialogOpen(false)}
        onStylesUpdate={() => {
          const updatedStyles = customStylesManager.getAllStyles();
          setCustomStyles(updatedStyles);
        }}
      />

      {/* AI Configuration Dialog */}
      <AIConfigDialog
        isOpen={showAIConfig}
        onClose={() => setShowAIConfig(false)}
        onConfigUpdate={(config) => {
          setUseAI(config.enableAI);
          if (config.apiKey) {
            setGeminiApiKey(config.apiKey);
          }
        }}
      />
    </div>
  );
};

export default ScreenplayEditor;

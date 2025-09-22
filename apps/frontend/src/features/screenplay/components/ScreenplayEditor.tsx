import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sun, Moon
} from 'lucide-react';

import { ScreenplayCoordinator } from '@shared/screenplay/coordinator';
import { getFormatStyles } from '@shared/screenplay/formatStyles';
import { ClipboardToolbar } from './ClipboardToolbar';
import { EditingToolbar } from './EditingToolbar';
import { FontToolbar } from './FontToolbar';
import { ParagraphToolbar } from './ParagraphToolbar';
import { StylesToolbar } from './StylesToolbar';
import { FindReplaceDialog } from './FindReplaceDialog';
import { StylesDialog } from './StylesDialog';
import { CustomStyle } from '@shared/screenplay/types';
import { customStylesManager } from '@shared/screenplay/customStylesManager';

// ============================================================================
// Constants
// ============================================================================
const PIXELS_PER_CM = 96 / 2.54; // Standard DPI conversion

// ============================================================================
// Ruler Component
// ============================================================================
const Ruler = ({ orientation = 'horizontal', isDarkMode }) => {
  const length = orientation === 'horizontal' ? 21 * PIXELS_PER_CM : 29.7 * PIXELS_PER_CM;
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
  const [selectedSize, setSelectedSize] = useState('12pt');
  const [documentStats, setDocumentStats] = useState({ pages: 1, words: 0 });
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toolbar states
  const [isFindReplaceOpen, setFindReplaceOpen] = useState(false);
  const [isFormatPainterActive, setFormatPainterActive] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [isStylesDialogOpen, setStylesDialogOpen] = useState(false);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);


  const coordinator = useMemo(() => new ScreenplayCoordinator((type, font, size) => getFormatStyles(type, font, size)), []);

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


  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const textData = e.clipboardData.getData('text/plain');
    if (!textData || !editorRef.current) return;
    
    const lines = textData.split('\n');
    const { results } = coordinator.processScript(lines);
    const formattedHTML = results.map(r => r.html).join('');
    
    editorRef.current.innerHTML = formattedHTML;

    // Re-apply styles after paste (FIX for scene headers)
    const divs = editorRef.current.querySelectorAll('div, span');
    divs.forEach(div => {
        const el = div as HTMLElement;
        if (el.className) {
            const baseClass = el.className.split(' ')[0];
            const styles = getFormatStyles(baseClass, selectedFont, selectedSize);
            Object.assign(el.style, styles);
        }
    });

    layoutAndPaginate();
  }, [coordinator, selectedFont, selectedSize, layoutAndPaginate]);

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
      `}} />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 shadow-sm z-30 bg-gray-100 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold" style={{fontFamily: 'Amiri'}}>محرر السيناريو</h1>
            <div className="flex items-center gap-2">
                 <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="p-1 border rounded bg-white dark:bg-gray-600">
                    <option value="Amiri">Amiri</option>
                    <option value="Courier Prime">Courier Prime</option>
                </select>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </div>
        <div className="flex items-center space-x-2">
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
                  className="page-content"
                  data-testid="screenplay-editor"
              />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-1.5 text-sm border-t bg-gray-100 dark:bg-gray-700">
        <span>{documentStats.pages} صفحة</span> | <span>{documentStats.words} كلمة</span>
      </div>

      <FindReplaceDialog 
        isOpen={isFindReplaceOpen} 
        onClose={() => setFindReplaceOpen(false)} 
        onFind={(term) => {
          // Implement find logic
        }}
        onReplace={(term, replacement) => {
          // Implement replace logic
        }}
        onReplaceAll={(term, replacement) => {
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
    </div>
  );
};

export default ScreenplayEditor;

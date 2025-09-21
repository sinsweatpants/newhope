import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles, X, Loader2, Sun, Moon, Copy, FileText,
  Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight,
  Palette,
  Search, Replace, Save, FolderOpen, Printer, Eye, Settings,
  Download, Upload,
  FilePlus, Undo, Redo, Scissors,
  ChevronsRight, Pencil, ChevronDown,
  BookHeart, Film, MapPin, Camera, Feather, UserSquare,
  Parentheses, MessageCircle, FastForward, BrainCircuit, NotebookText
} from 'lucide-react';

import { ScreenplayCoordinator } from '@shared/ScreenplayCoordinator';
import { getFormatStyles } from '@shared/formatStyles';

// ============================================================================
// Constants & Components
// ============================================================================
const PIXELS_PER_CM = 37.7952755906;

const Ruler = ({ orientation = 'horizontal', isDarkMode }) => {
  const length = orientation === 'horizontal' ? 21 * PIXELS_PER_CM : 29.7 * PIXELS_PER_CM;
  const lengthInCm = Math.floor(orientation === 'horizontal' ? 21 : 29.7);
  const numbers = Array.from({ length: lengthInCm }, (_, i) => {
    const style = orientation === 'horizontal'
      ? { right: `${(i + 1) * PIXELS_PER_CM}px`, transform: 'translateX(50%)' }
      : { top: `${(i + 1) * PIXELS_PER_CM}px`, transform: 'translateY(-50%)' };
    return <span key={i} className="ruler-number" style={style}>{i + 1}</span>;
  });
  return <div className={`ruler-container ${orientation} ${isDarkMode ? 'dark' : ''}`}>{numbers}</div>;
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

    editor.querySelectorAll('.page-break').forEach(el => el.remove());

    const A4_HEIGHT_CM = 29.7;
    const TOP_MARGIN_CM = 1.9;
    const BOTTOM_MARGIN_CM = 1.9;
    const AVAILABLE_HEIGHT_CM = A4_HEIGHT_CM - TOP_MARGIN_CM - BOTTOM_MARGIN_CM;
    
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.height = `${AVAILABLE_HEIGHT_CM}cm`;
    document.body.appendChild(tempDiv);
    const AVAILABLE_HEIGHT_PX = tempDiv.clientHeight;
    document.body.removeChild(tempDiv);

    let currentPageHeight = 0;
    let pageCounter = 1;
    const children = Array.from(editor.children);

    for (const child of children) {
      const el = child as HTMLElement;
      if (el.classList.contains('page-break')) continue;

      const style = window.getComputedStyle(el);
      const marginTop = parseFloat(style.marginTop);
      const marginBottom = parseFloat(style.marginBottom);
      const elementHeight = el.offsetHeight + marginTop + marginBottom;

      if (currentPageHeight + elementHeight > AVAILABLE_HEIGHT_PX) {
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


  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} dir="rtl">
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Courier+Prime&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{ __html: `
        .scroll-container {
            padding: 2rem;
            width: 100%;
            overflow: auto;
            flex-grow: 1;
        }
        .editor-canvas {
            position: relative;
            width: fit-content;
            margin: 0 auto;
            padding-top: 30px; /* Space for horizontal ruler */
            padding-right: 30px; /* Space for vertical ruler */
        }
        .page-background {
          width: 21cm;
          min-height: 29.7cm;
          background: ${isDarkMode ? '#2d3748' : '#ffffff'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .page-content {
          outline: none;
          direction: rtl;
          padding: 1.9cm 3.17cm 1.9cm 2.5cm;
          font-family: '${selectedFont}', 'Courier New', monospace;
          font-size: ${selectedSize};
        }
        .page-break {
            height: 3.8cm;
            position: relative;
            background-color: ${isDarkMode ? '#1f2937' : '#e5e7eb'};
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
            color: ${isDarkMode ? '#9ca3af' : '#4b5563'};
        }
        .ruler-container {
          position: absolute;
          background: ${isDarkMode ? '#4a5568' : '#f7fafc'};
          border: 1px solid ${isDarkMode ? '#2d3748' : '#e2e8f0'};
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .ruler-container.horizontal {
          top: 0;
          right: 30px;
          width: 21cm;
          height: 30px;
        }
        .ruler-container.vertical {
          top: 30px;
          right: 0;
          width: 30px;
          height: 29.7cm;
        }
        .ruler-number {
          position: absolute;
          font-size: 10px;
          color: ${isDarkMode ? '#a0aec0' : '#718096'};
        }
        .ruler-container.horizontal .ruler-number {
          top: 50%;
          transform: translateY(-50%);
        }
        .ruler-container.vertical .ruler-number {
          left: 50%;
          transform: translateX(-50%);
        }
      `}} />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 shadow-sm z-30 bg-gray-100 dark:bg-gray-700">
        <div className="flex justify-between items-center">
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
      </div>

      {/* Main Content */}
      <div className="scroll-container">
        <div className="editor-canvas">
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
    </div>
  );
};

export default ScreenplayEditor;

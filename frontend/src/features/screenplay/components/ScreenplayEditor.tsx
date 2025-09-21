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
// Main ScreenplayEditor Component
// ============================================================================
const ScreenplayEditor = () => {
  // State and Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Amiri');
  const [selectedSize, setSelectedSize] = useState('12pt');
  const [pageCount, setPageCount] = useState(1);
  const [documentStats, setDocumentStats] = useState({ pages: 1, words: 0 });

  const coordinator = useMemo(() => new ScreenplayCoordinator((type, font, size) => getFormatStyles(type, font, size)), []);

  const updateStats = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const pages = document.querySelectorAll('.page-background').length;
      setDocumentStats({ pages, words });
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const textData = e.clipboardData.getData('text/plain');
    if (!textData || !editorRef.current) return;
    
    const lines = textData.split('\n').filter(line => line.trim());
    const { results } = coordinator.processScript(lines);
    const formattedHTML = results.map(r => r.html).join('');
    
    // Clear editor and append new content
    editorRef.current.innerHTML = formattedHTML;

    // Re-apply styles after paste
    const divs = editorRef.current.querySelectorAll('div, span');
    divs.forEach(div => {
        const el = div as HTMLElement;
        if (el.className) {
            const baseClass = el.className.split(' ')[0];
            const styles = getFormatStyles(baseClass, selectedFont, selectedSize);
            Object.assign(el.style, styles);
        }
    });

    updateStats();
  }, [coordinator, selectedFont, selectedSize, updateStats]);

  useEffect(() => {
    updateStats();
  }, [pageCount, updateStats]);


  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} dir="rtl">
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Courier+Prime&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{ __html: `
        .page-wrapper {
            padding: 1in 0;
            width: 100%;
            display: flex;
            justify-content: center;
        }
        .page-background {
          position: relative;
          width: 8.5in;
          min-height: 11in;
          background: ${isDarkMode ? '#2d3748' : '#ffffff'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .page-content {
          outline: none;
          direction: rtl;
          padding: 1in 1in 1in 1.5in;
          box-sizing: border-box;
          font-family: '${selectedFont}', monospace;
          font-size: ${selectedSize};
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
      <div className="flex-grow overflow-y-auto" ref={scrollContainerRef}>
        <div className="page-wrapper">
            <div className="page-background">
                <div 
                    ref={editorRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onPaste={handlePaste}
                    onInput={updateStats}
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
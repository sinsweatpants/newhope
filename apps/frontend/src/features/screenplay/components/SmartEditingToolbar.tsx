/**
 * Smart Editing Toolbar - AI-powered editing tools for screenplay
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2, Brain, CheckCircle, AlertTriangle, Eye, EyeOff,
  RotateCcw, RotateCw, Lightbulb, Zap, Target,
  MessageSquare, PenTool, Sparkles, GitBranch
} from 'lucide-react';
import { geminiCoordinator } from '@shared/screenplay/geminiCoordinator';
import { advancedClassifier } from '@shared/screenplay/advancedClassifier';
import { pipelineProcessor } from '@shared/screenplay/pipelineProcessor';

interface SmartEditingToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
  selectedText?: string;
  onTextUpdate?: (newText: string) => void;
  className?: string;
}

interface ClassificationSuggestion {
  index: number;
  currentClass: string;
  suggestedClass: string;
  confidence: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface SmartSuggestion {
  type: 'classification' | 'formatting' | 'content' | 'structure';
  title: string;
  description: string;
  action: () => void;
  confidence: number;
  icon: React.ReactNode;
}

export const SmartEditingToolbar: React.FC<SmartEditingToolbarProps> = ({
  editorRef,
  selectedText,
  onTextUpdate,
  className = ''
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [classificationErrors, setClassificationErrors] = useState<ClassificationSuggestion[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);

  /**
   * Analyze document for improvements
   */
  const analyzeDocument = async () => {
    if (!editorRef.current) return;

    setIsAnalyzing(true);
    setSuggestions([]);

    try {
      const elements = Array.from(editorRef.current.children);
      const lines = elements.map((el, index) => ({
        index,
        raw: (el as HTMLElement).textContent || '',
        cls: (el as HTMLElement).className.split(' ')[0] || 'action',
        element: el as HTMLElement
      })).filter(line => line.raw.trim());

      // Get classification audit from Gemini
      const auditResult = await geminiCoordinator.auditLines(lines);
      setClassificationErrors(auditResult);

      // Generate smart suggestions
      const newSuggestions = await generateSmartSuggestions(lines, auditResult);
      setSuggestions(newSuggestions);

      // Store analysis in history
      const analysis = {
        timestamp: Date.now(),
        totalLines: lines.length,
        errorsFound: auditResult.length,
        suggestionsGenerated: newSuggestions.length,
        auditResult,
        suggestions: newSuggestions
      };
      setAnalysisHistory(prev => [analysis, ...prev.slice(0, 9)]); // Keep last 10

      setShowSuggestions(true);

    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Generate smart suggestions based on analysis
   */
  const generateSmartSuggestions = async (
    lines: any[],
    classificationErrors: ClassificationSuggestion[]
  ): Promise<SmartSuggestion[]> => {
    const suggestions: SmartSuggestion[] = [];

    // Classification error suggestions
    classificationErrors.forEach(error => {
      if (error.confidence > 0.8) {
        suggestions.push({
          type: 'classification',
          title: `تصحيح تصنيف السطر ${error.index + 1}`,
          description: `تغيير من "${error.currentClass}" إلى "${error.suggestedClass}" - ${error.reason}`,
          confidence: error.confidence,
          icon: <Target size={16} className="text-blue-500" />,
          action: () => applySuggestion(error)
        });
      }
    });

    // Structure suggestions
    const structureSuggestions = analyzeStructure(lines);
    suggestions.push(...structureSuggestions);

    // Content suggestions
    const contentSuggestions = await analyzeContent(lines);
    suggestions.push(...contentSuggestions);

    // Format suggestions
    const formatSuggestions = analyzeFormatting(lines);
    suggestions.push(...formatSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  };

  /**
   * Analyze document structure
   */
  const analyzeStructure = (lines: any[]): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];
    const structure = lines.reduce((acc, line) => {
      acc[line.cls] = (acc[line.cls] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check for missing Basmala
    if (!structure['basmala']) {
      suggestions.push({
        type: 'structure',
        title: 'إضافة البسملة',
        description: 'يُنصح بإضافة البسملة في بداية السيناريو',
        confidence: 0.8,
        icon: <Sparkles size={16} className="text-green-500" />,
        action: () => addBasmala()
      });
    }

    // Check scene header patterns
    const sceneHeaders = structure['scene-header-1'] || 0;
    const actions = structure['action'] || 0;
    if (sceneHeaders === 0 && actions > 5) {
      suggestions.push({
        type: 'structure',
        title: 'إضافة عناوين المشاهد',
        description: 'السيناريو يحتاج إلى عناوين مشاهد لتنظيم أفضل',
        confidence: 0.7,
        icon: <GitBranch size={16} className="text-purple-500" />,
        action: () => suggestSceneHeaders()
      });
    }

    // Check dialogue balance
    const characters = structure['character'] || 0;
    const dialogues = structure['dialogue'] || 0;
    if (characters > 0 && dialogues < characters * 0.8) {
      suggestions.push({
        type: 'structure',
        title: 'توازن الحوار',
        description: 'بعض الشخصيات قد تحتاج المزيد من الحوار',
        confidence: 0.6,
        icon: <MessageSquare size={16} className="text-orange-500" />,
        action: () => analyzeDialogueBalance()
      });
    }

    return suggestions;
  };

  /**
   * Analyze content quality
   */
  const analyzeContent = async (lines: any[]): Promise<SmartSuggestion[]> => {
    const suggestions: SmartSuggestion[] = [];

    // Check for very short lines
    const shortLines = lines.filter(line =>
      line.raw.trim().length < 10 && !['transition', 'scene-header-1'].includes(line.cls)
    );

    if (shortLines.length > lines.length * 0.3) {
      suggestions.push({
        type: 'content',
        title: 'تحسين الأسطر القصيرة',
        description: `${shortLines.length} أسطر قصيرة قد تحتاج تطوير`,
        confidence: 0.6,
        icon: <PenTool size={16} className="text-yellow-500" />,
        action: () => highlightShortLines(shortLines)
      });
    }

    // Check for repetitive content
    const textCounts = lines.reduce((acc, line) => {
      const key = line.raw.trim().toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicates = Object.entries(textCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      suggestions.push({
        type: 'content',
        title: 'محتوى مكرر',
        description: `تم العثور على ${duplicates.length} أسطر مكررة`,
        confidence: 0.8,
        icon: <AlertTriangle size={16} className="text-red-500" />,
        action: () => highlightDuplicates(duplicates)
      });
    }

    return suggestions;
  };

  /**
   * Analyze formatting issues
   */
  const analyzeFormatting = (lines: any[]): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // Check character name formatting
    const charactersWithoutColon = lines.filter(line =>
      line.cls === 'character' && !line.raw.trim().endsWith(':') && !line.raw.trim().endsWith('：')
    );

    if (charactersWithoutColon.length > 0) {
      suggestions.push({
        type: 'formatting',
        title: 'تنسيق أسماء الشخصيات',
        description: `${charactersWithoutColon.length} شخصيات تحتاج إضافة نقطتين`,
        confidence: 0.9,
        icon: <CheckCircle size={16} className="text-green-500" />,
        action: () => fixCharacterFormatting(charactersWithoutColon)
      });
    }

    // Check parenthetical formatting
    const unbalancedParentheses = lines.filter(line => {
      const text = line.raw.trim();
      const openCount = (text.match(/\(/g) || []).length;
      const closeCount = (text.match(/\)/g) || []).length;
      return openCount !== closeCount;
    });

    if (unbalancedParentheses.length > 0) {
      suggestions.push({
        type: 'formatting',
        title: 'تصحيح الأقواس',
        description: `${unbalancedParentheses.length} أسطر بأقواس غير متوازنة`,
        confidence: 0.95,
        icon: <AlertTriangle size={16} className="text-red-500" />,
        action: () => fixParentheses(unbalancedParentheses)
      });
    }

    return suggestions;
  };

  /**
   * Apply classification suggestion
   */
  const applySuggestion = (suggestion: ClassificationSuggestion) => {
    if (!editorRef.current) return;

    const elements = Array.from(editorRef.current.children);
    const targetElement = elements[suggestion.index] as HTMLElement;

    if (targetElement) {
      // Update class
      targetElement.className = suggestion.suggestedClass;

      // Apply appropriate styles
      const styles = getStylesForClass(suggestion.suggestedClass);
      Object.assign(targetElement.style, styles);

      // Trigger update
      onTextUpdate?.(editorRef.current.innerHTML);
    }
  };

  /**
   * Smart auto-complete for current line
   */
  const smartAutoComplete = async () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const currentElement = range.commonAncestorContainer.parentElement;
    if (!currentElement) return;

    const currentText = currentElement.textContent || '';
    const currentClass = currentElement.className.split(' ')[0];

    try {
      // Get contextual suggestions based on current class and text
      const suggestions = await getAutoCompleteSuggestions(currentText, currentClass);

      if (suggestions.length > 0) {
        // Show completion popup
        showAutoCompletePopup(suggestions, currentElement);
      }
    } catch (error) {
      console.warn('Auto-complete failed:', error);
    }
  };

  /**
   * Get auto-complete suggestions
   */
  const getAutoCompleteSuggestions = async (text: string, className: string): Promise<string[]> => {
    const suggestions: string[] = [];

    switch (className) {
      case 'character':
        // Common character completion
        if (text.length > 1) {
          const commonCharacters = ['الراوي', 'البطل', 'البطلة', 'الصديق', 'الوالد', 'الوالدة'];
          suggestions.push(...commonCharacters.filter(c =>
            c.startsWith(text.trim())
          ));
        }
        break;

      case 'action':
        // Action verb completions
        if (text.length > 2) {
          const actionStarters = [
            'يدخل إلى', 'يخرج من', 'ينظر إلى', 'يقف بجانب',
            'تجلس على', 'تتحرك نحو', 'يبتسم ابتسامة', 'تضحك بصوت'
          ];
          suggestions.push(...actionStarters.filter(a =>
            a.startsWith(text.trim())
          ));
        }
        break;

      case 'scene-header-1':
        // Scene number completions
        const sceneMatch = text.match(/مشهد\s*(\d*)/);
        if (sceneMatch) {
          const nextNumber = parseInt(sceneMatch[1] || '0') + 1;
          suggestions.push(`مشهد ${nextNumber}`);
        }
        break;
    }

    return suggestions;
  };

  /**
   * Reclassify selected text or current line
   */
  const reclassifySelection = async () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const element = range.commonAncestorContainer.parentElement;
    if (!element || !editorRef.current.contains(element)) return;

    const text = element.textContent || '';
    if (!text.trim()) return;

    setIsAnalyzing(true);

    try {
      const result = await advancedClassifier.classifyAdvanced(text);

      // Update element
      element.className = result.classification;
      const styles = getStylesForClass(result.classification);
      Object.assign(element.style, styles);

      // Show confidence indicator
      element.setAttribute('data-confidence', (result.confidence * 100).toFixed(0));
      element.setAttribute('title', `${result.classification} (${(result.confidence * 100).toFixed(0)}% confidence)`);

      onTextUpdate?.(editorRef.current.innerHTML);

    } catch (error) {
      console.error('Reclassification failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Helper functions for suggestions
   */
  const addBasmala = () => {
    if (!editorRef.current) return;

    const basmala = document.createElement('div');
    basmala.className = 'basmala';
    basmala.textContent = 'بسم الله الرحمن الرحيم';
    basmala.style.textAlign = 'center';
    basmala.style.fontWeight = 'bold';
    basmala.style.marginBottom = '20px';

    editorRef.current.insertBefore(basmala, editorRef.current.firstChild);
    onTextUpdate?.(editorRef.current.innerHTML);
  };

  const fixCharacterFormatting = (characters: any[]) => {
    if (!editorRef.current) return;

    const elements = Array.from(editorRef.current.children);
    characters.forEach(char => {
      const element = elements[char.index] as HTMLElement;
      if (element && !element.textContent?.endsWith(':')) {
        element.textContent = element.textContent + ' :';
      }
    });

    onTextUpdate?.(editorRef.current.innerHTML);
  };

  const getStylesForClass = (className: string): Record<string, string> => {
    // Return appropriate styles based on class
    const baseStyles: Record<string, Record<string, string>> = {
      'basmala': { textAlign: 'center', fontWeight: 'bold' },
      'scene-header-1': { fontWeight: 'bold', textAlign: 'center', marginTop: '20px' },
      'character': { fontWeight: 'bold', textAlign: 'center', marginTop: '15px' },
      'dialogue': { marginRight: '40px', marginLeft: '40px' },
      'parenthetical': { textAlign: 'center', fontStyle: 'italic' },
      'action': { marginTop: '10px' },
      'transition': { textAlign: 'left', fontWeight: 'bold', marginTop: '15px' }
    };

    return baseStyles[className] || {};
  };

  // Auto-suggest effect
  useEffect(() => {
    if (!autoSuggest || !editorRef.current) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.textContent && target.textContent.length > 5) {
        // Debounced auto-complete
        setTimeout(() => smartAutoComplete(), 500);
      }
    };

    editorRef.current.addEventListener('input', handleInput);
    return () => editorRef.current?.removeEventListener('input', handleInput);
  }, [autoSuggest]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Analyze Document */}
      <button
        onClick={analyzeDocument}
        disabled={isAnalyzing}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        title="تحليل السيناريو للاقتراحات"
      >
        <div className="relative">
          <Brain size={18} />
          {isAnalyzing && (
            <div className="absolute inset-0 animate-spin">
              <Zap size={18} className="text-yellow-500" />
            </div>
          )}
        </div>
      </button>

      {/* Reclassify */}
      <button
        onClick={reclassifySelection}
        disabled={isAnalyzing}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        title="إعادة تصنيف النص المحدد"
      >
        <Wand2 size={18} />
      </button>

      {/* Auto-suggest Toggle */}
      <button
        onClick={() => setAutoSuggest(!autoSuggest)}
        className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 ${autoSuggest ? 'text-blue-500' : ''}`}
        title="تفعيل/إلغاء الاقتراحات التلقائية"
      >
        <Lightbulb size={18} />
      </button>

      {/* Show/Hide Analysis */}
      <button
        onClick={() => setShowAnalysis(!showAnalysis)}
        className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 ${showAnalysis ? 'text-green-500' : ''}`}
        title="عرض/إخفاء تحليل المحتوى"
      >
        {showAnalysis ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>

      {/* Suggestions Panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 min-w-96 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">اقتراحات ذكية ({suggestions.length})</h4>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={suggestion.action}
              >
                <div className="flex-shrink-0 mt-1">
                  {suggestion.icon}
                </div>
                <div className="flex-grow">
                  <div className="font-medium text-sm">{suggestion.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {suggestion.description}
                  </div>
                  <div className="text-xs text-blue-500 mt-1">
                    الثقة: {Math.round(suggestion.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classification Errors Badge */}
      {classificationErrors.length > 0 && (
        <div className="relative">
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {classificationErrors.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartEditingToolbar;
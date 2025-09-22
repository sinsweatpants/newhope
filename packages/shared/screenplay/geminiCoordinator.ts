/**
 * Gemini Coordinator - Advanced AI coordination for screenplay formatting
 * Manages agents, confidence scoring, and context management for production use
 */

import { geminiService } from '../services/geminiService';
import { classificationService } from '../services/classificationService';
import type { AgentContext, AgentResult, FormattingAgent } from './types';

export interface CoordinatorConfig {
  enableAI?: boolean;
  confidenceThreshold?: number;
  maxRetries?: number;
  fallbackToLocal?: boolean;
  enableContextTracking?: boolean;
  debugMode?: boolean;
}

export interface CoordinatorStats {
  totalClassifications: number;
  aiClassifications: number;
  localClassifications: number;
  averageConfidence: number;
  averageProcessingTime: number;
  successRate: number;
  contextHits: number;
}

export interface ClassificationOptions {
  previousFormat?: string;
  position?: 'paste' | 'import' | 'normalize' | 'enter' | 'live-typing';
  isTyping?: boolean;
  isInstant?: boolean;
  useContext?: boolean;
  forceAI?: boolean;
}

class GeminiCoordinator {
  private config: Required<CoordinatorConfig>;
  private stats: CoordinatorStats;
  private contextHistory: Map<string, AgentContext> = new Map();
  private processingQueue: Array<() => Promise<any>> = [];
  private isInitialized = false;

  constructor(config: CoordinatorConfig = {}) {
    this.config = {
      enableAI: true,
      confidenceThreshold: 0.8,
      maxRetries: 2,
      fallbackToLocal: true,
      enableContextTracking: true,
      debugMode: false,
      ...config
    };

    this.stats = {
      totalClassifications: 0,
      aiClassifications: 0,
      localClassifications: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      successRate: 0,
      contextHits: 0
    };
  }

  /**
   * Initialize the coordinator with API key
   */
  setApiKey(apiKey: string): boolean {
    try {
      const success = geminiService.setApiKey(apiKey);
      if (success) {
        this.isInitialized = true;
        this.log('Coordinator initialized successfully');
      }
      return success;
    } catch (error) {
      this.log('Failed to initialize coordinator:', error);
      return false;
    }
  }

  /**
   * Main classification method with advanced features
   */
  async classifyWithAgents(
    text: string,
    options: ClassificationOptions = {}
  ): Promise<AgentResult> {
    const startTime = Date.now();
    this.stats.totalClassifications++;

    try {
      // Build context
      const context = this.buildContext(text, options);

      // Get classification
      const classificationResult = await classificationService.classify({
        text,
        context: {
          previousFormat: options.previousFormat,
          position: options.position,
          isTyping: options.isTyping,
          isInstant: options.isInstant
        },
        options: {
          useAI: this.config.enableAI && !options.isInstant,
          confidenceThreshold: this.config.confidenceThreshold,
          returnAlternatives: true
        }
      });

      // Create agent result
      const agentResult = this.createAgentResult(
        text,
        classificationResult.classification,
        classificationResult.confidence,
        context,
        classificationResult.source
      );

      // Update statistics
      this.updateStats(classificationResult, Date.now() - startTime);

      // Store context for future use
      if (this.config.enableContextTracking) {
        this.updateContextHistory(text, context, agentResult);
      }

      this.log(`Classified "${text.substring(0, 50)}..." as ${agentResult.elementType} (${agentResult.confidence})`);

      return agentResult;

    } catch (error) {
      this.log('Classification error:', error);

      // Fallback result
      const fallbackResult = this.createFallbackResult(text, options, startTime);
      this.updateStats({ source: 'fallback', confidence: 0.3 } as any, Date.now() - startTime);
      return fallbackResult;
    }
  }

  /**
   * Batch processing for multiple lines
   */
  async classifyBatch(
    lines: Array<{ text: string; options?: ClassificationOptions }>
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let previousFormat = 'action';

    for (const line of lines) {
      const options = {
        ...line.options,
        previousFormat,
        position: 'import' as const
      };

      const result = await this.classifyWithAgents(line.text, options);
      results.push(result);
      previousFormat = result.elementType;
    }

    return results;
  }

  /**
   * Build rich context for classification
   */
  private buildContext(text: string, options: ClassificationOptions): AgentContext {
    const baseContext: AgentContext = {
      linePosition: this.detectLinePosition(text),
      lastCharacter: this.extractLastCharacter(options.previousFormat),
      inDialogue: options.previousFormat === 'character' || options.previousFormat === 'dialogue',
      lastActionType: this.getLastActionType(options.previousFormat)
    };

    // Enhance with context history if available
    if (this.config.enableContextTracking && options.useContext !== false) {
      const historicalContext = this.getHistoricalContext(text);
      if (historicalContext) {
        this.stats.contextHits++;
        return { ...baseContext, ...historicalContext };
      }
    }

    return baseContext;
  }

  /**
   * Create standardized agent result
   */
  private createAgentResult(
    text: string,
    classification: string,
    confidence: number,
    context: AgentContext,
    source: string
  ): AgentResult {
    return {
      html: this.generateHTML(text, classification),
      processed: true,
      confidence,
      elementType: classification,
      agentUsed: `GeminiCoordinator(${source})`,
      originalLine: text,
      context
    };
  }

  /**
   * Generate HTML for classified line
   */
  private generateHTML(text: string, classification: string): string {
    const div = document.createElement('div');
    div.className = classification;

    // Handle special formatting for scene headers
    if (classification === 'scene-header-1') {
      const sceneMatch = text.match(/^(مشهد\s*\d+)\s*[-–—:،]?\s*(.*)$/i);
      if (sceneMatch && sceneMatch[2]) {
        div.innerHTML = `<span class="scene-number">${sceneMatch[1]}</span><span class="scene-info">${sceneMatch[2]}</span>`;
        return div.outerHTML;
      }
    }

    // Handle character formatting
    if (classification === 'character' && !text.endsWith(':') && !text.endsWith('：')) {
      div.textContent = text + ' :';
    } else {
      div.textContent = text;
    }

    return div.outerHTML;
  }

  /**
   * Create fallback result on error
   */
  private createFallbackResult(
    text: string,
    options: ClassificationOptions,
    startTime: number
  ): AgentResult {
    const fallbackClassification = this.getFallbackClassification(text, options.previousFormat);

    return {
      html: this.generateHTML(text, fallbackClassification),
      processed: true,
      confidence: 0.3,
      elementType: fallbackClassification,
      agentUsed: 'GeminiCoordinator(fallback)',
      originalLine: text,
      context: { linePosition: 'middle' }
    };
  }

  /**
   * Simple fallback classification logic
   */
  private getFallbackClassification(text: string, previousFormat?: string): string {
    const trimmed = text.trim();

    if (/^بسم\s+الله/.test(trimmed)) return 'basmala';
    if (/^مشهد\s*\d+/.test(trimmed)) return 'scene-header-1';
    if (/[:：]\s*$/.test(trimmed)) return 'character';
    if (/^\(.*\)$/.test(trimmed)) return 'parenthetical';
    if (previousFormat === 'character') return 'dialogue';
    if (/^(قطع|انتقال)/.test(trimmed)) return 'transition';

    return 'action';
  }

  /**
   * Context management utilities
   */
  private detectLinePosition(text: string): 'start' | 'middle' | 'end' {
    if (/^(مشهد|بسم\s+الله)/.test(text)) return 'start';
    if (/^(قطع|انتقال|تلاشي)/.test(text)) return 'end';
    return 'middle';
  }

  private extractLastCharacter(previousFormat?: string): string | undefined {
    if (previousFormat === 'character') {
      // In a real implementation, this would track actual character names
      return 'unknown_character';
    }
    return undefined;
  }

  private getLastActionType(previousFormat?: string): string | undefined {
    if (previousFormat === 'action') {
      return 'general'; // Could be enhanced with actual action type tracking
    }
    return undefined;
  }

  /**
   * Context history management
   */
  private updateContextHistory(text: string, context: AgentContext, result: AgentResult): void {
    const key = this.generateContextKey(text);
    this.contextHistory.set(key, {
      ...context,
      lastCharacter: result.elementType === 'character' ? text.replace(/[:：]\s*$/, '') : context.lastCharacter,
      inDialogue: result.elementType === 'dialogue' || result.elementType === 'character'
    });

    // Limit history size
    if (this.contextHistory.size > 1000) {
      const firstKey = this.contextHistory.keys().next().value;
      this.contextHistory.delete(firstKey);
    }
  }

  private getHistoricalContext(text: string): AgentContext | null {
    const key = this.generateContextKey(text);
    return this.contextHistory.get(key) || null;
  }

  private generateContextKey(text: string): string {
    // Generate a context key based on text patterns rather than exact text
    const patterns = [
      text.match(/^مشهد\s*\d+/) ? 'scene-pattern' : '',
      text.match(/[:：]\s*$/) ? 'character-pattern' : '',
      text.match(/^\(.*\)$/) ? 'parenthetical-pattern' : '',
      text.includes('قطع') ? 'transition-pattern' : ''
    ].filter(Boolean).join('|');

    return patterns || 'generic';
  }

  /**
   * Statistics management
   */
  private updateStats(result: any, processingTime: number): void {
    this.stats.averageProcessingTime = (this.stats.averageProcessingTime + processingTime) / 2;
    this.stats.averageConfidence = (this.stats.averageConfidence + result.confidence) / 2;

    if (result.source === 'ai' || result.source === 'hybrid') {
      this.stats.aiClassifications++;
    } else {
      this.stats.localClassifications++;
    }

    if (result.confidence > 0.7) {
      this.stats.successRate = (this.stats.successRate + 1) / 2;
    }
  }

  /**
   * Audit multiple lines for quality
   */
  async auditLines(
    lines: Array<{ index: number; raw: string; cls: string }>
  ): Promise<Array<{ index: number; suggestedClass: string; confidence: number }>> {
    if (!this.isInitialized || lines.length === 0) {
      return [];
    }

    try {
      const result = await geminiService.auditLines({
        lines,
        options: {
          contextWindow: 5,
          confidenceThreshold: this.config.confidenceThreshold,
          includeMetrics: true
        }
      });

      return result.corrections.map(correction => ({
        index: correction.index,
        suggestedClass: correction.suggestedClass,
        confidence: correction.confidenceScore / 100
      }));

    } catch (error) {
      this.log('Audit failed:', error);
      return [];
    }
  }

  /**
   * Configuration and management
   */
  updateConfig(newConfig: Partial<CoordinatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated:', newConfig);
  }

  getStats(): CoordinatorStats {
    return { ...this.stats };
  }

  clearHistory(): void {
    this.contextHistory.clear();
    this.log('Context history cleared');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    coordinator: boolean;
    gemini: boolean;
    classification: boolean;
    contextTracking: boolean;
    stats: CoordinatorStats;
  }> {
    const geminiHealth = await geminiService.healthCheck();
    const classificationHealth = await classificationService.healthCheck();

    return {
      coordinator: this.isInitialized,
      gemini: geminiHealth.connected,
      classification: classificationHealth.local && classificationHealth.ai,
      contextTracking: this.config.enableContextTracking,
      stats: this.getStats()
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debugMode) {
      console.log(`[GeminiCoordinator] ${message}`, ...args);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.contextHistory.clear();
    this.processingQueue = [];
    this.log('Coordinator cleanup completed');
  }
}

// Export singleton instance
export const geminiCoordinator = new GeminiCoordinator();
export default geminiCoordinator;
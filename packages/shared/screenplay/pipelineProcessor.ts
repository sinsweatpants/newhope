/**
 * Pipeline Processor - Unified 3-stage text processing system
 * Stage 1: Classification → Stage 2: Spacing Normalization → Stage 3: DOM Building
 */

import { geminiCoordinator } from './geminiCoordinator';
import { classificationService } from '../services/classificationService';
import type { AgentResult, AgentContext, FormattingAgent } from './types';

export interface PipelineStage {
  name: string;
  process: (input: any, context: PipelineContext) => Promise<any>;
  validate: (output: any) => boolean;
  fallback?: (input: any, error: Error) => any;
}

export interface PipelineContext {
  filename?: string;
  importType?: 'paste' | 'file' | 'ocr' | 'live-typing';
  preserveFormatting?: boolean;
  useAI?: boolean;
  batchMode?: boolean;
  metadata?: Record<string, any>;
}

export interface PipelineResult {
  success: boolean;
  output: any;
  stages: {
    stage: string;
    duration: number;
    success: boolean;
    error?: string;
  }[];
  totalDuration: number;
  metadata: {
    linesProcessed: number;
    averageConfidence: number;
    classificationsUsed: Record<string, number>;
    warnings: string[];
  };
}

export interface ClassificationStageOutput {
  lines: Array<{
    text: string;
    classification: string;
    confidence: number;
    source: string;
    metadata?: any;
  }>;
  context: AgentContext;
  statistics: {
    totalLines: number;
    averageConfidence: number;
    classificationsUsed: Record<string, number>;
  };
}

export interface NormalizationStageOutput {
  lines: Array<{
    text: string;
    classification: string;
    normalizedText: string;
    spacing: {
      before: number;
      after: number;
      indent: number;
    };
  }>;
  metadata: {
    spacingRules: Record<string, any>;
    adjustmentsMade: number;
  };
}

export interface DOMStageOutput {
  html: string;
  elements: Array<{
    type: string;
    content: string;
    className: string;
    attributes: Record<string, string>;
  }>;
  metadata: {
    totalElements: number;
    structure: Record<string, number>;
  };
}

class PipelineProcessor {
  private stages: Map<string, PipelineStage> = new Map();
  private spacingRules = this.initializeSpacingRules();
  private processingQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  constructor() {
    this.initializeStages();
  }

  /**
   * Initialize the three-stage pipeline
   */
  private initializeStages(): void {
    // Stage 1: Classification
    this.stages.set('classification', {
      name: 'Text Classification',
      process: this.classificationStage.bind(this),
      validate: (output) => output && Array.isArray(output.lines),
      fallback: this.classificationFallback.bind(this)
    });

    // Stage 2: Spacing Normalization
    this.stages.set('normalization', {
      name: 'Spacing Normalization',
      process: this.normalizationStage.bind(this),
      validate: (output) => output && Array.isArray(output.lines),
      fallback: this.normalizationFallback.bind(this)
    });

    // Stage 3: DOM Building
    this.stages.set('domBuilding', {
      name: 'DOM Building',
      process: this.domBuildingStage.bind(this),
      validate: (output) => output && typeof output.html === 'string',
      fallback: this.domBuildingFallback.bind(this)
    });
  }

  /**
   * Main pipeline processing method
   */
  async process(
    input: string | string[],
    context: PipelineContext = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const stageResults: PipelineResult['stages'] = [];
    let currentOutput = this.prepareInput(input);

    try {
      // Execute each stage sequentially
      for (const [stageName, stage] of this.stages) {
        const stageStartTime = Date.now();

        try {
          currentOutput = await stage.process(currentOutput, context);

          if (!stage.validate(currentOutput)) {
            throw new Error(`Stage validation failed for ${stageName}`);
          }

          stageResults.push({
            stage: stageName,
            duration: Date.now() - stageStartTime,
            success: true
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (stage.fallback) {
            currentOutput = stage.fallback(currentOutput, error as Error);
            stageResults.push({
              stage: stageName,
              duration: Date.now() - stageStartTime,
              success: false,
              error: `${errorMessage} (used fallback)`
            });
          } else {
            throw error;
          }
        }
      }

      return {
        success: true,
        output: currentOutput,
        stages: stageResults,
        totalDuration: Date.now() - startTime,
        metadata: this.extractMetadata(currentOutput, stageResults)
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        stages: stageResults,
        totalDuration: Date.now() - startTime,
        metadata: {
          linesProcessed: 0,
          averageConfidence: 0,
          classificationsUsed: {},
          warnings: [error instanceof Error ? error.message : 'Pipeline failed']
        }
      };
    }
  }

  /**
   * Stage 1: Text Classification
   */
  private async classificationStage(
    input: string[],
    context: PipelineContext
  ): Promise<ClassificationStageOutput> {
    const lines: ClassificationStageOutput['lines'] = [];
    const classificationsUsed: Record<string, number> = {};
    let totalConfidence = 0;
    let previousFormat = 'action';

    // Process lines in batch if enabled
    if (context.batchMode && lines.length > 5) {
      const batchResults = await this.processBatch(input, context);
      return batchResults;
    }

    // Process lines individually with context
    for (let i = 0; i < input.length; i++) {
      const text = input[i].trim();
      if (!text) continue;

      try {
        const classificationOptions = {
          previousFormat,
          position: context.importType || 'paste' as const,
          isTyping: context.importType === 'live-typing',
          isInstant: context.importType === 'live-typing',
          useContext: true
        };

        let result: AgentResult;

        if (context.useAI !== false) {
          result = await geminiCoordinator.classifyWithAgents(text, classificationOptions);
        } else {
          const classificationResult = await classificationService.classify({
            text,
            context: {
              previousFormat,
              position: classificationOptions.position,
              isTyping: classificationOptions.isTyping,
              isInstant: classificationOptions.isInstant
            },
            options: { useAI: false }
          });

          result = {
            html: `<div class="${classificationResult.classification}">${text}</div>`,
            processed: true,
            confidence: classificationResult.confidence,
            elementType: classificationResult.classification,
            agentUsed: 'LocalClassifier',
            originalLine: text,
            context: { linePosition: 'middle' }
          };
        }

        lines.push({
          text,
          classification: result.elementType,
          confidence: result.confidence,
          source: result.agentUsed,
          metadata: result.context
        });

        // Update statistics
        classificationsUsed[result.elementType] = (classificationsUsed[result.elementType] || 0) + 1;
        totalConfidence += result.confidence;
        previousFormat = result.elementType;

      } catch (error) {
        // Fallback classification
        const fallbackClass = this.getFallbackClassification(text, previousFormat);
        lines.push({
          text,
          classification: fallbackClass,
          confidence: 0.5,
          source: 'Fallback',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
        classificationsUsed[fallbackClass] = (classificationsUsed[fallbackClass] || 0) + 1;
        totalConfidence += 0.5;
      }
    }

    return {
      lines,
      context: { linePosition: 'middle' },
      statistics: {
        totalLines: lines.length,
        averageConfidence: totalConfidence / Math.max(lines.length, 1),
        classificationsUsed
      }
    };
  }

  /**
   * Stage 2: Spacing Normalization
   */
  private async normalizationStage(
    input: ClassificationStageOutput,
    context: PipelineContext
  ): Promise<NormalizationStageOutput> {
    const lines: NormalizationStageOutput['lines'] = [];
    let adjustmentsMade = 0;

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const prevLine = i > 0 ? input.lines[i - 1] : null;
      const nextLine = i < input.lines.length - 1 ? input.lines[i + 1] : null;

      const spacing = this.calculateSpacing(line, prevLine, nextLine);
      const normalizedText = this.normalizeText(line.text, line.classification);

      if (normalizedText !== line.text ||
          spacing.before > 0 || spacing.after > 0 || spacing.indent > 0) {
        adjustmentsMade++;
      }

      lines.push({
        text: line.text,
        classification: line.classification,
        normalizedText,
        spacing
      });
    }

    return {
      lines,
      metadata: {
        spacingRules: this.spacingRules,
        adjustmentsMade
      }
    };
  }

  /**
   * Stage 3: DOM Building
   */
  private async domBuildingStage(
    input: NormalizationStageOutput,
    context: PipelineContext
  ): Promise<DOMStageOutput> {
    const elements: DOMStageOutput['elements'] = [];
    const structure: Record<string, number> = {};
    let html = '';

    for (const line of input.lines) {
      const element = this.buildDOMElement(line);
      elements.push(element);

      // Add spacing
      if (line.spacing.before > 0) {
        html += '\n'.repeat(line.spacing.before);
      }

      // Add indentation
      if (line.spacing.indent > 0) {
        element.attributes.style = `margin-right: ${line.spacing.indent * 20}px;`;
      }

      html += this.elementToHTML(element);

      if (line.spacing.after > 0) {
        html += '\n'.repeat(line.spacing.after);
      }

      // Update structure count
      structure[line.classification] = (structure[line.classification] || 0) + 1;
    }

    return {
      html: html.trim(),
      elements,
      metadata: {
        totalElements: elements.length,
        structure
      }
    };
  }

  /**
   * Batch processing for large imports
   */
  private async processBatch(
    input: string[],
    context: PipelineContext
  ): Promise<ClassificationStageOutput> {
    const batchRequests = input.map((text, index) => ({
      text,
      options: {
        previousFormat: index > 0 ? 'action' : undefined,
        position: context.importType || 'import' as const
      }
    }));

    const results = await geminiCoordinator.classifyBatch(batchRequests);
    const classificationsUsed: Record<string, number> = {};
    let totalConfidence = 0;

    const lines = results.map(result => {
      classificationsUsed[result.elementType] = (classificationsUsed[result.elementType] || 0) + 1;
      totalConfidence += result.confidence;

      return {
        text: result.originalLine,
        classification: result.elementType,
        confidence: result.confidence,
        source: result.agentUsed,
        metadata: result.context
      };
    });

    return {
      lines,
      context: { linePosition: 'middle' },
      statistics: {
        totalLines: lines.length,
        averageConfidence: totalConfidence / Math.max(lines.length, 1),
        classificationsUsed
      }
    };
  }

  /**
   * Utility methods
   */
  private prepareInput(input: string | string[]): string[] {
    if (typeof input === 'string') {
      return input.split('\n').map(line => line.trim()).filter(Boolean);
    }
    return input.filter(Boolean);
  }

  private calculateSpacing(
    current: { classification: string },
    prev: { classification: string } | null,
    next: { classification: string } | null
  ) {
    const rules = this.spacingRules[current.classification] || {};

    return {
      before: this.getSpacingBefore(current.classification, prev?.classification),
      after: this.getSpacingAfter(current.classification, next?.classification),
      indent: rules.indent || 0
    };
  }

  private normalizeText(text: string, classification: string): string {
    switch (classification) {
      case 'character':
        return text.endsWith(':') ? text : text + ' :';
      case 'scene-header-1':
        return text.replace(/^مشهد\s*(\d+)/, 'مشهد $1');
      case 'dialogue':
        return text.trim();
      case 'parenthetical':
        return text.startsWith('(') && text.endsWith(')') ? text : `(${text})`;
      default:
        return text.trim();
    }
  }

  private buildDOMElement(line: NormalizationStageOutput['lines'][0]) {
    const baseAttributes: Record<string, string> = {
      'data-classification': line.classification,
      'data-original': line.text
    };

    // Special handling for scene headers
    if (line.classification === 'scene-header-1') {
      const sceneMatch = line.normalizedText.match(/^(مشهد\s*\d+)\s*[-–—:،]?\s*(.*)$/);
      if (sceneMatch && sceneMatch[2]) {
        return {
          type: 'div',
          content: `<span class="scene-number">${sceneMatch[1]}</span><span class="scene-info">${sceneMatch[2]}</span>`,
          className: line.classification,
          attributes: baseAttributes
        };
      }
    }

    return {
      type: 'div',
      content: line.normalizedText,
      className: line.classification,
      attributes: baseAttributes
    };
  }

  private elementToHTML(element: DOMStageOutput['elements'][0]): string {
    const attrs = Object.entries(element.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    return `<${element.type} class="${element.className}" ${attrs}>${element.content}</${element.type}>`;
  }

  private initializeSpacingRules() {
    return {
      'basmala': { before: 2, after: 2, indent: 0 },
      'scene-header-1': { before: 2, after: 1, indent: 0 },
      'scene-header-2': { before: 1, after: 1, indent: 0 },
      'scene-header-3': { before: 0, after: 1, indent: 0 },
      'character': { before: 1, after: 0, indent: 2 },
      'dialogue': { before: 0, after: 0, indent: 1 },
      'parenthetical': { before: 0, after: 0, indent: 3 },
      'action': { before: 1, after: 0, indent: 0 },
      'transition': { before: 1, after: 1, indent: 4 }
    };
  }

  private getSpacingBefore(current: string, prev?: string): number {
    const rules = this.spacingRules[current];
    if (!rules || !prev) return rules?.before || 0;

    // Special spacing rules based on transitions
    if (prev === 'dialogue' && current === 'character') return 1;
    if (prev === 'action' && current === 'scene-header-1') return 2;
    if (prev === 'transition' && current === 'scene-header-1') return 1;

    return rules.before || 0;
  }

  private getSpacingAfter(current: string, next?: string): number {
    const rules = this.spacingRules[current];
    if (!rules || !next) return rules?.after || 0;

    // Special spacing rules
    if (current === 'scene-header-1' && next === 'action') return 1;
    if (current === 'character' && next === 'dialogue') return 0;

    return rules.after || 0;
  }

  private getFallbackClassification(text: string, previousFormat: string): string {
    const trimmed = text.trim();

    if (/^بسم\s+الله/.test(trimmed)) return 'basmala';
    if (/^مشهد\s*\d+/.test(trimmed)) return 'scene-header-1';
    if (/[:：]\s*$/.test(trimmed)) return 'character';
    if (/^\(.*\)$/.test(trimmed)) return 'parenthetical';
    if (previousFormat === 'character') return 'dialogue';
    if (/^(قطع|انتقال|تلاشي)/.test(trimmed)) return 'transition';

    return 'action';
  }

  private extractMetadata(output: any, stages: PipelineResult['stages']) {
    const warnings: string[] = [];
    stages.forEach(stage => {
      if (stage.error) warnings.push(stage.error);
    });

    if (output?.metadata?.structure) {
      return {
        linesProcessed: output.metadata.totalElements || 0,
        averageConfidence: output.lines?.[0]?.confidence || 0,
        classificationsUsed: output.metadata.structure,
        warnings
      };
    }

    return {
      linesProcessed: 0,
      averageConfidence: 0,
      classificationsUsed: {},
      warnings
    };
  }

  /**
   * Fallback methods for each stage
   */
  private classificationFallback(input: string[], error: Error): ClassificationStageOutput {
    const lines = input.map(text => ({
      text,
      classification: 'action',
      confidence: 0.3,
      source: 'Fallback',
      metadata: { error: error.message }
    }));

    return {
      lines,
      context: { linePosition: 'middle' },
      statistics: {
        totalLines: lines.length,
        averageConfidence: 0.3,
        classificationsUsed: { action: lines.length }
      }
    };
  }

  private normalizationFallback(input: any, error: Error): NormalizationStageOutput {
    const lines = (input.lines || []).map((line: any) => ({
      text: line.text || '',
      classification: line.classification || 'action',
      normalizedText: line.text || '',
      spacing: { before: 0, after: 0, indent: 0 }
    }));

    return {
      lines,
      metadata: {
        spacingRules: {},
        adjustmentsMade: 0
      }
    };
  }

  private domBuildingFallback(input: any, error: Error): DOMStageOutput {
    const lines = input.lines || [];
    const html = lines.map((line: any) =>
      `<div class="${line.classification || 'action'}">${line.normalizedText || line.text || ''}</div>`
    ).join('\n');

    return {
      html,
      elements: [],
      metadata: {
        totalElements: lines.length,
        structure: {}
      }
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    pipelineProcessor: boolean;
    stages: Record<string, boolean>;
    dependencies: {
      geminiCoordinator: boolean;
      classificationService: boolean;
    };
  }> {
    const stageHealth: Record<string, boolean> = {};

    for (const [name, stage] of this.stages) {
      try {
        await stage.process([], {});
        stageHealth[name] = true;
      } catch {
        stageHealth[name] = false;
      }
    }

    const coordinatorHealth = await geminiCoordinator.healthCheck();
    const classificationHealth = await classificationService.healthCheck();

    return {
      pipelineProcessor: true,
      stages: stageHealth,
      dependencies: {
        geminiCoordinator: coordinatorHealth.coordinator,
        classificationService: classificationHealth.local
      }
    };
  }

  /**
   * Get processing statistics
   */
  getStatistics() {
    return {
      stagesCount: this.stages.size,
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      spacingRules: Object.keys(this.spacingRules).length
    };
  }
}

// Export singleton instance
export const pipelineProcessor = new PipelineProcessor();
export default pipelineProcessor;
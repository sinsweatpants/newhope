/**
 * Advanced Classifier - ML-enhanced classification with context awareness
 * Combines pattern matching, ML features, and contextual analysis
 */

import { productionAgentSystem } from './productionAgentSystem';
import { geminiCoordinator } from './geminiCoordinator';
import type { AgentResult, AgentContext } from './types';

export interface ClassificationFeatures {
  textLength: number;
  arabicRatio: number;
  punctuationCount: number;
  colonCount: number;
  parenthesesCount: number;
  numberCount: number;
  capitalRatio: number;
  wordCount: number;
  sentenceCount: number;
  specialCharacters: number;
  contextScore: number;
}

export interface MLPrediction {
  classification: string;
  confidence: number;
  features: ClassificationFeatures;
  reasoning: string[];
}

export interface ClassificationStrategy {
  name: string;
  weight: number;
  processor: (text: string, context: AgentContext) => Promise<AgentResult>;
}

export interface EnsembleResult {
  classification: string;
  confidence: number;
  source: string;
  strategies: Array<{
    name: string;
    classification: string;
    confidence: number;
    weight: number;
  }>;
  features: ClassificationFeatures;
  processingTime: number;
}

class AdvancedClassifier {
  private strategies: ClassificationStrategy[] = [];
  private featureWeights = this.initializeFeatureWeights();
  private contextHistory: Array<{ text: string; classification: string; context: AgentContext }> = [];
  private classificationCache = new Map<string, EnsembleResult>();
  private performanceMetrics = {
    totalClassifications: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
    strategyPerformance: new Map<string, { accuracy: number; speed: number }>()
  };

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize classification strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      {
        name: 'production-agents',
        weight: 0.4,
        processor: this.productionAgentStrategy.bind(this)
      },
      {
        name: 'pattern-matching',
        weight: 0.3,
        processor: this.patternMatchingStrategy.bind(this)
      },
      {
        name: 'context-analysis',
        weight: 0.2,
        processor: this.contextAnalysisStrategy.bind(this)
      },
      {
        name: 'ml-features',
        weight: 0.1,
        processor: this.mlFeatureStrategy.bind(this)
      }
    ];
  }

  /**
   * Main classification method using ensemble approach
   */
  async classifyAdvanced(
    text: string,
    context: AgentContext = {}
  ): Promise<EnsembleResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalClassifications++;

    // Check cache first
    const cacheKey = this.generateCacheKey(text, context);
    if (this.classificationCache.has(cacheKey)) {
      const cached = this.classificationCache.get(cacheKey)!;
      return { ...cached, processingTime: Date.now() - startTime };
    }

    try {
      // Extract features
      const features = this.extractFeatures(text, context);

      // Run all strategies in parallel
      const strategyPromises = this.strategies.map(async strategy => {
        const strategyStart = Date.now();
        try {
          const result = await strategy.processor(text, context);
          const strategyTime = Date.now() - strategyStart;

          // Update strategy performance
          this.updateStrategyPerformance(strategy.name, strategyTime, true);

          return {
            name: strategy.name,
            classification: result.elementType,
            confidence: result.confidence,
            weight: strategy.weight,
            processingTime: strategyTime
          };
        } catch (error) {
          this.updateStrategyPerformance(strategy.name, Date.now() - strategyStart, false);
          return {
            name: strategy.name,
            classification: 'action',
            confidence: 0.3,
            weight: strategy.weight * 0.5, // Reduce weight on failure
            processingTime: Date.now() - strategyStart
          };
        }
      });

      const strategyResults = await Promise.all(strategyPromises);

      // Ensemble decision making
      const ensembleResult = this.makeEnsembleDecision(
        strategyResults,
        features,
        Date.now() - startTime
      );

      // Update context history
      this.updateContextHistory(text, ensembleResult.classification, context);

      // Cache result
      this.cacheResult(cacheKey, ensembleResult);

      return ensembleResult;

    } catch (error) {
      // Fallback result
      return {
        classification: 'action',
        confidence: 0.3,
        source: 'fallback',
        strategies: [],
        features: this.extractFeatures(text, context),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Strategy 1: Production Agents
   */
  private async productionAgentStrategy(text: string, context: AgentContext): Promise<AgentResult> {
    return await productionAgentSystem.processWithBestAgent(text, context);
  }

  /**
   * Strategy 2: Advanced Pattern Matching
   */
  private async patternMatchingStrategy(text: string, context: AgentContext): Promise<AgentResult> {
    const patterns = this.getAdvancedPatterns();
    const trimmed = text.trim();
    let bestMatch = { classification: 'action', confidence: 0.5 };

    for (const [classification, patternData] of Object.entries(patterns)) {
      for (const pattern of patternData.patterns) {
        if (pattern.regex.test(trimmed)) {
          let confidence = pattern.baseConfidence;

          // Apply context bonuses
          if (pattern.contextBonuses) {
            for (const [contextKey, bonus] of Object.entries(pattern.contextBonuses)) {
              if (context[contextKey as keyof AgentContext]) {
                confidence += bonus;
              }
            }
          }

          // Apply feature bonuses
          const features = this.extractFeatures(text, context);
          confidence += this.calculateFeatureBonus(features, classification);

          if (confidence > bestMatch.confidence) {
            bestMatch = { classification, confidence: Math.min(confidence, 1.0) };
          }
        }
      }
    }

    const html = `<div class="${bestMatch.classification}">${text}</div>`;
    return {
      html,
      processed: true,
      confidence: bestMatch.confidence,
      elementType: bestMatch.classification,
      agentUsed: 'PatternMatchingStrategy',
      originalLine: text,
      context
    };
  }

  /**
   * Strategy 3: Context Analysis
   */
  private async contextAnalysisStrategy(text: string, context: AgentContext): Promise<AgentResult> {
    let confidence = 0.5;
    let classification = 'action';

    // Analyze context patterns
    const contextScore = this.analyzeContext(text, context);

    // Sequence analysis
    const sequencePattern = this.analyzeSequence(text);
    if (sequencePattern) {
      classification = sequencePattern.classification;
      confidence = sequencePattern.confidence + (contextScore * 0.2);
    }

    // Position-based analysis
    if (context.linePosition === 'start') {
      if (/^(مشهد|بسم\s+الله)/.test(text)) {
        confidence += 0.2;
      }
    }

    // Dialogue flow analysis
    if (context.inDialogue) {
      if (!/^[A-Z\u0600-\u06FF\s]+[:：]/.test(text) && !/^\(.*\)$/.test(text)) {
        classification = 'dialogue';
        confidence += 0.3;
      }
    }

    const html = `<div class="${classification}">${text}</div>`;
    return {
      html,
      processed: true,
      confidence: Math.min(confidence, 1.0),
      elementType: classification,
      agentUsed: 'ContextAnalysisStrategy',
      originalLine: text,
      context
    };
  }

  /**
   * Strategy 4: ML Feature Analysis
   */
  private async mlFeatureStrategy(text: string, context: AgentContext): Promise<AgentResult> {
    const features = this.extractFeatures(text, context);
    const prediction = this.makeMlPrediction(features);

    const html = `<div class="${prediction.classification}">${text}</div>`;
    return {
      html,
      processed: true,
      confidence: prediction.confidence,
      elementType: prediction.classification,
      agentUsed: 'MLFeatureStrategy',
      originalLine: text,
      context
    };
  }

  /**
   * Extract comprehensive features from text
   */
  private extractFeatures(text: string, context: AgentContext): ClassificationFeatures {
    const trimmed = text.trim();
    const arabicChars = (trimmed.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = trimmed.length;

    return {
      textLength: trimmed.length,
      arabicRatio: totalChars > 0 ? arabicChars / totalChars : 0,
      punctuationCount: (trimmed.match(/[.!?،؟]/g) || []).length,
      colonCount: (trimmed.match(/[:：]/g) || []).length,
      parenthesesCount: (trimmed.match(/[()]/g) || []).length,
      numberCount: (trimmed.match(/\d/g) || []).length,
      capitalRatio: this.calculateCapitalRatio(trimmed),
      wordCount: trimmed.split(/\s+/).length,
      sentenceCount: Math.max(1, (trimmed.match(/[.!?؟]/g) || []).length),
      specialCharacters: (trimmed.match(/[^\w\s\u0600-\u06FF]/g) || []).length,
      contextScore: this.calculateContextScore(context)
    };
  }

  /**
   * Make ML-based prediction using features
   */
  private makeMlPrediction(features: ClassificationFeatures): MLPrediction {
    const reasoning: string[] = [];
    let classification = 'action';
    let confidence = 0.5;

    // Rule-based ML simulation
    if (features.colonCount > 0 && features.textLength < 50) {
      classification = 'character';
      confidence = 0.8 + (features.colonCount * 0.1);
      reasoning.push('High colon count with short text suggests character name');
    }

    if (features.parenthesesCount >= 2) {
      classification = 'parenthetical';
      confidence = 0.9;
      reasoning.push('Balanced parentheses detected');
    }

    if (features.numberCount > 0 && features.textLength < 30) {
      classification = 'scene-header-1';
      confidence = 0.85;
      reasoning.push('Numbers in short text suggest scene header');
    }

    if (features.arabicRatio > 0.8 && features.textLength > 100) {
      if (classification === 'action') {
        confidence += 0.1;
        reasoning.push('High Arabic content in long text');
      }
    }

    if (features.contextScore > 0.7) {
      confidence += features.contextScore * 0.2;
      reasoning.push('Strong contextual indicators');
    }

    return {
      classification,
      confidence: Math.min(confidence, 1.0),
      features,
      reasoning
    };
  }

  /**
   * Ensemble decision making
   */
  private makeEnsembleDecision(
    strategyResults: Array<{
      name: string;
      classification: string;
      confidence: number;
      weight: number;
    }>,
    features: ClassificationFeatures,
    processingTime: number
  ): EnsembleResult {
    // Weighted voting
    const votes: Record<string, number> = {};

    for (const result of strategyResults) {
      const score = result.confidence * result.weight;
      votes[result.classification] = (votes[result.classification] || 0) + score;
    }

    // Find winning classification
    let bestClassification = 'action';
    let bestScore = 0;

    for (const [classification, score] of Object.entries(votes)) {
      if (score > bestScore) {
        bestScore = score;
        bestClassification = classification;
      }
    }

    // Calculate ensemble confidence
    const totalWeight = strategyResults.reduce((sum, result) => sum + result.weight, 0);
    const ensembleConfidence = totalWeight > 0 ? bestScore / totalWeight : 0.5;

    // Determine source
    const winningStrategy = strategyResults.find(r => r.classification === bestClassification);
    const source = winningStrategy ? `ensemble(${winningStrategy.name})` : 'ensemble(mixed)';

    return {
      classification: bestClassification,
      confidence: Math.min(ensembleConfidence, 1.0),
      source,
      strategies: strategyResults,
      features,
      processingTime
    };
  }

  /**
   * Helper methods
   */
  private calculateCapitalRatio(text: string): number {
    const capitals = (text.match(/[A-Z\u0600-\u06FF]/g) || []).length;
    const letters = (text.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
    return letters > 0 ? capitals / letters : 0;
  }

  private calculateContextScore(context: AgentContext): number {
    let score = 0;
    if (context.lastCharacter) score += 0.3;
    if (context.inDialogue) score += 0.2;
    if (context.linePosition) score += 0.2;
    if (context.lastActionType) score += 0.1;
    return Math.min(score, 1.0);
  }

  private analyzeContext(text: string, context: AgentContext): number {
    let score = 0;

    // Historical pattern analysis
    const recentHistory = this.contextHistory.slice(-5);
    const patternMatch = recentHistory.find(h =>
      h.text.toLowerCase().includes(text.toLowerCase().substring(0, 10))
    );

    if (patternMatch) {
      score += 0.3;
    }

    // Sequence analysis
    if (recentHistory.length > 0) {
      const lastClass = recentHistory[recentHistory.length - 1].classification;
      if (this.isValidSequence(lastClass, text)) {
        score += 0.4;
      }
    }

    return score;
  }

  private analyzeSequence(text: string): { classification: string; confidence: number } | null {
    const recentHistory = this.contextHistory.slice(-3);

    // Character -> Dialogue sequence
    if (recentHistory.length > 0) {
      const last = recentHistory[recentHistory.length - 1];
      if (last.classification === 'character' &&
          !/^[A-Z\u0600-\u06FF\s]+[:：]/.test(text) &&
          !/^\(.*\)$/.test(text)) {
        return { classification: 'dialogue', confidence: 0.8 };
      }
    }

    // Scene pattern detection
    if (/^مشهد\s*\d+/.test(text)) {
      return { classification: 'scene-header-1', confidence: 0.95 };
    }

    return null;
  }

  private isValidSequence(prevClass: string, currentText: string): boolean {
    const sequenceRules: Record<string, string[]> = {
      'character': ['dialogue', 'parenthetical'],
      'scene-header-1': ['scene-header-2', 'action'],
      'parenthetical': ['dialogue'],
      'dialogue': ['character', 'action', 'parenthetical'],
      'action': ['character', 'scene-header-1', 'transition']
    };

    const possibleNext = sequenceRules[prevClass] || [];

    // Simple heuristic check
    for (const nextClass of possibleNext) {
      if (this.textMatchesClass(currentText, nextClass)) {
        return true;
      }
    }

    return false;
  }

  private textMatchesClass(text: string, className: string): boolean {
    const patterns: Record<string, RegExp> = {
      'character': /[:：]\s*$|^[A-Z\u0600-\u06FF\s]+$/,
      'dialogue': /^[^()]+[.!?؟]$|^[^()]{10,}$/,
      'parenthetical': /^\(.*\)$/,
      'action': /^[^()]+[.،]$|يدخل|يخرج|ينظر/,
      'scene-header-1': /^مشهد\s*\d+/,
      'transition': /قطع|انتقال|تلاشي/
    };

    const pattern = patterns[className];
    return pattern ? pattern.test(text.trim()) : false;
  }

  private calculateFeatureBonus(features: ClassificationFeatures, classification: string): number {
    const weights = this.featureWeights[classification] || {};
    let bonus = 0;

    for (const [featureName, weight] of Object.entries(weights)) {
      const featureValue = features[featureName as keyof ClassificationFeatures] as number;
      bonus += (featureValue || 0) * weight;
    }

    return Math.min(bonus, 0.3); // Cap bonus at 0.3
  }

  private getAdvancedPatterns() {
    return {
      'basmala': {
        patterns: [
          {
            regex: /^بسم\s+الله\s+الرحمن\s+الرحيم/,
            baseConfidence: 0.98,
            contextBonuses: { linePosition: 0.02 }
          }
        ]
      },
      'scene-header-1': {
        patterns: [
          {
            regex: /^مشهد\s*\d+/,
            baseConfidence: 0.95,
            contextBonuses: { linePosition: 0.05 }
          }
        ]
      },
      'character': {
        patterns: [
          {
            regex: /^[A-Z\u0600-\u06FF\s]+[:：]\s*$/,
            baseConfidence: 0.9,
            contextBonuses: { inDialogue: -0.1 }
          }
        ]
      },
      'dialogue': {
        patterns: [
          {
            regex: /^[^()]+[.!?؟]$/,
            baseConfidence: 0.7,
            contextBonuses: { inDialogue: 0.2, lastCharacter: 0.15 }
          }
        ]
      },
      'parenthetical': {
        patterns: [
          {
            regex: /^\([^)]+\)$/,
            baseConfidence: 0.95,
            contextBonuses: {}
          }
        ]
      },
      'action': {
        patterns: [
          {
            regex: /يدخل|يخرج|ينظر|يقف/,
            baseConfidence: 0.8,
            contextBonuses: { lastActionType: 0.1 }
          }
        ]
      }
    };
  }

  private initializeFeatureWeights(): Record<string, Record<string, number>> {
    return {
      'character': {
        colonCount: 0.3,
        textLength: -0.01,
        capitalRatio: 0.2
      },
      'dialogue': {
        textLength: 0.005,
        punctuationCount: 0.1,
        contextScore: 0.2
      },
      'parenthetical': {
        parenthesesCount: 0.4,
        textLength: -0.01
      },
      'scene-header-1': {
        numberCount: 0.2,
        textLength: -0.02,
        arabicRatio: 0.1
      },
      'action': {
        textLength: 0.002,
        sentenceCount: 0.1,
        arabicRatio: 0.1
      }
    };
  }

  private updateContextHistory(text: string, classification: string, context: AgentContext): void {
    this.contextHistory.push({ text, classification, context });

    // Keep only recent history
    if (this.contextHistory.length > 100) {
      this.contextHistory = this.contextHistory.slice(-50);
    }
  }

  private generateCacheKey(text: string, context: AgentContext): string {
    const contextKey = [
      context.lastCharacter || '',
      context.inDialogue ? 'dialogue' : '',
      context.linePosition || '',
      context.lastActionType || ''
    ].filter(Boolean).join('|');

    return `${text.substring(0, 50)}::${contextKey}`;
  }

  private cacheResult(key: string, result: EnsembleResult): void {
    // Limit cache size
    if (this.classificationCache.size > 1000) {
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }

    this.classificationCache.set(key, result);
  }

  private updateStrategyPerformance(strategyName: string, processingTime: number, success: boolean): void {
    const current = this.performanceMetrics.strategyPerformance.get(strategyName) ||
      { accuracy: 0.5, speed: 100 };

    const newAccuracy = success ?
      (current.accuracy + 1) / 2 :
      (current.accuracy + 0) / 2;

    const newSpeed = (current.speed + processingTime) / 2;

    this.performanceMetrics.strategyPerformance.set(strategyName, {
      accuracy: newAccuracy,
      speed: newSpeed
    });
  }

  /**
   * Public API methods
   */
  async classify(text: string, context: AgentContext = {}): Promise<AgentResult> {
    const ensembleResult = await this.classifyAdvanced(text, context);

    return {
      html: `<div class="${ensembleResult.classification}">${text}</div>`,
      processed: true,
      confidence: ensembleResult.confidence,
      elementType: ensembleResult.classification,
      agentUsed: ensembleResult.source,
      originalLine: text,
      context
    };
  }

  /**
   * Batch classification
   */
  async classifyBatch(
    texts: Array<{ text: string; context?: AgentContext }>
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    for (const item of texts) {
      const result = await this.classify(item.text, item.context || {});
      results.push(result);
    }

    return results;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.classificationCache.size,
      historySize: this.contextHistory.length
    };
  }

  /**
   * Clear caches and reset
   */
  reset(): void {
    this.classificationCache.clear();
    this.contextHistory = [];
    this.performanceMetrics = {
      totalClassifications: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      strategyPerformance: new Map()
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    classifier: boolean;
    strategies: Record<string, boolean>;
    dependencies: Record<string, boolean>;
  }> {
    const strategyHealth: Record<string, boolean> = {};

    for (const strategy of this.strategies) {
      try {
        await strategy.processor('test', {});
        strategyHealth[strategy.name] = true;
      } catch {
        strategyHealth[strategy.name] = false;
      }
    }

    const agentSystemHealth = await productionAgentSystem.healthCheck();
    const coordinatorHealth = await geminiCoordinator.healthCheck();

    return {
      classifier: true,
      strategies: strategyHealth,
      dependencies: {
        productionAgentSystem: Object.values(agentSystemHealth).every(Boolean),
        geminiCoordinator: coordinatorHealth.coordinator
      }
    };
  }
}

// Export singleton instance
export const advancedClassifier = new AdvancedClassifier();
export default advancedClassifier;
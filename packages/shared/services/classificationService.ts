/**
 * Classification Service - Unified text classification with local and AI fallbacks
 * Combines local ScreenplayClassifier with GeminiService for intelligent classification
 */

import { geminiService, type GeminiClassificationRequest } from './geminiService';

export interface ClassificationRequest {
  text: string;
  context?: {
    previousFormat?: string;
    position?: 'paste' | 'import' | 'normalize' | 'enter' | 'live-typing';
    isTyping?: boolean;
    isInstant?: boolean;
    lineHistory?: string[];
  };
  options?: {
    useAI?: boolean;
    fallbackToLocal?: boolean;
    confidenceThreshold?: number;
    returnAlternatives?: boolean;
  };
}

export interface ClassificationResult {
  classification: string;
  confidence: number;
  source: 'local' | 'ai' | 'hybrid' | 'fallback';
  alternatives?: Array<{
    classification: string;
    confidence: number;
    source: string;
  }>;
  processingTime: number;
  metadata?: {
    localResult?: { classification: string; confidence: number };
    aiResult?: { classification: string; confidence: number };
    reasoning?: string;
  };
}

export class ClassificationService {
  private localClassifier: ScreenplayClassifier;
  private classificationCache = new Map<string, ClassificationResult>();
  private statistics = {
    totalClassifications: 0,
    aiClassifications: 0,
    localClassifications: 0,
    hybridClassifications: 0,
    cacheHits: 0,
    averageProcessingTime: 0
  };

  constructor() {
    this.localClassifier = new ScreenplayClassifier();
  }

  /**
   * Main classification method with intelligent routing
   */
  async classify(request: ClassificationRequest): Promise<ClassificationResult> {
    const startTime = Date.now();
    this.statistics.totalClassifications++;

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    if (this.classificationCache.has(cacheKey)) {
      this.statistics.cacheHits++;
      const cached = this.classificationCache.get(cacheKey)!;
      return { ...cached, processingTime: Date.now() - startTime };
    }

    const options = {
      useAI: true,
      fallbackToLocal: true,
      confidenceThreshold: 0.8,
      returnAlternatives: false,
      ...request.options
    };

    try {
      // Get local classification first (fast)
      const localResult = this.classifyLocally(request);

      // Decide if AI is needed
      const needsAI = options.useAI && this.shouldUseAI(request, localResult);

      if (needsAI) {
        try {
          const aiResult = await this.classifyWithAI(request);
          const hybridResult = this.combineResults(localResult, aiResult, request);

          this.cacheResult(cacheKey, hybridResult);
          this.updateStatistics(hybridResult, Date.now() - startTime);
          return hybridResult;

        } catch (aiError) {
          console.warn(`[ClassificationService] AI classification failed, using local. Error: ${JSON.stringify(aiError, null, 2)}`);
          const fallbackResult = {
            ...localResult,
            source: 'fallback' as const,
            processingTime: Date.now() - startTime
          };

          this.updateStatistics(fallbackResult, Date.now() - startTime);
          return fallbackResult;
        }
      } else {
        // Use local result only
        const finalResult = {
          ...localResult,
          processingTime: Date.now() - startTime
        };

        this.cacheResult(cacheKey, finalResult);
        this.updateStatistics(finalResult, Date.now() - startTime);
        return finalResult;
      }

    } catch (error) {
      console.error(`[ClassificationService] Classification failed: ${JSON.stringify(error, null, 2)}`);

      // Emergency fallback
      const emergencyResult: ClassificationResult = {
        classification: 'action',
        confidence: 0.3,
        source: 'fallback',
        processingTime: Date.now() - startTime
      };

      this.updateStatistics(emergencyResult, Date.now() - startTime);
      return emergencyResult;
    }
  }

  /**
   * Local classification using ScreenplayClassifier
   */
  private classifyLocally(request: ClassificationRequest): Omit<ClassificationResult, 'processingTime'> {
    this.statistics.localClassifications++;

    const classification = this.localClassifier.classifyLine(
      request.text,
      request.context?.previousFormat || 'action'
    );

    // Calculate confidence based on pattern matching strength
    const confidence = this.calculateLocalConfidence(request.text, classification);

    return {
      classification,
      confidence,
      source: 'local',
      alternatives: []
    };
  }

  /**
   * AI classification using GeminiService
   */
  private async classifyWithAI(request: ClassificationRequest): Promise<Omit<ClassificationResult, 'processingTime'>> {
    this.statistics.aiClassifications++;

    const geminiRequest: GeminiClassificationRequest = {
      text: request.text,
      context: request.context,
      options: {
        includeConfidence: true,
        returnAlternatives: request.options?.returnAlternatives || false
      }
    };

    const result = await geminiService.classifyLine(geminiRequest);

    return {
      classification: result.classification,
      confidence: result.confidence,
      source: 'ai',
      alternatives: result.alternatives,
      metadata: {
        reasoning: result.metadata?.reasoning
      }
    };
  }

  /**
   * Combine local and AI results intelligently
   */
  private combineResults(
    localResult: Omit<ClassificationResult, 'processingTime'>,
    aiResult: Omit<ClassificationResult, 'processingTime'>,
    request: ClassificationRequest
  ): Omit<ClassificationResult, 'processingTime'> {
    this.statistics.hybridClassifications++;

    // If both agree and have high confidence, use that
    if (localResult.classification === aiResult.classification &&
        aiResult.confidence > 0.8) {
      return {
        classification: aiResult.classification,
        confidence: Math.min(localResult.confidence + 0.1, 1.0),
        source: 'hybrid',
        metadata: {
          localResult: { classification: localResult.classification, confidence: localResult.confidence },
          aiResult: { classification: aiResult.classification, confidence: aiResult.confidence }
        }
      };
    }

    // If AI has high confidence, trust it
    if (aiResult.confidence > 0.85) {
      return {
        ...aiResult,
        source: 'hybrid',
        metadata: {
          localResult: { classification: localResult.classification, confidence: localResult.confidence },
          aiResult: { classification: aiResult.classification, confidence: aiResult.confidence }
        }
      };
    }

    // If local has high confidence and AI is uncertain, use local
    if (localResult.confidence > 0.9 && aiResult.confidence < 0.6) {
      return {
        ...localResult,
        source: 'hybrid',
        metadata: {
          localResult: { classification: localResult.classification, confidence: localResult.confidence },
          aiResult: { classification: aiResult.classification, confidence: aiResult.confidence }
        }
      };
    }

    // Default to AI result with combined metadata
    return {
      ...aiResult,
      source: 'hybrid',
      metadata: {
        localResult: { classification: localResult.classification, confidence: localResult.confidence },
        aiResult: { classification: aiResult.classification, confidence: aiResult.confidence }
      }
    };
  }

  /**
   * Determine if AI classification is needed
   */
  private shouldUseAI(
    request: ClassificationRequest,
    localResult: Omit<ClassificationResult, 'processingTime'>
  ): boolean {
    // Always use AI for important decisions
    if (request.context?.position === 'paste' || request.context?.position === 'import') {
      return true;
    }

    // Use AI if local confidence is low
    if (localResult.confidence < 0.7) {
      return true;
    }

    // Use AI for complex lines
    if (request.text.length > 100 || this.hasComplexPatterns(request.text)) {
      return true;
    }

    // Skip AI for instant typing to maintain performance
    if (request.context?.isInstant || request.context?.isTyping) {
      return false;
    }

    return false;
  }

  /**
   * Calculate confidence for local classification
   */
  private calculateLocalConfidence(text: string, classification: string): number {
    const patterns = this.localClassifier.getConfidencePatterns();
    let confidence = 0.5; // Base confidence

    // High confidence patterns
    if (patterns.highConfidence[classification]?.test(text)) {
      confidence = 0.95;
    }
    // Medium confidence patterns
    else if (patterns.mediumConfidence[classification]?.test(text)) {
      confidence = 0.75;
    }
    // Low confidence (fallback)
    else {
      confidence = 0.4;
    }

    // Adjust based on text characteristics
    if (text.length < 3) confidence *= 0.8;
    if (text.length > 200) confidence *= 0.9;
    if (/[\u0600-\u06FF]/.test(text)) confidence += 0.1; // Arabic text bonus

    return Math.min(confidence, 1.0);
  }

  /**
   * Check for complex patterns that need AI
   */
  private hasComplexPatterns(text: string): boolean {
    // Mixed languages
    if (/[\u0600-\u06FF]/.test(text) && /[a-zA-Z]/.test(text)) return true;

    // Multiple colons or special characters
    if ((text.match(/:/g) || []).length > 1) return true;

    // Nested parentheses
    if (/\([^)]*\([^)]*\)/.test(text)) return true;

    // Scene headers with complex structure
    if (/مشهد.*\d+.*[-–—].*[ليلنهار].*[داخليخارجي]/.test(text)) return true;

    return false;
  }

  /**
   * Cache management
   */
  private getCacheKey(request: ClassificationRequest): string {
    return `${request.text}|${request.context?.previousFormat || ''}|${request.context?.position || ''}`;
  }

  private cacheResult(key: string, result: ClassificationResult): void {
    // Keep cache size reasonable
    if (this.classificationCache.size > 1000) {
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }

    this.classificationCache.set(key, result);
  }

  /**
   * Update statistics
   */
  private updateStatistics(result: ClassificationResult, processingTime: number): void {
    this.statistics.averageProcessingTime =
      (this.statistics.averageProcessingTime + processingTime) / 2;
  }

  /**
   * Batch classification for multiple lines
   */
  async classifyBatch(
    requests: ClassificationRequest[]
  ): Promise<ClassificationResult[]> {
    // Process in parallel with concurrency limit
    const batchSize = 5;
    const results: ClassificationResult[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(request => this.classify(request))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.classificationCache.clear();
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      cacheSize: this.classificationCache.size,
      hitRate: this.statistics.cacheHits / Math.max(this.statistics.totalClassifications, 1)
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    local: boolean;
    ai: boolean;
    cache: boolean;
    statistics: any;
  }> {
    const aiHealth = await geminiService.healthCheck();

    return {
      local: true, // Local classifier always works
      ai: aiHealth.connected,
      cache: this.classificationCache.size >= 0,
      statistics: this.getStatistics()
    };
  }
}

/**
 * Enhanced ScreenplayClassifier with confidence patterns
 */
class ScreenplayClassifier {
  private sceneTimeKeywords = ['ليل', 'نهار', 'صباح', 'مساء', 'فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'];
  private sceneLocationKeywords = ['داخلي', 'خارجي', 'فوتو', 'مونتاج', 'int.', 'ext.'];
  private transitionKeywords = ['قطع', 'اختفاء', 'تحول', 'مزج', 'انتقال', 'cut to', 'fade to', 'dissolve to'];
  private commonVerbs = ['يقف', 'تقف', 'يجلس', 'تجلس', 'يدخل', 'تدخل', 'يخرج', 'تخرج'];

  classifyLine(line: string, previousFormat: string = 'action'): string {
    const trimmedLine = line.trim();
    if (!trimmedLine) return 'action';

    // Basmala
    if (/^بسم\s+الله\s+الرحمن\s+الرحيم/.test(trimmedLine)) {
      return 'basmala';
    }

    // Scene headers
    if (/^مشهد\s*\d+\s*$/.test(trimmedLine)) {
      return 'scene-header-1';
    }

    if (this.sceneLocationKeywords.some(k => trimmedLine.includes(k)) ||
        this.sceneTimeKeywords.some(k => trimmedLine.includes(k))) {
      return 'scene-header-2';
    }

    // Character names
    if (/[:：]\s*$/.test(trimmedLine) ||
        (/^[A-Z\u0600-\u06FF\s]+$/.test(trimmedLine) && trimmedLine.split(/\s+/).length <= 4)) {
      return 'character';
    }

    // Parentheticals
    if (/^\(.*\)$/.test(trimmedLine)) {
      return 'parenthetical';
    }

    // Transitions
    if (this.transitionKeywords.some(k => trimmedLine.toLowerCase().includes(k))) {
      return 'transition';
    }

    // Dialogue context
    if (previousFormat === 'character' || previousFormat === 'parenthetical') {
      return 'dialogue';
    }

    return 'action';
  }

  getConfidencePatterns() {
    return {
      highConfidence: {
        basmala: /^بسم\s+الله\s+الرحمن\s+الرحيم/,
        'scene-header-1': /^مشهد\s*\d+\s*$/,
        character: /^[A-Z\u0600-\u06FF\s]+[:：]\s*$/,
        parenthetical: /^\([^)]+\)$/,
        transition: /^(قطع إلى|انتقال إلى|تلاشي)/
      },
      mediumConfidence: {
        'scene-header-2': /(ليل|نهار|داخلي|خارجي)/,
        dialogue: /^[^()]+[.!?؟]$/,
        action: /^(يدخل|يخرج|ينظر|يقف)/
      }
    };
  }
}

// Export singleton instance
export const classificationService = new ClassificationService();
export default classificationService;
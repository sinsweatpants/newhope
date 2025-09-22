/**
 * Gemini Service - Advanced AI integration for screenplay classification and auditing
 * Handles REST API communication, prompt management, and error handling
 */

export interface GeminiClassificationRequest {
  text: string;
  context?: {
    previousFormat?: string;
    position?: 'paste' | 'import' | 'normalize' | 'enter' | 'live-typing';
    isTyping?: boolean;
    isInstant?: boolean;
    lineHistory?: string[];
  };
  options?: {
    includeConfidence?: boolean;
    returnAlternatives?: boolean;
    customPrompt?: string;
  };
}

export interface GeminiClassificationResult {
  classification: string;
  confidence: number;
  source: 'gemini' | 'fallback' | 'error-fallback';
  alternatives?: Array<{
    classification: string;
    confidence: number;
    reason: string;
  }>;
  processingTime: number;
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    reasoning?: string;
  };
}

export interface GeminiAuditRequest {
  lines: Array<{
    index: number;
    raw: string;
    cls: string;
    context?: any;
  }>;
  options?: {
    contextWindow?: number;
    confidenceThreshold?: 'adaptive' | number;
    includeMetrics?: boolean;
    deepAnalysis?: boolean;
    culturalContext?: string;
    dialectSupport?: string[];
  };
}

export interface GeminiAuditResult {
  corrections: Array<{
    index: number;
    currentClass: string;
    suggestedClass: string;
    confidence: 'high' | 'medium' | 'low' | 'adaptive';
    confidenceScore: number;
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    suggestedAction: 'correct' | 'review' | 'split' | 'merge';
  }>;
  statistics?: {
    totalLines: number;
    suggestedCorrections: number;
    highConfidenceCorrections: number;
    averageConfidence: number;
    processingTime: number;
  };
  metadata?: {
    modelUsed: string;
    promptVersion: string;
    tokensUsed: number;
  };
}

export interface GeminiServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
  rateLimitDelay?: number;
}

class GeminiService {
  private config: Required<GeminiServiceConfig>;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;

  constructor(config: GeminiServiceConfig = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      model: config.model || 'gemini-2.0-flash-exp',
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      rateLimitDelay: config.rateLimitDelay || 1000,
      ...config
    };
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): boolean {
    if (!apiKey || apiKey === 'your_api_key') {
      console.warn('[GeminiService] Invalid API key provided');
      return false;
    }
    this.config.apiKey = apiKey;
    return true;
  }

  /**
   * Classify a single line with AI
   */
  async classifyLine(request: GeminiClassificationRequest): Promise<GeminiClassificationResult> {
    const startTime = Date.now();

    if (!this.config.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = this.buildClassificationPrompt(request);
      const response = await this.makeRequest(prompt, {
        temperature: 0.2,
        maxOutputTokens: 512,
        responseMimeType: 'application/json'
      });

      const result = this.parseClassificationResponse(response);

      return {
        ...result,
        processingTime: Date.now() - startTime,
        source: 'gemini'
      };

    } catch (error) {
      console.error('[GeminiService] Classification failed:', error);
      return {
        classification: this.getFallbackClassification(request.text, request.context?.previousFormat),
        confidence: 0.5,
        source: 'error-fallback',
        processingTime: Date.now() - startTime,
        alternatives: []
      };
    }
  }

  /**
   * Audit multiple lines for quality and corrections
   */
  async auditLines(request: GeminiAuditRequest): Promise<GeminiAuditResult> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    if (request.lines.length === 0) {
      return { corrections: [] };
    }

    try {
      const prompt = this.buildAuditPrompt(request);
      const response = await this.makeRequest(prompt, {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      });

      return this.parseAuditResponse(response, request.lines.length);

    } catch (error) {
      console.error('[GeminiService] Audit failed:', error);
      return {
        corrections: [],
        statistics: {
          totalLines: request.lines.length,
          suggestedCorrections: 0,
          highConfidenceCorrections: 0,
          averageConfidence: 0,
          processingTime: 0
        }
      };
    }
  }

  /**
   * Build classification prompt
   */
  private buildClassificationPrompt(request: GeminiClassificationRequest): string {
    const allowedClasses = [
      'basmala', 'scene-header-1', 'scene-header-2', 'scene-header-3',
      'action', 'character', 'parenthetical', 'dialogue', 'transition'
    ];

    return `أنت نظام ذكي متخصص في تصنيف النصوص السينمائية العربية.

المطلوب: تصنيف السطر التالي إلى واحد من الفئات المحددة.

النص للتصنيف: "${request.text}"

السياق:
- النوع السابق: ${request.context?.previousFormat || 'غير محدد'}
- الموقع: ${request.context?.position || 'غير محدد'}

الفئات المسموحة: ${allowedClasses.join(', ')}

قواعد التصنيف:
1. البسملة: تبدأ بـ "بسم الله الرحمن الرحيم"
2. عنوان المشهد (1): "مشهد" + رقم
3. عنوان المشهد (2): مكان أو وقت
4. عنوان المشهد (3): تفاصيل إضافية
5. الشخصية: اسم ينتهي بـ ":" أو ":："
6. بين القوسين: نص بين ( )
7. الحوار: يتبع الشخصية مباشرة
8. الانتقال: كلمات مثل "قطع إلى"
9. الحدث: وصف الأحداث والحركة

أرجع النتيجة في JSON:
{
  "classification": "الفئة",
  "confidence": 0.95,
  "reasoning": "السبب",
  "alternatives": [{"classification": "بديل", "confidence": 0.8}]
}`;
  }

  /**
   * Build audit prompt for multiple lines
   */
  private buildAuditPrompt(request: GeminiAuditRequest): string {
    const lines = request.lines.slice(-50); // Limit to last 50 lines

    return `أنت نظام تدقيق متقدم للنصوص السينمائية العربية.

المطلوب: مراجعة الأسطر التالية واقتراح التصحيحات اللازمة.

الأسطر للمراجعة:
${lines.map(line => `[${line.index}] "${line.raw}" (مصنف كـ: ${line.cls})`).join('\n')}

معايير التدقيق:
1. دقة التصنيف حسب السياق
2. تماسك التدفق السردي
3. صحة التنسيق العربي
4. اتباع معايير السيناريو

أرجع النتيجة في JSON:
{
  "corrections": [
    {
      "index": 0,
      "currentClass": "current",
      "suggestedClass": "suggested",
      "confidence": "high",
      "confidenceScore": 95,
      "reason": "السبب",
      "priority": "high",
      "suggestedAction": "correct"
    }
  ],
  "statistics": {
    "totalLines": ${lines.length},
    "suggestedCorrections": 0,
    "highConfidenceCorrections": 0,
    "averageConfidence": 0
  }
}`;
  }

  /**
   * Make HTTP request to Gemini API with rate limiting
   */
  private async makeRequest(prompt: string, generationConfig: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          // Rate limiting
          const timeSinceLastRequest = Date.now() - this.lastRequestTime;
          if (timeSinceLastRequest < this.config.rateLimitDelay) {
            await new Promise(resolve =>
              setTimeout(resolve, this.config.rateLimitDelay - timeSinceLastRequest)
            );
          }

          const url = `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          this.lastRequestTime = Date.now();

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${errorText}`);
          }

          const data = await response.json();
          resolve(data);

        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      try {
        await request();
      } catch (error) {
        console.error('[GeminiService] Queue processing error:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Parse classification response
   */
  private parseClassificationResponse(response: any): Omit<GeminiClassificationResult, 'processingTime' | 'source'> {
    try {
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(text);

      return {
        classification: parsed.classification || 'action',
        confidence: parsed.confidence || 0.5,
        alternatives: parsed.alternatives || [],
        metadata: {
          reasoning: parsed.reasoning,
          modelUsed: this.config.model
        }
      };
    } catch (error) {
      console.warn('[GeminiService] Failed to parse classification response:', error);
      return {
        classification: 'action',
        confidence: 0.3,
        alternatives: []
      };
    }
  }

  /**
   * Parse audit response
   */
  private parseAuditResponse(response: any, totalLines: number): GeminiAuditResult {
    try {
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{"corrections": []}';
      const parsed = JSON.parse(text);

      const corrections = (parsed.corrections || []).filter((c: any) =>
        typeof c.index === 'number' && c.suggestedClass && c.currentClass
      );

      return {
        corrections,
        statistics: {
          totalLines,
          suggestedCorrections: corrections.length,
          highConfidenceCorrections: corrections.filter((c: any) => c.confidence === 'high').length,
          averageConfidence: corrections.reduce((sum: number, c: any) => sum + (c.confidenceScore || 0), 0) / Math.max(corrections.length, 1),
          processingTime: 0
        },
        metadata: {
          modelUsed: this.config.model,
          promptVersion: '2.0',
          tokensUsed: response?.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.warn('[GeminiService] Failed to parse audit response:', error);
      return {
        corrections: [],
        statistics: {
          totalLines,
          suggestedCorrections: 0,
          highConfidenceCorrections: 0,
          averageConfidence: 0,
          processingTime: 0
        }
      };
    }
  }

  /**
   * Fallback classification for errors
   */
  private getFallbackClassification(text: string, previousFormat?: string): string {
    const trimmed = text.trim();

    if (/^بسم\s+الله\s+الرحمن\s+الرحيم/.test(trimmed)) return 'basmala';
    if (/^مشهد\s*\d+/.test(trimmed)) return 'scene-header-1';
    if (/[:：]\s*$/.test(trimmed)) return 'character';
    if (/^\(.*\)$/.test(trimmed)) return 'parenthetical';
    if (previousFormat === 'character') return 'dialogue';
    if (/^(قطع|انتقال|تلاشي)/.test(trimmed)) return 'transition';

    return 'action';
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ connected: boolean; model: string; error?: string }> {
    try {
      const response = await this.classifyLine({
        text: 'test',
        context: { previousFormat: 'action' }
      });

      return {
        connected: response.source === 'gemini',
        model: this.config.model
      };
    } catch (error) {
      return {
        connected: false,
        model: this.config.model,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    queueLength: number;
    lastRequestTime: number;
    config: Omit<GeminiServiceConfig, 'apiKey'>;
  } {
    return {
      queueLength: this.requestQueue.length,
      lastRequestTime: this.lastRequestTime,
      config: {
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        rateLimitDelay: this.config.rateLimitDelay
      }
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export default geminiService;
/**
 * OCR Service - Advanced text recognition with multiple OCR engines
 * Supports Tesseract.js, PDF.js, and Scribe.js with intelligent fallbacks
 * Enhanced with performance optimization and intelligent caching
 */

import { DynamicImports } from '../utils/dynamicLoader';
import { performanceOptimizer } from '../utils/performanceOptimizer';
import { cacheManager } from '../utils/cacheManager';

export interface OCRResult {
  text: string;
  confidence: number;
  engine: 'tesseract' | 'scribe' | 'pdf.js' | 'hybrid';
  processingTime: number;
  metadata: {
    language?: string;
    pageCount?: number;
    blocks?: OCRBlock[];
    warnings?: string[];
  };
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCROptions {
  language?: string; // 'ara', 'eng', 'ara+eng'
  engines?: ('tesseract' | 'scribe' | 'pdf.js')[];
  fallbackOnLowConfidence?: boolean;
  confidenceThreshold?: number;
  preprocessImage?: boolean;
  outputFormat?: 'text' | 'detailed';
}

class OCRService {
  private tesseractWorker: any = null;
  private isInitialized = false;
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Initialize OCR engines with performance optimization
   */
  private async initializeEngines(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register memory cleanup callback
      performanceOptimizer.registerMemoryCleanup(() => {
        if (this.tesseractWorker) {
          // Cleanup Tesseract worker if memory is low
          this.tesseractWorker.terminate();
          this.tesseractWorker = null;
        }
      });

      // Initialize Tesseract worker with performance monitoring
      await performanceOptimizer.addTask(
        'ocr-init',
        () => this.loadTesseract(),
        { priority: 'normal', timeout: 30000 }
      );

      this.isInitialized = true;
    } catch (error) {
      console.warn('[OCRService] Failed to initialize engines:', error);
    }
  }

  /**
   * Main OCR processing method with intelligent engine selection
   */
  async processFile(
    file: File,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    await this.initializeEngines();

    const defaultOptions: OCROptions = {
      language: 'ara+eng',
      engines: ['tesseract', 'scribe'],
      fallbackOnLowConfidence: true,
      confidenceThreshold: this.DEFAULT_CONFIDENCE_THRESHOLD,
      preprocessImage: true,
      outputFormat: 'text',
      ...options
    };

    try {
      // Determine best engine based on file type
      const fileType = this.getFileType(file);
      let result: OCRResult;

      if (fileType === 'pdf') {
        result = await this.processPDFWithOCR(file, defaultOptions);
      } else if (this.isImageFile(file)) {
        result = await this.processImageWithOCR(file, defaultOptions);
      } else {
        throw new Error(`Unsupported file type for OCR: ${fileType}`);
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      return {
        text: '',
        confidence: 0,
        engine: 'tesseract',
        processingTime: Date.now() - startTime,
        metadata: {
          warnings: [error instanceof Error ? error.message : 'Unknown error']
        }
      };
    }
  }

  /**
   * Process PDF with OCR using multiple strategies
   */
  async processPDFWithOCR(
    file: File,
    options: OCROptions
  ): Promise<OCRResult> {
    try {
      // First try PDF.js for embedded text
      const pdfText = await this.extractPDFText(file);

      if (pdfText && pdfText.trim().length > 100) {
        return {
          text: this.smartProcessPDFText(pdfText),
          confidence: 0.95,
          engine: 'pdf.js',
          processingTime: 0,
          metadata: { language: 'mixed' }
        };
      }

      // Fallback to image-based OCR
      return await this.processPDFAsImages(file, options);

    } catch (error) {
      throw new Error(`PDF OCR processing failed: ${error}`);
    }
  }

  /**
   * Extract text from PDF using PDF.js
   */
  private async extractPDFText(file: File): Promise<string> {
    try {
      const pdfjsLib = await this.loadPdfjs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      console.warn('[OCRService] PDF.js text extraction failed:', error);
      return '';
    }
  }

  /**
   * Process PDF by converting pages to images and running OCR
   */
  private async processPDFAsImages(
    file: File,
    options: OCROptions
  ): Promise<OCRResult> {
    try {
      // Check if we're in a browser environment
      if (typeof document === 'undefined') {
        // In Node.js, delegate to backend processing
        return await this.invokeBackendFallback(file, options, 'Canvas rendering not available in Node.js');
      }

      const pdfjsLib = await this.loadPdfjs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let allText = '';
      let totalConfidence = 0;
      const pageResults: string[] = [];

      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;

          const viewport = page.getViewport({ scale: 2.0 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Convert canvas to blob for OCR
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/png');
          });

          const imageFile = new File([blob], `page_${pageNum}.png`, { type: 'image/png' });
          const pageResult = await this.processImageWithOCR(imageFile, options);

          pageResults.push(pageResult.text);
          allText += pageResult.text + '\n\n';
          totalConfidence += pageResult.confidence;

        } catch (pageError) {
          console.warn(`[OCRService] Failed to process page ${pageNum}:`, pageError);
        }
      }

      return {
        text: this.smartProcessPDFText(allText),
        confidence: totalConfidence / pdf.numPages,
        engine: 'hybrid',
        processingTime: 0,
        metadata: {
          pageCount: pdf.numPages,
          language: 'mixed'
        }
      };

    } catch (error) {
      throw new Error(`PDF image OCR failed: ${error}`);
    }
  }

  /**
   * Process image files with OCR
   */
  async processImageWithOCR(
    file: File,
    options: OCROptions
  ): Promise<OCRResult> {
    const engines = options.engines || ['tesseract'];
    let bestResult: OCRResult | null = null;

    // Try each engine in order
    for (const engine of engines) {
      try {
        let result: OCRResult;

        switch (engine) {
          case 'tesseract':
            result = await this.processWithTesseract(file, options);
            break;
          case 'scribe':
            result = await this.processWithScribe(file, options);
            break;
          default:
            continue;
        }

        // Keep best result
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }

        const meetsThreshold =
          result.confidence >= (options.confidenceThreshold || this.DEFAULT_CONFIDENCE_THRESHOLD) &&
          result.text.trim().length > 0;

        if (meetsThreshold) {
          bestResult = result;
          break;
        }

      } catch (error) {
        console.warn(`[OCRService] ${engine} failed:`, error);
      }
    }

    return bestResult || {
      text: '',
      confidence: 0,
      engine: 'tesseract',
      processingTime: 0,
      metadata: { warnings: ['All OCR engines failed'] }
    };
  }

  /**
   * Process with Tesseract.js with performance optimization
   */
  private async processWithTesseract(
    file: File,
    options: OCROptions
  ): Promise<OCRResult> {
    // Check cache first
    const fileHash = await this.getFileHash(file);
    const cacheKey = `tesseract-${fileHash}-${options.language}`;
    const cached = await cacheManager.get<OCRResult>(cacheKey);
    if (cached) {
      return { ...cached, processingTime: 0 };
    }

    await this.loadTesseract();

    try {
      // Optimize image before processing
      const optimizedFile = await performanceOptimizer.optimizeImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9
      });

      await this.tesseractWorker.loadLanguage(options.language || 'ara+eng');
      await this.tesseractWorker.initialize(options.language || 'ara+eng');

      const { data } = await performanceOptimizer.addTask(
        'tesseract-recognize',
        () => this.tesseractWorker.recognize(optimizedFile),
        { priority: 'high', timeout: 60000 }
      );

      const result: OCRResult = {
        text: performanceOptimizer.optimizeTextProcessing(data.text),
        confidence: data.confidence / 100,
        engine: 'tesseract',
        processingTime: 0,
        metadata: {
          language: options.language,
          blocks: data.blocks?.map((block: any) => ({
            text: block.text,
            confidence: block.confidence / 100,
            bbox: block.bbox
          }))
        }
      };

      // Cache result for future use
      await cacheManager.set(cacheKey, result, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        compress: true
      });

      return result;

    } catch (error) {
      throw new Error(`Tesseract processing failed: ${error}`);
    }
  }

  /**
   * Process with Scribe.js (when available)
   */
  private async processWithScribe(
    file: File,
    options: OCROptions
  ): Promise<OCRResult> {
    try {
      const scribe = await this.loadScribe();
      if (!scribe) {
        throw new Error('Scribe.js not available');
      }

      const recognizer =
        typeof scribe === 'function'
          ? scribe
          : typeof scribe.recognize === 'function'
            ? scribe.recognize.bind(scribe)
            : typeof scribe.default === 'function'
              ? scribe.default
              : typeof scribe.default?.recognize === 'function'
                ? scribe.default.recognize.bind(scribe.default)
                : null;

      if (!recognizer) {
        throw new Error('Unsupported Scribe.js interface');
      }

      const arrayBuffer = await file.arrayBuffer();
      const result = await recognizer(arrayBuffer, {
        language: options.language || 'ara+eng',
        format: 'text'
      });

      const text = performanceOptimizer.optimizeTextProcessing(result?.text || '');
      const confidence = typeof result?.confidence === 'number' ? result.confidence : 0.65;

      if (text.trim().length > 0) {
        return {
          text,
          confidence,
          engine: 'scribe',
          processingTime: 0,
          metadata: {
            language: options.language,
            warnings: result?.warnings ? [].concat(result.warnings) : undefined
          }
        };
      }

      throw new Error('Scribe.js returned empty text');
    } catch (error) {
      console.warn('[OCRService] Scribe.js fallback to backend:', error);
      return this.invokeBackendFallback(file, options, error instanceof Error ? error.message : String(error));
    }
  }

  private async invokeBackendFallback(
    file: File,
    options: OCROptions,
    reason?: string
  ): Promise<OCRResult> {
    const payload = await this.fileToDataUrl(file);

    const response = await fetch('/api/ocr/process', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileData: payload,
        originalName: file.name,
        mimetype: file.type,
        options: {
          ...options,
          engines: ['scribe', 'tesseract'],
          preprocessImage: options.preprocessImage ?? true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Backend OCR fallback failed with status ${response.status}`);
    }

    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || 'Backend OCR fallback returned an error');
    }

    const warnings: string[] = [];
    if (reason) warnings.push(`Local Scribe unavailable: ${reason}`);
    if (json.data?.metadata?.warnings) {
      warnings.push(...json.data.metadata.warnings);
    }

    return {
      text: json.data?.text ?? '',
      confidence: json.data?.confidence ?? 0,
      engine: json.data?.engine ?? 'scribe',
      processingTime: json.data?.processingTime ?? 0,
      metadata: {
        ...json.data?.metadata,
        warnings: warnings.length ? warnings : undefined
      }
    } as OCRResult;
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Smart PDF text processing and cleanup
   */
  smartProcessPDFText(rawText: string): string {
    return rawText
      // Fix common PDF extraction issues
      .replace(/([a-zA-Z\u0600-\u06FF])\s+([a-zA-Z\u0600-\u06FF])/g, '$1$2')
      // Clean up line breaks
      .replace(/\n\s*\n/g, '\n\n')
      // Fix Arabic text direction issues
      .replace(/(\u0600-\u06FF+)\s+(\u0600-\u06FF+)/g, '$1$2')
      // Remove excessive spaces
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Dynamic loading functions with performance optimization
   */
  private async loadTesseract() {
    if (this.tesseractWorker) return;

    try {
      const { createWorker } = await DynamicImports.loadTesseract();

      // Add task to performance optimizer
      this.tesseractWorker = await performanceOptimizer.addTask(
        'tesseract-init',
        () => createWorker('ara+eng'),
        { priority: 'high', timeout: 30000 }
      );
    } catch (error) {
      console.warn('[OCRService] Failed to load Tesseract.js:', error);
      throw error;
    }
  }

  private async loadPdfjs() {
    // Check cache first
    const cacheKey = 'pdfjs-lib';
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
      const pdfjsLib = await DynamicImports.loadPdfjs();
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // Cache for future use
      await cacheManager.set(cacheKey, pdfjsLib, { ttl: 60 * 60 * 1000 }); // 1 hour

      return pdfjsLib;
    } catch (error) {
      throw new Error('Failed to load PDF.js');
    }
  }

  private async loadScribe() {
    try {
      const scribe = await DynamicImports.loadScribe();
      return scribe.default || scribe;
    } catch (error) {
      console.warn('[OCRService] Scribe.js not available:', error);
      return null;
    }
  }

  /**
   * Get file hash for caching
   */
  private async getFileHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();

      // Check if crypto.subtle is available (browser environment)
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback for Node.js environment - use simple hash
        const bytes = new Uint8Array(buffer);
        let hash = 0;
        for (let i = 0; i < bytes.length; i++) {
          hash = ((hash << 5) - hash) + bytes[i];
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
      }
    } catch (error) {
      // Fallback to filename + size + timestamp
      return `${file.name}-${file.size}-${Date.now()}`;
    }
  }

  /**
   * Utility methods
   */
  private getFileType(file: File): string {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'unknown';
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Cleanup resources
   */
  async terminate(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return ['ara', 'eng', 'ara+eng'];
  }

  /**
   * Health check for OCR engines with performance metrics
   */
  async healthCheck(): Promise<{
    tesseract: boolean;
    scribe: boolean;
    pdfjs: boolean;
    performance: {
      cacheHitRate: number;
      averageProcessingTime: number;
      memoryUsage: number;
    };
  }> {
    const results = {
      tesseract: false,
      scribe: false,
      pdfjs: false
    };

    try {
      await this.loadTesseract();
      results.tesseract = true;
    } catch {}

    try {
      await this.loadScribe();
      results.scribe = true;
    } catch {}

    try {
      await this.loadPdfjs();
      results.pdfjs = true;
    } catch {}

    // Get performance metrics
    const cacheStats = cacheManager.getStats();
    const perfMetrics = performanceOptimizer.getMetrics();

    return {
      ...results,
      performance: {
        cacheHitRate: cacheStats.hitRate,
        averageProcessingTime: perfMetrics.processingMetrics.averageTaskTime,
        memoryUsage: perfMetrics.memoryUsage.percentage
      }
    };
  }
}

// Export singleton instance
export const ocrService = new OCRService();
export default ocrService;
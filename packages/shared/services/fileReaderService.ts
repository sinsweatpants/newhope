/**
 * File Reader Service - Universal file processing for PDF, DOCX, TXT, and Images
 * Supports encoding detection and import hooks
 */

import { ocrService } from './ocrService';

export interface FileProcessingResult {
  text: string;
  metadata: {
    filename: string;
    fileType: string;
    encoding?: string;
    pageCount?: number;
    language?: string;
    confidence?: number;
  };
  success: boolean;
  error?: string;
}

export interface FileProcessingOptions {
  enableOCR?: boolean;
  preserveFormatting?: boolean;
  targetLanguage?: 'ar' | 'en' | 'auto';
  fallbackEncoding?: string;
}

class FileReaderService {
  private supportedTypes = {
    pdf: ['application/pdf', '.pdf'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
    doc: ['application/msword', '.doc'],
    txt: ['text/plain', '.txt'],
    rtf: ['application/rtf', '.rtf'],
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', '.jpg', '.jpeg', '.png', '.gif', '.bmp']
  };

  /**
   * Universal file extraction method
   */
  async extractTextFromFile(
    file: File,
    options: FileProcessingOptions = {}
  ): Promise<string> {
    const result = await this.processFile(file, options);
    if (!result.success || !result.text) {
      throw new Error(result.error || 'Failed to extract text from file');
    }
    return result.text;
  }

  /**
   * Comprehensive file processing with metadata
   */
  async processFile(
    file: File,
    options: FileProcessingOptions = {}
  ): Promise<FileProcessingResult> {
    try {
      const fileType = this.detectFileType(file);
      const baseMetadata = {
        filename: file.name,
        fileType,
        size: file.size,
      };

      switch (fileType) {
        case 'pdf':
          return await this.processPDF(file, options, baseMetadata);
        case 'docx':
        case 'doc':
          return await this.processDOCX(file, options, baseMetadata);
        case 'txt':
        case 'rtf':
          return await this.processTextFile(file, options, baseMetadata);
        case 'image':
          return await this.processImage(file, options, baseMetadata);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      return {
        text: '',
        metadata: { filename: file.name, fileType: 'unknown' },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect file type from file object
   */
  private detectFileType(file: File): string {
    const mimeType = file.type.toLowerCase();
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    for (const [type, patterns] of Object.entries(this.supportedTypes)) {
      if (patterns.some(pattern =>
        pattern.startsWith('.') ? extension === pattern : mimeType === pattern
      )) {
        return type === 'images' ? 'image' : type;
      }
    }

    // Fallback to extension-based detection
    if (['.pdf'].includes(extension)) return 'pdf';
    if (['.docx', '.doc'].includes(extension)) return 'docx';
    if (['.txt', '.rtf'].includes(extension)) return 'txt';
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(extension)) return 'image';

    return 'unknown';
  }

  /**
   * Process PDF files - attempts multiple extraction methods
   */
  private async processPDF(
    file: File,
    options: FileProcessingOptions,
    baseMetadata: any
  ): Promise<FileProcessingResult> {
    try {
      // Try PDF.js first for text extraction
      const pdfText = await this.extractPDFText(file);

      if (pdfText && pdfText.trim().length > 50) {
        return {
          text: this.cleanExtractedText(pdfText),
          metadata: {
            ...baseMetadata,
            extractionMethod: 'pdf.js',
            confidence: 0.95
          },
          success: true
        };
      }

      // Fallback to OCR if enabled and PDF has minimal text
      if (options.enableOCR) {
        const ocrText = await this.processPDFWithOCR(file, options);
        return {
          text: this.cleanExtractedText(ocrText),
          metadata: {
            ...baseMetadata,
            extractionMethod: 'ocr',
            confidence: 0.8
          },
          success: true
        };
      }

      return {
        text: pdfText || '',
        metadata: { ...baseMetadata, extractionMethod: 'pdf.js' },
        success: true
      };

    } catch (error) {
      throw new Error(`PDF processing failed: ${error}`);
    }
  }

  /**
   * Extract text from PDF using PDF.js
   */
  private async extractPDFText(file: File): Promise<string> {
    // Dynamic import to avoid bundle bloat
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
  }

  /**
   * Process PDF with OCR fallback
   */
  private async processPDFWithOCR(
    file: File,
    options: FileProcessingOptions
  ): Promise<string> {
    try {
      const result = await ocrService.processFile(file, {
        language: this.resolveOcrLanguage(options.targetLanguage),
        preprocessImage: true,
        fallbackOnLowConfidence: true,
        outputFormat: 'text'
      });

      if (!result.text.trim()) {
        throw new Error('OCR returned empty result for PDF');
      }

      return result.text;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Process DOCX/DOC files
   */
  private async processDOCX(
    file: File,
    options: FileProcessingOptions,
    baseMetadata: any
  ): Promise<FileProcessingResult> {
    try {
      // Dynamic import for mammoth
      const mammoth = await import('mammoth');

      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      return {
        text: this.cleanExtractedText(result.value),
        metadata: {
          ...baseMetadata,
          extractionMethod: 'mammoth',
          confidence: 0.9,
          warnings: result.messages?.length || 0
        },
        success: true
      };
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error}`);
    }
  }

  /**
   * Process plain text files with encoding detection
   */
  private async processTextFile(
    file: File,
    options: FileProcessingOptions,
    baseMetadata: any
  ): Promise<FileProcessingResult> {
    try {
      let text: string;
      let detectedEncoding = 'utf-8';

      // Try UTF-8 first
      try {
        text = await file.text();
        // Check if text contains valid Arabic characters
        if (this.isValidArabicText(text)) {
          detectedEncoding = 'utf-8';
        }
      } catch {
        // Fallback encoding detection would go here
        // For now, use fallback encoding
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder(options.fallbackEncoding || 'windows-1256');
        text = decoder.decode(arrayBuffer);
        detectedEncoding = options.fallbackEncoding || 'windows-1256';
      }

      return {
        text: this.cleanExtractedText(text),
        metadata: {
          ...baseMetadata,
          encoding: detectedEncoding,
          confidence: 0.95
        },
        success: true
      };
    } catch (error) {
      throw new Error(`Text file processing failed: ${error}`);
    }
  }

  /**
   * Process image files (requires OCR)
   */
  private async processImage(
    file: File,
    options: FileProcessingOptions,
    baseMetadata: any
  ): Promise<FileProcessingResult> {
    if (!options.enableOCR) {
      throw new Error('OCR must be enabled to process image files');
    }

    try {
      const ocrResult = await ocrService.processFile(file, {
        language: this.resolveOcrLanguage(options.targetLanguage),
        preprocessImage: true,
        fallbackOnLowConfidence: true,
        outputFormat: 'text'
      });

      const cleanedText = this.cleanExtractedText(ocrResult.text);
      const success = cleanedText.length > 0;

      return {
        text: cleanedText,
        metadata: {
          ...baseMetadata,
          extractionMethod: `ocr-${ocrResult.engine}`,
          confidence: ocrResult.confidence,
          language: ocrResult.metadata.language || this.resolveOcrLanguage(options.targetLanguage)
        },
        success,
        ...(success ? {} : { error: 'لم يتمكن OCR من استخراج نص قابل للاستخدام' })
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error}`);
    }
  }

  /**
   * Resolve OCR language based on user preference
   */
  private resolveOcrLanguage(target?: 'ar' | 'en' | 'auto'): string {
    switch (target) {
      case 'ar':
        return 'ara';
      case 'en':
        return 'eng';
      default:
        return 'ara+eng';
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Clean up line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
  }

  /**
   * Check if text contains valid Arabic characters
   */
  private isValidArabicText(text: string): boolean {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  }

  /**
   * Get supported file types for UI
   */
  getSupportedTypes(): string[] {
    return Object.values(this.supportedTypes).flat();
  }

  /**
   * Validate an incoming file before processing
   */
  validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!file) {
      return { isValid: false, errors: ['لم يتم توفير ملف'] };
    }

    if (file.size === 0) {
      errors.push('الملف فارغ');
    }

    const maxSizeBytes = 50 * 1024 * 1024; // 50MB practical limit
    if (file.size > maxSizeBytes) {
      errors.push('حجم الملف كبير جداً');
    }

    if (!this.isSupported(file)) {
      errors.push('نوع الملف غير مدعوم');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate file type
   */
  isSupported(file: File): boolean {
    return this.detectFileType(file) !== 'unknown';
  }
}

// Export singleton instance
export const fileReaderService = new FileReaderService();
export default fileReaderService;
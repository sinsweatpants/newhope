import { createHash } from 'node:crypto';
import path from 'node:path';

// Dynamic imports for optional dependencies
let sharp: any = null;
let tesseractJs: any = null;

try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not available');
}

try {
  tesseractJs = require('tesseract.js');
} catch (error) {
  console.warn('Tesseract.js not available');
}

interface OCRBackendRequest {
  buffer: Buffer;
  filename?: string;
  mimetype?: string;
}

export interface OCRBackendOptions {
  language?: string;
  confidenceThreshold?: number;
  preprocessImage?: boolean;
  maxPages?: number;
  engines?: Array<'tesseract' | 'scribe'>;
}

export interface OCRBackendResult {
  text: string;
  confidence: number;
  engine: 'tesseract' | 'scribe' | 'pdf.js' | 'hybrid';
  processingTime: number;
  metadata: {
    language?: string;
    pageCount?: number;
    warnings?: string[];
    sourceFiles?: string[];
  };
}

const DEFAULT_THRESHOLD = 0.7;
const DEFAULT_MAX_PAGES = 3;

export class OCRBackendService {
  private worker: Worker | null = null;
  private pdfModulePromise: Promise<any> | null = null;
  private scribeModulePromise: Promise<any> | null = null;

  async process(
    request: OCRBackendRequest,
    options: OCRBackendOptions = {}
  ): Promise<OCRBackendResult> {
    const start = Date.now();
    const resolvedOptions: Required<OCRBackendOptions> = {
      language: options.language ?? 'ara+eng',
      confidenceThreshold: options.confidenceThreshold ?? DEFAULT_THRESHOLD,
      preprocessImage: options.preprocessImage ?? true,
      maxPages: options.maxPages ?? DEFAULT_MAX_PAGES,
      engines: options.engines ?? ['tesseract', 'scribe']
    };

    const fileType = this.detectFileType(request);
    const warnings: string[] = [];

    try {
      if (fileType === 'pdf') {
        const result = await this.processPdf(request, resolvedOptions);
        result.processingTime = Date.now() - start;
        return result;
      }

      if (fileType === 'image') {
        const result = await this.processImage(request, resolvedOptions, warnings);
        result.processingTime = Date.now() - start;
        if (warnings.length) {
          result.metadata.warnings = [...(result.metadata.warnings ?? []), ...warnings];
        }
        return result;
      }

      throw new Error(`Unsupported file type: ${request.mimetype ?? request.filename ?? 'unknown'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OCR error';
      return {
        text: '',
        confidence: 0,
        engine: 'tesseract',
        processingTime: Date.now() - start,
        metadata: {
          warnings: [message]
        }
      };
    }
  }

  private detectFileType(request: OCRBackendRequest): 'pdf' | 'image' | 'unknown' {
    const { mimetype, filename } = request;
    const mime = mimetype?.toLowerCase();

    if (mime === 'application/pdf') {
      return 'pdf';
    }

    if (mime?.startsWith('image/')) {
      return 'image';
    }

    const ext = filename ? path.extname(filename).toLowerCase() : '';
    if (ext === '.pdf') return 'pdf';
    if (['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.tiff'].includes(ext)) {
      return 'image';
    }

    return 'unknown';
  }

  private async processPdf(
    request: OCRBackendRequest,
    options: Required<OCRBackendOptions>
  ): Promise<OCRBackendResult> {
    const pdfjs = await this.getPdfModule();
    const data = new Uint8Array(request.buffer);
    const pdf = await pdfjs.getDocument({ data }).promise;

    let collectedText = '';
    const warnings: string[] = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(' ');
      collectedText += `${text}\n`;
    }

    const cleaned = this.cleanText(collectedText);
    if (cleaned.length > 50) {
      return {
        text: cleaned,
        confidence: 0.95,
        engine: 'pdf.js',
        processingTime: 0,
        metadata: {
          language: 'mixed',
          pageCount: pdf.numPages,
          warnings: warnings.length ? warnings : undefined
        }
      };
    }

    warnings.push('PDF text layer too small, falling back to OCR');
    const imageBuffers = await this.pdfToImages(request.buffer, Math.min(pdf.numPages, options.maxPages));
    if (imageBuffers.length === 0) {
      throw new Error('Unable to rasterize PDF for OCR fallback');
    }
    const ocrResult = await this.recognizeSequential(imageBuffers, options, warnings);

    return {
      ...ocrResult,
      engine: ocrResult.engine === 'tesseract' ? 'hybrid' : ocrResult.engine,
      metadata: {
        ...ocrResult.metadata,
        pageCount: pdf.numPages,
        warnings: warnings.length ? warnings : ocrResult.metadata.warnings
      }
    };
  }

  private async processImage(
    request: OCRBackendRequest,
    options: Required<OCRBackendOptions>,
    warnings: string[]
  ): Promise<OCRBackendResult> {
    const images = [await this.prepareImage(request.buffer, options)];
    return this.recognizeSequential(images, options, warnings);
  }

  private async recognizeSequential(
    images: Buffer[],
    options: Required<OCRBackendOptions>,
    warnings: string[]
  ): Promise<OCRBackendResult> {
    let bestResult: OCRBackendResult | null = null;

    for (const engine of options.engines) {
      try {
        if (engine === 'tesseract') {
          const result = await this.runTesseract(images, options);
          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = result;
          }

          if (result.confidence >= options.confidenceThreshold && result.text.trim().length > 0) {
            return result;
          }

          warnings.push('Tesseract confidence below threshold, evaluating fallback engines');
        } else if (engine === 'scribe') {
          const result = await this.runScribe(images, options);
          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = result;
          }

          if (result.text.trim().length > 0) {
            return result;
          }
        }
      } catch (error) {
        warnings.push(`${engine} failed: ${error instanceof Error ? error.message : error}`);
      }
    }

    return (
      bestResult ?? {
        text: '',
        confidence: 0,
        engine: 'tesseract',
        processingTime: 0,
        metadata: { warnings }
      }
    );
  }

  private async prepareImage(buffer: Buffer, options: Required<OCRBackendOptions>): Promise<Buffer> {
    if (!options.preprocessImage) {
      return buffer;
    }

    return await sharp(buffer)
      .resize({
        width: 1600,
        withoutEnlargement: true,
        fit: 'inside'
      })
      .grayscale()
      .sharpen()
      .normalize()
      .toBuffer();
  }

  private async pdfToImages(buffer: Buffer, pages: number): Promise<Buffer[]> {
    const images: Buffer[] = [];

    for (let page = 0; page < pages; page++) {
      try {
        const image = await sharp(buffer, { page, density: 300 })
          .png()
          .toBuffer();
        images.push(image);
      } catch (error) {
        if (images.length === 0) {
          throw new Error(`Failed to rasterize PDF page ${page + 1}: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
    }

    return images;
  }

  private async runTesseract(
    images: Buffer[],
    options: Required<OCRBackendOptions>
  ): Promise<OCRBackendResult> {
    const worker = await this.getWorker(options.language);

    let combinedText = '';
    let confidenceSum = 0;

    for (const image of images) {
      const { data } = await worker.recognize(image);
      combinedText += `${data.text}\n`;
      confidenceSum += data.confidence / 100;
    }

    const text = this.cleanText(combinedText);

    return {
      text,
      confidence: images.length ? confidenceSum / images.length : 0,
      engine: 'tesseract',
      processingTime: 0,
      metadata: {
        language: options.language
      }
    };
  }

  private async runScribe(
    images: Buffer[],
    options: Required<OCRBackendOptions>
  ): Promise<OCRBackendResult> {
    const module = await this.getScribeModule();
    const recognizer = module?.recognize ?? module?.default?.recognize ?? module?.default;

    if (typeof recognizer !== 'function') {
      throw new Error('Scribe.js recognizer not available');
    }

    const results = await Promise.all(images.map(async (image) => recognizer(image, {
      language: options.language,
      format: 'text'
    })));

    const combinedText = results.map((res: any) => res?.text ?? '').join('\n');
    const confidences = results.map((res: any) => res?.confidence ?? 0.6);

    return {
      text: this.cleanText(combinedText),
      confidence: confidences.length
        ? confidences.reduce((sum: number, value: number) => sum + value, 0) / confidences.length
        : 0.6,
      engine: 'scribe',
      processingTime: 0,
      metadata: {
        language: options.language
      }
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private async getWorker(language: string): Promise<Worker> {
    if (this.worker) {
      await this.worker.loadLanguage(language);
      await this.worker.initialize(language);
      return this.worker;
    }

    if (!tesseractJs) {
      throw new Error('Tesseract.js not available');
    }
    this.worker = await tesseractJs.createWorker();
    await this.worker.load();
    await this.worker.loadLanguage(language);
    await this.worker.initialize(language);
    return this.worker;
  }

  private async getPdfModule(): Promise<any> {
    if (!this.pdfModulePromise) {
      this.pdfModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs')
        .then((module) => {
          const pdfjs = module.default ?? module;
          if (pdfjs.GlobalWorkerOptions) {
            pdfjs.GlobalWorkerOptions.workerSrc = undefined;
          }
          return pdfjs;
        })
        .catch((error) => {
          console.warn('PDF.js not available:', error.message);
          throw new Error('PDF.js dependency not available');
        });
    }

    return this.pdfModulePromise;
  }

  private async getScribeModule(): Promise<any> {
    if (!this.scribeModulePromise) {
      this.scribeModulePromise = import('scribe.js-ocr')
        .then((module) => module.default ?? module)
        .catch((error) => {
          console.warn('Scribe.js not available:', error.message);
          throw new Error('Scribe.js dependency not available');
        });
    }

    return this.scribeModulePromise;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async healthCheck() {
    const language = 'eng';
    const hash = createHash('sha1').update('health-check').digest('hex');

    try {
      await this.getWorker(language);
      return {
        id: hash,
        tesseract: true,
        pdfjs: true,
        scribe: await this.getScribeModule().then(() => true).catch(() => false)
      };
    } catch (error) {
      return {
        id: hash,
        tesseract: false,
        pdfjs: false,
        scribe: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const ocrBackendService = new OCRBackendService();

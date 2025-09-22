import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileReaderService } from '@shared/services/fileReaderService';
import { createMockFile, mockTimers } from '../../utils/testHelpers';

describe('FileReaderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate supported file types', () => {
      const textFile = createMockFile({ name: 'test.txt', type: 'text/plain' });
      const result = fileReaderService.validateFile(textFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported file types', () => {
      const execFile = createMockFile({ name: 'malware.exe', type: 'application/x-msdownload' });
      const result = fileReaderService.validateFile(execFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('نوع الملف غير مدعوم');
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = createMockFile({
        name: 'large.txt',
        type: 'text/plain',
        size: 60 * 1024 * 1024 // 60MB
      });
      const result = fileReaderService.validateFile(largeFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('حجم الملف كبير جداً');
    });

    it('should reject empty files', () => {
      const emptyFile = createMockFile({ size: 0 });
      const result = fileReaderService.validateFile(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('الملف فارغ');
    });
  });

  describe('readFile', () => {
    it('should read text files successfully', async () => {
      const textFile = createMockFile({
        name: 'script.txt',
        type: 'text/plain'
      });

      const result = await fileReaderService.readFile(textFile);

      expect(result.content).toBe('mock file content');
      expect(result.metadata.name).toBe('script.txt');
      expect(result.metadata.type).toBe('text/plain');
    });

    it('should handle PDF files', async () => {
      const pdfFile = createMockFile({
        name: 'script.pdf',
        type: 'application/pdf'
      });

      const result = await fileReaderService.readFile(pdfFile);

      expect(result.content).toBeDefined();
      expect(result.metadata.name).toBe('script.pdf');
    });

    it('should handle DOCX files', async () => {
      const docxFile = createMockFile({
        name: 'script.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const result = await fileReaderService.readFile(docxFile);

      expect(result.content).toBeDefined();
      expect(result.metadata.name).toBe('script.docx');
    });

    it('should handle image files', async () => {
      const imageFile = createMockFile({
        name: 'page.png',
        type: 'image/png'
      });

      const result = await fileReaderService.readFile(imageFile);

      expect(result.content).toBeDefined();
      expect(result.metadata.name).toBe('page.png');
    });

    it('should reject invalid files', async () => {
      const invalidFile = createMockFile({
        name: 'malware.exe',
        type: 'application/x-msdownload'
      });

      await expect(fileReaderService.readFile(invalidFile))
        .rejects.toThrow('الملف غير صالح');
    });

    it('should handle file reading errors gracefully', async () => {
      // Mock FileReader to throw an error
      const originalFileReader = global.FileReader;
      global.FileReader = class extends originalFileReader {
        readAsText() {
          setTimeout(() => {
            this.onerror(new Error('Failed to read file'));
          }, 10);
        }
      };

      const textFile = createMockFile();

      await expect(fileReaderService.readFile(textFile))
        .rejects.toThrow('فشل في قراءة الملف');

      global.FileReader = originalFileReader;
    });
  });

  describe('extractText', () => {
    it('should extract text from plain text', async () => {
      const result = await fileReaderService.extractText('Hello World', 'text/plain');
      expect(result).toBe('Hello World');
    });

    it('should extract text from HTML', async () => {
      const htmlContent = '<p>Hello <strong>World</strong></p>';
      const result = await fileReaderService.extractText(htmlContent, 'text/html');
      expect(result).toContain('Hello World');
    });

    it('should handle RTF format', async () => {
      const rtfContent = '{\\rtf1\\ansi Hello World}';
      const result = await fileReaderService.extractText(rtfContent, 'application/rtf');
      expect(result).toContain('Hello World');
    });

    it('should handle extraction errors', async () => {
      await expect(fileReaderService.extractText(null as any, 'text/plain'))
        .rejects.toThrow('فشل في استخراج النص');
    });
  });

  describe('performance', () => {
    it('should process files within performance threshold', async () => {
      const timers = mockTimers();
      const file = createMockFile();

      const startTime = performance.now();
      await fileReaderService.readFile(file);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // 500ms threshold
      timers.restore();
    });

    it('should handle multiple files concurrently', async () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        createMockFile({ name: `file${i}.txt` })
      );

      const promises = files.map(file => fileReaderService.readFile(file));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.metadata.name).toBe(`file${index}.txt`);
      });
    });
  });

  describe('caching', () => {
    it('should cache file reading results', async () => {
      const file = createMockFile({ name: 'cached.txt' });

      // First read
      const result1 = await fileReaderService.readFile(file);

      // Second read should be faster (cached)
      const startTime = performance.now();
      const result2 = await fileReaderService.readFile(file);
      const endTime = performance.now();

      expect(result1.content).toBe(result2.content);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast from cache
    });
  });

  describe('memory management', () => {
    it('should clean up file references after processing', async () => {
      const file = createMockFile();
      const result = await fileReaderService.readFile(file);

      expect(result.content).toBeDefined();
      // File should be processed and cleaned up
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
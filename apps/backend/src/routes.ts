import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { notificationsRouter } from "./notifications";
import multer from "multer";
import path from "path";
import { promises as fs } from 'fs';
import { ocrBackendService } from './services/ocr';
import { classificationBackendService } from './services/classification';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|docx?|txt|png|jpe?g|gif)$/i;
    if (allowedTypes.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Version endpoint
  app.get('/api/version', (req, res) => {
    res.json({ version: '1.0.0', environment: process.env.NODE_ENV });
  });

  // Notifications API
  app.use('/api/notifications', notificationsRouter);

  // User management APIs
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create user' });
    }
  });

  // File upload endpoints for OCR processing
  app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      };

      res.json({
        success: true,
        file: fileInfo,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  // OCR processing endpoint (placeholder for future OCR service)
  app.post('/api/ocr/process', async (req, res) => {
    try {
      const { fileId, filePath, fileData, originalName, mimetype, options } = req.body ?? {};

      if (!fileId && !filePath && !fileData) {
        return res.status(400).json({ success: false, data: null, error: 'لم يتم تمرير ملف للمعالجة' });
      }

      const resolvedInfo = await resolveIncomingFile({ fileId, filePath, fileData, originalName, mimetype });
      if (!resolvedInfo) {
        return res.status(404).json({ success: false, data: null, error: 'تعذر العثور على الملف المطلوب' });
      }

      const { buffer, name, type } = resolvedInfo;
      const result = await ocrBackendService.process({
        buffer,
        filename: name,
        mimetype: type
      }, {
        language: options?.language,
        preprocessImage: options?.preprocessImage,
        confidenceThreshold: options?.confidenceThreshold,
        engines: options?.engines,
        maxPages: options?.maxPages
      });

      res.json({ success: true, data: result, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR processing failed';
      res.status(500).json({ success: false, data: null, error: message });
    }
  });

  // Screenplay-specific endpoints
  app.post('/api/screenplay/classify', async (req, res) => {
    try {
      const { text, context, options } = req.body ?? {};

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'نص السيناريو مطلوب للتصنيف' });
      }

      const result = await classificationBackendService.classify({ text, context, options });
      res.json({ success: true, data: result, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Classification failed';
      res.status(500).json({ success: false, data: null, error: message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

interface IncomingFileRequest {
  fileId?: string;
  filePath?: string;
  fileData?: string;
  originalName?: string;
  mimetype?: string;
}

async function resolveIncomingFile({
  fileId,
  filePath,
  fileData,
  originalName,
  mimetype
}: IncomingFileRequest): Promise<{ buffer: Buffer; name: string; type: string } | null> {
  try {
    if (fileData) {
      const decoded = decodeBase64Payload(fileData);
      const type = mimetype || decoded.mimetype || guessMimeType(originalName);
      const name = originalName || `upload.${extensionFromMime(type)}`;
      return { buffer: decoded.buffer, name, type };
    }

    const targetPath = filePath
      ? path.resolve(process.cwd(), filePath)
      : path.resolve(process.cwd(), 'uploads', fileId as string);

    const buffer = await fs.readFile(targetPath);
    const type = mimetype || guessMimeType(originalName || targetPath);
    const name = originalName || path.basename(targetPath);
    return { buffer, name, type };
  } catch {
    return null;
  }
}

function decodeBase64Payload(payload: string): { buffer: Buffer; mimetype?: string } {
  const match = payload.match(/^data:(.*?);base64,(.*)$/);
  if (match) {
    return { buffer: Buffer.from(match[2], 'base64'), mimetype: match[1] };
  }
  return { buffer: Buffer.from(payload, 'base64') };
}

function guessMimeType(reference?: string | null): string {
  if (!reference) return 'application/octet-stream';
  const ext = path.extname(reference).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.pdf':
      return 'application/pdf';
    case '.txt':
      return 'text/plain';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    case 'application/pdf':
      return 'pdf';
    case 'text/plain':
      return 'txt';
    default:
      return 'bin';
  }
}

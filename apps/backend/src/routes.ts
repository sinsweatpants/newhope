import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { notificationsRouter } from "./notifications";
import multer from "multer";
import path from "path";

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
      const { fileId, options } = req.body;
      // TODO: Integrate with ocrService when implemented
      res.json({
        success: true,
        text: 'OCR processing will be implemented with ocrService',
        confidence: 0.95
      });
    } catch (error) {
      res.status(500).json({ error: 'OCR processing failed' });
    }
  });

  // Screenplay-specific endpoints
  app.post('/api/screenplay/classify', async (req, res) => {
    try {
      const { text, context } = req.body;
      // TODO: Integrate with classificationService
      res.json({
        classification: 'action',
        confidence: 0.8,
        suggestions: []
      });
    } catch (error) {
      res.status(500).json({ error: 'Classification failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

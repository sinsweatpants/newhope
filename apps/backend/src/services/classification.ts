import { ClassificationService, type ClassificationRequest, type ClassificationResult } from '@shared/services/classificationService';
import { geminiService } from '@shared/services/geminiService';

const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  geminiService.setApiKey(apiKey);
}

export class ClassificationBackendService {
  private readonly service: ClassificationService;

  constructor() {
    this.service = new ClassificationService();
  }

  async classify(payload: ClassificationRequest): Promise<ClassificationResult> {
    return this.service.classify(payload);
  }

  async classifyBatch(payloads: ClassificationRequest[]): Promise<ClassificationResult[]> {
    return this.service.classifyBatch(payloads);
  }

  async healthCheck() {
    return this.service.healthCheck();
  }
}

export const classificationBackendService = new ClassificationBackendService();

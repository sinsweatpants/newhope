/**
 * AI Configuration Dialog - Manage Gemini API settings and AI preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Settings, Key, Brain, Zap, Shield, AlertCircle,
  CheckCircle, XCircle, RefreshCw, Eye, EyeOff,
  Sliders, BarChart3, Activity
} from 'lucide-react';
import { geminiCoordinator } from '@shared/screenplay/geminiCoordinator';
import { geminiService } from '@shared/services/geminiService';

interface AIConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate?: (config: AIConfig) => void;
}

interface AIConfig {
  apiKey: string;
  enableAI: boolean;
  confidenceThreshold: number;
  maxRetries: number;
  fallbackToLocal: boolean;
  enableContextTracking: boolean;
  debugMode: boolean;
  useAdvancedClassifier: boolean;
  batchProcessing: boolean;
  rateLimitDelay: number;
}

interface HealthStatus {
  coordinator: boolean;
  gemini: boolean;
  classification: boolean;
  contextTracking: boolean;
  lastCheck: number;
}

interface PerformanceStats {
  totalClassifications: number;
  aiClassifications: number;
  localClassifications: number;
  averageConfidence: number;
  averageProcessingTime: number;
  successRate: number;
  contextHits: number;
}

export const AIConfigDialog: React.FC<AIConfigDialogProps> = ({
  isOpen,
  onClose,
  onConfigUpdate
}) => {
  const [config, setConfig] = useState<AIConfig>({
    apiKey: '',
    enableAI: true,
    confidenceThreshold: 0.8,
    maxRetries: 2,
    fallbackToLocal: true,
    enableContextTracking: true,
    debugMode: false,
    useAdvancedClassifier: true,
    batchProcessing: true,
    rateLimitDelay: 1000
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [currentTab, setCurrentTab] = useState<'config' | 'health' | 'stats'>('config');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, [isOpen]);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [config]);

  /**
   * Load configuration from localStorage and coordinator
   */
  const loadConfiguration = () => {
    try {
      // Load from localStorage
      const savedApiKey = localStorage.getItem('gemini-api-key') || '';
      const savedConfig = localStorage.getItem('ai-config');

      let loadedConfig = { ...config, apiKey: savedApiKey };

      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        loadedConfig = { ...loadedConfig, ...parsed };
      }

      setConfig(loadedConfig);
      setHasUnsavedChanges(false);

      // Load current coordinator stats if available
      loadPerformanceStats();

    } catch (error) {
      console.warn('Failed to load AI configuration:', error);
    }
  };

  /**
   * Save configuration
   */
  const saveConfiguration = async () => {
    try {
      // Save API key separately for security
      if (config.apiKey) {
        localStorage.setItem('gemini-api-key', config.apiKey);
        geminiCoordinator.setApiKey(config.apiKey);
      }

      // Save other config (without API key)
      const configToSave = { ...config };
      delete (configToSave as any).apiKey;
      localStorage.setItem('ai-config', JSON.stringify(configToSave));

      // Update coordinator configuration
      geminiCoordinator.updateConfig({
        enableAI: config.enableAI,
        confidenceThreshold: config.confidenceThreshold,
        maxRetries: config.maxRetries,
        fallbackToLocal: config.fallbackToLocal,
        enableContextTracking: config.enableContextTracking,
        debugMode: config.debugMode
      });

      setHasUnsavedChanges(false);
      onConfigUpdate?.(config);

      // Test connection after saving
      await testConnection();

    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('فشل في حفظ الإعدادات');
    }
  };

  /**
   * Test API connection
   */
  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      alert('يرجى إدخال مفتاح API أولاً');
      return;
    }

    setIsTestingConnection(true);

    try {
      // Set API key temporarily for testing
      geminiService.setApiKey(config.apiKey);

      // Perform health check
      const health = await geminiCoordinator.healthCheck();
      setHealthStatus({
        ...health,
        lastCheck: Date.now()
      });

      if (health.gemini) {
        alert('تم الاتصال بنجاح! API يعمل بشكل صحيح.');
      } else {
        alert('فشل في الاتصال. يرجى التحقق من مفتاح API.');
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      alert(`فشل في اختبار الاتصال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  /**
   * Load performance statistics
   */
  const loadPerformanceStats = () => {
    try {
      const stats = geminiCoordinator.getStats();
      setPerformanceStats(stats);
    } catch (error) {
      console.warn('Failed to load performance stats:', error);
    }
  };

  /**
   * Clear all data and reset
   */
  const resetConfiguration = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات؟ سيتم فقدان جميع البيانات المحفوظة.')) {
      localStorage.removeItem('gemini-api-key');
      localStorage.removeItem('ai-config');
      geminiCoordinator.clearHistory();

      setConfig({
        apiKey: '',
        enableAI: true,
        confidenceThreshold: 0.8,
        maxRetries: 2,
        fallbackToLocal: true,
        enableContextTracking: true,
        debugMode: false,
        useAdvancedClassifier: true,
        batchProcessing: true,
        rateLimitDelay: 1000
      });

      setHealthStatus(null);
      setPerformanceStats(null);
      setHasUnsavedChanges(false);
    }
  };

  /**
   * Render configuration tab
   */
  const renderConfigTab = () => (
    <div className="space-y-6">
      {/* API Configuration */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Key size={18} className="text-blue-500" />
          إعدادات API
        </h3>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              مفتاح Gemini API *
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="AIza..."
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              احصل على مفتاح API من{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Google AI Studio
              </a>
            </div>
          </div>

          {/* Test Connection */}
          <button
            onClick={testConnection}
            disabled={isTestingConnection || !config.apiKey.trim()}
            className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTestingConnection ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                جاري الاختبار...
              </>
            ) : (
              <>
                <Zap size={18} />
                اختبار الاتصال
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Settings */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Brain size={18} className="text-purple-500" />
          إعدادات الذكاء الاصطناعي
        </h3>

        <div className="space-y-4">
          {/* Enable AI */}
          <label className="flex items-center justify-between">
            <span>تفعيل الذكاء الاصطناعي</span>
            <input
              type="checkbox"
              checked={config.enableAI}
              onChange={(e) => setConfig(prev => ({ ...prev, enableAI: e.target.checked }))}
              className="rounded"
            />
          </label>

          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium mb-2">
              حد الثقة ({Math.round(config.confidenceThreshold * 100)}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={config.confidenceThreshold}
              onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>منخفض (50%)</span>
              <span>عالي (100%)</span>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3 pt-4 border-t">
            <label className="flex items-center justify-between">
              <span>الاحتفاظ بالسياق</span>
              <input
                type="checkbox"
                checked={config.enableContextTracking}
                onChange={(e) => setConfig(prev => ({ ...prev, enableContextTracking: e.target.checked }))}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>الرجوع للمعالجة المحلية</span>
              <input
                type="checkbox"
                checked={config.fallbackToLocal}
                onChange={(e) => setConfig(prev => ({ ...prev, fallbackToLocal: e.target.checked }))}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>المعالجة المجمعة</span>
              <input
                type="checkbox"
                checked={config.batchProcessing}
                onChange={(e) => setConfig(prev => ({ ...prev, batchProcessing: e.target.checked }))}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>وضع التطوير</span>
              <input
                type="checkbox"
                checked={config.debugMode}
                onChange={(e) => setConfig(prev => ({ ...prev, debugMode: e.target.checked }))}
                className="rounded"
              />
            </label>
          </div>

          {/* Performance Settings */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium mb-2">
                عدد المحاولات ({config.maxRetries})
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={config.maxRetries}
                onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                تأخير الطلبات ({config.rateLimitDelay}ms)
              </label>
              <input
                type="range"
                min="500"
                max="3000"
                step="250"
                value={config.rateLimitDelay}
                onChange={(e) => setConfig(prev => ({ ...prev, rateLimitDelay: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render health status tab
   */
  const renderHealthTab = () => (
    <div className="space-y-6">
      {healthStatus ? (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Activity size={18} className="text-green-500" />
            حالة النظام
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>منسق AI</span>
              {healthStatus.coordinator ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <XCircle size={18} className="text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>خدمة Gemini</span>
              {healthStatus.gemini ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <XCircle size={18} className="text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>نظام التصنيف</span>
              {healthStatus.classification ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <XCircle size={18} className="text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span>تتبع السياق</span>
              {healthStatus.contextTracking ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <XCircle size={18} className="text-red-500" />
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-4">
            آخر فحص: {new Date(healthStatus.lastCheck).toLocaleString('ar-SA')}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 text-center">
          <AlertCircle size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            لم يتم فحص حالة النظام بعد
          </p>
          <button
            onClick={testConnection}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            فحص الحالة
          </button>
        </div>
      )}
    </div>
  );

  /**
   * Render statistics tab
   */
  const renderStatsTab = () => (
    <div className="space-y-6">
      {performanceStats ? (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500" />
            إحصائيات الأداء
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">
                {performanceStats.totalClassifications}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                إجمالي التصنيفات
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-500">
                {Math.round(performanceStats.averageConfidence * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                متوسط الثقة
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-500">
                {performanceStats.averageProcessingTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                متوسط وقت المعالجة
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-orange-500">
                {Math.round(performanceStats.successRate * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                معدل النجاح
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span>تصنيفات AI:</span>
              <span>{performanceStats.aiClassifications}</span>
            </div>
            <div className="flex justify-between">
              <span>تصنيفات محلية:</span>
              <span>{performanceStats.localClassifications}</span>
            </div>
            <div className="flex justify-between">
              <span>نجاحات السياق:</span>
              <span>{performanceStats.contextHits}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 text-center">
          <BarChart3 size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            لا توجد إحصائيات متاحة
          </p>
          <button
            onClick={loadPerformanceStats}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            تحديث الإحصائيات
          </button>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={24} />
            إعدادات الذكاء الاصطناعي
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setCurrentTab('config')}
            className={`px-6 py-3 font-medium ${
              currentTab === 'config'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            الإعدادات
          </button>
          <button
            onClick={() => setCurrentTab('health')}
            className={`px-6 py-3 font-medium ${
              currentTab === 'health'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            حالة النظام
          </button>
          <button
            onClick={() => setCurrentTab('stats')}
            className={`px-6 py-3 font-medium ${
              currentTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            الإحصائيات
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {currentTab === 'config' && renderConfigTab()}
          {currentTab === 'health' && renderHealthTab()}
          {currentTab === 'stats' && renderStatsTab()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={resetConfiguration}
              className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
            >
              إعادة تعيين
            </button>
            {hasUnsavedChanges && (
              <span className="text-sm text-yellow-600 flex items-center gap-1">
                <AlertCircle size={16} />
                تغييرات غير محفوظة
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              إلغاء
            </button>
            <button
              onClick={saveConfiguration}
              disabled={!hasUnsavedChanges}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfigDialog;
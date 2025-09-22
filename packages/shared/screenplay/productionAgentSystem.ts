/**
 * Production Agent System - Specialized agents for screenplay element processing
 * Individual agents for each screenplay element type with ML capabilities
 */

import type { AgentResult, AgentContext, FormattingAgent } from './types';

export interface AgentCapabilities {
  confidence: number;
  specializations: string[];
  fallbackSupport: boolean;
  contextAware: boolean;
  mlEnhanced: boolean;
}

export interface AgentMetrics {
  processedCount: number;
  averageConfidence: number;
  successRate: number;
  averageProcessingTime: number;
  lastUsed: number;
}

export interface AgentPattern {
  regex: RegExp;
  confidence: number;
  priority: number;
  contextRequirement?: string;
}

abstract class BaseAgent implements FormattingAgent {
  protected metrics: AgentMetrics = {
    processedCount: 0,
    averageConfidence: 0,
    successRate: 0,
    averageProcessingTime: 0,
    lastUsed: 0
  };

  protected patterns: AgentPattern[] = [];
  protected capabilities: AgentCapabilities;
  protected name: string;

  constructor(name: string, capabilities: AgentCapabilities) {
    this.name = name;
    this.capabilities = capabilities;
    this.initializePatterns();
  }

  abstract initializePatterns(): void;
  abstract processSpecialized(text: string, context: AgentContext): AgentResult;

  /**
   * Main processing method with metrics tracking
   */
  async process(text: string, context: AgentContext = {}): Promise<AgentResult> {
    const startTime = Date.now();
    this.metrics.processedCount++;
    this.metrics.lastUsed = Date.now();

    try {
      const result = this.processSpecialized(text, context);

      // Update metrics
      this.updateMetrics(result, Date.now() - startTime, true);

      return result;
    } catch (error) {
      // Update metrics for failure
      this.updateMetrics(null, Date.now() - startTime, false);

      // Return fallback result
      return this.createFallbackResult(text, context);
    }
  }

  /**
   * Check if agent can handle the text
   */
  canHandle(text: string, context: AgentContext = {}): number {
    let maxConfidence = 0;

    for (const pattern of this.patterns) {
      if (pattern.regex.test(text)) {
        let confidence = pattern.confidence;

        // Apply context requirements
        if (pattern.contextRequirement && context[pattern.contextRequirement as keyof AgentContext]) {
          confidence += 0.1;
        }

        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    // Apply capability bonuses
    if (this.capabilities.contextAware && Object.keys(context).length > 0) {
      maxConfidence += 0.05;
    }

    if (this.capabilities.mlEnhanced) {
      maxConfidence += 0.05;
    }

    return Math.min(maxConfidence, 1.0);
  }

  /**
   * Get agent information
   */
  getInfo() {
    return {
      name: this.name,
      capabilities: this.capabilities,
      metrics: this.metrics,
      patternsCount: this.patterns.length
    };
  }

  /**
   * Utility methods
   */
  protected updateMetrics(result: AgentResult | null, processingTime: number, success: boolean): void {
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime + processingTime) / 2;

    if (success && result) {
      this.metrics.averageConfidence =
        (this.metrics.averageConfidence + result.confidence) / 2;
      this.metrics.successRate =
        (this.metrics.successRate + 1) / 2;
    } else {
      this.metrics.successRate =
        (this.metrics.successRate + 0) / 2;
    }
  }

  protected createFallbackResult(text: string, context: AgentContext): AgentResult {
    return {
      html: `<div class="action">${text}</div>`,
      processed: true,
      confidence: 0.3,
      elementType: 'action',
      agentUsed: `${this.name}(fallback)`,
      originalLine: text,
      context
    };
  }

  protected generateHTML(text: string, elementType: string): string {
    const div = document.createElement('div');
    div.className = elementType;
    div.textContent = text;
    return div.outerHTML;
  }
}

/**
 * Basmala Agent - Handles Islamic opening phrases
 */
export class BasmalaAgent extends BaseAgent {
  constructor() {
    super('BasmalaAgent', {
      confidence: 0.95,
      specializations: ['basmala', 'religious-text'],
      fallbackSupport: true,
      contextAware: false,
      mlEnhanced: false
    });
  }

  initializePatterns(): void {
    this.patterns = [
      {
        regex: /^بسم\s+الله\s+الرحمن\s+الرحيم/,
        confidence: 0.98,
        priority: 1
      },
      {
        regex: /^بسم\s*الله/,
        confidence: 0.85,
        priority: 2
      },
      {
        regex: /الرحمن\s+الرحيم/,
        confidence: 0.75,
        priority: 3
      }
    ];
  }

  processSpecialized(text: string, context: AgentContext): AgentResult {
    const trimmed = text.trim();
    let confidence = 0.5;

    // Check patterns for confidence
    for (const pattern of this.patterns) {
      if (pattern.regex.test(trimmed)) {
        confidence = Math.max(confidence, pattern.confidence);
      }
    }

    // Special formatting for Basmala
    const html = `<div class="basmala" style="text-align: center; font-weight: bold; margin: 20px 0;">${trimmed}</div>`;

    return {
      html,
      processed: true,
      confidence,
      elementType: 'basmala',
      agentUsed: this.name,
      originalLine: text,
      context: {
        ...context,
        linePosition: 'start'
      }
    };
  }
}

/**
 * Scene Header Agent - Handles scene transitions and headers
 */
export class SceneHeaderAgent extends BaseAgent {
  private sceneKeywords = ['ليل', 'نهار', 'صباح', 'مساء', 'فجر', 'داخلي', 'خارجي'];

  constructor() {
    super('SceneHeaderAgent', {
      confidence: 0.9,
      specializations: ['scene-header-1', 'scene-header-2', 'scene-header-3'],
      fallbackSupport: true,
      contextAware: true,
      mlEnhanced: true
    });
  }

  initializePatterns(): void {
    this.patterns = [
      {
        regex: /^مشهد\s*\d+\s*$/,
        confidence: 0.95,
        priority: 1
      },
      {
        regex: /^مشهد\s*\d+\s*[-–—:،]/,
        confidence: 0.9,
        priority: 2
      },
      {
        regex: new RegExp(`(${this.sceneKeywords.join('|')})`),
        confidence: 0.8,
        priority: 3,
        contextRequirement: 'linePosition'
      },
      {
        regex: /^(int\.|ext\.|interior|exterior)/i,
        confidence: 0.75,
        priority: 4
      }
    ];
  }

  processSpecialized(text: string, context: AgentContext): AgentResult {
    const trimmed = text.trim();
    let elementType = 'scene-header-1';
    let confidence = 0.5;

    // Determine scene header level
    if (/^مشهد\s*\d+\s*$/.test(trimmed)) {
      elementType = 'scene-header-1';
      confidence = 0.95;
    } else if (this.sceneKeywords.some(keyword => trimmed.includes(keyword))) {
      elementType = 'scene-header-2';
      confidence = 0.85;
    } else {
      elementType = 'scene-header-3';
      confidence = 0.7;
    }

    // Enhanced formatting for scene headers
    let html: string;
    if (elementType === 'scene-header-1') {
      const sceneMatch = trimmed.match(/^(مشهد\s*\d+)\s*[-–—:،]?\s*(.*)$/);
      if (sceneMatch && sceneMatch[2]) {
        html = `<div class="${elementType}"><span class="scene-number">${sceneMatch[1]}</span><span class="scene-info">${sceneMatch[2]}</span></div>`;
      } else {
        html = this.generateHTML(trimmed, elementType);
      }
    } else {
      html = this.generateHTML(trimmed, elementType);
    }

    return {
      html,
      processed: true,
      confidence,
      elementType,
      agentUsed: this.name,
      originalLine: text,
      context: {
        ...context,
        linePosition: 'start'
      }
    };
  }
}

/**
 * Character Dialogue Agent - Handles character names and dialogue
 */
export class CharacterDialogueAgent extends BaseAgent {
  private characterNames = new Set<string>();
  private commonCharacterPatterns = ['الراوي', 'المقدم', 'الصوت', 'voice over'];

  constructor() {
    super('CharacterDialogueAgent', {
      confidence: 0.88,
      specializations: ['character', 'dialogue'],
      fallbackSupport: true,
      contextAware: true,
      mlEnhanced: true
    });
  }

  initializePatterns(): void {
    this.patterns = [
      {
        regex: /^[A-Z\u0600-\u06FF\s]+[:：]\s*$/,
        confidence: 0.92,
        priority: 1
      },
      {
        regex: /[:：]\s*$/,
        confidence: 0.85,
        priority: 2
      },
      {
        regex: /^[A-Z\u0600-\u06FF\s]{2,20}$/,
        confidence: 0.75,
        priority: 3,
        contextRequirement: 'lastCharacter'
      },
      {
        regex: new RegExp(`^(${this.commonCharacterPatterns.join('|')})`, 'i'),
        confidence: 0.8,
        priority: 2
      }
    ];
  }

  processSpecialized(text: string, context: AgentContext): AgentResult {
    const trimmed = text.trim();

    // Check if this is a character name
    if (this.isCharacterName(trimmed, context)) {
      return this.processCharacterName(trimmed, context, text);
    }

    // Check if this is dialogue
    if (this.isDialogue(trimmed, context)) {
      return this.processDialogue(trimmed, context, text);
    }

    // Fallback
    return this.createFallbackResult(text, context);
  }

  private isCharacterName(text: string, context: AgentContext): boolean {
    // Clear character indicators
    if (/[:：]\s*$/.test(text)) return true;

    // Name-like patterns
    if (/^[A-Z\u0600-\u06FF\s]+$/.test(text) && text.split(/\s+/).length <= 4) {
      return true;
    }

    // Known character names
    if (this.characterNames.has(text.toLowerCase())) return true;

    return false;
  }

  private isDialogue(text: string, context: AgentContext): boolean {
    // Previous line was character
    if (context.lastCharacter) return true;

    // Dialogue patterns
    if (/^[^()]+[.!?؟]$/.test(text)) return true;

    return false;
  }

  private processCharacterName(trimmed: string, context: AgentContext, originalText: string): AgentResult {
    // Clean character name
    const characterName = trimmed.replace(/[:：]\s*$/, '').trim();

    // Add to known characters
    this.characterNames.add(characterName.toLowerCase());

    // Format character name
    const formattedName = trimmed.endsWith(':') || trimmed.endsWith('：') ?
      trimmed : trimmed + ' :';

    const html = `<div class="character">${formattedName}</div>`;

    return {
      html,
      processed: true,
      confidence: 0.9,
      elementType: 'character',
      agentUsed: this.name,
      originalLine: originalText,
      context: {
        ...context,
        lastCharacter: characterName,
        inDialogue: true
      }
    };
  }

  private processDialogue(trimmed: string, context: AgentContext, originalText: string): AgentResult {
    const html = this.generateHTML(trimmed, 'dialogue');

    return {
      html,
      processed: true,
      confidence: 0.85,
      elementType: 'dialogue',
      agentUsed: this.name,
      originalLine: originalText,
      context: {
        ...context,
        inDialogue: true
      }
    };
  }
}

/**
 * Action Agent - Handles action descriptions and scene directions
 */
export class ActionAgent extends BaseAgent {
  private actionVerbs = ['يدخل', 'يخرج', 'ينظر', 'يقف', 'تجلس', 'يتحرك', 'يبتسم'];

  constructor() {
    super('ActionAgent', {
      confidence: 0.8,
      specializations: ['action'],
      fallbackSupport: true,
      contextAware: true,
      mlEnhanced: true
    });
  }

  initializePatterns(): void {
    this.patterns = [
      {
        regex: new RegExp(`^(${this.actionVerbs.join('|')})`),
        confidence: 0.85,
        priority: 1
      },
      {
        regex: /^[^()]+[.،]$/,
        confidence: 0.7,
        priority: 2
      },
      {
        regex: /وصف|مشهد|منظر/,
        confidence: 0.75,
        priority: 3
      }
    ];
  }

  processSpecialized(text: string, context: AgentContext): AgentResult {
    const trimmed = text.trim();
    let confidence = 0.6;

    // Check for action indicators
    for (const pattern of this.patterns) {
      if (pattern.regex.test(trimmed)) {
        confidence = Math.max(confidence, pattern.confidence);
      }
    }

    // Context-based confidence adjustment
    if (context.lastActionType) {
      confidence += 0.1;
    }

    const html = this.generateHTML(trimmed, 'action');

    return {
      html,
      processed: true,
      confidence: Math.min(confidence, 1.0),
      elementType: 'action',
      agentUsed: this.name,
      originalLine: text,
      context: {
        ...context,
        lastActionType: 'general'
      }
    };
  }
}

/**
 * Parenthetical Agent - Handles parenthetical expressions
 */
export class ParentheticalAgent extends BaseAgent {
  constructor() {
    super('ParentheticalAgent', {
      confidence: 0.95,
      specializations: ['parenthetical'],
      fallbackSupport: true,
      contextAware: false,
      mlEnhanced: false
    });
  }

  initializePatterns(): void {
    this.patterns = [
      {
        regex: /^\([^)]+\)$/,
        confidence: 0.95,
        priority: 1
      },
      {
        regex: /^\([^)]*$/,
        confidence: 0.8,
        priority: 2
      },
      {
        regex: /^[^(]*\)$/,
        confidence: 0.8,
        priority: 3
      }
    ];
  }

  processSpecialized(text: string, context: AgentContext): AgentResult {
    const trimmed = text.trim();
    let confidence = 0.5;

    // Check parenthetical patterns
    if (/^\([^)]+\)$/.test(trimmed)) {
      confidence = 0.95;
    } else if (/^\(|[)\]]$/.test(trimmed)) {
      confidence = 0.8;
    }

    // Ensure proper parenthetical formatting
    const formattedText = trimmed.startsWith('(') && trimmed.endsWith(')') ?
      trimmed : `(${trimmed})`;

    const html = this.generateHTML(formattedText, 'parenthetical');

    return {
      html,
      processed: true,
      confidence,
      elementType: 'parenthetical',
      agentUsed: this.name,
      originalLine: text,
      context
    };
  }
}

/**
 * Transition Agent - Handles scene transitions
 */
export class TransitionAgent extends BaseAgent {
  private transitionKeywords = ['قطع إلى', 'انتقال إلى', 'تلاشي', 'مزج', 'cut to', 'fade to'];

  constructor() {
    super('TransitionAgent', {
      confidence: 0.9,
      specializations: ['transition'],
      fallbackSupport: true,
      contextAware: true,
      mlEnhanced: false
    });
  }

  initializePatterns(): void {
    this.patterns = this.transitionKeywords.map(keyword => ({
      regex: new RegExp(keyword, 'i'),
      confidence: 0.9,
      priority: 1
    }));
  }

  processSpecialized(text: string, context: AgentContext): AgentResult {
    const trimmed = text.trim();
    let confidence = 0.5;

    // Check transition keywords
    for (const keyword of this.transitionKeywords) {
      if (trimmed.toLowerCase().includes(keyword.toLowerCase())) {
        confidence = 0.9;
        break;
      }
    }

    const html = this.generateHTML(trimmed, 'transition');

    return {
      html,
      processed: true,
      confidence,
      elementType: 'transition',
      agentUsed: this.name,
      originalLine: text,
      context: {
        ...context,
        linePosition: 'end'
      }
    };
  }
}

/**
 * Production Agent System Manager
 */
export class ProductionAgentSystem {
  private agents: Map<string, BaseAgent> = new Map();
  private agentPriority: string[] = [
    'basmala',
    'scene-header',
    'character-dialogue',
    'parenthetical',
    'transition',
    'action'
  ];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all specialized agents
   */
  private initializeAgents(): void {
    this.agents.set('basmala', new BasmalaAgent());
    this.agents.set('scene-header', new SceneHeaderAgent());
    this.agents.set('character-dialogue', new CharacterDialogueAgent());
    this.agents.set('parenthetical', new ParentheticalAgent());
    this.agents.set('transition', new TransitionAgent());
    this.agents.set('action', new ActionAgent());
  }

  /**
   * Process text with the best suitable agent
   */
  async processWithBestAgent(text: string, context: AgentContext = {}): Promise<AgentResult> {
    let bestAgent: BaseAgent | null = null;
    let bestConfidence = 0;

    // Find the best agent for this text
    for (const agentName of this.agentPriority) {
      const agent = this.agents.get(agentName);
      if (!agent) continue;

      const confidence = agent.canHandle(text, context);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestAgent = agent;
      }
    }

    // Use the best agent or fall back to action agent
    if (bestAgent && bestConfidence > 0.5) {
      return await bestAgent.process(text, context);
    }

    // Fallback to action agent
    const actionAgent = this.agents.get('action');
    if (actionAgent) {
      return await actionAgent.process(text, context);
    }

    // Ultimate fallback
    return {
      html: `<div class="action">${text}</div>`,
      processed: true,
      confidence: 0.3,
      elementType: 'action',
      agentUsed: 'SystemFallback',
      originalLine: text,
      context
    };
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const agentStats: Record<string, any> = {};
    let totalProcessed = 0;
    let totalConfidence = 0;

    for (const [name, agent] of this.agents) {
      const info = agent.getInfo();
      agentStats[name] = info;
      totalProcessed += info.metrics.processedCount;
      totalConfidence += info.metrics.averageConfidence * info.metrics.processedCount;
    }

    return {
      agentCount: this.agents.size,
      totalProcessed,
      systemAverageConfidence: totalProcessed > 0 ? totalConfidence / totalProcessed : 0,
      agents: agentStats
    };
  }

  /**
   * Get specific agent
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Health check for all agents
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, agent] of this.agents) {
      try {
        await agent.process('test', {});
        health[name] = true;
      } catch {
        health[name] = false;
      }
    }

    return health;
  }
}

// Export singleton instance
export const productionAgentSystem = new ProductionAgentSystem();
export default productionAgentSystem;
import { Patterns } from './patterns';
import { ActionType, type AgentContext, type AgentResult, type FormattingAgent } from './types';

export function isValidCharacterName(name: string): boolean {
  if (!name) return false;
  if (name.length < 2 || name.length > 50) return false;
  if (/[^\u0600-\u06FFa-zA-Z\s]/.test(name)) return false;
  return !Patterns.actionKeywords.test(name);
}

export function classifyAction(text: string): string {
  if (/يدخل|يخرج|يصل|يغادر/.test(text)) return ActionType.Movement;
  if (/ينظر|يراقب|يلاحظ/.test(text)) return ActionType.Observation;
  if (/يتكلم|يقول|يهمس|يصرخ/.test(text)) return ActionType.Speech;
  if (/يضحك|يبكي|يبتسم|يحزن/.test(text)) return ActionType.Emotion;
  if (/فجأة|بسرعة|ببطء/.test(text)) return ActionType.Temporal;
  return ActionType.General;
}

export function compileHtml(tag: string, cls: string, text: string, getFormatStylesFn: (formatType: string) => React.CSSProperties, extra: React.CSSProperties = {}): string {
  const div = document.createElement(tag);
  div.className = cls;
  const baseStyles = getFormatStylesFn ? getFormatStylesFn(cls.split(' ')[0]) || {} : {};
  Object.assign(div.style, baseStyles, extra);
  div.textContent = text;
  return div.outerHTML;
}

// Formatting Agents
export const BasmalaAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  if (Patterns.basmala.test(line)) {
    const html = compileHtml("div", "basmala", line.trim(), getFormatStylesFn);
    ctx.inDialogue = false;
    return { html, processed: true, confidence: 1.0, elementType: "basmala", agentUsed: "BasmalaAgent", originalLine: line, context: ctx };
  }
  return null;
}

export const SceneHeaderAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  const trimmedLine = line.trim();
  const m2 = trimmedLine.match(/^(مشهد\s*\d+)\s*[-–—:،]?\s*(.*)$/i);
  if (m2) {
    const head = m2[1].trim();
    const rest = m2[2].trim();
    if (rest && Patterns.sceneHeader2.time.test(rest) && Patterns.sceneHeader2.inOut.test(rest)) {
      const container = document.createElement('div');
      container.className = 'scene-header-top-line';
      const part1 = document.createElement('span');
      part1.className = 'scene-header-1';
      part1.textContent = head;
      const part2 = document.createElement('span');
      part2.className = 'scene-header-2';
      part2.textContent = rest;
      container.appendChild(part1);
      container.appendChild(part2);
      ctx.inDialogue = false;
      return { html: container.outerHTML, processed: true, confidence: 0.99, elementType: "scene-header-combined", agentUsed: "SceneHeaderAgent", originalLine: line, context: ctx };
    }
  }
  if (Patterns.sceneHeader3.test(trimmedLine)) {
    const html = compileHtml("div", "scene-header-3", trimmedLine, getFormatStylesFn);
    ctx.inDialogue = false;
    return { html, processed: true, confidence: 0.90, elementType: "scene-header-3", agentUsed: "SceneHeaderAgent", originalLine: line, context: ctx };
  }
  return null;
}

export const CharacterDialogueAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
    if (!line.trim()) {
        ctx.inDialogue = false;
        return { html: '<div><br></div>', processed: true, confidence: 1.0, elementType: "empty-line", agentUsed: "CharacterDialogueAgent", originalLine: line, context: ctx };
    }

    const direct = line.match(Patterns.characterNames);
    if (direct) {
        const name = direct[1].trim();
        const dialogue = line.substring(direct[0].length).trim();
        if (isValidCharacterName(name)) {
            const html = compileHtml("div", "character", name + " :", getFormatStylesFn) +
                         (dialogue ? compileHtml("div", "dialogue", dialogue, getFormatStylesFn) : "");
            ctx.lastCharacter = name;
            ctx.inDialogue = true;
            return { html, processed: true, confidence: 0.9, elementType: "character-dialogue", agentUsed: "CharacterDialogueAgent", originalLine: line, context: ctx };
        }
    }

    // Check if this is a Syriac dialogue line that should be associated with the last character
    if (ctx.inDialogue && ctx.lastCharacter) {
        const syriacPattern = /^[\s•]*([^\u0600-\u06FF\s]+[^\(\)]*)\s*\(\s*([^)]+)\s*\)\s*$/;
        if (syriacPattern.test(line)) {
            // Let SyriacDialogueAgent handle this
            return null;
        }
        return { html: compileHtml("div", "dialogue", line, getFormatStylesFn), processed: true, confidence: 0.8, elementType: "continued-dialogue", agentUsed: "CharacterDialogueAgent", originalLine: line, context: ctx };
    }
    return null;
}

export const ActionAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
    if (Patterns.actionKeywords.test(line) || Patterns.actionBullet.test(line)) {
        const html = compileHtml("div", `action`, line, getFormatStylesFn);
        ctx.inDialogue = false;
        return { html, processed: true, confidence: 0.85, elementType: `action`, agentUsed: "ActionAgent", originalLine: line, context: ctx };
    }
    return null;
}

export const TransitionAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
    if (Patterns.transitions.test(line)) {
        const html = compileHtml("div", `transition`, line, getFormatStylesFn);
        ctx.inDialogue = false;
        return { html, processed: true, confidence: 0.9, elementType: "transition", agentUsed: "TransitionAgent", originalLine: line, context: ctx };
    }
    return null;
}

export const DirectorNotesAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  if (Patterns.directorNotes.test(line)) {
    const stripped = line.replace(/^\s*\(|\)\s*$/g, "").trim();
    const html = compileHtml("div", `parenthetical`, `(${stripped})`, getFormatStylesFn);
    return { html, processed: true, confidence: 0.85, elementType: "parenthetical", agentUsed: "DirectorNotesAgent", originalLine: line, context: ctx };
  }
  return null;
}

export const StageDirectionsAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  if (Patterns.stageDirections.test(line)) {
    const cleanLine = line.replace(/^\s*-\s*/, "").trim();
    const html = compileHtml("div", "stage-direction", cleanLine, getFormatStylesFn);
    ctx.inDialogue = false;
    return { html, processed: true, confidence: 0.9, elementType: "stage-direction", agentUsed: "StageDirectionsAgent", originalLine: line, context: ctx };
  }
  return null;
}

export const SyriacDialogueAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  // Check for Syriac text with Arabic translation in parentheses
  const syriacPattern = /^[\s•]*([^\u0600-\u06FF\s]+[^\(\)]*)\s*\(\s*([^)]+)\s*\)\s*$/;
  const match = line.match(syriacPattern);

  if (match) {
    const syriacText = match[1].trim();
    const arabicTranslation = match[2].trim();

    const container = document.createElement('div');
    container.className = 'syriac-dialogue-container';

    // Apply base styles
    const baseStyles = getFormatStylesFn ? getFormatStylesFn('syriac-dialogue-container') || {} : {};
    Object.assign(container.style, baseStyles);

    const syriacDiv = document.createElement('div');
    syriacDiv.className = 'syriac-text';
    const syriacStyles = getFormatStylesFn ? getFormatStylesFn('syriac-text') || {} : {};
    Object.assign(syriacDiv.style, syriacStyles);
    syriacDiv.textContent = syriacText;

    const translationDiv = document.createElement('div');
    translationDiv.className = 'arabic-translation';
    const translationStyles = getFormatStylesFn ? getFormatStylesFn('arabic-translation') || {} : {};
    Object.assign(translationDiv.style, translationStyles);
    translationDiv.textContent = `(${arabicTranslation})`;

    container.appendChild(syriacDiv);
    container.appendChild(translationDiv);

    return { html: container.outerHTML, processed: true, confidence: 0.95, elementType: "syriac-dialogue", agentUsed: "SyriacDialogueAgent", originalLine: line, context: ctx };
  }
  return null;
}

export const CutTransitionAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  if (Patterns.transitionCut.test(line)) {
    const html = compileHtml("div", "cut-transition", line.trim(), getFormatStylesFn);
    ctx.inDialogue = false;
    return { html, processed: true, confidence: 1.0, elementType: "cut-transition", agentUsed: "CutTransitionAgent", originalLine: line, context: ctx };
  }
  return null;
}

export const DefaultAgent: FormattingAgent = (line, ctx, getFormatStylesFn) => {
  const html = compileHtml("div", "action", line, getFormatStylesFn);
  ctx.inDialogue = false;
  return { html, processed: true, confidence: 0.1, elementType: 'action', agentUsed: "DefaultAgent", originalLine: line, context: ctx };
}

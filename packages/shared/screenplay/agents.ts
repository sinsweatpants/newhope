
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

export function compileHtml(tag: string, cls: string, text: string, getFormatStylesFn?: (formatType: string) => React.CSSProperties, extra: React.CSSProperties = {}): string {
  const element = document.createElement(tag);
  element.className = cls;

  // تطبيق الأنماط الأساسية من getFormatStylesFn
  if (getFormatStylesFn) {
    const baseClass = cls.split(' ')[0];
    const baseStyles = getFormatStylesFn(baseClass) || {};
    Object.assign(element.style, baseStyles);
  }

  // تطبيق الأنماط الإضافية
  if (extra && Object.keys(extra).length > 0) {
    Object.assign(element.style, extra);
  }

  // تعيين النص
  element.textContent = text;

  return element.outerHTML;
}

class BaseAgent implements FormattingAgent {
  constructor() {}

  execute(_line: string, _ctx: AgentContext, _getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    throw new Error("Method 'execute' must be implemented.");
  }
}

// Formatting Agents
export class BasmalaAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    const trimmedLine = line.trim();
    if (Patterns.basmala.test(trimmedLine)) {
      const html = compileHtml("div", "basmala", trimmedLine, getFormatStylesFn);
      ctx.inDialogue = false;
      return { html, processed: true, confidence: 1.0, elementType: "basmala", agentUsed: "BasmalaAgent", originalLine: line, context: ctx };
    }
    return null;
  }
}

export class SceneHeaderAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    const trimmedLine = line.trim();

    // التعرف على أنماط رؤوس المشاهد المختلفة

    // نمط مخصص للنص في الصورة: "مشهد 1 - ليل - داخلي - مستشفى"
    const fullSceneMatch = trimmedLine.match(/^(مشهد\s*\d+)\s*[-–—]\s*(ليل|نهار|صباح|مساء|فجر|ظهر|عصر|مغرب|عشاء)\s*[-–—]\s*(داخلي|خارجي|داخل|خارج)\s*[-–—]?\s*(.*)$/i);
    if (fullSceneMatch) {
      const sceneNumber = fullSceneMatch[1].trim();
      const timeInfo = fullSceneMatch[2].trim();
      const locationInfo = fullSceneMatch[3].trim();
      const specificPlace = fullSceneMatch[4].trim();

      // إنشاء container رئيسي
      const mainContainer = document.createElement('div');
      mainContainer.className = 'scene-header-container';

      // السطر الأول: رقم المشهد على اليمين، الوقت والموقع على اليسار
      const topLineContainer = document.createElement('div');
      topLineContainer.className = 'scene-header-top-line';
      const topLineStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-top-line') || {} : {};
      Object.assign(topLineContainer.style, topLineStyles);

      const sceneNumberSpan = document.createElement('span');
      sceneNumberSpan.className = 'scene-header-1';
      const numberStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-1') || {} : {};
      Object.assign(sceneNumberSpan.style, numberStyles);
      sceneNumberSpan.textContent = sceneNumber;

      const timeLocationSpan = document.createElement('span');
      timeLocationSpan.className = 'scene-header-2';
      const detailsStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-2') || {} : {};
      Object.assign(timeLocationSpan.style, detailsStyles);
      timeLocationSpan.textContent = `${timeInfo} - ${locationInfo}`;

      topLineContainer.appendChild(sceneNumberSpan);
      topLineContainer.appendChild(timeLocationSpan);
      mainContainer.appendChild(topLineContainer);

      // السطر الثاني: الموقع المحدد في المنتصف
      if (specificPlace) {
        const locationDiv = document.createElement('div');
        locationDiv.className = 'scene-header-3';
        const locationStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-3') || {} : {};
        Object.assign(locationDiv.style, locationStyles);
        locationDiv.textContent = specificPlace;
        mainContainer.appendChild(locationDiv);
      }

      ctx.inDialogue = false;
      return {
        html: mainContainer.outerHTML,
        processed: true,
        confidence: 0.99,
        elementType: "scene-header-combined",
        agentUsed: "SceneHeaderAgent",
        originalLine: line,
        context: ctx
      };
    }

    // نمط عام للمشاهد المعقدة
    const complexSceneMatch = trimmedLine.match(/^(مشهد\s*\d+)\s*[-–—]\s*(.+)$/i);
    if (complexSceneMatch) {
      const sceneNumber = complexSceneMatch[1].trim();
      const allDetails = complexSceneMatch[2].trim();

      // تحليل التفاصيل بطريقة أذكى
      const timeWords = ['ليل', 'نهار', 'صباح', 'مساء', 'فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'];
      const locationWords = ['داخلي', 'خارجي', 'داخل', 'خارج'];

      let timeAndLocation = '';
      let specificLocation = '';

      // تقسيم النص بناءً على الفاصلات أو الشرطات
      const parts = allDetails.split(/[-–—،]/).map(part => part.trim()).filter(part => part.length > 0);

      // فصل الأجزاء إلى مجموعتين
      const timeLocationParts = [];
      const specificLocationParts = [];

      for (const part of parts) {
        const hasTime = timeWords.some(word => part.includes(word));
        const hasLocation = locationWords.some(word => part.includes(word));

        if (hasTime || hasLocation) {
          timeLocationParts.push(part);
        } else {
          specificLocationParts.push(part);
        }
      }

      // تجميع الأجزاء
      timeAndLocation = timeLocationParts.join(' - ');
      specificLocation = specificLocationParts.join(' - ');

      // إذا لم نجد كلمات وقت أو موقع، نتعامل مع النمط العادي
      if (!timeAndLocation && specificLocationParts.length > 0) {
        // للنص مثل "مشهد 1 - ليل - داخلي"
        if (parts.length >= 2) {
          // الجزءان الأولان للوقت والموقع العام
          timeAndLocation = parts.slice(0, 2).join(' - ');
          // باقي الأجزاء للموقع المحدد
          if (parts.length > 2) {
            specificLocation = parts.slice(2).join(' - ');
          }
        } else {
          timeAndLocation = parts[0] || '';
        }
      }

      // إذا كان لدينا شيء مثل "ليل - داخلي" وحده
      if (!timeAndLocation) {
        timeAndLocation = allDetails;
      }

      if (timeAndLocation || specificLocation) {
        // إنشاء container رئيسي
        const mainContainer = document.createElement('div');
        mainContainer.className = 'scene-header-container';

        // السطر الأول: scene-header-1 (يمين) و scene-header-2 (يسار)
        const topLineContainer = document.createElement('div');
        topLineContainer.className = 'scene-header-top-line';
        const topLineStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-top-line') || {} : {};
        Object.assign(topLineContainer.style, topLineStyles);

        const sceneNumberSpan = document.createElement('span');
        sceneNumberSpan.className = 'scene-header-1';
        const numberStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-1') || {} : {};
        Object.assign(sceneNumberSpan.style, numberStyles);
        sceneNumberSpan.textContent = sceneNumber;

        const timeLocationSpan = document.createElement('span');
        timeLocationSpan.className = 'scene-header-2';
        const detailsStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-2') || {} : {};
        Object.assign(timeLocationSpan.style, detailsStyles);
        timeLocationSpan.textContent = timeAndLocation || '';

        topLineContainer.appendChild(sceneNumberSpan);
        topLineContainer.appendChild(timeLocationSpan);
        mainContainer.appendChild(topLineContainer);

        // إضافة الموقع المحدد في السطر الثاني إن وُجد
        if (specificLocation) {
          const locationDiv = document.createElement('div');
          locationDiv.className = 'scene-header-3';
          const locationStyles = getFormatStylesFn ? getFormatStylesFn('scene-header-3') || {} : {};
          Object.assign(locationDiv.style, locationStyles);
          locationDiv.textContent = specificLocation;
          mainContainer.appendChild(locationDiv);
        }

        ctx.inDialogue = false;
        return {
          html: mainContainer.outerHTML,
          processed: true,
          confidence: 0.99,
          elementType: "scene-header-combined",
          agentUsed: "SceneHeaderAgent",
          originalLine: line,
          context: ctx
        };
      }
    }

    // نمط scene-header-3 (عناوين فرعية أو مواقع)
    if (Patterns.sceneHeader3?.test(trimmedLine)) {
      const html = compileHtml("div", "scene-header-3", trimmedLine, getFormatStylesFn);
      ctx.inDialogue = false;
      return {
        html,
        processed: true,
        confidence: 0.90,
        elementType: "scene-header-3",
        agentUsed: "SceneHeaderAgent",
        originalLine: line,
        context: ctx
      };
    }

    // نمط بسيط للمشاهد
    const simpleSceneMatch = trimmedLine.match(/^مشهد\s*\d+/i);
    if (simpleSceneMatch) {
      const html = compileHtml("div", "scene-header-1", trimmedLine, getFormatStylesFn);
      ctx.inDialogue = false;
      return {
        html,
        processed: true,
        confidence: 0.85,
        elementType: "scene-header-1",
        agentUsed: "SceneHeaderAgent",
        originalLine: line,
        context: ctx
      };
    }

    return null;
  }
}

export class CharacterDialogueAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
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
        // If the line doesn't start with an action keyword, it's continued dialogue.
        if (!Patterns.actionKeywords.test(line) && !Patterns.actionBullet.test(line)) {
            return { html: compileHtml("div", "dialogue", line, getFormatStylesFn), processed: true, confidence: 0.8, elementType: "continued-dialogue", agentUsed: "CharacterDialogueAgent", originalLine: line, context: ctx };
        }
    }
    return null;
  }
}

export class ActionAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    if (Patterns.actionKeywords.test(line) || (Patterns.actionBullet.test(line) && !Patterns.characterNames.test(line))) {
        const cleanedLine = line.replace(Patterns.actionBullet, "").trim();
        const html = compileHtml("div", `action`, cleanedLine, getFormatStylesFn);
        ctx.inDialogue = false;
        return { html, processed: true, confidence: 0.85, elementType: `action`, agentUsed: "ActionAgent", originalLine: line, context: ctx };
    }
    return null;
  }
}

export class TransitionAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    if (Patterns.transitions.test(line)) {
        const html = compileHtml("div", `transition`, line, getFormatStylesFn);
        ctx.inDialogue = false;
        return { html, processed: true, confidence: 0.9, elementType: "transition", agentUsed: "TransitionAgent", originalLine: line, context: ctx };
    }
    return null;
  }
}

export class DirectorNotesAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    if (Patterns.directorNotes.test(line)) {
      const stripped = line.replace(/^\s*\(|\)\s*$/g, "").trim();
      const html = compileHtml("div", `parenthetical`, `(${stripped})`, getFormatStylesFn);
      return { html, processed: true, confidence: 0.85, elementType: "parenthetical", agentUsed: "DirectorNotesAgent", originalLine: line, context: ctx };
    }
    return null;
  }
}

export class SyriacDialogueAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    const syriacPattern = /^[\s•]*([^\u0600-\u06FF\s]+[^\(\)]*)\s*\(\s*([^)]+)\s*\)\s*$/;
    const match = line.match(syriacPattern);

    if (match) {
      const syriacText = match[1].trim();
      const arabicTranslation = match[2].trim();

      const container = document.createElement('div');
      container.className = 'syriac-dialogue-container';

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
}

export class CutTransitionAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    if (Patterns.transitionCut.test(line)) {
      const html = compileHtml("div", "cut-transition", line.trim(), getFormatStylesFn);
      ctx.inDialogue = false;
      return { html, processed: true, confidence: 1.0, elementType: "cut-transition", agentUsed: "CutTransitionAgent", originalLine: line, context: ctx };
    }
    return null;
  }
}

export class DefaultAgent extends BaseAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null {
    const html = compileHtml("div", "action", line, getFormatStylesFn);
    ctx.inDialogue = false;
    return { html, processed: true, confidence: 0.1, elementType: 'action', agentUsed: "DefaultAgent", originalLine: line, context: ctx };
  }
}

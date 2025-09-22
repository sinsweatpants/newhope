
import type { AgentContext, AgentResult, FormattingAgent } from './types';
import { BasmalaAgent, TransitionAgent, DirectorNotesAgent, CharacterDialogueAgent, SceneHeaderAgent, ActionAgent, SyriacDialogueAgent, CutTransitionAgent, DefaultAgent } from './agents';

// ScreenplayCoordinator Class
export class ScreenplayCoordinator {
  getFormatStylesFn: (formatType: string, font?: string, size?: string) => React.CSSProperties;
  agents: FormattingAgent[];

  constructor(getFormatStylesFn: (formatType: string, font?: string, size?: string) => React.CSSProperties) {
    this.getFormatStylesFn = getFormatStylesFn;
    this.agents = [
      BasmalaAgent,
      CutTransitionAgent,
      TransitionAgent,
      SceneHeaderAgent,
      DirectorNotesAgent,
      CharacterDialogueAgent, 
      ActionAgent,            
      SyriacDialogueAgent,
      DefaultAgent
    ];
  }

  processLine(line: string, context: AgentContext = {}): AgentResult {
    for (const fn of this.agents) {
      const res = fn(line, context, this.getFormatStylesFn);
      if (res?.processed) return res;
    }
    return DefaultAgent(line, context, this.getFormatStylesFn) as AgentResult;
  }

  // Helper to decide if an ENTER is needed, now using correct element types
  shouldInsertEnter(prevType: string, currentType: string): boolean {
    const isPrevDialogue = ['character-dialogue', 'continued-dialogue', 'parenthetical'].includes(prevType);

    // FROM 'scene-header-3' TO 'action' = ENTER
    if (prevType === 'scene-header-3' && currentType === 'action') return true;
    
    // FROM ACTION TO character = ENTER
    if (prevType === 'action' && currentType === 'character-dialogue') return true;

    // FROM dialogue TO character = ENTER
    if (isPrevDialogue && currentType === 'character-dialogue') return true;
    
    // FROM dialogue TO ACTION = ENTER
    if (isPrevDialogue && currentType === 'action') return true;

    // FROM dialogue TO transition = ENTER
    if (isPrevDialogue && currentType === 'transition') return true;

    // FROM ACTION TO transition = ENTER
    if (prevType === 'action' && currentType === 'transition') return true;

    return false;
  }

  processScript(lines: string[]) {
    const ctx: AgentContext = {};
    const results: AgentResult[] = [];
    let previousLineType: string | null = null;
    
    const nonEmptyLines = lines.map(ln => ln.trim()).filter(ln => ln.length > 0);

    for (const line of nonEmptyLines) {
      const result = this.processLine(line, ctx);
      
      // Correctly use elementType
      const currentLineType = result.elementType;

      if (previousLineType) {
        if (this.shouldInsertEnter(previousLineType, currentLineType)) {
          const style = this.getFormatStylesFn('action');
          // Ensure the spacer has height
          style.minHeight = '1.2em'; 
          const styleString = Object.entries(style)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
            .join(';');
            
          const enterLine: AgentResult = {
            elementType: 'spacer', // A specific type for the spacer
            html: `<div class="action" style="${styleString}">&nbsp;</div>`,
            processed: true,
            confidence: 1.0,
            agentUsed: 'Coordinator',
            originalLine: '',
            context: ctx
          };
          results.push(enterLine);
        }
      }

      results.push(result);
      // Correctly update the previous line type
      previousLineType = result.elementType;
    }

    return { results };
  }
}

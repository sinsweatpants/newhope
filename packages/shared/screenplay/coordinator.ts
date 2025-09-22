
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
      CharacterDialogueAgent, // Runs first to identify dialogue lines
      ActionAgent,            // Runs after, to catch any non-dialogue lines as actions
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

  // Helper to decide if an ENTER is needed
  shouldInsertEnter(prevType: string, currentType: string): boolean {
    const rules: [string, string][] = [
      ['scene-header-3', 'action'],
      ['action', 'character'],
      ['action', 'dialogue'], 
      ['dialogue', 'character'],
      ['dialogue', 'action'],
      ['dialogue', 'transition'],
      ['action', 'transition'],
    ];

    return rules.some(([prev, current]) => prev === prevType && current === currentType);
  }

  processScript(lines: string[]) {
    const ctx: AgentContext = {};
    const results: AgentResult[] = [];
    let previousLineType: string | null = null;
    
    // Filter out empty lines from the source script to normalize spacing
    const nonEmptyLines = lines.map(ln => ln.trim()).filter(ln => ln.length > 0);

    for (const line of nonEmptyLines) {
      const result = this.processLine(line, ctx);
      const currentLineType = result.type;

      if (previousLineType) {
        if (this.shouldInsertEnter(previousLineType, currentLineType)) {
          // Insert an "ENTER" - a styled empty div
          const style = this.getFormatStylesFn('action');
          const styleString = Object.entries(style)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
            .join(';');
            
          const enterLine: AgentResult = {
            type: 'action', // Treat spacer as an action
            html: `<div class="action" style="${styleString}">&nbsp;</div>`,
            processed: true
          };
          results.push(enterLine);
        }
      }

      results.push(result);
      previousLineType = result.type; // Use the type from the result object
    }

    return { results };
  }
}

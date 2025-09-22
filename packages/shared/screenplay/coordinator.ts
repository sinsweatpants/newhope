import type { AgentContext, AgentResult, FormattingAgent } from './types';
import { BasmalaAgent, TransitionAgent, DirectorNotesAgent, CharacterDialogueAgent, SceneHeaderAgent, ActionAgent, StageDirectionsAgent, SyriacDialogueAgent, CutTransitionAgent, DefaultAgent } from './agents';

// ScreenplayCoordinator Class
export class ScreenplayCoordinator {
  getFormatStylesFn: (formatType: string, font?: string, size?: string) => React.CSSProperties;
  agents: FormattingAgent[];

  constructor(getFormatStylesFn: (formatType: string, font?: string, size?: string) => React.CSSProperties) {
    this.getFormatStylesFn = getFormatStylesFn;
    this.agents = [ BasmalaAgent, CutTransitionAgent, TransitionAgent, StageDirectionsAgent, SyriacDialogueAgent, DirectorNotesAgent, CharacterDialogueAgent, SceneHeaderAgent, ActionAgent, DefaultAgent ];
  }

  processLine(line: string, context: AgentContext = {}): AgentResult {
    for (const fn of this.agents) {
      const res = fn(line, context, this.getFormatStylesFn);
      if (res?.processed) return res;
    }
    return DefaultAgent(line, context, this.getFormatStylesFn) as AgentResult;
  }

  processScript(lines: string[]) {
    const ctx: AgentContext = {};
    const results = lines.map(ln => this.processLine(ln.trim(), ctx));
    return { results };
  }
}

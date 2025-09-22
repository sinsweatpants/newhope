// Type Definitions for Agents and Context
export interface AgentContext {
  lastCharacter?: string;
  inDialogue?: boolean;
  lastActionType?: string;
  currentScene?: string;
  lastLocation?: string;
  linePosition?: 'start' | 'middle' | 'end';
}

export interface AgentResult {
  html: string;
  processed: boolean;
  confidence: number;
  elementType: string;
  agentUsed: string;
  originalLine: string;
  context: AgentContext;
}

export interface FormattingAgent {
  execute(line: string, ctx: AgentContext, getFormatStylesFn: (formatType: string) => React.CSSProperties): AgentResult | null;
}

export const ActionType = {
  Movement: "movement",
  Observation: "observation", 
  Speech: "speech",
  Emotion: "emotion",
  Temporal: "temporal",
  General: "general",
};

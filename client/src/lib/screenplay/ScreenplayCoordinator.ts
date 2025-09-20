import { AgentContext, ProcessLineResult } from "./types";

export class ScreenplayCoordinator {
  private formatStylesRef: (elementType: string) => string;

  constructor(formatStylesRef: (elementType: string) => string) {
    this.formatStylesRef = formatStylesRef;
  }

  processLine(line: string, context: AgentContext): ProcessLineResult {
    const trimmedLine = line.trim();
    
    // Detect element type based on line characteristics
    let elementType = this.classifyLine(trimmedLine);
    
    // Generate HTML with proper formatting
    const html = `<div class="${elementType}">${this.escapeHtml(trimmedLine)}</div>`;
    
    return {
      html,
      elementType
    };
  }

  private classifyLine(line: string): string {
    const upperLine = line.toUpperCase();
    
    // Scene headers (INT./EXT. or FADE IN:/FADE OUT:)
    if (upperLine.startsWith("INT.") || upperLine.startsWith("EXT.")) {
      return "scene-header-1";
    }
    
    if (upperLine.startsWith("FADE IN:") || upperLine.startsWith("FADE OUT:")) {
      return "scene-header-2";
    }
    
    // Transitions (all caps ending with :)
    if (upperLine.match(/^[A-Z\s]+:$/)) {
      return "transition";
    }
    
    // Character names (all caps, centered position)
    if (line === upperLine && upperLine.length > 0 && !upperLine.includes(".") && upperLine.length < 30) {
      return "character";
    }
    
    // Parenthetical (starts and ends with parentheses)
    if (line.startsWith("(") && line.endsWith(")")) {
      return "parenthetical";
    }
    
    // Director notes (starts with NOTE:)
    if (upperLine.startsWith("NOTE:")) {
      return "director-note";
    }
    
    // Dialogue (follows character name, not all caps)
    if (line !== upperLine && line.length > 0) {
      return "dialogue";
    }
    
    // Default to action
    return "action";
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

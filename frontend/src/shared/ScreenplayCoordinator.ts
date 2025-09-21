import { getFormatStyles } from './formatStyles';
import { Patterns } from './patterns';

type ScreenplayElement = {
  type: 'SceneHeading' | 'Character' | 'Dialogue' | 'Parenthetical' | 'Action' | 'Transition' | 'Basmala';
  content: string;
};

// Text Sanitization Function (from Phase 1)
const sanitizeScriptInput = (line: string): string => {
  let cleanedLine = line.replace(/\t/g, '    ');
  cleanedLine = cleanedLine.replace(Patterns.characterBullets, '');
  // We keep the leading spaces for indentation analysis, so no .trim() here.
  return cleanedLine;
};

export class ScreenplayCoordinator {
  // This function is now a static utility since styling is handled by CSS classes.
  static getElementHtml(element: ScreenplayElement): string {
    const div = document.createElement('div');
    const className = element.type.toLowerCase();
    div.className = className;
    div.textContent = element.content;
    
    // Apply inline styles for dynamic properties (like font) if needed in the future
    const styles = getFormatStyles(className); 
    Object.assign(div.style, styles);

    return div.outerHTML;
  }

  // The main processing logic based on indentation and context.
  processScript(lines: string[]): { results: ScreenplayElement[] } {
    const elements: ScreenplayElement[] = [];
    let lastElementType: ScreenplayElement['type'] | null = null;

    for (const line of lines) {
      const sanitizedLine = sanitizeScriptInput(line);
      const content = sanitizedLine.trim();
      
      if (!content) continue; // Skip empty lines

      // Calculate indentation
      const leadingSpaces = sanitizedLine.match(/^\s*/)?.[0]?.length || 0;
      // Assuming a standard screenplay width of 60 characters (Courier 12pt)
      const indentationPercentage = (leadingSpaces / 60) * 100;

      let currentElementType: ScreenplayElement['type'];

      // Rule-based classification
      if (Patterns.sceneKeywords.test(content)) {
        currentElementType = 'SceneHeading';
      } else if (Patterns.transitions.test(content)) {
        currentElementType = 'Transition';
      } else if (Patterns.directorNotes.test(content)) {
        currentElementType = 'Parenthetical';
      } else if (lastElementType === 'Character' || lastElementType === 'Parenthetical') {
        // If the last element was a Character or Parenthetical, this must be Dialogue.
        currentElementType = 'Dialogue';
      } else if (indentationPercentage > 30 || Patterns.isCharacter.test(content)) {
        // High indentation or ALL CAPS suggests a Character name.
        currentElementType = 'Character';
      } else if (indentationPercentage > 15 && indentationPercentage < 30) {
        // Medium indentation, could be Dialogue following an Action.
        currentElementType = 'Dialogue';
      }
      else {
        // Default to Action for everything else.
        currentElementType = 'Action';
      }
      
      elements.push({ type: currentElementType, content });
      lastElementType = currentElementType;
    }

    return { results: elements };
  }
}

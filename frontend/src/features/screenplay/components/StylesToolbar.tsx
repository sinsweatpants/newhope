import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { customStylesManager, CustomStyle } from '@shared/CustomStylesManager';
import StylesDialog from './StylesDialog';

interface StylesToolbarProps {
  onStylesUpdate: () => void;
  customStyles: CustomStyle[];
}


const StylesToolbar: React.FC<StylesToolbarProps> = ({ onStylesUpdate, customStyles }) => {
  const [isStylesDialogOpen, setStylesDialogOpen] = useState(false);

  const applyStyle = (styleName: string) => {
    const style = customStylesManager.getStyle(styleName);
    if (style) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement) {
          customStylesManager.applyStyle(parentElement, style);
        }
      }
    } else {
        document.execCommand('formatBlock', false, styleName);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2 border-r pr-2">
        <select onChange={(e) => applyStyle(e.target.value)} defaultValue="p" className="p-1 border rounded bg-background">
          <option value="p">Normal</option>
          <option value="h1">Title</option>
          <option value="h2">Subtitle</option>
          <option value="h3">Heading 1</option>
          <option value="h4">Heading 2</option>
          <option value="pre">Emphasis</option>
          {customStyles.map(style => (
            <option key={style.name} value={style.name}>{style.name}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => setStylesDialogOpen(true)}>
          Manage Styles
        </Button>
      </div>
      <StylesDialog
        isOpen={isStylesDialogOpen}
        onClose={() => setStylesDialogOpen(false)}
        onStylesUpdate={onStylesUpdate}
      />
    </>
  );
};

export default StylesToolbar;

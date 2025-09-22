import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { customStylesManager, CustomStyle } from '@shared/CustomStylesManager';


interface StylesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStylesUpdate: () => void;
}

const StylesDialog: React.FC<StylesDialogProps> = ({ isOpen, onClose, onStylesUpdate }) => {
  const [styleName, setStyleName] = useState('');

  const handleCreateStyle = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.parentElement;
      if (parentElement) {
        const computedStyle = window.getComputedStyle(parentElement);
        const newStyle: CustomStyle = {
          name: styleName,
          fontFamily: computedStyle.fontFamily,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          fontStyle: computedStyle.fontStyle,
          textDecoration: computedStyle.textDecoration,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
        };
        if(customStylesManager.addStyle(newStyle)) {
          onStylesUpdate();
          setStyleName('');
        } else {
          // Handle error, maybe show a toast
          alert('Style with this name already exists.');
        }
      }
    }
  };

  const currentStyles = customStylesManager.getAllStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Custom Styles</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="style-name">New Style Name</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="style-name"
              value={styleName}
              onChange={(e) => setStyleName(e.target.value)}
              placeholder="e.g., Character Name"
            />
            <Button onClick={handleCreateStyle} disabled={!styleName}>Create from Selection</Button>
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2">Existing Styles</h3>
          <ul>
            {currentStyles.map(style => (
              <li key={style.name} className="flex justify-between items-center p-2 hover:bg-muted/50">
                <span>{style.name}</span>
                 <Button variant="destructive" size="sm" onClick={() => {
                   customStylesManager.removeStyle(style.name);
                   onStylesUpdate();
                 }}>Delete</Button>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StylesDialog;

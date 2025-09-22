import React from 'react';
import { Button } from '@/components/ui/button';
import { Scissors, Clipboard, ClipboardPaste, Brush } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ClipboardToolbarProps {
  onFormatPainterToggle: (active: boolean) => void;
  isFormatPainterActive: boolean;
}


const ClipboardToolbar: React.FC<ClipboardToolbarProps> = ({ onFormatPainterToggle, isFormatPainterActive }) => {

  const toggleFormatPainter = () => {
    onFormatPainterToggle(!isFormatPainterActive);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2 border-r pr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('cut')}>
              <Scissors className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cut</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('copy')}>
              <Clipboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('paste')}>
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Paste</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={isFormatPainterActive ? "secondary" : "ghost"} size="sm" onClick={toggleFormatPainter}>
              <Brush className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Format Painter</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default ClipboardToolbar;

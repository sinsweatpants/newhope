import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Replace } from 'lucide-react';
import FindReplaceDialog from './FindReplaceDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditingToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

const EditingToolbar: React.FC<EditingToolbarProps> = ({ editorRef }) => {
  const [isFindReplaceOpen, setFindReplaceOpen] = useState(false);

  const handleFind = (term: string) => {
    // Basic find functionality
    if (window.find) {
      window.find(term, false, false, true, false, true, false);
    }
  };

  const handleReplace = (term: string, replacement: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.toString().toLowerCase() === term.toLowerCase()) {
            range.deleteContents();
            range.insertNode(document.createTextNode(replacement));
        }
    }
    handleFind(term);
  };

  const handleReplaceAll = (term: string, replacement: string) => {
    if (editorRef.current) {
        const content = editorRef.current.innerHTML;
        const newContent = content.replace(new RegExp(term, 'gi'), replacement);
        editorRef.current.innerHTML = newContent;
    }
  };


  return (
    <>
      <TooltipProvider>
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setFindReplaceOpen(true)}>
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Find</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setFindReplaceOpen(true)}>
                <Replace className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Replace</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <FindReplaceDialog
        isOpen={isFindReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
        onFind={handleFind}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
      />
    </>
  );
};

export default EditingToolbar;

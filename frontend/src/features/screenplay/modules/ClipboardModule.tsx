import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ClipboardCopy,
  ClipboardPaste,
  Paintbrush,
  Brush,
  Scissors,
} from "lucide-react";
import { getEditorSelection } from "@/features/screenplay/utils/editorCommands";

interface ClipboardModuleProps {
  editorRef: React.RefObject<HTMLDivElement>;
  onPasteText: (text: string) => void;
  onCaptureFormat: () => void;
  onApplyCapturedFormat: () => void;
  hasCapturedFormat: boolean;
}

/**
 * Provides clipboard centric tooling for the screenplay editor including copy,
 * cut, paste and format painter capabilities. The component focuses on
 * producing accessible controls that can be reused elsewhere in the toolbar.
 */
const ClipboardModule = ({
  editorRef,
  onPasteText,
  onCaptureFormat,
  onApplyCapturedFormat,
  hasCapturedFormat,
}: ClipboardModuleProps) => {
  /**
   * Copies the plain text representation of the current selection into the
   * system clipboard.
   */
  const handleCopy = useCallback(async () => {
    const selection = getEditorSelection(editorRef.current);
    if (!selection) return;
    const { range } = selection;
    const fragment = range.cloneContents();
    const temp = document.createElement("div");
    temp.appendChild(fragment);
    const text = temp.innerText;

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("copy failed", error);
    }
  }, [editorRef]);

  /**
   * Cuts the currently selected text by copying it to the clipboard and
   * removing it from the document.
   */
  const handleCut = useCallback(async () => {
    const selection = getEditorSelection(editorRef.current);
    if (!selection) return;
    const { range } = selection;
    const fragment = range.cloneContents();
    const temp = document.createElement("div");
    temp.appendChild(fragment);
    const text = temp.innerText;

    try {
      await navigator.clipboard.writeText(text);
      range.deleteContents();
    } catch (error) {
      console.error("cut failed", error);
    }
  }, [editorRef]);

  /**
   * Reads text from the system clipboard and hands it to the parent editor for
   * structured processing.
   */
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPasteText(text);
      }
    } catch (error) {
      console.error("paste failed", error);
    }
  }, [onPasteText]);

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <ClipboardCopy className="h-4 w-4" />
            <span className="sr-only">نسخ</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>نسخ</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handleCut}>
            <Scissors className="h-4 w-4" />
            <span className="sr-only">قص</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>قص</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handlePaste}>
            <ClipboardPaste className="h-4 w-4" />
            <span className="sr-only">لصق</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>لصق</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCaptureFormat}>
            <Paintbrush className="h-4 w-4" />
            <span className="sr-only">نسخ التنسيق</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>نسخ التنسيق</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasCapturedFormat}
            onClick={onApplyCapturedFormat}
          >
            <Brush className="h-4 w-4" />
            <span className="sr-only">تطبيق التنسيق</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>تطبيق التنسيق</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ClipboardModule;

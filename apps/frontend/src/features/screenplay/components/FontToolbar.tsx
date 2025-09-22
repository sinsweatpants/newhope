import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Palette, Highlighter, Eraser } from "lucide-react";

interface FontToolbarProps {
    handleColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleHighlightChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FontToolbar({ handleColorChange, handleHighlightChange }: FontToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2 border-r pr-2">
        <select defaultValue="Arial" className="p-1 border rounded bg-background">
          <option>Arial</option>
          <option>Verdana</option>
          <option>Times New Roman</option>
          <option>Courier New</option>
        </select>
        <select defaultValue="12" className="p-1 border rounded bg-background">
          <option>10</option>
          <option>12</option>
          <option>14</option>
          <option>18</option>
          <option>24</option>
        </select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('bold')}>
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bold</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('italic')}>
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Italic</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('underline')}>
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Underline</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('strikethrough')}>
              <Strikethrough className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Strikethrough</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('subscript')}>
              <Subscript className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Subscript</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('superscript')}>
              <Superscript className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Superscript</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Palette className="h-4 w-4" />
                    <input type="color" onChange={handleColorChange} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Text Color</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
             <div className="relative">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Highlighter className="h-4 w-4" />
                    <input type="color" onChange={handleHighlightChange} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Highlight Color</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => document.execCommand('removeFormat')}>
              <Eraser className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear Formatting</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Search, Replace } from "lucide-react";

interface EditingToolbarProps {
    setFindReplaceOpen: (open: boolean) => void;
}

export function EditingToolbar({ setFindReplaceOpen }: EditingToolbarProps) {
  return (
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
  );
}

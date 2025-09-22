import { Button } from "@/components/ui/button";
import { StylesDialog } from "./StylesDialog";
import { CustomStyle } from "@shared/screenplay/types";

interface StylesToolbarProps {
    customStyles: CustomStyle[];
    applyStyle: (style: string) => void;
    setStylesDialogOpen: (open: boolean) => void;
    isStylesDialogOpen: boolean;
    onStylesUpdate: (styles: CustomStyle[]) => void;
}

export function StylesToolbar({ customStyles, applyStyle, setStylesDialogOpen, isStylesDialogOpen, onStylesUpdate }: StylesToolbarProps) {
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
}

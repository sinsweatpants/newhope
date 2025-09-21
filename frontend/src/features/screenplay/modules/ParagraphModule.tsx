import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  List,
  ListOrdered,
  ListTree,
  ChevronsRight,
  ChevronsLeft,
  Square,
  Pilcrow,
} from "lucide-react";
import {
  applyBlockStyles,
  execEditorCommand,
} from "@/features/screenplay/utils/editorCommands";

interface ParagraphModuleProps {
  editorRef: React.RefObject<HTMLDivElement>;
  showFormattingMarks: boolean;
  onToggleFormattingMarks: (value: boolean) => void;
}

const LINE_SPACING = [
  { value: "1.15", label: "مفرد" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "مزدوج" },
];

const PARAGRAPH_SPACING = [
  { value: "0pt", label: "بدون" },
  { value: "6pt", label: "6pt" },
  { value: "12pt", label: "12pt" },
];

/**
 * Manages paragraph level controls including alignment, spacing, list support
 * and paragraph level styling such as borders or shading.
 */
const ParagraphModule = ({
  editorRef,
  showFormattingMarks,
  onToggleFormattingMarks,
}: ParagraphModuleProps) => {
  const [borderColor, setBorderColor] = useState("#e5e7eb");
  const [shadingColor, setShadingColor] = useState("transparent");

  /**
   * Applies a block level alignment command.
   */
  const setAlignment = useCallback(
    (align: "right" | "left" | "center" | "justify") => {
      applyBlockStyles(editorRef.current, { textAlign: align });
    },
    [editorRef]
  );

  /**
   * Adjusts the block line height for the active paragraph.
   */
  const setLineSpacing = useCallback(
    (value: string) => {
      applyBlockStyles(editorRef.current, { lineHeight: value });
    },
    [editorRef]
  );

  /**
   * Controls spacing before and after the current paragraph.
   */
  const setParagraphSpacing = useCallback(
    (value: string) => {
      applyBlockStyles(editorRef.current, {
        marginTop: value,
        marginBottom: value,
      });
    },
    [editorRef]
  );

  const handleList = useCallback(
    (type: "ordered" | "unordered") => {
      execEditorCommand(
        editorRef.current,
        type === "ordered" ? "insertOrderedList" : "insertUnorderedList"
      );
    },
    [editorRef]
  );

  const handleIndent = useCallback(
    (direction: "increase" | "decrease") => {
      execEditorCommand(editorRef.current, direction === "increase" ? "indent" : "outdent");
    },
    [editorRef]
  );

  const applyBorder = useCallback(
    (color: string) => {
      setBorderColor(color);
      applyBlockStyles(editorRef.current, {
        border: color === "transparent" ? "none" : `1px solid ${color}`,
      });
    },
    [editorRef]
  );

  const applyShading = useCallback(
    (color: string) => {
      setShadingColor(color);
      applyBlockStyles(editorRef.current, {
        backgroundColor: color,
      });
    },
    [editorRef]
  );

  const handleMultilevelList = useCallback(() => {
    execEditorCommand(editorRef.current, "insertUnorderedList");
    execEditorCommand(editorRef.current, "indent");
  }, [editorRef]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setAlignment("right")}>
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>محاذاة يمين</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setAlignment("center")}>
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>توسيط</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setAlignment("left")}>
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>محاذاة يسار</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => setAlignment("justify")}>
              <AlignJustify className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>ضبط</TooltipContent>
        </Tooltip>
      </div>

      <Select onValueChange={setLineSpacing} defaultValue="1.15">
        <SelectTrigger className="w-[120px] h-9 text-right">
          <SelectValue placeholder="تباعد الأسطر" />
        </SelectTrigger>
        <SelectContent>
          {LINE_SPACING.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={setParagraphSpacing} defaultValue="0pt">
        <SelectTrigger className="w-[120px] h-9 text-right">
          <SelectValue placeholder="تباعد الفقرات" />
        </SelectTrigger>
        <SelectContent>
          {PARAGRAPH_SPACING.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => handleList("unordered")}>
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تعداد نقطي</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => handleList("ordered")}>
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تعداد رقمي</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleMultilevelList}>
              <ListTree className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>قائمة هرمية</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => handleIndent("increase")}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>زيادة المسافة البادئة</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => handleIndent("decrease")}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تقليل المسافة البادئة</TooltipContent>
        </Tooltip>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Square className="h-4 w-4" />
        <input
          type="color"
          value={borderColor}
          onChange={(event) => applyBorder(event.target.value)}
          className="h-9 w-10 cursor-pointer rounded border"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span>تظليل فقرة</span>
        <input
          type="color"
          value={shadingColor}
          onChange={(event) => applyShading(event.target.value)}
          className="h-9 w-10 cursor-pointer rounded border"
        />
      </label>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showFormattingMarks ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onToggleFormattingMarks(!showFormattingMarks)}
          >
            <Pilcrow className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>إظهار/إخفاء علامات التنسيق</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ParagraphModule;

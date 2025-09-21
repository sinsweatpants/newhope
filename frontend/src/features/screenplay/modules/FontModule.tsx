import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter,
  Eraser,
  Sparkles,
} from "lucide-react";
import {
  applyInlineStyles,
  clearFormatting,
  execEditorCommand,
  focusEditor,
} from "@/features/screenplay/utils/editorCommands";

interface FontModuleProps {
  editorRef: React.RefObject<HTMLDivElement>;
  selectedFont: string;
  selectedSize: string;
  onDefaultFontChange: (font: string) => void;
  onDefaultSizeChange: (size: string) => void;
}

const FONT_OPTIONS = [
  "Amiri",
  "Courier Prime",
  "Arial",
  "Times New Roman",
  "Helvetica",
  "Noto Naskh Arabic",
  "Cairo",
  "IBM Plex Sans Arabic",
];

const FONT_SIZES = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt", "32pt"];

const TEXT_EFFECTS: Record<string, { label: string; textShadow?: string; filter?: string }> = {
  none: { label: "بدون" },
  shadow: { label: "ظل خفيف", textShadow: "1px 1px 3px rgba(15,23,42,0.45)" },
  glow: { label: "توهج", textShadow: "0 0 6px rgba(245, 158, 11, 0.85)" },
  outline: { label: "حد", filter: "drop-shadow(0 0 1px rgba(17, 24, 39, 0.8))" },
};

/**
 * Advanced font tooling covering families, sizes, inline formatting and visual
 * effects such as highlight colours or shadows.
 */
const FontModule = ({
  editorRef,
  selectedFont,
  selectedSize,
  onDefaultFontChange,
  onDefaultSizeChange,
}: FontModuleProps) => {
  const [customFont, setCustomFont] = useState("");
  const [textColor, setTextColor] = useState("#1f2937");
  const [highlightColor, setHighlightColor] = useState("#fef08a");
  const [activeEffect, setActiveEffect] = useState("none");

  /**
   * Applies the provided font family to the current selection or saves it as
   * the default when no selection exists.
   */
  const handleFontChange = useCallback(
    (font: string) => {
      onDefaultFontChange(font);
      const applied = applyInlineStyles(editorRef.current, { fontFamily: font });
      if (!applied && editorRef.current) {
        editorRef.current.style.fontFamily = font;
      }
    },
    [editorRef, onDefaultFontChange]
  );

  /**
   * Applies the provided font size to the current selection or falls back to
   * updating the editor defaults.
   */
  const handleSizeChange = useCallback(
    (size: string) => {
      onDefaultSizeChange(size);
      const applied = applyInlineStyles(editorRef.current, { fontSize: size });
      if (!applied && editorRef.current) {
        editorRef.current.style.fontSize = size;
      }
    },
    [editorRef, onDefaultSizeChange]
  );

  /**
   * Applies a text colour using inline styles.
   */
  const applyTextColor = useCallback(
    (color: string) => {
      setTextColor(color);
      applyInlineStyles(editorRef.current, { color });
    },
    [editorRef]
  );

  /**
   * Applies a background highlight colour.
   */
  const applyHighlight = useCallback(
    (color: string) => {
      setHighlightColor(color);
      applyInlineStyles(editorRef.current, { backgroundColor: color });
    },
    [editorRef]
  );

  /**
   * Applies one of the predefined text effects by controlling text shadow or
   * CSS filters.
   */
  const applyEffect = useCallback(
    (effect: string) => {
      setActiveEffect(effect);
      const definition = TEXT_EFFECTS[effect];
      if (!definition) return;
      applyInlineStyles(editorRef.current, {
        textShadow: definition.textShadow ?? "none",
        filter: definition.filter ?? "none",
      });
    },
    [editorRef]
  );

  const handleCustomFontApply = useCallback(() => {
    if (!customFont.trim()) return;
    handleFontChange(customFont.trim());
    setCustomFont("");
  }, [customFont, handleFontChange]);

  const toggleInlineCommand = useCallback(
    (command: string) => {
      focusEditor(editorRef.current);
      execEditorCommand(editorRef.current, command);
    },
    [editorRef]
  );

  const handleClearFormatting = useCallback(() => {
    clearFormatting(editorRef.current);
  }, [editorRef]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedFont} onValueChange={handleFontChange}>
        <SelectTrigger className="w-[160px] h-9 text-right">
          <SelectValue placeholder="الخط" />
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((font) => (
            <SelectItem key={font} value={font}>
              {font}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          value={customFont}
          onChange={(event) => setCustomFont(event.target.value)}
          placeholder="خط مخصص"
          className="h-9 w-32 text-right"
        />
        <Button variant="outline" size="sm" onClick={handleCustomFontApply}>
          إضافة
        </Button>
      </div>

      <Select value={selectedSize} onValueChange={handleSizeChange}>
        <SelectTrigger className="w-[100px] h-9 text-right">
          <SelectValue placeholder="الحجم" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => toggleInlineCommand("bold")}>
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>عريض</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => toggleInlineCommand("italic")}>
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>مائل</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => toggleInlineCommand("underline")}>
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>تحته خط</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => toggleInlineCommand("strikeThrough")}>
              <Strikethrough className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>يتوسطه خط</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => toggleInlineCommand("subscript")}>
              <Subscript className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>منخفض</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => toggleInlineCommand("superscript")}>
              <Superscript className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>مرتفع</TooltipContent>
        </Tooltip>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span>لون النص</span>
        <input
          type="color"
          value={textColor}
          onChange={(event) => applyTextColor(event.target.value)}
          className="h-9 w-10 cursor-pointer rounded border"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span>تظليل</span>
        <input
          type="color"
          value={highlightColor}
          onChange={(event) => applyHighlight(event.target.value)}
          className="h-9 w-10 cursor-pointer rounded border"
        />
      </label>

      <Select value={activeEffect} onValueChange={applyEffect}>
        <SelectTrigger className="w-[140px] h-9 text-right">
          <SelectValue placeholder="تأثير بصري" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TEXT_EFFECTS).map(([key, value]) => (
            <SelectItem key={key} value={key}>
              {value.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={() => applyHighlight("transparent")}>
            <Highlighter className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>إزالة التظليل</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handleClearFormatting}>
            <Eraser className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>إزالة التنسيق</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={() => applyEffect("glow")}>
            <Sparkles className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>توهج سريع</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default FontModule;

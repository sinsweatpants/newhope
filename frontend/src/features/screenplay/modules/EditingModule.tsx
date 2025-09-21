import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  captureFormatting,
  clearFormattingHighlights,
  findNext,
  highlightSimilarFormatting,
  replaceRangeWithText,
  selectCurrentBlock,
  execEditorCommand,
} from "@/features/screenplay/utils/editorCommands";
import { Search, Replace, MousePointerClick, CheckSquare, ScanText } from "lucide-react";

interface EditingModuleProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

interface FindState {
  index: number;
  range: Range | null;
}

/**
 * Supplies find, replace and advanced selection tools for the editor. The
 * module keeps track of search state and highlights matching formatting on
 * demand.
 */
const EditingModule = ({ editorRef }: EditingModuleProps) => {
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [findState, setFindState] = useState<FindState>({ index: 0, range: null });
  const [highlighted, setHighlighted] = useState<HTMLElement[]>([]);

  useEffect(() => {
    setFindState({ index: 0, range: null });
  }, [searchTerm, matchCase]);

  /**
   * Executes a forward search inside the editor content.
   */
  const handleFindNext = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !searchTerm) return;
    const result = findNext(editor, searchTerm, findState.index, matchCase);
    if (result) {
      setFindState({ index: result.endIndex, range: result.range });
    } else {
      // restart search from top if nothing found
      const restart = findNext(editor, searchTerm, 0, matchCase);
      if (restart) {
        setFindState({ index: restart.endIndex, range: restart.range });
      }
    }
  }, [editorRef, findState.index, matchCase, searchTerm]);

  /**
   * Replaces the current selection (result of last find) with the replacement
   * string.
   */
  const handleReplaceCurrent = useCallback(() => {
    if (!findState.range || !replaceTerm) return;
    replaceRangeWithText(findState.range, replaceTerm);
    setFindState((state) => ({ index: state.index, range: null }));
  }, [findState.range, replaceTerm]);

  /**
   * Replaces all occurrences of the search term throughout the editor.
   */
  const handleReplaceAll = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !searchTerm || !replaceTerm) return;
    let offset = 0;
    let result = findNext(editor, searchTerm, offset, matchCase);
    while (result) {
      replaceRangeWithText(result.range, replaceTerm);
      offset = result.startIndex + replaceTerm.length;
      result = findNext(editor, searchTerm, offset, matchCase);
    }
    setFindState({ index: 0, range: null });
  }, [editorRef, matchCase, replaceTerm, searchTerm]);

  const handleSelectAll = useCallback(() => {
    execEditorCommand(editorRef.current, "selectAll");
  }, [editorRef]);

  const handleSelectParagraph = useCallback(() => {
    selectCurrentBlock(editorRef.current);
  }, [editorRef]);

  const handleSelectSimilar = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    clearFormattingHighlights(highlighted);
    const captured = captureFormatting(editor);
    const matches = highlightSimilarFormatting(editor, captured);
    setHighlighted(matches);
  }, [editorRef, highlighted]);

  const clearHighlights = useCallback(() => {
    clearFormattingHighlights(highlighted);
    setHighlighted([]);
  }, [highlighted]);

  return (
    <div className="flex items-center gap-2">
      <Dialog open={findDialogOpen} onOpenChange={setFindDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
            بحث
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>البحث داخل النص</DialogTitle>
            <DialogDescription>
              ابحث عن كلمة أو عبارة داخل المستند مع إمكانية مطابقة حالة الأحرف.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="searchTerm">الكلمة المراد البحث عنها</Label>
            <Input
              id="searchTerm"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="نص البحث"
              className="text-right"
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={matchCase} onCheckedChange={(value) => setMatchCase(Boolean(value))} />
              <span>مطابقة حالة الأحرف</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFindState({ index: 0, range: null })}>
                إعادة تعيين
              </Button>
              <Button onClick={handleFindNext}>بحث عن التالي</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Replace className="h-4 w-4" />
            استبدال
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استبدال متقدم</DialogTitle>
            <DialogDescription>
              استبدل ظهورًا واحدًا أو كل التكرارات للكلمة المحددة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="replace-search">نص البحث</Label>
              <Input
                id="replace-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="الكلمة الحالية"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-term">النص البديل</Label>
              <Input
                id="replace-term"
                value={replaceTerm}
                onChange={(event) => setReplaceTerm(event.target.value)}
                placeholder="النص الجديد"
                className="text-right"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleReplaceCurrent}>
                استبدال الحالي
              </Button>
              <Button onClick={handleReplaceAll}>استبدال الكل</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MousePointerClick className="h-4 w-4" />
            تحديد
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 text-right">
          <DropdownMenuItem onClick={handleSelectAll}>
            <CheckSquare className="ml-2 h-4 w-4" /> تحديد الكل
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSelectParagraph}>
            <ScanText className="ml-2 h-4 w-4" /> تحديد الفقرة الحالية
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSelectSimilar}>
            <Search className="ml-2 h-4 w-4" /> تحديد تنسيق مشابه
          </DropdownMenuItem>
          <DropdownMenuItem onClick={clearHighlights}>
            مسح التحديدات المتطابقة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default EditingModule;

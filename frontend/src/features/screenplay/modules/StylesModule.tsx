import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  applyCapturedFormatting,
  captureFormatting,
  type CapturedFormatting,
} from "@/features/screenplay/utils/editorCommands";
import { Paintbrush } from "lucide-react";

interface StylesModuleProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

interface StyleDefinition {
  id: string;
  name: string;
  formatting: CapturedFormatting;
}

const BUILTIN_STYLES: StyleDefinition[] = [
  {
    id: "normal",
    name: "نص عادي",
    formatting: {
      inline: {
        fontSize: "12pt",
        fontWeight: "400",
        color: "#111827",
      },
      block: {
        textAlign: "right",
        lineHeight: "1.5",
        marginBottom: "6pt",
      },
    },
  },
  {
    id: "title",
    name: "عنوان رئيسي",
    formatting: {
      inline: {
        fontSize: "26pt",
        fontWeight: "700",
      },
      block: {
        textAlign: "center",
        marginBottom: "12pt",
      },
    },
  },
  {
    id: "subtitle",
    name: "عنوان فرعي",
    formatting: {
      inline: {
        fontSize: "18pt",
        fontWeight: "600",
        color: "#1e3a8a",
      },
      block: {
        textAlign: "center",
        marginBottom: "8pt",
      },
    },
  },
  {
    id: "heading1",
    name: "Heading 1",
    formatting: {
      inline: {
        fontSize: "16pt",
        fontWeight: "700",
      },
      block: {
        textAlign: "right",
        marginTop: "12pt",
        marginBottom: "6pt",
      },
    },
  },
  {
    id: "heading2",
    name: "Heading 2",
    formatting: {
      inline: {
        fontSize: "14pt",
        fontWeight: "600",
      },
      block: {
        textAlign: "right",
        marginTop: "10pt",
        marginBottom: "4pt",
      },
    },
  },
  {
    id: "emphasis",
    name: "تشديد",
    formatting: {
      inline: {
        fontStyle: "italic",
        color: "#b91c1c",
      },
      block: {
        textAlign: "right",
      },
    },
  },
];

/**
 * Presents reusable document styles with the ability to capture custom
 * formatting from the current selection for later re-application.
 */
const StylesModule = ({ editorRef }: StylesModuleProps) => {
  const [customStyles, setCustomStyles] = useState<StyleDefinition[]>([]);
  const [newStyleName, setNewStyleName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const allStyles = useMemo(
    () => [...BUILTIN_STYLES, ...customStyles],
    [customStyles]
  );

  const applyStyle = useCallback(
    (style: StyleDefinition) => {
      applyCapturedFormatting(editorRef.current, style.formatting);
    },
    [editorRef]
  );

  const handleCreateStyle = useCallback(() => {
    if (!newStyleName.trim()) return;
    const captured = captureFormatting(editorRef.current);
    if (!captured) return;

    const style: StyleDefinition = {
      id: `custom-${Date.now()}`,
      name: newStyleName.trim(),
      formatting: captured,
    };
    setCustomStyles((previous) => [...previous, style]);
    setDialogOpen(false);
    setNewStyleName("");
  }, [editorRef, newStyleName]);

  return (
    <div className="flex items-center gap-2">
      {allStyles.map((style) => (
        <Button key={style.id} variant="outline" size="sm" onClick={() => applyStyle(style)}>
          {style.name}
        </Button>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Paintbrush className="h-4 w-4" />
            إنشاء نمط
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ نمط مخصص</DialogTitle>
            <DialogDescription>
              اختر اسمًا مميزًا للنمط وسيتم حفظ إعداداته الحالية لاستخدامها لاحقًا.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newStyleName}
            onChange={(event) => setNewStyleName(event.target.value)}
            placeholder="اسم النمط"
            className="text-right"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateStyle}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StylesModule;

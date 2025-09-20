import { useState, useRef, useCallback } from "react";
import { ScreenplayCoordinator } from "@/lib/screenplay/ScreenplayCoordinator";
import { getFormatStyles } from "@/lib/screenplay/formatStyles";
import { AgentContext } from "@/lib/screenplay/types";

interface ProcessedLine {
  html: string;
  elementType: string;
}

export default function ScreenplayProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedLines, setProcessedLines] = useState<ProcessedLine[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const coordinatorRef = useRef<ScreenplayCoordinator>(new ScreenplayCoordinator(getFormatStyles));

  const processContent = useCallback(async (rawText: string) => {
    if (!rawText || rawText.trim() === "") {
      return;
    }

    setIsProcessing(true);
    
    try {
      const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== "");
      const context: AgentContext = {};
      const newProcessedLines: ProcessedLine[] = [];
      
      for (const line of lines) {
        const res = coordinatorRef.current.processLine(line, context);
        newProcessedLines.push({
          html: res.html,
          elementType: res.elementType
        });
      }
      
      setProcessedLines(newProcessedLines);
    } catch (error) {
      console.error("Error processing content:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getElementStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case "scene-header-1":
      case "scene-header-2":
        return {
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          textTransform: "uppercase" as const,
          marginBottom: "1em"
        };

      case "scene-header-3":
        return {
          textAlign: "center",
          fontWeight: "bold",
          marginBottom: "0.5em"
        };

      case "action":
        return {
          textAlign: "right",
          margin: "0.5em 0",
          direction: "rtl" as const
        };

      case "character":
        return {
          textAlign: "center",
          fontWeight: "bold",
          margin: "1em 0 0.2em 0",
          textTransform: "uppercase" as const
        };

      case "dialogue":
        return {
          textAlign: "center",
          margin: "0 2em",
          lineHeight: "1.4"
        };

      case "parenthetical":
        return {
          textAlign: "center",
          margin: "0 3em",
          fontStyle: "italic"
        };

      case "transition":
        return {
          textAlign: "center",
          fontWeight: "bold",
          textTransform: "uppercase" as const,
          margin: "1em auto"
        };

      case "director-note":
        return {
          fontStyle: "italic",
          fontSize: "0.9em",
          color: "#555",
          margin: "0.5em 0",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "3px",
          padding: "2px 4px"
        };

      default:
        return {};
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rawText = e.clipboardData?.getData("text/plain");
    if (rawText) {
      await processContent(rawText);
    }
  }, [processContent]);

  const handleClick = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        await processContent(text);
      }
    } catch (error) {
      console.error("Error accessing clipboard:", error);
    }
  }, [processContent]);

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div
        ref={pageRef}
        className="script-page cursor-pointer transition-all duration-200 hover:shadow-lg"
        onClick={handleClick}
        onPaste={handlePaste}
        tabIndex={0}
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "20px auto",
          paddingTop: "1in",
          paddingBottom: "1in", 
          paddingLeft: "1in",
          paddingRight: "1.5in",
          boxSizing: "border-box",
          background: "#fff",
          boxShadow: "0 0 10px rgba(0,0,0,0.15)",
          overflow: "visible",
          position: "relative",
          fontFamily: "'Courier New', monospace",
          fontSize: "12pt",
          lineHeight: "1.5",
          outline: "none"
        }}
        data-testid="a4-page"
      >
        {isProcessing && (
          <div className="text-center text-gray-500 mt-20">
            جاري المعالجة...
          </div>
        )}
        {!isProcessing && processedLines.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="mb-4">انقر هنا أو الصق نص السيناريو</p>
            <p className="text-sm">سيتم التنسيق تلقائياً وفقاً للمعايير المهنية</p>
          </div>
        )}
        {!isProcessing && processedLines.map((line, index) => (
          <div
            key={index}
            className={line.elementType}
            style={getElementStyle(line.elementType)}
            dangerouslySetInnerHTML={{ __html: line.html }}
          />
        ))}
      </div>
    </div>
  );
}

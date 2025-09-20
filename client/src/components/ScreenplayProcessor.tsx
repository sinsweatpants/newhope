import { useState, useRef, useCallback } from "react";
import { ScreenplayCoordinator } from "@/lib/screenplay/ScreenplayCoordinator";
import { getFormatStyles } from "@/lib/screenplay/formatStyles";
import { AgentContext } from "@/lib/screenplay/types";

export default function ScreenplayProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const coordinatorRef = useRef<ScreenplayCoordinator>(new ScreenplayCoordinator(getFormatStyles));

  const processContent = useCallback(async (rawText: string) => {
    if (!rawText || rawText.trim() === "" || !pageRef.current) {
      return;
    }

    setIsProcessing(true);
    
    try {
      // Clear existing content
      pageRef.current.innerHTML = "";
      
      const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== "");
      const context: AgentContext = {};
      
      let currentPage = pageRef.current;
      
      for (const line of lines) {
        const res = coordinatorRef.current.processLine(line, context);
        
        const block = document.createElement("div");
        block.innerHTML = res.html;
        block.className = res.elementType;
        
        // Apply inline styles from the existing formatting rules
        applyFormattingRules(block, res.elementType);
        currentPage.appendChild(block);
      }
      
      setHasContent(true);
    } catch (error) {
      console.error("Error processing content:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const applyFormattingRules = (block: HTMLElement, type: string): void => {
    switch (type) {
      case "scene-header-1":
      case "scene-header-2":
        Object.assign(block.style, {
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          textTransform: "uppercase",
          marginBottom: "1em"
        });
        break;

      case "scene-header-3":
        Object.assign(block.style, {
          textAlign: "center",
          fontWeight: "bold",
          marginBottom: "0.5em"
        });
        break;

      case "action":
        Object.assign(block.style, {
          textAlign: "right",
          margin: "0.5em 0",
          direction: "rtl"
        });
        break;

      case "character":
        Object.assign(block.style, {
          textAlign: "center",
          fontWeight: "bold",
          margin: "1em 0 0.2em 0",
          textTransform: "uppercase"
        });
        break;

      case "dialogue":
        Object.assign(block.style, {
          textAlign: "center",
          margin: "0 2em",
          lineHeight: "1.4"
        });
        break;

      case "parenthetical":
        Object.assign(block.style, {
          textAlign: "center",
          margin: "0 3em",
          fontStyle: "italic"
        });
        break;

      case "transition":
        Object.assign(block.style, {
          textAlign: "center",
          fontWeight: "bold",
          textTransform: "uppercase",
          margin: "1em auto"
        });
        break;

      case "director-note":
        Object.assign(block.style, {
          fontStyle: "italic",
          fontSize: "0.9em",
          color: "#555",
          margin: "0.5em 0",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "3px",
          padding: "2px 4px"
        });
        break;
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
        {!isProcessing && !hasContent && (
          <div className="text-center text-gray-400 mt-20">
            <p className="mb-4">انقر هنا أو الصق نص السيناريو</p>
            <p className="text-sm">سيتم التنسيق تلقائياً وفقاً للمعايير المهنية</p>
          </div>
        )}
      </div>
    </div>
  );
}

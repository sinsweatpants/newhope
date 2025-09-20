import { useState, useRef, useCallback } from "react";
import { ScreenplayCoordinator } from "@shared/ScreenplayCoordinator";
import { getFormatStyles } from "@shared/formatStyles";
import { AgentContext } from "@shared/types";

export default function ScreenplayProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const coordinatorRef = useRef<ScreenplayCoordinator>(new ScreenplayCoordinator(getFormatStyles));

  const createPage = (): HTMLDivElement => {
    const page = document.createElement("div");
    page.className = "script-page";
    Object.assign(page.style, {
      width: "210mm", // A4
      minHeight: "297mm",
      margin: "20px auto",
      padding: "1in 1in 1in 1.5in", // top=1in, right=1in, bottom=1in, left=1.5in
      boxSizing: "border-box",
      background: "#fff",
      boxShadow: "0 0 10px rgba(0,0,0,0.15)",
      fontFamily: "'Courier New', monospace",
      fontSize: "12pt",
      lineHeight: "1.5"
    });
    return page;
  };


  const processContent = useCallback(async (rawText: string) => {
    if (!rawText || rawText.trim() === "") {
      return;
    }

    setIsProcessing(true);
    
    try {
      // Clear existing pages
      const existingPages = document.querySelectorAll('.script-page');
      existingPages.forEach(page => page.remove());

      const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== "");
      const context: AgentContext = {};

      let currentPage = createPage();
      let pageContentHeight = 0;

      // Add page temporarily to measure height
      document.body.appendChild(currentPage);
      const pageUsableHeight = currentPage.clientHeight - 192; // 2 * 96px (2 inches)

      for (const line of lines) {
        const res = coordinatorRef.current.processLine(line, context);

        const block = document.createElement("div");
        block.innerHTML = res.html;

        currentPage.appendChild(block);
        
        // Add to DOM temporarily to measure height
        document.body.appendChild(block);
        pageContentHeight += block.offsetHeight;
        document.body.removeChild(block);
        currentPage.appendChild(block);

        // If page is full, create new page
        if (pageContentHeight >= pageUsableHeight) {
          currentPage = createPage();
          document.body.appendChild(currentPage);
          pageContentHeight = 0;
        }
      }

      // Ensure final page is added
      if (!document.body.contains(currentPage)) {
        document.body.appendChild(currentPage);
      }

    } catch (error) {
      console.error("Error processing content:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault();
    const rawText = e.clipboardData?.getData("text/plain");
    if (!rawText) return;

    setIsProcessing(true);

    try {
      // Clear existing pages
      const existingPages = document.querySelectorAll('.script-page');
      existingPages.forEach(page => page.remove());

      const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== "");
      const context: AgentContext = {};

      let currentPage = createPage();
      let pageContentHeight = 0;

      // Add page temporarily to measure height
      document.body.appendChild(currentPage);
      const pageUsableHeight = currentPage.clientHeight - 192; // 2 * 96px (2 inches)

      for (const line of lines) {
        const res = coordinatorRef.current.processLine(line, context);

        const block = document.createElement("div");
        block.innerHTML = res.html;

        currentPage.appendChild(block);
        
        // Add to DOM temporarily to measure height
        document.body.appendChild(block);
        pageContentHeight += block.offsetHeight;
        document.body.removeChild(block);
        currentPage.appendChild(block);

        // If page is full, create new page
        if (pageContentHeight >= pageUsableHeight) {
          currentPage = createPage();
          document.body.appendChild(currentPage);
          pageContentHeight = 0;
        }
      }

      // Ensure final page is added
      if (!document.body.contains(currentPage)) {
        document.body.appendChild(currentPage);
      }
    } catch (error) {
      console.error("Error processing paste:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDivPaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    await handlePaste(e.nativeEvent as ClipboardEvent);
  }, [handlePaste]);

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
        onPaste={handleDivPaste}
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
        {!isProcessing && (
          <div className="text-center text-gray-400 mt-20">
            <p className="mb-4">انقر هنا أو الصق نص السيناريو</p>
            <p className="text-sm">سيتم التنسيق تلقائياً وفقاً للمعايير المهنية</p>
          </div>
        )}
      </div>
    </div>
  );
}

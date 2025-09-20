import { ScreenplayCoordinator } from "./ScreenplayCoordinator";
import { getFormatStyles } from "./formatStyles";
import { AgentContext } from "./types";

export class ScreenplayPasteProcessor {
  private coordinator: ScreenplayCoordinator;

  constructor() {
    this.coordinator = new ScreenplayCoordinator(getFormatStyles);
  }

  async processPaste(e: ClipboardEvent): Promise<void> {
    e.preventDefault();
    
    const rawText = e.clipboardData?.getData("text/plain");
    if (!rawText || rawText.trim() === "") {
      return;
    }

    const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== "");
    const context: AgentContext = {};
    
    let currentPage = this.createPage();
    let pageContentHeight = 0;
    
    // إضافة مؤقتة للـ DOM لحساب الارتفاع
    document.body.appendChild(currentPage);
    
    // 96px ≈ 1in (علوي + سفلي)
    const pageUsableHeight = currentPage.clientHeight - (96 * 2);
    
    // إزالة مؤقتة
    document.body.removeChild(currentPage);

    for (const line of lines) {
      const res = this.coordinator.processLine(line, context);
      
      const block = document.createElement("div");
      block.innerHTML = res.html;
      
      this.applyFormattingRules(block, res.elementType);
      currentPage.appendChild(block);
      
      pageContentHeight += block.offsetHeight;
      
      if (pageContentHeight >= pageUsableHeight) {
        document.body.appendChild(currentPage);
        currentPage = this.createPage();
        pageContentHeight = 0;
      }
    }

    document.body.appendChild(currentPage);
  }

  private createPage(): HTMLDivElement {
    const page = document.createElement("div");
    page.className = "script-page";
    
    Object.assign(page.style, {
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
      overflow: "hidden",
      position: "relative"
    });

    return page;
  }

  private applyFormattingRules(block: HTMLElement, type: string): void {
    switch (type) {
      case "scene-header-1":
      case "scene-header-2":
        Object.assign(block.style, {
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          textTransform: "uppercase"
        });
        break;

      case "scene-header-3":
        Object.assign(block.style, {
          textAlign: "center",
          fontWeight: "bold"
        });
        break;

      case "action":
        Object.assign(block.style, {
          textAlign: "right",
          margin: "0.5em 1in 0.5em 1.5in"
        });
        break;

      case "character":
        Object.assign(block.style, {
          textAlign: "center",
          fontWeight: "bold",
          margin: "1em 1.5in 0.2em 1.5in"
        });
        break;

      case "dialogue":
      case "parenthetical":
        Object.assign(block.style, {
          textAlign: "center",
          margin: "0 1.5in",
          maxWidth: "calc(210mm - 3in)"
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
          margin: "0.5em 1in",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "3px",
          padding: "2px 4px"
        });
        break;
    }
  }
}

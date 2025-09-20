import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScreenplayPasteProcessor } from "@/lib/screenplay/ScreenplayPasteProcessor";
import { Download, Settings, Film, Check, Ruler, Clipboard } from "lucide-react";

export default function ScreenplayProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedContent, setProcessedContent] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processorRef = useRef<ScreenplayPasteProcessor>(new ScreenplayPasteProcessor());

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    setIsProcessing(true);
    setErrorMessage("");
    try {
      // Clear existing processed content
      const existingPages = document.querySelectorAll('.script-page');
      existingPages.forEach(page => page.remove());

      // Process the pasted content
      await processorRef.current.processPaste(e.nativeEvent as ClipboardEvent);
      setProcessedContent("Content processed successfully");
    } catch (error) {
      console.error("Error processing paste:", error);
      setErrorMessage(`Error processing paste: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleProcessClipboard = useCallback(async () => {
    setIsProcessing(true);
    setErrorMessage("");
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Create a mock clipboard event
        const mockEvent = {
          preventDefault: () => {},
          clipboardData: {
            getData: (format: string) => format === "text/plain" ? text : ""
          }
        } as unknown as ClipboardEvent;

        // Clear existing processed content
        const existingPages = document.querySelectorAll('.script-page');
        existingPages.forEach(page => page.remove());

        await processorRef.current.processPaste(mockEvent);
        setProcessedContent("Clipboard content processed successfully");
      } else {
        setErrorMessage("No text found in clipboard");
      }
    } catch (error) {
      console.error("Error accessing clipboard:", error);
      setErrorMessage(`Error accessing clipboard: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-muted font-sans">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Film className="w-8 h-8 text-foreground" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Screenplay Paste Processor</h1>
                <p className="text-sm text-muted-foreground">Professional screenplay formatting tool</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button className="flex items-center space-x-2" data-testid="button-export-pdf">
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2" data-testid="button-settings">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Instructions Panel */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">How to Use</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">1</div>
                <div>
                  <h3 className="font-medium text-card-foreground">Paste Your Script</h3>
                  <p className="text-sm text-muted-foreground mt-1">Copy and paste your screenplay text into the processing area</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">2</div>
                <div>
                  <h3 className="font-medium text-card-foreground">Automatic Processing</h3>
                  <p className="text-sm text-muted-foreground mt-1">Text is automatically classified and formatted according to industry standards</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">3</div>
                <div>
                  <h3 className="font-medium text-card-foreground">Professional Output</h3>
                  <p className="text-sm text-muted-foreground mt-1">Get perfectly formatted A4 pages ready for production</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Area */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Script Processing Area</h2>
            <div className="border-2 border-dashed border-muted rounded-lg p-8">
              <div className="text-center mb-4">
                <Clipboard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Paste your screenplay text here</p>
                <p className="text-sm text-muted-foreground mb-4">The processor will automatically detect and format scene headers, action lines, character names, dialogue, and transitions</p>
              </div>
              
              <Textarea
                ref={textareaRef}
                placeholder="Paste your screenplay content here or use the button below to process clipboard content..."
                className="min-h-32 font-mono"
                onPaste={handlePaste}
                disabled={isProcessing}
                data-testid="textarea-script-input"
              />
              
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={handleProcessClipboard}
                  disabled={isProcessing}
                  className="px-6 py-2"
                  data-testid="button-process-clipboard"
                >
                  {isProcessing ? "Processing..." : "Process Clipboard Content"}
                </Button>
              </div>

              {processedContent && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm" data-testid="text-process-status">{processedContent}</p>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm" data-testid="text-error-message">{errorMessage}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Panel */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Automatic Formatting</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Scene headers with proper capitalization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Character names centered and bold</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Dialogue with proper margins</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Action lines with right alignment</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Transitions and director notes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Professional Standards</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  <span>A4 page format (210mm × 297mm)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  <span>Industry-standard margins</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  <span>Courier New 12pt font</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  <span>Automatic page breaking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-blue-500" />
                  <span>Print-ready output</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Technical Specifications */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Technical Specifications</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-card-foreground mb-2">Page Dimensions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Width: 210mm (A4 standard)</li>
                  <li>Height: 297mm minimum</li>
                  <li>Margins: 1in top/bottom</li>
                  <li>Left: 1in, Right: 1.5in</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-card-foreground mb-2">Typography</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Font: Courier New</li>
                  <li>Size: 12pt</li>
                  <li>Line height: 1.5</li>
                  <li>Character spacing: Monospace</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-card-foreground mb-2">Processing</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Clipboard event handling</li>
                  <li>Line-by-line classification</li>
                  <li>Dynamic DOM generation</li>
                  <li>Automatic page breaks</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">© 2024 Screenplay Paste Processor. Professional formatting tool for screenwriters.</p>
            <p className="text-xs mt-2">Supports industry-standard screenplay formats with automatic A4 page generation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

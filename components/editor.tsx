"use client";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import { useTheme } from "next-themes";
import { useEdgeStore } from "@/lib/edgestore";
import { useEffect, useRef, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import dynamic from "next/dynamic";
import { CodeBlockEnhancer } from "./code-block-enhancer";

// Lazy load PDF components to avoid webpack bundling issues with pdfjs-dist
const PDFBlock = dynamic(() => import("./pdf-block"), {
  ssr: false,
  loading: () => (
    <div className="p-4 border rounded-lg bg-muted">
      <p className="text-sm">Đang tải PDF...</p>
    </div>
  ),
});

// Helper function to check if URL is PDF
const isPDFUrl = (url: string): boolean => {
  return url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?');
};

interface EditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  editable?: boolean;
}

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const editorRef = useRef<HTMLDivElement>(null);

  const handleUpload = async (file: File) => {
    // Support both images and PDFs
    const response = await edgestore.publicFiles.upload({ file });
    return response.url;
  };

  const editor: BlockNoteEditor = useBlockNote({
    editable,
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
      
      // Render math equations after content change
      setTimeout(() => {
        renderMathEquations();
      }, 100);
    },
    uploadFile: handleUpload,
  });

  // Function to render math equations in code blocks with language "math"
  const renderMathEquations = useCallback(() => {
    if (!editorRef.current) return;

    // Find all code blocks with language "math"
    const codeBlocks = editorRef.current.querySelectorAll(
      'code[data-language="math"], code[class*="language-math"]'
    );

    codeBlocks.forEach((codeBlock) => {
      const text = codeBlock.textContent || "";
      
      // Check if it's a math equation (starts with $ or contains LaTeX)
      if (text.match(/^\$.*\$$/) || text.match(/\\[a-zA-Z]+/)) {
        // Extract math content (remove $ delimiters if present)
        const mathContent = text.replace(/^\$\$?|\$\$?$/g, "").trim();
        
        if (mathContent) {
          try {
            // Create a new element for KaTeX rendering
            const mathElement = document.createElement("span");
            mathElement.className = "katex-math-block";
            
            // Render with KaTeX
            katex.render(mathContent, mathElement, {
              displayMode: text.startsWith("$$"),
              throwOnError: false,
              errorColor: "#cc0000",
            });
            
            // Replace code block with math element
            codeBlock.parentElement?.replaceChild(mathElement, codeBlock);
          } catch (error) {
            console.error("KaTeX rendering error:", error);
          }
        }
      }
    });

    // Also handle inline math in text (e.g., $x^2$)
    const textNodes = editorRef.current.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
    textNodes.forEach((node) => {
      const html = node.innerHTML;
      // Replace inline math: $...$
      const inlineMathRegex = /\$([^$]+)\$/g;
      if (inlineMathRegex.test(html)) {
        const newHtml = html.replace(inlineMathRegex, (match, mathContent) => {
          try {
            const mathElement = document.createElement("span");
            katex.render(mathContent.trim(), mathElement, {
              displayMode: false,
              throwOnError: false,
            });
            return mathElement.outerHTML;
          } catch {
            return match;
          }
        });
        node.innerHTML = newHtml;
      }
    });
  }, []);

  // Function to render PDF viewers for PDF URLs in image blocks
  const renderPDFViewers = useCallback(() => {
    if (!editorRef.current || editable) return; // Only render PDFs in read-only mode

    // Find all image elements
    const images = editorRef.current.querySelectorAll("img");
    
    images.forEach((img) => {
      const src = img.getAttribute("src");
      if (src && isPDFUrl(src)) {
        // Create a container for PDF viewer
        const container = document.createElement("div");
        container.className = "pdf-viewer-container";
        
        // Replace image with PDF viewer (using React portal would be better, but this works)
        img.parentElement?.replaceChild(container, img);
        
        // Note: In a real implementation, we'd use React Portal to render PDFViewer
        // For now, we'll just show a link to the PDF
        container.innerHTML = `
          <div class="p-4 border rounded-lg bg-muted">
            <p class="mb-2 text-sm">PDF Document</p>
            <a href="${src}" target="_blank" class="text-blue-500 hover:underline">
              Open PDF in new tab
            </a>
          </div>
        `;
      }
    });
  }, [editable]);

  // Render math and PDFs on mount and when theme changes
  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        renderMathEquations();
        renderPDFViewers();
      }, 500);
    }
  }, [resolvedTheme, initialContent, editable, renderMathEquations, renderPDFViewers]);

  return (
    <CodeBlockEnhancer>
      <div ref={editorRef}>
        <BlockNoteView
          editor={editor}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
        />
      </div>
    </CodeBlockEnhancer>
  );
};

export default Editor;

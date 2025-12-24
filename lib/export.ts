/**
 * Export Functions for Documents
 * Export documents to PDF, Markdown, and Plain Text
 */

import TurndownService from "turndown";

/**
 * Export document to PDF using browser's native print
 * This approach handles page breaks perfectly
 * @param element - HTML element containing the document content
 * @param filename - Name of the PDF file (without .pdf extension)
 */
export const exportToPDF = async (
  element: HTMLElement,
  filename: string = "document"
): Promise<void> => {
  try {
    // Clone the element
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Hide elements that shouldn't be in PDF
    const elementsToHide = [
      'button',
      '[role="button"]',
      '.no-print',
      '[data-no-print]',
      '.bn-side-menu',
      '.bn-drag-handle',
      '.bn-formatting-toolbar',
      '.bn-slash-menu',
      '.bn-suggestion-menu',
      '[data-test-id]',
      'img[src=""]',
      'img:not([src])',
    ];

    elementsToHide.forEach(selector => {
      try {
        const elements = clonedElement.querySelectorAll(selector);
        elements.forEach(el => {
          (el as HTMLElement).remove(); // Remove instead of hide
        });
      } catch (e) {
        // Ignore selector errors
      }
    });

    // Remove placeholders
    const placeholders = clonedElement.querySelectorAll('[data-placeholder], .placeholder');
    placeholders.forEach(el => {
      (el as HTMLElement).remove();
    });

    // Create a temporary container for print
    const printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    printContainer.appendChild(clonedElement);

    // Add print-specific styles
    const printStyles = document.createElement('style');
    printStyles.id = 'print-styles';
    printStyles.textContent = `
      @media print {
        /* Hide everything except print container */
        body > *:not(#print-container) {
          display: none !important;
        }
        
        /* Show only print container */
        #print-container {
          display: block !important;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          margin: 0;
          padding: 20mm;
          background: white;
          color: black;
        }
        
        /* Page setup */
        @page {
          size: A4;
          margin: 10mm;
        }
        
        /* Prevent page breaks inside small elements only */
        p, li, blockquote, pre {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Headings: avoid break after (keep with next content) but allow break before */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* List handling - avoid breaking lists but allow breaking between items if needed */
        ul, ol {
          page-break-before: auto;
          page-break-after: auto;
        }
        
        li {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Orphans and widows */
        p, li {
          orphans: 2;
          widows: 2;
        }
        
        /* Font sizes */
        body, #print-container {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
        }
        
        h1 { font-size: 24pt; margin: 12pt 0 6pt 0; }
        h2 { font-size: 20pt; margin: 12pt 0 6pt 0; }
        h3 { font-size: 16pt; margin: 12pt 0 6pt 0; }
        h4 { font-size: 14pt; margin: 12pt 0 6pt 0; }
        h5 { font-size: 12pt; margin: 12pt 0 6pt 0; }
        h6 { font-size: 11pt; margin: 12pt 0 6pt 0; }
        
        p { margin: 6pt 0; }
        
        ul, ol { margin: 8pt 0; }
        li { margin: 4pt 0; }
        
        blockquote, pre {
          page-break-inside: avoid !important;
          margin: 8pt 0;
          padding: 8pt;
        }
        
        /* Images */
        img {
          max-width: 100%;
          page-break-inside: avoid !important;
        }
        
        /* Tables */
        table {
          page-break-inside: auto;
          width: 100%;
        }
        
        tr {
          page-break-inside: avoid !important;
        }
      }
    `;

    // Append to body
    document.body.appendChild(printStyles);
    document.body.appendChild(printContainer);

    // Set document title for PDF filename
    const originalTitle = document.title;
    document.title = filename;

    // Trigger print dialog
    window.print();

    // Cleanup after print (wait a bit for print dialog)
    setTimeout(() => {
      document.body.removeChild(printContainer);
      document.body.removeChild(printStyles);
      document.title = originalTitle;
    }, 1000);

  } catch (error) {
    console.error("PDF export error:", error);
    throw new Error("Failed to export PDF");
  }
};

/**
 * Export document to Markdown
 * @param html - HTML content of the document
 * @param filename - Name of the Markdown file (without .md extension)
 */
export const exportToMarkdown = (
  html: string,
  filename: string = "document"
): void => {
  try {
    const turndownService = new TurndownService({
      headingStyle: "atx", // Use # for headings
      codeBlockStyle: "fenced", // Use ``` for code blocks
    });

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(html);

    // Create blob and download
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Markdown export error:", error);
    throw new Error("Failed to export Markdown");
  }
};

/**
 * Copy document as plain text
 * @param html - HTML content of the document
 */
export const copyAsPlainText = async (html: string): Promise<void> => {
  try {
    // Create a temporary div to extract text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Get plain text
    const plainText = tempDiv.textContent || tempDiv.innerText || "";

    // Copy to clipboard
    await navigator.clipboard.writeText(plainText);
  } catch (error) {
    console.error("Copy to clipboard error:", error);
    throw new Error("Failed to copy text");
  }
};

/**
 * Extract plain text from HTML
 * @param html - HTML content
 * @returns Plain text content
 */
export const extractPlainText = (html: string): string => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
};

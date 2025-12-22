/**
 * Export Functions for Documents
 * Export documents to PDF, Markdown, and Plain Text
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import TurndownService from "turndown";

/**
 * Export document to PDF
 * @param element - HTML element containing the document content
 * @param filename - Name of the PDF file (without .pdf extension)
 */
export const exportToPDF = async (
  element: HTMLElement,
  filename: string = "document"
): Promise<void> => {
  try {
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Hide elements that shouldn't be in PDF
    const elementsToHide = [
      'button',  // All buttons
      '[role="button"]',  // Button-like elements
      '.no-print',  // Elements with no-print class
      '[data-no-print]',  // Elements with data-no-print attribute
      '.bn-block-outer[data-node-type="paragraph"]:has(.bn-inline-content:empty)',  // Empty paragraphs with placeholders
    ];

    elementsToHide.forEach(selector => {
      const elements = clonedElement.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    });

    // Also hide placeholder text specifically
    const placeholders = clonedElement.querySelectorAll('[data-placeholder], .placeholder');
    placeholders.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Append cloned element temporarily to document (needed for html2canvas)
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '0';
    clonedElement.style.padding = '20px';  // Add padding to prevent clipping
    clonedElement.style.overflow = 'visible';  // Ensure content is not clipped
    document.body.appendChild(clonedElement);

    // Convert HTML to canvas
    const canvas = await html2canvas(clonedElement, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',  // White background
      windowHeight: clonedElement.scrollHeight + 100,  // Add extra height to prevent clipping
      allowTaint: true,  // Allow cross-origin images
    });

    // Remove cloned element
    document.body.removeChild(clonedElement);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4"); // A4 size, portrait

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save PDF
    pdf.save(`${filename}.pdf`);
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

"use client";

import dynamic from "next/dynamic";

// Lazy load PDFViewer to avoid webpack bundling issues
const PDFViewer = dynamic(() => import("./pdf-viewer").then(mod => ({ default: mod.PDFViewer })), {
  ssr: false,
  loading: () => (
    <div className="p-4 border rounded-lg bg-muted">
      <p className="text-sm">Đang tải PDF...</p>
    </div>
  ),
});

interface PDFBlockProps {
  url: string;
}

/**
 * PDF Block Component
 * Used to render PDF files embedded in documents
 * Can be used in BlockNote editor or standalone
 */
export const PDFBlock = ({ url }: PDFBlockProps) => {
  return (
    <div className="my-4 w-full">
      <PDFViewer url={url} />
    </div>
  );
};

/**
 * Helper function to check if a URL is a PDF
 */
export const isPDFUrl = (url: string): boolean => {
  return url.toLowerCase().endsWith(".pdf") || url.includes(".pdf?");
};

/**
 * Extract PDF URL from BlockNote image block
 */
export const extractPDFUrl = (block: any): string | null => {
  if (block.type === "image" && block.props?.url) {
    const url = block.props.url;
    if (isPDFUrl(url)) {
      return url;
    }
  }
  return null;
};


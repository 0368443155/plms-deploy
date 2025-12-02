"use client";

import { useEffect, useRef, useState } from "react";

// Dynamic import pdfjs-dist to avoid webpack bundling issues
let pdfjsLib: any = null;

const loadPDFJS = async () => {
  if (typeof window === "undefined") return null;
  
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    
    // Set worker path for PDF.js
    if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
  }
  
  return pdfjsLib;
};

interface PDFViewerProps {
  url: string;
  width?: number;
  height?: number;
}

/**
 * PDF Viewer Component
 * Renders PDF files using PDF.js
 * Supports multi-page PDFs with navigation
 */
export const PDFViewer = ({ url, width = 800, height = 600 }: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    const loadPDF = async () => {
      if (!canvasRef.current) return;

      setLoading(true);
      setError(null);

      try {
        // Load PDF.js library dynamically
        const pdfjs = await loadPDFJS();
        if (!pdfjs) {
          setError("PDF.js không thể tải được");
          setLoading(false);
          return;
        }

        // Load PDF document
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        
        setTotalPages(pdf.numPages);

        // Render current page
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not get canvas context");
        }
        
        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas, // Required by PDF.js RenderParameters
        };
        
        await page.render(renderContext).promise;
        setLoading(false);
      } catch (err) {
        console.error("PDF loading error:", err);
        setError("Failed to load PDF. Please check the URL.");
        setLoading(false);
      }
    };

    loadPDF();
  }, [url, currentPage, scale]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-muted">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Open PDF in new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
          >
            ← Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
          >
            Next →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="px-3 py-1 text-sm border rounded hover:bg-accent"
          >
            Zoom Out
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="px-3 py-1 text-sm border rounded hover:bg-accent"
          >
            Zoom In
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm border rounded hover:bg-accent"
          >
            Download
          </a>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex justify-center p-4 overflow-auto bg-gray-100 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-lg" />
        )}
      </div>
    </div>
  );
};


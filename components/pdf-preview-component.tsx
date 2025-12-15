"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

interface PDFPreviewComponentProps {
    url: string;
    scale?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    onTotalPagesChange?: (total: number) => void;
}

/**
 * PDF Preview Component - Optimized for DocumentBlock
 * Renders PDF pages with smooth scaling and navigation
 */
const PDFPreviewComponent = ({
    url,
    scale = 1,
    currentPage = 1,
    onPageChange,
    onTotalPagesChange,
}: PDFPreviewComponentProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pdfDocRef = useRef<any>(null);

    // Load PDF document
    const loadPDF = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const pdfjs = await loadPDFJS();
            if (!pdfjs) {
                setError("PDF.js không thể tải được");
                setLoading(false);
                return;
            }

            // Load PDF if not already loaded
            if (!pdfDocRef.current) {
                const loadingTask = pdfjs.getDocument(url);
                pdfDocRef.current = await loadingTask.promise;
                onTotalPagesChange?.(pdfDocRef.current.numPages);
            }

            await renderPage();
        } catch (err) {
            console.error("PDF loading error:", err);
            setError("Không thể tải PDF. Vui lòng kiểm tra URL.");
            setLoading(false);
        }
    }, [url, onTotalPagesChange]);

    // Render current page
    const renderPage = useCallback(async () => {
        if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;

        try {
            const page = await pdfDocRef.current.getPage(currentPage);

            // Calculate scale to fit container width
            const containerWidth = containerRef.current.clientWidth - 32; // padding
            const viewport = page.getViewport({ scale: 1 });
            const fitScale = containerWidth / viewport.width;
            const finalScale = fitScale * scale;

            const scaledViewport = page.getViewport({ scale: finalScale });

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (!context) {
                throw new Error("Could not get canvas context");
            }

            // Set canvas dimensions
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Render PDF page
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
            };

            await page.render(renderContext).promise;
            setLoading(false);
        } catch (err) {
            console.error("PDF render error:", err);
            setError("Lỗi khi render trang PDF");
            setLoading(false);
        }
    }, [currentPage, scale]);

    // Load PDF on mount or URL change
    useEffect(() => {
        pdfDocRef.current = null; // Reset on URL change
        loadPDF();

        return () => {
            pdfDocRef.current = null;
        };
    }, [url]);

    // Re-render on page or scale change
    useEffect(() => {
        if (pdfDocRef.current) {
            renderPage();
        }
    }, [currentPage, scale, renderPage]);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (pdfDocRef.current) {
                renderPage();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [renderPage]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-muted">
                <p className="text-red-500 mb-4">{error}</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                >
                    Mở PDF trong tab mới
                </a>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-auto flex justify-center bg-slate-100 dark:bg-slate-800"
        >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                        <span className="text-sm text-muted-foreground">Đang tải PDF...</span>
                    </div>
                </div>
            )}
            <div className="p-4">
                <canvas
                    ref={canvasRef}
                    className="shadow-lg rounded-sm bg-white"
                    style={{ opacity: loading ? 0.5 : 1 }}
                />
            </div>
        </div>
    );
};

export default PDFPreviewComponent;

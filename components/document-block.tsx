"use client";

import { useCallback, useState } from "react";
import { FileText, Download, ExternalLink, Maximize2, Minimize2, X } from "lucide-react";

interface DocumentBlockProps {
    url: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    onRemove?: () => void;
    editable?: boolean;
}

// Detect file type from URL or extension
const getFileType = (url: string, providedType?: string): string => {
    if (providedType) return providedType.toLowerCase();

    const extension = url.split(".").pop()?.toLowerCase().split("?")[0] || "";

    const typeMap: Record<string, string> = {
        pdf: "pdf",
        doc: "word",
        docx: "word",
        xls: "excel",
        xlsx: "excel",
        ppt: "powerpoint",
        pptx: "powerpoint",
        jpg: "image",
        jpeg: "image",
        png: "image",
        gif: "image",
        webp: "image",
        svg: "image",
        txt: "text",
        csv: "csv",
        json: "json",
        md: "markdown",
    };

    return typeMap[extension] || "document";
};

// Format file size
const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Get file icon color based on type
const getFileTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
        pdf: "text-red-500",
        word: "text-blue-600",
        excel: "text-green-600",
        powerpoint: "text-orange-500",
        image: "text-purple-500",
        text: "text-gray-600",
        csv: "text-green-500",
        json: "text-yellow-600",
        markdown: "text-gray-700",
        document: "text-gray-500",
    };
    return colors[type] || "text-gray-500";
};

// Get file type label
const getFileTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        pdf: "PDF",
        word: "Word",
        excel: "Excel",
        powerpoint: "PowerPoint",
        image: "Hình ảnh",
        text: "Văn bản",
        csv: "CSV",
        json: "JSON",
        markdown: "Markdown",
        document: "Tài liệu",
    };
    return labels[type] || "Tài liệu";
};

// Get badge color class
const getBadgeColorClass = (type: string): string => {
    const classes: Record<string, string> = {
        pdf: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        word: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        excel: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
        powerpoint: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
        image: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
        text: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        csv: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
        json: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
        markdown: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        document: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return classes[type] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

/**
 * Document Block Component - Đơn giản hóa
 * Hiển thị preview tài liệu với khung linh hoạt theo layout
 */
export const DocumentBlock = ({
    url,
    fileName,
    fileType: providedFileType,
    fileSize,
    onRemove,
    editable = false,
}: DocumentBlockProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const fileType = getFileType(url, providedFileType);
    const displayName = fileName || url.split("/").pop()?.split("?")[0] || "Tài liệu";

    // Render preview content based on file type
    const renderPreview = () => {
        const previewHeight = isExpanded ? "400px" : "200px";

        switch (fileType) {
            case "image":
                return (
                    <div
                        className="relative overflow-auto bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                        style={{ height: previewHeight }}
                    >
                        <img
                            src={url}
                            alt={displayName}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                );

            case "pdf":
                // Use browser's built-in PDF viewer via iframe
                return (
                    <div className="relative" style={{ height: previewHeight }}>
                        <iframe
                            src={url}
                            className="w-full h-full border-0"
                            title={`Preview ${displayName}`}
                        />
                    </div>
                );

            case "word":
            case "excel":
            case "powerpoint":
                // Use Microsoft Office Online viewer for Office documents
                const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
                return (
                    <div className="relative" style={{ height: previewHeight }}>
                        <iframe
                            src={officeViewerUrl}
                            className="w-full h-full border-0"
                            title={`Preview ${displayName}`}
                        />
                    </div>
                );

            default:
                // Generic document preview - show icon and download link
                return (
                    <div
                        className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 gap-4 p-8"
                        style={{ height: previewHeight }}
                    >
                        <FileText className={`h-16 w-16 ${getFileTypeColor(fileType)}`} />
                        <p className="text-sm text-muted-foreground text-center">
                            Xem trước không khả dụng cho loại tài liệu này
                        </p>
                        <a
                            href={url}
                            download={displayName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Tải xuống để xem
                        </a>
                    </div>
                );
        }
    };

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`flex-shrink-0 ${getFileTypeColor(fileType)}`}>
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate text-slate-800 dark:text-slate-200">
                            {displayName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`px-1.5 py-0.5 rounded ${getBadgeColorClass(fileType)}`}>
                                {getFileTypeLabel(fileType)}
                            </span>
                            {fileSize && <span>{formatFileSize(fileSize)}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Expand/collapse */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title={isExpanded ? "Thu gọn" : "Mở rộng"}
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>

                    {/* Open in new tab */}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Mở trong tab mới"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>

                    {/* Download */}
                    <a
                        href={url}
                        download={displayName}
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Tải xuống"
                    >
                        <Download className="h-4 w-4" />
                    </a>

                    {/* Remove button */}
                    {editable && onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
                            title="Xóa tài liệu"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Preview area - always show when expanded */}
            {isExpanded && (
                <div className="relative">
                    {renderPreview()}
                </div>
            )}

            {/* Collapsed view - click to expand */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                >
                    <Maximize2 className="h-4 w-4" />
                    Xem trước tài liệu
                </button>
            )}
        </div>
    );
};

export default DocumentBlock;

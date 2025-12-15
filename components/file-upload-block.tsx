"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useEdgeStore } from "@/lib/edgestore";
import { Upload, File, X, Loader2, FileText, Image, FileSpreadsheet, Presentation } from "lucide-react";
import { toast } from "sonner";

interface FileUploadBlockProps {
    onUploadComplete: (file: UploadedFile) => void;
    onCancel?: () => void;
    acceptedTypes?: string[];
}

export interface UploadedFile {
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

// Supported file types and their MIME types
const FILE_TYPES = {
    document: {
        accept: {
            "application/pdf": [".pdf"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-powerpoint": [".ppt"],
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
            "text/plain": [".txt"],
            "text/csv": [".csv"],
            "application/json": [".json"],
            "text/markdown": [".md"],
        },
        maxSize: 50 * 1024 * 1024, // 50MB
        label: "Tài liệu",
    },
    image: {
        accept: {
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/gif": [".gif"],
            "image/webp": [".webp"],
            "image/svg+xml": [".svg"],
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        label: "Hình ảnh",
    },
};

// Get file type icon
const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes("word") || type.includes("document")) return <FileText className="h-8 w-8 text-blue-600" />;
    if (type.includes("excel") || type.includes("spreadsheet")) return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    if (type.includes("powerpoint") || type.includes("presentation")) return <Presentation className="h-8 w-8 text-orange-500" />;
    if (type.startsWith("image/")) return <Image className="h-8 w-8 text-purple-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
};

// Format file size
const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * File Upload Block Component
 * Cho phép tải file lên và chèn vào editor như một block mới
 */
export const FileUploadBlock = ({
    onUploadComplete,
    onCancel,
    acceptedTypes = ["document", "image"],
}: FileUploadBlockProps) => {
    const { edgestore } = useEdgeStore();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Merge accepted types
    const acceptedMimeTypes = acceptedTypes.reduce((acc, type) => {
        const typeConfig = FILE_TYPES[type as keyof typeof FILE_TYPES];
        if (typeConfig) {
            return { ...acc, ...typeConfig.accept };
        }
        return acc;
    }, {});

    const maxSize = Math.max(
        ...acceptedTypes.map(type => FILE_TYPES[type as keyof typeof FILE_TYPES]?.maxSize || 0)
    );

    // Handle file drop
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setSelectedFile(file);

        // Create preview for images
        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    }, []);

    // Handle upload
    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const response = await edgestore.publicFiles.upload({
                file: selectedFile,
                onProgressChange: (progress) => {
                    setUploadProgress(progress);
                },
            });

            // Get file type from extension
            const extension = selectedFile.name.split(".").pop()?.toLowerCase() || "";
            let fileType = "document";

            if (["pdf"].includes(extension)) fileType = "pdf";
            else if (["doc", "docx"].includes(extension)) fileType = "word";
            else if (["xls", "xlsx"].includes(extension)) fileType = "excel";
            else if (["ppt", "pptx"].includes(extension)) fileType = "powerpoint";
            else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) fileType = "image";
            else if (["txt", "md"].includes(extension)) fileType = "text";
            else if (["csv"].includes(extension)) fileType = "csv";
            else if (["json"].includes(extension)) fileType = "json";

            onUploadComplete({
                url: response.url,
                fileName: selectedFile.name,
                fileType,
                fileSize: selectedFile.size,
            });

            toast.success("Tải lên thành công!");

            // Cleanup
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setSelectedFile(null);
            setPreviewUrl(null);
            setUploadProgress(0);
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.message || "Không thể tải file lên");
        } finally {
            setUploading(false);
        }
    };

    // Cancel upload
    const handleCancel = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        onCancel?.();
    };

    // Dropzone configuration
    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept: acceptedMimeTypes,
        maxSize,
        multiple: false,
    });

    // Show error for rejected files
    const fileRejectionError = fileRejections.length > 0
        ? fileRejections[0].errors[0]?.message
        : null;

    return (
        <div className="my-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {!selectedFile ? (
                // Dropzone area
                <div
                    {...getRootProps()}
                    className={`
            p-8 text-center cursor-pointer transition-all
            ${isDragActive
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }
          `}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center gap-4">
                        <div className={`
              p-4 rounded-full transition-colors
              ${isDragActive
                                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                            }
            `}>
                            <Upload className="h-8 w-8" />
                        </div>

                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">
                                {isDragActive
                                    ? "Thả file vào đây..."
                                    : "Kéo thả file hoặc click để chọn"
                                }
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Hỗ trợ: PDF, Word, Excel, PowerPoint, hình ảnh, văn bản
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Tối đa {formatSize(maxSize)}
                            </p>
                        </div>
                    </div>

                    {fileRejectionError && (
                        <p className="mt-4 text-sm text-red-500">{fileRejectionError}</p>
                    )}
                </div>
            ) : (
                // File preview and upload controls
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        {/* File icon or image preview */}
                        <div className="flex-shrink-0">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
                                    alt={selectedFile.name}
                                    className="w-16 h-16 object-cover rounded-lg border"
                                />
                            ) : (
                                <div className="w-16 h-16 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border">
                                    {getFileIcon(selectedFile.type)}
                                </div>
                            )}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {selectedFile.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {formatSize(selectedFile.size)}
                            </p>

                            {/* Progress bar */}
                            {uploading && (
                                <div className="mt-3">
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Đang tải lên... {uploadProgress}%
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Cancel button */}
                        {!uploading && (
                            <button
                                onClick={handleCancel}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        )}
                    </div>

                    {/* Action buttons */}
                    {!uploading && (
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpload}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                Tải lên và chèn
                            </button>
                        </div>
                    )}

                    {uploading && (
                        <div className="flex justify-center mt-4">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileUploadBlock;

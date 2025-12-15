"use client";

import { useState } from "react";
import { FileUp, Plus, FileText, Image as ImageIcon, Table2, X } from "lucide-react";
import { FileUploadBlock, UploadedFile } from "./file-upload-block";

interface EditorToolbarProps {
    onInsertDocument: (file: UploadedFile) => void;
    editable?: boolean;
}

/**
 * Editor Toolbar - Thêm các công cụ bổ sung cho BlockNote editor
 * Bao gồm nút tải tài liệu lên và chèn vào ghi chú
 */
export const EditorToolbar = ({ onInsertDocument, editable = true }: EditorToolbarProps) => {
    const [showUpload, setShowUpload] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    if (!editable) return null;

    const handleUploadComplete = (file: UploadedFile) => {
        onInsertDocument(file);
        setShowUpload(false);
        setIsExpanded(false);
    };

    return (
        <div className="mb-4">
            {/* Toolbar buttons */}
            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {/* Toggle expand */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`
            p-2 rounded-lg transition-all flex items-center gap-2
            ${isExpanded
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600"
                            : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }
          `}
                    title="Thêm nội dung"
                >
                    <Plus className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-45" : ""}`} />
                    <span className="text-sm font-medium">Thêm</span>
                </button>

                {/* Expanded toolbar items */}
                {isExpanded && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300 dark:border-slate-600">
                        {/* Upload document button */}
                        <button
                            onClick={() => setShowUpload(!showUpload)}
                            className={`
                px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm
                ${showUpload
                                    ? "bg-blue-500 text-white"
                                    : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                }
              `}
                            title="Tải tài liệu lên"
                        >
                            <FileUp className="h-4 w-4" />
                            <span>Tài liệu</span>
                        </button>

                        {/* Other insert options (for future expansion) */}
                        <button
                            className="px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-2 text-sm"
                            title="Chèn hình ảnh"
                            disabled
                        >
                            <ImageIcon className="h-4 w-4" />
                            <span>Hình ảnh</span>
                        </button>

                        <button
                            className="px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-2 text-sm"
                            title="Chèn bảng"
                            disabled
                        >
                            <Table2 className="h-4 w-4" />
                            <span>Bảng</span>
                        </button>
                    </div>
                )}
            </div>

            {/* File upload area */}
            {showUpload && (
                <div className="mt-3">
                    <FileUploadBlock
                        onUploadComplete={handleUploadComplete}
                        onCancel={() => setShowUpload(false)}
                        acceptedTypes={["document", "image"]}
                    />
                </div>
            )}
        </div>
    );
};

export default EditorToolbar;

"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { IconPicker } from "@/components/icon-picker";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { ImageIcon, Smile, X, Paperclip, FileUp, Loader2 } from "lucide-react";
import { ElementRef, useRef, useState, useCallback, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import TextareaAutosize from "react-textarea-autosize";
import { useCoverImage } from "@/hooks/use-cover-image";
import { ExportMenu } from "@/components/export-menu";
import { SummarizeButton } from "@/components/ai/summarize-button";
import { ChatButton } from "@/components/ai/chat-button";
import { useEdgeStore } from "@/lib/edgestore";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lazy load DocumentBlock for preview
const DocumentBlock = dynamic(() => import("./document-block"), {
  ssr: false,
  loading: () => (
    <div className="p-4 border rounded-lg bg-muted animate-pulse">
      <p className="text-sm">Đang tải...</p>
    </div>
  ),
});

interface ToolbarProps {
  initialData: Doc<"documents">;
  preview?: boolean;
}

// Interface for attached files
interface AttachedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
}

export const Toolbar = ({ initialData, preview }: ToolbarProps) => {
  const inputRef = useRef<ElementRef<"textarea">>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialData.title);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(
    initialData.attachedFiles || []
  );
  const [showAttachments, setShowAttachments] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const update = useMutation(api.documents.update);
  const removeIcon = useMutation(api.documents.removeIcon);
  const { edgestore } = useEdgeStore();

  const coverImage = useCoverImage();

  // Sync attachedFiles from initialData when it changes
  useEffect(() => {
    if (initialData.attachedFiles) {
      setAttachedFiles(initialData.attachedFiles);
    }
  }, [initialData.attachedFiles]);

  // Save attached files to Convex
  const saveAttachments = useCallback(async (files: AttachedFile[]) => {
    try {
      await update({
        id: initialData._id,
        attachedFiles: files,
      });
    } catch (error) {
      console.error("Error saving attachments:", error);
      toast.error("Không thể lưu tệp đính kèm");
    }
  }, [initialData._id, update]);

  const enableInput = () => {
    if (preview) return;
    setIsEditing(true);
    setValue(initialData.title);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const disableInput = () => {
    const finalTitle = value.trim() || "Không có tiêu đề";

    if (finalTitle !== initialData.title) {
      update({
        id: initialData._id,
        title: finalTitle,
      });
    }

    setIsEditing(false);
  };

  const onInput = (newValue: string) => {
    setValue(newValue);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      disableInput();
    } else if (event.key === "Escape") {
      setValue(initialData.title);
      setIsEditing(false);
    }
  };

  const onIconSelect = (icon: string) => {
    update({
      id: initialData._id,
      icon,
    });
  };

  const onRemoveIcon = () => {
    removeIcon({ id: initialData._id });
  };

  // Truncate long filename for toast display
  const truncateFileName = (fileName: string, maxLength: number = 40): string => {
    if (fileName.length <= maxLength) return fileName;

    // Extract extension
    const lastDotIndex = fileName.lastIndexOf(".");
    const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : "";
    const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;

    // Calculate how many chars we can show (accounting for "..." and extension)
    const availableChars = maxLength - ext.length - 3; // 3 for "..."

    if (availableChars <= 10) {
      // If too short, just show start + ... + ext
      return `${nameWithoutExt.substring(0, 10)}...${ext}`;
    }

    // Show start and end with ... in middle
    const startChars = Math.ceil(availableChars * 0.6); // 60% at start
    const endChars = Math.floor(availableChars * 0.4); // 40% at end

    return `${nameWithoutExt.substring(0, startChars)}...${nameWithoutExt.substring(nameWithoutExt.length - endChars)}${ext}`;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file size (must be > 0 bytes)
    if (file.size === 0) {
      toast.error("Tệp tin không được rỗng (Dung lượng phải > 0 byte).", {
        description: "Vui lòng chọn một tệp có nội dung"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await edgestore.publicFiles.upload({
        file,
        onProgressChange: (progress) => {
          setUploadProgress(progress);
        },
      });

      // Determine file type
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      let fileType = "document";
      if (["pdf"].includes(extension)) fileType = "pdf";
      else if (["doc", "docx"].includes(extension)) fileType = "word";
      else if (["xls", "xlsx"].includes(extension)) fileType = "excel";
      else if (["ppt", "pptx"].includes(extension)) fileType = "powerpoint";
      else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) fileType = "image";
      else if (["txt", "md"].includes(extension)) fileType = "text";

      // Check for duplicate filename and auto-rename
      let finalFileName = file.name;
      const existingFileNames = attachedFiles.map(f => f.fileName);

      if (existingFileNames.includes(finalFileName)) {
        // Extract name and extension
        const lastDotIndex = finalFileName.lastIndexOf(".");
        const nameWithoutExt = lastDotIndex > 0 ? finalFileName.substring(0, lastDotIndex) : finalFileName;
        const ext = lastDotIndex > 0 ? finalFileName.substring(lastDotIndex) : "";

        // Find next available number
        let counter = 1;
        while (existingFileNames.includes(`${nameWithoutExt} (${counter})${ext}`)) {
          counter++;
        }

        finalFileName = `${nameWithoutExt} (${counter})${ext}`;
        toast.message(`File trùng tên. Đã đổi tên thành: ${truncateFileName(finalFileName)}`, {
          description: "Tên file gốc đã tồn tại trong danh sách đính kèm"
        });
      }

      const newFile: AttachedFile = {
        id: `file-${Date.now()}`,
        fileUrl: response.url,
        fileName: finalFileName,
        fileType,
        fileSize: file.size,
        uploadedAt: Date.now(),
      };

      // Update state and save
      setAttachedFiles(prev => {
        const updatedFiles = [...prev, newFile];
        saveAttachments(updatedFiles);
        return updatedFiles;
      });

      toast.success(`Đã tải lên: ${truncateFileName(finalFileName)}`);

      // Close modal and show attachments after a short delay
      setTimeout(() => {
        setShowFileUpload(false);
        setShowAttachments(true);
      }, 100);

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Không thể tải file lên");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [edgestore.publicFiles, saveAttachments, attachedFiles]);

  // Handle file input change
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Handle remove file
  const handleRemoveFile = useCallback((fileId: string) => {
    const updatedFiles = attachedFiles.filter(f => f.id !== fileId);
    setAttachedFiles(updatedFiles);
    saveAttachments(updatedFiles);
    toast.success("Đã xóa tệp đính kèm");
  }, [attachedFiles, saveAttachments]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="pl-[54px] group relative">
      {/* Render this when the user is viewing their document */}
      {!!initialData.icon && !preview && (
        <div className="flex items-center gap-x-2 group/icon pt-6">
          <IconPicker onChange={onIconSelect}>
            <p className="text-6xl hover:opacity-75 transition">
              {initialData.icon}
            </p>
          </IconPicker>
          <Button
            onClick={onRemoveIcon}
            className="rounded-full opacity-100 transition text-muted-foreground text-xs"
            variant="outline"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {/* Render this when the guest is viewing others' document */}
      {!!initialData.icon && preview && (
        <p className="text-6xl pt-6">{initialData.icon}</p>
      )}
      <div className="opacity-100 flex items-center gap-x-1 py-4 flex-wrap">
        {!initialData.icon && !preview && (
          <IconPicker asChild onChange={onIconSelect}>
            <Button
              className="text-muted-foreground text-xs"
              variant="outline"
              size="sm"
            >
              <Smile className="h-4 w-4 mr-2" />
              Thêm biểu tượng
            </Button>
          </IconPicker>
        )}
        {!initialData.coverImage && !preview && (
          <Button
            onClick={coverImage.onOpen}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Thêm ảnh bìa
          </Button>
        )}

        {/* File Attachment Button */}
        {!preview && (
          <Button
            onClick={() => setShowFileUpload(true)}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Tệp đính kèm
            {attachedFiles.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full">
                {attachedFiles.length}
              </span>
            )}
          </Button>
        )}

        {!preview && (
          <>
            <SummarizeButton documentId={initialData._id} />
            <ChatButton documentId={initialData._id} />
            <ExportMenu documentTitle={initialData.title || "document"} />
          </>
        )}
      </div>

      {/* Title editing */}
      {isEditing && !preview ? (
        <TextareaAutosize
          ref={inputRef}
          onBlur={disableInput}
          onKeyDown={onKeyDown}
          value={value}
          onChange={(e) => onInput(e.target.value)}
          className="text-5xl bg-transparent font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF] resize-none"
        />
      ) : (
        <div
          onClick={enableInput}
          className="pb-[11.5px] text-5xl font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF]"
        >
          {value}
        </div>
      )}

      {/* Attached Files Preview Section */}
      {attachedFiles.length > 0 && (
        <div className="mt-6 mb-4">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Paperclip className="h-4 w-4" />
            <span>Tệp đính kèm ({attachedFiles.length})</span>
            <span className="text-xs">{showAttachments ? "▼" : "▶"}</span>
          </button>

          {showAttachments && (
            <div className="mt-4 space-y-3">
              {attachedFiles.map((file) => (
                <DocumentBlock
                  key={file.id}
                  url={file.fileUrl}
                  fileName={file.fileName}
                  fileType={file.fileType}
                  fileSize={file.fileSize}
                  editable={!preview}
                  onRemove={!preview ? () => handleRemoveFile(file.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Upload Modal */}
      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Tải tệp đính kèm
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {isUploading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-sm text-muted-foreground mb-2">Đang tải lên...</p>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);

                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    handleFileUpload(file);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onFileInputChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.md,.jpg,.jpeg,.png,.gif,.webp,.svg"
                />
                <FileUp className={`h-10 w-10 mx-auto mb-4 ${isDragging ? "text-blue-500" : "text-slate-400"
                  }`} />
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {isDragging ? "Thả tệp vào đây" : "Click để chọn tệp"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hoặc kéo thả tệp vào đây
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Hỗ trợ: PDF, Word, Excel, PowerPoint, hình ảnh, văn bản
                </p>
              </div>
            )}
          </div>

          {/* Show existing attachments in modal */}
          {attachedFiles.length > 0 && !isUploading && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Tệp đã đính kèm:</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
                  >
                    <Paperclip className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm truncate max-w-[200px]" title={file.fileName}>
                        {file.fileName}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        ({formatSize(file.fileSize)})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

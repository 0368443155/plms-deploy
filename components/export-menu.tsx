"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileDown, Copy } from "lucide-react";
import { exportToPDF, exportToMarkdown, copyAsPlainText } from "@/lib/export";
import { toast } from "sonner";
import { useRef } from "react";

interface ExportMenuProps {
  documentTitle: string;
  contentElementId?: string; // ID of element containing document content
}

export const ExportMenu = ({
  documentTitle,
  contentElementId = "document-content",
}: ExportMenuProps) => {
  const handleExportPDF = async () => {
    try {
      const element = document.getElementById(contentElementId);
      if (!element) {
        // Fallback: try to find ONLY the editor content area (not the whole container)
        // .ProseMirror contains the actual content without UI elements
        const editorContent =
          document.querySelector(".ProseMirror") ||
          document.querySelector(".bn-editor") ||
          document.querySelector(".bn-container");

        if (!editorContent) {
          toast.error("Không tìm thấy nội dung để export");
          return;
        }
        await exportToPDF(editorContent as HTMLElement, documentTitle);
      } else {
        await exportToPDF(element, documentTitle);
      }
      toast.success("Đã export PDF thành công!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Không thể export PDF");
    }
  };

  const handleExportMarkdown = () => {
    try {
      // Get HTML content from editor
      const editorElement =
        document.querySelector(".bn-container") ||
        document.querySelector('[data-blocknote-editor]');

      if (!editorElement) {
        toast.error("Không tìm thấy nội dung để export");
        return;
      }

      const html = editorElement.innerHTML;
      exportToMarkdown(html, documentTitle);
      toast.success("Đã export Markdown thành công!");
    } catch (error) {
      console.error("Markdown export error:", error);
      toast.error("Không thể export Markdown");
    }
  };

  const handleCopyPlainText = async () => {
    try {
      const editorElement =
        document.querySelector(".bn-container") ||
        document.querySelector('[data-blocknote-editor]');

      if (!editorElement) {
        toast.error("Không tìm thấy nội dung để copy");
        return;
      }

      const html = editorElement.innerHTML;
      await copyAsPlainText(html);
      toast.success("Đã copy vào clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Không thể copy text");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground text-xs">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyPlainText}>
          <Copy className="h-4 w-4 mr-2" />
          Copy as Plain Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


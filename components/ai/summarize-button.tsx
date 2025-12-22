"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { SummaryModal } from "./summary-modal";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SummarizeButtonProps {
  documentId: Id<"documents">;
}

/**
 * Extract plain text from BlockNote JSON content
 */
function extractPlainText(content: string | undefined): string {
  if (!content) return "";

  try {
    const blocks = JSON.parse(content);

    if (!Array.isArray(blocks)) return "";

    return blocks
      .map((block: any) => {
        if (block.type === "paragraph" || block.type === "heading") {
          return block.content?.map((c: any) => c.text || "").join("") || "";
        }
        if (block.type === "bulletListItem" || block.type === "numberedListItem") {
          return block.content?.map((c: any) => c.text || "").join("") || "";
        }
        return "";
      })
      .filter((text: string) => text.trim().length > 0)
      .join("\n");
  } catch (error) {
    return "";
  }
}

export const SummarizeButton = ({ documentId }: SummarizeButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get document to check content length
  const document = useQuery(api.documents.getById, { documentId });

  // Extract plain text and check length
  const plainText = extractPlainText(document?.content);
  const isContentTooShort = plainText.length < 100;
  const charCount = plainText.length;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="gap-2"
                disabled={isContentTooShort}
              >
                <Sparkles className="h-4 w-4" />
                Tóm tắt AI
              </Button>
            </span>
          </TooltipTrigger>
          {isContentTooShort && (
            <TooltipContent>
              <p>Nội dung tài liệu quá ngắn để tóm tắt</p>
              <p className="text-xs text-muted-foreground">
                Cần tối thiểu 100 ký tự (hiện tại: {charCount} ký tự)
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <SummaryModal
        documentId={documentId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

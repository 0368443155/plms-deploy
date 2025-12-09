"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryModalProps {
  documentId: Id<"documents">;
  open: boolean;
  onClose: () => void;
}

export const SummaryModal = ({
  documentId,
  open,
  onClose,
}: SummaryModalProps) => {
  const summarize = useAction(api.ai.summarizeDocument);
  const cachedSummary = useQuery(api.ai.getSummary, { documentId });
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [model, setModel] = useState("");

  // Load cached summary when modal opens
  useEffect(() => {
    if (open && cachedSummary) {
      setSummary(cachedSummary.summary);
      setFromCache(true);
      setModel(cachedSummary.model);
    } else if (open && !cachedSummary && !summary) {
      // Auto-generate if no cache
      handleSummarize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cachedSummary]);

  const handleSummarize = async (forceRegenerate = false) => {
    setIsLoading(true);

    try {
      const result = await summarize({
        documentId,
        forceRegenerate,
      });

      setSummary(result.summary);
      setFromCache(result.fromCache);
      setModel(result.model);

      if (result.fromCache) {
        toast.success("Đã tải tóm tắt từ cache");
      } else {
        toast.success("Đã tạo tóm tắt mới!");
      }
    } catch (error: any) {
      console.error("Summarize error:", error);
      toast.error(error.message || "Không thể tạo tóm tắt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    toast.success("Đã copy tóm tắt!");
  };

  const handleRegenerate = () => {
    handleSummarize(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Tóm tắt AI
          </DialogTitle>
          <DialogDescription>
            Tóm tắt nội dung tài liệu bằng AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Đang tạo tóm tắt...
                </span>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {summary}
                </p>
              </div>

              {fromCache && (
                <p className="text-xs text-muted-foreground">
                  Từ cache • Model: {model}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tạo lại
                  </Button>
                </div>
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Không thể tạo tóm tắt. Vui lòng thử lại.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSummarize()}
                className="mt-4"
              >
                Thử lại
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


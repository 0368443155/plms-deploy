"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { SummaryModal } from "./summary-modal";
import { Id } from "@/convex/_generated/dataModel";

interface SummarizeButtonProps {
  documentId: Id<"documents">;
}

export const SummarizeButton = ({ documentId }: SummarizeButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Tóm tắt AI
      </Button>

      <SummaryModal
        documentId={documentId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};


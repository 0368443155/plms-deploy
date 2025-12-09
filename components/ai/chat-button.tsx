"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { ChatInterface } from "./chat-interface";
import { Id } from "@/convex/_generated/dataModel";

interface ChatButtonProps {
  documentId: Id<"documents">;
}

export const ChatButton = ({ documentId }: ChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        Hỏi AI
      </Button>

      <ChatInterface
        documentId={documentId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};


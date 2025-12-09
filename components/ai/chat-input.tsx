"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = ({
  onSend,
  disabled = false,
  placeholder = "Nhập tin nhắn...",
}: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSend(message);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-[44px] max-h-[120px] resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="h-[44px] w-[44px] flex-shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};


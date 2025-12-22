"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
  documentId: Id<"documents">;
  open: boolean;
  onClose: () => void;
}

export const ChatInterface = ({
  documentId,
  open,
  onClose,
}: ChatInterfaceProps) => {
  const sessions = useQuery(api.ai.getChatSessions, { documentId });
  const messages = useQuery(
    api.ai.getChatMessages,
    open && sessions && sessions.length > 0
      ? { sessionId: sessions[0]._id }
      : "skip"
  );
  const chatWithAI = useAction(api.ai.chatWithAI);

  const [currentSessionId, setCurrentSessionId] = useState<
    Id<"chatSessions"> | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load latest session on mount
  useEffect(() => {
    if (sessions && sessions.length > 0 && !currentSessionId) {
      const latest = sessions[0];
      setCurrentSessionId(latest._id);
    }
  }, [sessions, currentSessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);

    try {
      const result = await chatWithAI({
        documentId,
        sessionId: currentSessionId || undefined,
        message,
      });

      // Update session ID if new
      if (!currentSessionId) {
        setCurrentSessionId(result.sessionId);
      }

      // Messages will automatically appear via useQuery
      // No manual state updates needed - DB is source of truth!
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Không thể gửi tin nhắn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
  };

  const displayMessages = messages || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex flex-col gap-3 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Hỏi đáp AI
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSession}
              className="gap-2 self-start"
            >
              <PlusCircle className="h-4 w-4" />
              Cuộc trò chuyện mới
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {displayMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center">
                Hỏi tôi bất kỳ điều gì về tài liệu này
              </p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Ví dụ: &quot;Tóm tắt nội dung chính&quot;, &quot;Giải thích phần này&quot;, &quot;Có những điểm nào quan trọng?&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayMessages.map((msg, index) => (
                <ChatMessage
                  key={msg._id || index}
                  message={{
                    role: msg.role as "user" | "assistant",
                    content: msg.content,
                    createdAt: msg.createdAt,
                  }}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI đang suy nghĩ...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="px-6 pb-6 pt-4 border-t">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
            placeholder="Hỏi về nội dung tài liệu..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

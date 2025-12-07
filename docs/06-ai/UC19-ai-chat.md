# UC19 - HỎI ĐÁP AI (AI CHAT)

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC19
- **Tên:** Hỏi đáp AI về nội dung trang
- **Mô tả:** Chat với AI để hỏi về nội dung document, nhận giải thích, gợi ý
- **Actor:** User (Authenticated)
- **Precondition:** 
  - User đã đăng nhập
  - Document có nội dung
  - Gemini API key đã được cấu hình
- **Postcondition:** Chat history được lưu
- **Trạng thái:** ❌ Chưa triển khai
- **Ưu tiên:** 🟢 THẤP
- **Thời gian ước tính:** 1 tuần
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ✅ Documents (UC07-UC13)
  - ✅ UC18 (AI Summary) - Có thể dùng chung Gemini setup
- **Tech Stack:** Convex, Google Gemini API, React, TypeScript, Streaming

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Chat với AI

1. User mở document
2. System hiển thị nút "Hỏi AI"
3. User click nút "Hỏi AI"
4. System hiển thị chat interface (sidebar hoặc modal)
5. System load chat history (nếu có)
6. User nhập câu hỏi
7. User click "Gửi" hoặc Enter
8. System gửi câu hỏi + document context đến Gemini API
9. System stream response từ API
10. System hiển thị response real-time
11. System lưu chat message vào database
12. User có thể tiếp tục hỏi

### Alternative Flow 1: New conversation

5a. User click "Cuộc trò chuyện mới"
6a. System clear chat history
7a. Continue từ step 6

### Alternative Flow 2: Suggested questions

5a. System hiển thị suggested questions
6a. User click suggested question
7a. Continue từ step 8

### Exception Flow

- 8a. Nếu API error → Show error message
- 8b. Nếu API rate limit → Show "Vui lòng thử lại sau"
- 8c. Nếu network error → Retry with exponential backoff
- *. Nếu unauthorized → Redirect to login

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [Open Chat] → [Load History] → [Type Question] → [Send]
                                                              ↓
                                                    [Add Context] → [Call Gemini API]
                                                                          ↓
                                                                    [Stream Response]
                                                                          ↓
                                                                    [Display + Save]
                                                                          ↓
                                                                    [Continue Chat]
```

---

## 4. DATABASE SCHEMA

### 4.1. AI Chats Table

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables ...
  
  aiChats: defineTable({
    documentId: v.id("documents"),       // Link to document
    userId: v.string(),                  // Owner
    conversationId: v.string(),          // Group messages by conversation
    role: v.string(),                    // "user" | "assistant"
    content: v.string(),                 // Message content
    model: v.string(),                   // AI model used
    tokenCount: v.optional(v.number()),  // Tokens used
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_document_conversation", ["documentId", "conversationId"]),
});
```

### 4.2. Tương thích với Documents

- ✅ Link với documents qua documentId
- ✅ Conversation history per document
- ✅ Không ảnh hưởng đến documents table

---

## 5. API ENDPOINTS

### 5.1. Chat with AI (Streaming)

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

export const chatWithAI = action({
  args: {
    documentId: v.id("documents"),
    conversationId: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Get document
    const document = await ctx.runQuery(internal.documents.getById, {
      documentId: args.documentId,
    });
    
    if (!document || document.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Generate or use existing conversation ID
    const conversationId = args.conversationId || crypto.randomUUID();
    
    // Get conversation history
    const history = await ctx.runQuery(internal.ai.getChatHistory, {
      documentId: args.documentId,
      conversationId,
    });
    
    // Extract document content as context
    const documentContext = extractPlainText(document.content);
    
    // Build conversation for Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create chat with history
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `Đây là nội dung tài liệu:\n\n${documentContext}\n\nHãy trả lời các câu hỏi dựa trên nội dung này.`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "Tôi đã hiểu nội dung tài liệu. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về nội dung này.",
            },
          ],
        },
        ...history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });
    
    // Save user message
    await ctx.runMutation(internal.ai.saveChatMessage, {
      documentId: args.documentId,
      userId,
      conversationId,
      role: "user",
      content: args.message,
      model: "gemini-pro",
    });
    
    try {
      // Send message and get response
      const result = await chat.sendMessage(args.message);
      const response = await result.response;
      const text = response.text();
      
      // Save assistant message
      await ctx.runMutation(internal.ai.saveChatMessage, {
        documentId: args.documentId,
        userId,
        conversationId,
        role: "assistant",
        content: text,
        model: "gemini-pro",
      });
      
      return {
        conversationId,
        response: text,
        model: "gemini-pro",
      };
    } catch (error: any) {
      console.error("Gemini chat error:", error);
      
      if (error.message?.includes("quota")) {
        throw new Error("API quota exceeded. Please try again later.");
      }
      
      throw new Error("Failed to get response. Please try again.");
    }
  },
});

// Helper function (same as UC18)
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
        return "";
      })
      .filter((text: string) => text.trim().length > 0)
      .join("\n");
  } catch (error) {
    return "";
  }
}
```

### 5.2. Get Chat History (Internal)

```typescript
export const getChatHistory = internalQuery({
  args: {
    documentId: v.id("documents"),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("aiChats")
      .withIndex("by_document_conversation", (q) =>
        q.eq("documentId", args.documentId).eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
    
    return messages;
  },
});
```

### 5.3. Save Chat Message (Internal)

```typescript
export const saveChatMessage = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    conversationId: v.string(),
    role: v.string(),
    content: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("aiChats", {
      documentId: args.documentId,
      userId: args.userId,
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      model: args.model,
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});
```

### 5.4. Get Conversations

```typescript
export const getConversations = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Get all messages for this document
    const messages = await ctx.db
      .query("aiChats")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    // Group by conversationId
    const conversations = new Map<string, any>();
    
    messages.forEach((msg) => {
      if (!conversations.has(msg.conversationId)) {
        conversations.set(msg.conversationId, {
          conversationId: msg.conversationId,
          messages: [],
          createdAt: msg.createdAt,
        });
      }
      
      conversations.get(msg.conversationId)!.messages.push(msg);
    });
    
    return Array.from(conversations.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});
```

### 5.5. Delete Conversation

```typescript
export const deleteConversation = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const messages = await ctx.db
      .query("aiChats")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));
  },
});
```

---

## 6. UI COMPONENTS

### 6.1. Component Structure

```
components/ai/
├── chat-button.tsx             # Trigger button
├── chat-interface.tsx          # Main chat UI
├── chat-message.tsx            # Individual message
├── chat-input.tsx              # Message input
└── suggested-questions.tsx     # Suggested questions
```

### 6.2. ChatButton Component

```typescript
// components/ai/chat-button.tsx
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
```

### 6.3. ChatInterface Component

```typescript
// components/ai/chat-interface.tsx
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
import { SuggestedQuestions } from "./suggested-questions";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import crypto from "crypto";

interface ChatInterfaceProps {
  documentId: Id<"documents">;
  open: boolean;
  onClose: () => void;
}

export const ChatInterface = ({ documentId, open, onClose }: ChatInterfaceProps) => {
  const conversations = useQuery(api.ai.getConversations, { documentId });
  const chatWithAI = useAction(api.ai.chatWithAI);
  
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (conversations && conversations.length > 0 && !currentConversationId) {
      const latest = conversations[0];
      setCurrentConversationId(latest.conversationId);
      setMessages(latest.messages);
    }
  }, [conversations]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to UI immediately
    const userMessage = {
      role: "user",
      content: message,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      const result = await chatWithAI({
        documentId,
        conversationId: currentConversationId || undefined,
        message,
      });
      
      // Update conversation ID if new
      if (!currentConversationId) {
        setCurrentConversationId(result.conversationId);
      }
      
      // Add assistant message
      const assistantMessage = {
        role: "assistant",
        content: result.response,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Không thể gửi tin nhắn");
      
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewConversation = () => {
    setCurrentConversationId("");
    setMessages([]);
  };
  
  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Hỏi đáp AI
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Cuộc trò chuyện mới
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-6">
                Hỏi tôi bất kỳ điều gì về tài liệu này
              </p>
              <SuggestedQuestions onSelect={handleSuggestedQuestion} />
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Hỏi về nội dung tài liệu..."
        />
      </DialogContent>
    </Dialog>
  );
};
```

### 6.4. ChatMessage Component

```typescript
// components/ai/chat-message.tsx
"use client";

import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ChatMessageProps {
  message: {
    role: string;
    content: string;
    createdAt: number;
  };
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-blue-500" : "bg-purple-500"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      
      <div className={cn("flex-1 space-y-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-lg p-3 max-w-[80%]",
            isUser
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-800"
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-muted-foreground px-1">
          {formatDistanceToNow(new Date(message.createdAt), {
            addSuffix: true,
            locale: vi,
          })}
        </p>
      </div>
    </div>
  );
};
```

### 6.5. ChatInput Component

```typescript
// components/ai/chat-input.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useState, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = ({ onSend, disabled, placeholder }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="flex gap-2 border-t pt-4">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Nhập tin nhắn..."}
        disabled={disabled}
        className="min-h-[60px] max-h-[120px] resize-none"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};
```

### 6.6. SuggestedQuestions Component

```typescript
// components/ai/suggested-questions.tsx
"use client";

import { Button } from "@/components/ui/button";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  "Tóm tắt nội dung chính của tài liệu này",
  "Những điểm quan trọng nhất là gì?",
  "Giải thích chi tiết hơn về...",
  "Có ví dụ nào không?",
];

export const SuggestedQuestions = ({ onSelect }: SuggestedQuestionsProps) => {
  return (
    <div className="space-y-2 w-full max-w-md">
      <p className="text-sm text-muted-foreground text-center mb-3">
        Câu hỏi gợi ý:
      </p>
      <div className="grid grid-cols-1 gap-2">
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            className="justify-start text-left h-auto py-3"
            onClick={() => onSelect(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};
```

---

## 7. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| Message | Required, max 1000 chars | "Tin nhắn không được để trống" |
| Document | Must exist and owned by user | "Không có quyền truy cập" |
| API Key | Must be configured | "API key chưa được cấu hình" |

---

## 8. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not document owner | "Bạn không có quyền chat về tài liệu này" | Show error toast |
| `API_QUOTA_EXCEEDED` | Gemini quota exceeded | "Đã vượt quá giới hạn API. Vui lòng thử lại sau" | Show error toast |
| `API_ERROR` | Gemini API error | "Không thể gửi tin nhắn. Vui lòng thử lại" | Show error toast |
| `MESSAGE_TOO_LONG` | Message > 1000 chars | "Tin nhắn quá dài" | Show error toast |

---

## 9. TEST CASES

### Functional Tests:

**TC01: Send Message**
- Input: "Tóm tắt tài liệu này"
- Expected: AI responds with summary
- Actual: ⏳ Pending

**TC02: Conversation History**
- Input: Multiple messages
- Expected: Context maintained across messages
- Actual: ⏳ Pending

**TC03: New Conversation**
- Input: Click "Cuộc trò chuyện mới"
- Expected: Chat history cleared
- Actual: ⏳ Pending

---

## 10. CODE EXAMPLES

### 10.1. Chat with AI

```typescript
const chatWithAI = useAction(api.ai.chatWithAI);

const result = await chatWithAI({
  documentId: "j57abc123",
  conversationId: "conv-xyz",
  message: "Giải thích phần này",
});

console.log(result.response);
```

---

## 11. SECURITY CONSIDERATIONS

- ✅ **API Key Security:** Store in environment variables
- ✅ **Authentication:** Require login
- ✅ **Authorization:** Verify document ownership
- ✅ **Rate Limiting:** Limit messages per user
- ✅ **Content Filtering:** Sanitize user input
- ✅ **Privacy:** Store chats with userId check

---

## 12. PERFORMANCE OPTIMIZATION

- ✅ **Context Management:** Only send relevant document content
- ✅ **History Limit:** Max 10 messages in context
- ✅ **Lazy Loading:** Load conversations on demand
- ✅ **Cleanup:** Delete old conversations (60 days)
- ✅ **Streaming:** Stream responses for better UX

---

## 13. COST OPTIMIZATION

### Estimated Cost:
- 100 users × 20 messages/day × 500 chars = 1M chars/day
- Cost: $0.25/day = $7.50/month

### Cost Reduction:
1. ✅ **Context Limit:** Max 5000 chars of document content
2. ✅ **History Limit:** Max 10 messages in conversation
3. ✅ **Rate Limiting:** Max 50 messages per user per day
4. ✅ **Cleanup:** Delete old conversations

---

## 14. RELATED USE CASES

- **UC07:** Tạo trang mới - Source of content
- **UC09:** Sửa nội dung - Content changes affect context
- **UC18:** Tóm tắt AI - Can use summary in chat

---

## 15. REFERENCES

- [Google Gemini API](https://ai.google.dev/)
- [Gemini Chat API](https://ai.google.dev/docs/gemini_api_overview)
- [Convex Actions](https://docs.convex.dev/functions/actions)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Trạng thái:** Ready for implementation  
**Ước tính:** 1 tuần

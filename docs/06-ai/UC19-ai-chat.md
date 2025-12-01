# UC19 - Hỏi đáp với AI

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC19 |
| **Tên** | Hỏi đáp với AI (AI Chat/Q&A) |
| **Mô tả** | Người dùng chat với AI assistant (Google Gemini) để hỏi đáp về nội dung document, giải thích khái niệm, hoặc brainstorming ý tưởng |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Document tồn tại (optional)<br>- GEMINI_API_KEY configured |
| **Postcondition** | - Chat history được lưu<br>- Response từ AI hiển thị<br>- Context được maintain |
| **Độ ưu tiên** | 🟢 Thấp (Nice to have) |
| **Trạng thái** | ❌ Cần triển khai |
| **Sprint** | Sprint 7 (Week 8) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang xem document
2. Người dùng click "Chat with AI" button (💬 icon)
3. Hệ thống hiển thị chat sidebar/modal:
   - Chat history (nếu có)
   - Input box
   - Send button
4. Người dùng type câu hỏi
5. Người dùng click "Send" hoặc press Enter
6. Message được thêm vào chat history (user message)
7. Hiển thị "AI is typing..." indicator
8. Gọi `sendMessage` mutation với:
   - Message text
   - Document ID (for context)
   - Chat session ID
9. **AI Chat logic:**
   - Get document content (for context)
   - Get chat history (last 10 messages)
   - Build prompt với context
   - Call Google Gemini API
   - Stream response (optional)
10. AI response được insert vào chat history
11. Hiển thị response trong chat UI
12. "Typing" indicator biến mất
13. User có thể tiếp tục hỏi
14. Use case tiếp tục (conversational)

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Chat without document context**
- Tại bước 8: No document ID
- General Q&A mode
- No document context in prompt
- AI answers based on general knowledge

**A2: Copy AI response**
- Tại bước 11: Hover response → "Copy" button
- Click to copy
- Toast: "Copied!"

**A3: Insert response into document**
- Tại bước 11: Click "Insert"
- Insert AI response vào document
- At cursor position
- Close chat

**A4: Regenerate response**
- Tại bước 11: Click "Regenerate"
- Delete last AI message
- Resend last user message
- Get new response

**A5: Clear chat history**
- Tại bước 3: Click "Clear history"
- Confirm action
- Delete all messages in session
- Fresh start

**A6: Example prompts**
- Tại bước 3: Show suggested prompts:
  - "Explain this concept"
  - "Summarize this section"
  - "Give me examples"
  - "Create a quiz"
- Click prompt → Auto-fill input

**A7: Multi-turn conversation**
- Tại bước 13: User asks follow-up
- AI maintains context from previous messages
- Coherent conversation

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Empty message**
- Tại bước 5: Message is empty
- Disable send button
- No API call

**E2: API error**
- Tại bước 9: Gemini API failed
- Show error message in chat
- "Sorry, I encountered an error"
- Retry button

**E3: API key missing**
- Tại bước 9: GEMINI_API_KEY not set
- Show error: "AI chat not available"
- Contact admin

**E4: Rate limit**
- Tại bước 9: Too many requests
- Show error: "Too many messages. Wait a moment"
- Disable input for 1 minute

**E5: Network error**
- Tại bước 9: Connection lost
- Show error: "Connection lost"
- Message queued
- Retry when online

**E6: Message too long**
- Tại bước 5: Message > 1000 chars
- Show warning
- Truncate or prevent send

---

## 3. Biểu đồ hoạt động

```
┌─────────┐          ┌──────────┐          ┌────────┐          ┌─────────┐
│  User   │          │  System  │          │ Convex │          │ Gemini  │
└────┬────┘          └─────┬────┘          └───┬────┘          └────┬────┘
     │                     │                   │                     │
     │  1. Click "Chat"    │                   │                     │
     ├────────────────────>│                   │                     │
     │                     │                   │                     │
     │  2. Show chat UI    │                   │                     │
     │<────────────────────┤                   │                     │
     │                     │                   │                     │
     │  3. Type message    │                   │                     │
     ├────────────────────>│                   │                     │
     │                     │                   │                     │
     │  4. Click "Send"    │                   │                     │
     ├────────────────────>│                   │                     │
     │                     │                   │                     │
     │                     │  5. Send message  │                     │
     │                     ├──────────────────>│                     │
     │                     │                   │                     │
     │                     │  6. Get context   │                     │
     │                     │     (doc + hist)  │                     │
     │                     │                   │                     │
     │                     │  7. Build prompt  │                     │
     │                     │                   │                     │
     │                     │  8. Call Gemini   │                     │
     │                     ├─────────────────────────────────────────>│
     │                     │                   │                     │
     │                     │  9. Response      │                     │
     │                     │<─────────────────────────────────────────┤
     │                     │                   │                     │
     │                     │  10. Save msg     │                     │
     │                     │                   │                     │
     │  11. Show response  │                   │                     │
     │<────────────────────┤                   │                     │
     │                     │                   │                     │
     │  12. Continue chat  │                   │                     │
     ├────────────────────>│                   │                     │
     │                     │                   │                     │
```

---

## 4. Database Schema

### 4.1 Chat Sessions Table

```typescript
// convex/schema.ts
chatSessions: defineTable({
  userId: v.string(),
  documentId: v.optional(v.id("documents")),
  title: v.string(),                // Auto-generated from first message
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_document", ["documentId"]),
```

### 4.2 Chat Messages Table

```typescript
chatMessages: defineTable({
  sessionId: v.id("chatSessions"),
  userId: v.string(),
  role: v.string(),                 // "user" | "assistant"
  content: v.string(),
  createdAt: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_session_created", ["sessionId", "createdAt"]),
```

---

## 5. API Endpoints

### 5.1 Chat Mutations

```typescript
// convex/chat.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const createSession = mutation({
  args: {
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const sessionId = await ctx.db.insert("chatSessions", {
      userId,
      documentId: args.documentId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

export const sendMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate session
    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Save user message
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      userId,
      role: "user",
      content: args.message,
      createdAt: Date.now(),
    });

    // Get chat history
    const history = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .order("desc")
      .take(10);

    // Get document context if available
    let documentContext = "";
    if (session.documentId) {
      const document = await ctx.db.get(session.documentId);
      if (document?.content) {
        const plainText = extractPlainText(document.content);
        documentContext = plainText.substring(0, 2000); // Limit context
      }
    }

    // Build prompt
    const prompt = buildPrompt(args.message, history.reverse(), documentContext);

    // Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiMessage = response.text();

      // Save AI response
      await ctx.db.insert("chatMessages", {
        sessionId: args.sessionId,
        userId,
        role: "assistant",
        content: aiMessage,
        createdAt: Date.now(),
      });

      // Update session title if first message
      if (history.length === 0) {
        const title = args.message.substring(0, 50);
        await ctx.db.patch(args.sessionId, {
          title,
          updatedAt: Date.now(),
        });
      }

      return aiMessage;
    } catch (error: any) {
      console.error("Gemini API error:", error);
      throw new Error(`AI chat failed: ${error.message}`);
    }
  },
});

// Helper functions
function buildPrompt(
  userMessage: string,
  history: any[],
  documentContext: string
): string {
  let prompt = "";

  // Add document context
  if (documentContext) {
    prompt += `Context from document:\n${documentContext}\n\n`;
  }

  // Add chat history
  if (history.length > 0) {
    prompt += "Previous conversation:\n";
    for (const msg of history) {
      prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
    }
    prompt += "\n";
  }

  // Add current message
  prompt += `User: ${userMessage}\n\nAssistant:`;

  return prompt;
}

function extractPlainText(content?: string): string {
  // Same as UC18
  if (!content) return "";
  try {
    const blocks = JSON.parse(content);
    let text = "";
    const extractFromBlock = (block: any) => {
      if (block.content) {
        for (const item of block.content) {
          if (item.type === "text" && item.text) {
            text += item.text + " ";
          }
        }
      }
      if (block.children) {
        for (const child of block.children) {
          extractFromBlock(child);
        }
      }
    };
    for (const block of blocks) {
      extractFromBlock(block);
    }
    return text.trim();
  } catch (error) {
    return "";
  }
}
```

### 5.2 Chat Queries

```typescript
// convex/chat.ts
export const getMessages = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const session = await ctx.db.get(args.sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .order("asc")
      .collect();

    return messages;
  },
});

export const getSessions = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return sessions;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
components/ai/
├── chat-button.tsx                 # Trigger button
├── chat-sidebar.tsx                # Chat UI
├── chat-message.tsx                # Single message
├── chat-input.tsx                  # Input box
└── typing-indicator.tsx            # "AI is typing..."
```

### 6.2 Chat Sidebar

```typescript
// components/ai/chat-sidebar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ChatSidebarProps {
  documentId?: Id<"documents">;
  onClose: () => void;
}

export const ChatSidebar = ({ documentId, onClose }: ChatSidebarProps) => {
  const [sessionId, setSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createSession = useMutation(api.chat.createSession);
  const sendMessage = useMutation(api.chat.sendMessage);
  const messages = useQuery(
    api.chat.getMessages,
    sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    // Create session on mount
    createSession({ documentId }).then(setSessionId);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!sessionId) return;

    setIsTyping(true);

    try {
      await sendMessage({ sessionId, message });
    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">💬 AI Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((message) => (
          <ChatMessage key={message._id} message={message} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  );
};
```

### 6.3 Chat Message

```typescript
// components/ai/chat-message.tsx
"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { User, Bot, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatMessageProps {
  message: Doc<"chatMessages">;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard!");
  };

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3 group relative",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {!isUser && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};
```

### 6.4 Chat Input

```typescript
// components/ai/chat-input.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything..."
        disabled={disabled}
        className="resize-none"
        rows={3}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};
```

---

## 7. Validation Rules

### 7.1 Message Validation

| Rule | Check | Error |
|------|-------|-------|
| Not empty | Length > 0 | Disable send |
| Max length | <= 1000 chars | Truncate/warn |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Empty message | - | Disable send button |
| API error | "Failed to send" | Retry button |
| API key missing | "Chat not available" | Show error |
| Rate limit | "Too many messages" | Wait 1 minute |
| Network error | "Connection lost" | Queue message |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC19-01 | Send message | AI responds |
| TC19-02 | Multi-turn chat | Context maintained |
| TC19-03 | Copy response | Copied to clipboard |
| TC19-04 | Chat with document | Context-aware answers |
| TC19-05 | Clear history | All messages deleted |
| TC19-06 | API error | Error shown |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify authentication
- ✅ Check session ownership
- ✅ Secure API key
- ✅ Rate limiting
- ✅ Content moderation (optional)

---

## 12. Performance Optimization

- Limit chat history to 10 messages
- Paginate old messages
- Stream responses (optional)
- Cache common questions

---

## 13. Related Use Cases

- [UC18 - Tóm tắt AI](./UC18-ai-summary.md)
- [UC09 - Sửa nội dung](../02-documents/UC09-edit-content.md)

---

## 14. References

- [Google Gemini API](https://ai.google.dev/)
- [Chat UI Best Practices](https://www.nngroup.com/articles/chatbot-design/)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 3-4 days  
**Priority:** Low (Enhancement feature)

---

# 🎊 CONGRATULATIONS! 🎊

## ✅ 100% COMPLETE - ALL 19 USE CASES DOCUMENTED!

Bạn đã hoàn thành toàn bộ tài liệu cho dự án Notion Clone!

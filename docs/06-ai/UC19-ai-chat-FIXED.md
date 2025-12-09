# UC19 - HỎI ĐÁP AI (AI CHAT) - FIXED VERSION

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
- **Tech Stack:** Convex, Google Gemini API, React, TypeScript
- **⚠️ IMPORTANT:** Sử dụng **2 separate tables** (chatSessions + chatMessages) thay vì 1 table

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Chat với AI

1. User mở document
2. System hiển thị nút "Hỏi AI"
3. User click nút "Hỏi AI"
4. System hiển thị chat interface
5. System load existing sessions hoặc tạo session mới
6. User nhập câu hỏi
7. User click "Gửi"
8. System save user message
9. System gửi câu hỏi + document context đến Gemini API
10. System save assistant response
11. System hiển thị response
12. User có thể tiếp tục hỏi

### Alternative Flow: New conversation

5a. User click "Cuộc trò chuyện mới"
6a. System tạo session mới
7a. Continue từ step 6

### Exception Flow

- 9a. Nếu API error → Show error message
- 9b. Nếu API rate limit → Show "Vui lòng thử lại sau"
- *. Nếu unauthorized → Redirect to login

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [Open Chat] → [Load/Create Session] → [Type Question] → [Send]
                                                                      ↓
                                                              [Save User Message]
                                                                      ↓
                                                              [Call Gemini API]
                                                                      ↓
                                                              [Save AI Response]
                                                                      ↓
                                                              [Display + Continue]
```

---

## 4. DATABASE SCHEMA (NORMALIZED - 2 TABLES)

### ⚠️ IMPORTANT: Normalized Schema

Thay vì dùng 1 table với `conversationId` string, chúng ta dùng **2 separate tables** để tốt hơn về organization và queries.

### 4.1. Chat Sessions

```typescript
// convex/schema.ts (from schema_new.ts)
chatSessions: defineTable({
  userId: v.string(),
  documentId: v.id("documents"),
  title: v.optional(v.string()), // Auto-generated from first question
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_document", ["documentId"])
  .index("by_user_document", ["userId", "documentId"])
  .index("by_user_updated", ["userId", "updatedAt"]),
```

### 4.2. Chat Messages

```typescript
chatMessages: defineTable({
  sessionId: v.id("chatSessions"),  // ✅ Proper foreign key
  role: v.string(),           // "user" | "assistant"
  content: v.string(),
  model: v.optional(v.string()), // AI model used for assistant messages
  tokens: v.optional(v.number()), // Token count (for cost tracking)
  createdAt: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_session_created", ["sessionId", "createdAt"]),
```

### 4.3. Tại sao 2 tables tốt hơn?

✅ **Better organization:** Sessions và messages tách biệt  
✅ **Easier queries:** Query sessions list, then messages  
✅ **Metadata:** Session có thể có title, summary, etc.  
✅ **Performance:** Index on sessionId hiệu quả hơn

---

## 5. API ENDPOINTS

### 5.1. Chat with AI

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal } from "./_generated/api";

export const chatWithAI = action({
  args: {
    documentId: v.id("documents"),
    sessionId: v.optional(v.id("chatSessions")),  // ✅ Use sessionId
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
    
    // Get or create session
    let sessionId = args.sessionId;
    if (!sessionId) {
      // Create new session
      sessionId = await ctx.runMutation(internal.ai.createChatSession, {
        userId,
        documentId: args.documentId,
      });
    }
    
    // Get conversation history
    const history = await ctx.runQuery(internal.ai.getChatHistory, {
      sessionId,
    });
    
    // Extract document content as context
    const documentContext = extractPlainText(document.content);
    
    // Build conversation for Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{
            text: `Đây là nội dung tài liệu:\n\n${documentContext}\n\nHãy trả lời các câu hỏi dựa trên nội dung này.`,
          }],
        },
        {
          role: "model",
          parts: [{
            text: "Tôi đã hiểu nội dung tài liệu. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về nội dung này.",
          }],
        },
        ...history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });
    
    // Save user message
    await ctx.runMutation(internal.ai.saveChatMessage, {
      sessionId,
      role: "user",
      content: args.message,
    });
    
    try {
      // Send message and get response
      const result = await chat.sendMessage(args.message);
      const response = await result.response;
      const text = response.text();
      
      // Save assistant message
      await ctx.runMutation(internal.ai.saveChatMessage, {
        sessionId,
        role: "assistant",
        content: text,
        model: "gemini-pro",
      });
      
      // Update session timestamp
      await ctx.runMutation(internal.ai.updateSessionTimestamp, {
        sessionId,
      });
      
      return {
        sessionId,
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

// Helper function
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

### 5.2. Create Chat Session (Internal)

```typescript
export const createChatSession = internalMutation({
  args: {
    userId: v.string(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("chatSessions", {
      userId: args.userId,
      documentId: args.documentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return sessionId;
  },
});
```

### 5.3. Get Chat History (Internal)

```typescript
export const getChatHistory = internalQuery({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    return messages;
  },
});
```

### 5.4. Save Chat Message (Internal)

```typescript
export const saveChatMessage = internalMutation({
  args: {
    sessionId: v.id("chatSessions"),
    role: v.string(),
    content: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      model: args.model,
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});
```

### 5.5. Update Session Timestamp (Internal)

```typescript
export const updateSessionTimestamp = internalMutation({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
    });
  },
});
```

### 5.6. Get Chat Sessions

```typescript
export const getChatSessions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", userId).eq("documentId", args.documentId)
      )
      .order("desc")
      .collect();
    
    // Get first message for each session to show preview
    const sessionsWithPreview = await Promise.all(
      sessions.map(async (session) => {
        const firstMessage = await ctx.db
          .query("chatMessages")
          .withIndex("by_session_created", (q) => q.eq("sessionId", session._id))
          .first();
        
        const messageCount = await ctx.db
          .query("chatMessages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        
        return {
          ...session,
          preview: firstMessage?.content.substring(0, 100) || "",
          messageCount: messageCount.length,
        };
      })
    );
    
    return sessionsWithPreview;
  },
});
```

### 5.7. Get Session Messages

```typescript
export const getSessionMessages = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    return messages;
  },
});
```

### 5.8. Delete Session

```typescript
export const deleteSession = mutation({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Delete all messages in this session
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));
    
    // Delete session
    await ctx.db.delete(args.sessionId);
  },
});
```

---

## 6. UI COMPONENTS

### 6.1. ChatInterface Component

```typescript
// components/ai/chat-interface.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ChatInterfaceProps {
  documentId: Id<"documents">;
  open: boolean;
  onClose: () => void;
}

export const ChatInterface = ({ documentId, open, onClose }: ChatInterfaceProps) => {
  const sessions = useQuery(api.ai.getChatSessions, { documentId });
  const chatWithAI = useAction(api.ai.chatWithAI);
  
  const [currentSessionId, setCurrentSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load latest session on mount
  useEffect(() => {
    if (sessions && sessions.length > 0 && !currentSessionId) {
      const latest = sessions[0];
      setCurrentSessionId(latest._id);
      loadSessionMessages(latest._id);
    }
  }, [sessions]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const loadSessionMessages = async (sessionId: Id<"chatSessions">) => {
    const sessionMessages = await api.ai.getSessionMessages({ sessionId });
    setMessages(sessionMessages);
  };
  
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
        sessionId: currentSessionId || undefined,
        message,
      });
      
      // Update session ID if new
      if (!currentSessionId) {
        setCurrentSessionId(result.sessionId);
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
  
  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
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
              onClick={handleNewSession}
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
              <p className="text-muted-foreground">
                Hỏi tôi bất kỳ điều gì về tài liệu này
              </p>
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
| `API_QUOTA_EXCEEDED` | Gemini quota exceeded | "Đã vượt quá giới hạn API" | Show error toast |
| `API_ERROR` | Gemini API error | "Không thể gửi tin nhắn" | Show error toast |

---

## 9. TEST CASES

**TC01: Send Message with Session**
- Input: message, sessionId
- Expected: Message saved, AI responds
- Actual: ⏳ Pending

**TC02: Create New Session**
- Input: message, no sessionId
- Expected: New session created
- Actual: ⏳ Pending

**TC03: Load Session History**
- Input: sessionId
- Expected: All messages loaded
- Actual: ⏳ Pending

---

## 10. CODE EXAMPLES

### 10.1. Chat with AI

```typescript
const chatWithAI = useAction(api.ai.chatWithAI);

const result = await chatWithAI({
  documentId: "j57abc123",
  sessionId: session._id,  // ✅ Use sessionId (not conversationId)
  message: "Giải thích phần này",
});

console.log(result.response);
console.log(result.sessionId);  // ✅ Returns sessionId
```

### 10.2. Get Sessions

```typescript
const sessions = useQuery(api.ai.getChatSessions, {
  documentId: "j57abc123",
});

// Each session has:
// - _id (sessionId)
// - preview (first message)
// - messageCount
// - createdAt, updatedAt
```

---

## 11. SECURITY CONSIDERATIONS

- ✅ **API Key Security:** Store in environment variables
- ✅ **Authentication:** Require login
- ✅ **Authorization:** Verify document ownership
- ✅ **Session Ownership:** Verify session belongs to user
- ✅ **Rate Limiting:** Limit messages per user

---

## 12. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Indexes on sessionId, userId
- ✅ **Queries:** Use withIndex for filtering
- ✅ **History Limit:** Max 10 messages in context
- ✅ **Lazy Loading:** Load sessions on demand
- ✅ **Cleanup:** Delete old sessions (60 days)

---

## 13. COST OPTIMIZATION

### Estimated Cost:
- 100 users × 20 messages/day × 500 chars = 1M chars/day
- Cost: $0.25/day = $7.50/month

### Cost Reduction:
1. ✅ **Context Limit:** Max 5000 chars of document content
2. ✅ **History Limit:** Max 10 messages in conversation
3. ✅ **Rate Limiting:** Max 50 messages per user per day
4. ✅ **Cleanup:** Delete old sessions

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
- [CRITICAL_FIXES.md](../CRITICAL_FIXES.md) - Chi tiết về 2-table approach

---

**Tạo bởi:** AI Assistant  
**Ngày:** 10/12/2025  
**Trạng thái:** ✅ FIXED - Ready for implementation  
**Schema:** Normalized (2 tables: chatSessions + chatMessages)  
**Ước tính:** 1 tuần

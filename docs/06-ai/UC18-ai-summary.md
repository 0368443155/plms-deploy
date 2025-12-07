# UC18 - TÓM TẮT NỘI DUNG (AI SUMMARY)

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC18
- **Tên:** Tóm tắt nội dung trang bằng AI
- **Mô tả:** Sử dụng Google Gemini AI để tóm tắt nội dung document
- **Actor:** User (Authenticated)
- **Precondition:** 
  - User đã đăng nhập
  - Document có nội dung (min 100 chars)
  - Gemini API key đã được cấu hình
- **Postcondition:** Summary được hiển thị và cache
- **Trạng thái:** ❌ Chưa triển khai
- **Ưu tiên:** 🟢 THẤP
- **Thời gian ước tính:** 3-4 ngày
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ✅ Documents (UC07-UC13)
- **Tech Stack:** Convex, Google Gemini API, React, TypeScript

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Tóm tắt nội dung

1. User mở document
2. System hiển thị nút "Tóm tắt AI"
3. User click nút "Tóm tắt AI"
4. System kiểm tra cache (content hash)
5. Nếu có cache → Hiển thị summary từ cache
6. Nếu không có cache:
   - System extract plain text từ BlockNote content
   - System gọi Gemini API
   - System lưu summary vào cache
   - System hiển thị summary
7. User có thể copy summary

### Alternative Flow 1: Regenerate summary

6a. User click "Tạo lại"
7a. System force gọi API (bỏ qua cache)
8a. Continue từ step 6

### Alternative Flow 2: Content quá ngắn

4a. Nếu content < 100 chars
5a. System show error "Nội dung quá ngắn để tóm tắt"
6a. End

### Exception Flow

- 6a. Nếu API error → Show error message
- 6b. Nếu API rate limit → Show "Vui lòng thử lại sau"
- 6c. Nếu network error → Retry with exponential backoff
- *. Nếu unauthorized → Redirect to login

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [Click Summarize] → [Check Cache] → [Cache Hit?]
                                                  ↓ Yes
                                            [Show Cached Summary]
                                                  ↓ No
                                            [Extract Text] → [Call Gemini API] → [Cache Result] → [Show Summary]
                                                                    ↓ (error)
                                                              [Show Error]
```

---

## 4. DATABASE SCHEMA

### 4.1. AI Summaries Table

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables ...
  
  aiSummaries: defineTable({
    documentId: v.id("documents"),       // Link to document
    userId: v.string(),                  // Owner
    summary: v.string(),                 // AI-generated summary
    contentHash: v.string(),             // Hash of content to detect changes
    model: v.string(),                   // AI model used (e.g., "gemini-pro")
    tokenCount: v.optional(v.number()),  // Tokens used
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"])
    .index("by_document_hash", ["documentId", "contentHash"]),
});
```

### 4.2. Tương thích với Documents

- ✅ Link với documents qua documentId
- ✅ Cache invalidation qua contentHash
- ✅ Không ảnh hưởng đến documents table

---

## 5. API ENDPOINTS

### 5.1. Summarize Document

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

export const summarizeDocument = action({
  args: {
    documentId: v.id("documents"),
    forceRegenerate: v.optional(v.boolean()),
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
    
    // Extract plain text from BlockNote content
    const plainText = extractPlainText(document.content);
    
    if (!plainText || plainText.length < 100) {
      throw new Error("Content too short to summarize (minimum 100 characters)");
    }
    
    // Calculate content hash
    const contentHash = hashContent(plainText);
    
    // Check cache if not forcing regeneration
    if (!args.forceRegenerate) {
      const cached = await ctx.runQuery(internal.ai.getCachedSummary, {
        documentId: args.documentId,
        contentHash,
      });
      
      if (cached) {
        return {
          summary: cached.summary,
          fromCache: true,
          model: cached.model,
        };
      }
    }
    
    // Call Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Hãy tóm tắt nội dung sau một cách ngắn gọn và súc tích (khoảng 3-5 câu):

${plainText}

Tóm tắt:`;
    
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();
      
      // Cache the result
      await ctx.runMutation(internal.ai.cacheSummary, {
        documentId: args.documentId,
        userId,
        summary,
        contentHash,
        model: "gemini-pro",
      });
      
      return {
        summary,
        fromCache: false,
        model: "gemini-pro",
      };
    } catch (error: any) {
      console.error("Gemini API error:", error);
      
      if (error.message?.includes("quota")) {
        throw new Error("API quota exceeded. Please try again later.");
      }
      
      throw new Error("Failed to generate summary. Please try again.");
    }
  },
});

// Helper functions
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

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
```

### 5.2. Get Cached Summary (Internal)

```typescript
export const getCachedSummary = internalQuery({
  args: {
    documentId: v.id("documents"),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document_hash", (q) =>
        q.eq("documentId", args.documentId).eq("contentHash", args.contentHash)
      )
      .first();
    
    return cached;
  },
});
```

### 5.3. Cache Summary (Internal)

```typescript
export const cacheSummary = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    summary: v.string(),
    contentHash: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete old cache for this document
    const oldCache = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    
    await Promise.all(oldCache.map((cache) => ctx.db.delete(cache._id)));
    
    // Insert new cache
    const summaryId = await ctx.db.insert("aiSummaries", {
      documentId: args.documentId,
      userId: args.userId,
      summary: args.summary,
      contentHash: args.contentHash,
      model: args.model,
      createdAt: Date.now(),
    });
    
    return summaryId;
  },
});
```

### 5.4. Get Summary History

```typescript
export const getSummaryHistory = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const summaries = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(5);
    
    return summaries;
  },
});
```

---

## 6. UI COMPONENTS

### 6.1. Component Structure

```
components/ai/
├── summarize-button.tsx        # Trigger button
├── summary-modal.tsx           # Display summary
└── summary-skeleton.tsx        # Loading state
```

### 6.2. SummarizeButton Component

```typescript
// components/ai/summarize-button.tsx
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
```

### 6.3. SummaryModal Component

```typescript
// components/ai/summary-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { SummarySkeleton } from "./summary-skeleton";

interface SummaryModalProps {
  documentId: Id<"documents">;
  open: boolean;
  onClose: () => void;
}

export const SummaryModal = ({ documentId, open, onClose }: SummaryModalProps) => {
  const summarize = useAction(api.ai.summarizeDocument);
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [model, setModel] = useState("");
  
  useEffect(() => {
    if (open && !summary) {
      handleSummarize();
    }
  }, [open]);
  
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
    navigator.clipboard.writeText(summary);
    toast.success("Đã copy tóm tắt!");
  };
  
  const handleRegenerate = () => {
    handleSummarize(true);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Tóm tắt AI
          </DialogTitle>
          <DialogDescription>
            Tóm tắt nội dung trang bằng Google Gemini AI
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <SummarySkeleton />
          ) : summary ? (
            <>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {fromCache ? "📦 Từ cache" : "✨ Mới tạo"} • Model: {model}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tạo lại
                </Button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Click "Tóm tắt" để bắt đầu
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### 6.4. SummarySkeleton Component

```typescript
// components/ai/summary-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const SummarySkeleton = () => {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
};
```

### 6.5. Integration với Document Page

```typescript
// app/(main)/(routes)/documents/[documentId]/page.tsx
import { SummarizeButton } from "@/components/ai/summarize-button";

const DocumentIdPage = ({ params }: { params: { documentId: string } }) => {
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <SummarizeButton documentId={params.documentId as Id<"documents">} />
        {/* Other toolbar buttons */}
      </div>
      
      {/* Editor */}
      <Editor documentId={params.documentId} />
    </div>
  );
};
```

---

## 7. ENVIRONMENT SETUP

### 7.1. Environment Variables

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

### 7.2. Get Gemini API Key

1. Truy cập: https://makersuite.google.com/app/apikey
2. Tạo API key mới
3. Copy và paste vào `.env.local`

### 7.3. Install Dependencies

```bash
npm install @google/generative-ai
```

---

## 8. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| Content | Min 100 chars | "Nội dung quá ngắn để tóm tắt" |
| API Key | Must be configured | "API key chưa được cấu hình" |
| Document | Must exist and owned by user | "Không có quyền truy cập" |

---

## 9. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not document owner | "Bạn không có quyền tóm tắt trang này" | Show error toast |
| `CONTENT_TOO_SHORT` | Content < 100 chars | "Nội dung quá ngắn để tóm tắt" | Show error toast |
| `API_QUOTA_EXCEEDED` | Gemini quota exceeded | "Đã vượt quá giới hạn API. Vui lòng thử lại sau" | Show error toast |
| `API_ERROR` | Gemini API error | "Không thể tạo tóm tắt. Vui lòng thử lại" | Show error toast |

---

## 10. TEST CASES

### Functional Tests:

**TC01: Summarize Document**
- Input: Document with 500 chars
- Expected: Summary generated successfully
- Actual: ⏳ Pending

**TC02: Cache Hit**
- Input: Summarize same document twice
- Expected: Second time uses cache
- Actual: ⏳ Pending

**TC03: Content Too Short**
- Input: Document with 50 chars
- Expected: Error "Content too short"
- Actual: ⏳ Pending

**TC04: Regenerate**
- Input: Click "Tạo lại"
- Expected: New summary generated (bypass cache)
- Actual: ⏳ Pending

### Non-functional Tests:

**Performance:**
- API call: < 5s
- Cache retrieval: < 100ms
- Actual: ⏳ Pending

**Cost:**
- Cache hit rate: > 70%
- API calls per user per day: < 50
- Actual: ⏳ Pending

---

## 11. CODE EXAMPLES

### 11.1. Summarize Document

```typescript
const summarize = useAction(api.ai.summarizeDocument);

const result = await summarize({
  documentId: "j57abc123",
  forceRegenerate: false,
});

console.log(result.summary);
console.log(result.fromCache); // true/false
```

### 11.2. Extract Plain Text

```typescript
function extractPlainText(content: string): string {
  const blocks = JSON.parse(content);
  
  return blocks
    .map((block: any) => block.content?.map((c: any) => c.text).join(""))
    .join("\n");
}
```

---

## 12. SECURITY CONSIDERATIONS

- ✅ **API Key Security:** Store in environment variables, never expose to client
- ✅ **Authentication:** Require login for all operations
- ✅ **Authorization:** Verify document ownership
- ✅ **Rate Limiting:** Limit API calls per user
- ✅ **Content Validation:** Sanitize input before sending to API
- ✅ **Cache Security:** Store summaries with userId check

---

## 13. PERFORMANCE OPTIMIZATION

- ✅ **Caching:** Cache summaries by content hash (70%+ hit rate)
- ✅ **Content Hashing:** Detect content changes efficiently
- ✅ **Lazy Loading:** Only summarize when user requests
- ✅ **Cleanup:** Delete old cache entries (30 days)
- ✅ **Batch Processing:** Consider batch summarization for multiple documents

---

## 14. COST OPTIMIZATION

### Gemini API Pricing (Free Tier):
- **Free:** 60 requests per minute
- **Paid:** $0.00025 per 1K characters

### Cost Reduction Strategies:
1. ✅ **Aggressive Caching:** Cache by content hash
2. ✅ **Content Length Limit:** Max 5000 chars per summary
3. ✅ **Rate Limiting:** Max 10 summaries per user per day
4. ✅ **Cleanup:** Delete old summaries after 30 days

### Estimated Cost:
- 100 users × 5 summaries/day × 1000 chars = 500K chars/day
- Cost: $0.125/day = $3.75/month (with 70% cache hit rate)

---

## 15. RELATED USE CASES

- **UC07:** Tạo trang mới - Source of content to summarize
- **UC09:** Sửa nội dung - Content changes invalidate cache
- **UC19:** Hỏi đáp AI - Can use summary as context

---

## 16. REFERENCES

- [Google Gemini API](https://ai.google.dev/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Convex Actions](https://docs.convex.dev/functions/actions)
- [Implementation Guide](../UPDATE_GUIDE.md)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Trạng thái:** Ready for implementation  
**Ước tính:** 3-4 ngày

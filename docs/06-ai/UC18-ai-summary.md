# UC18 - Tóm tắt nội dung bằng AI

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC18 |
| **Tên** | Tóm tắt nội dung bằng AI (AI Summarization) |
| **Mô tả** | Người dùng sử dụng Google Gemini AI để tóm tắt nội dung document dài thành các điểm chính |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Document có nội dung (>100 characters)<br>- GEMINI_API_KEY configured |
| **Postcondition** | - Summary được tạo<br>- Summary được cache<br>- Hiển thị trong UI |
| **Độ ưu tiên** | 🟢 Thấp (Nice to have) |
| **Trạng thái** | ❌ Cần triển khai |
| **Sprint** | Sprint 7 (Week 8) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang xem document
2. Document có nội dung dài (>500 words)
3. Người dùng click button "Summarize with AI" (✨ icon)
4. Hệ thống hiển thị loading state
5. Gọi `summarizeDocument` mutation với documentId
6. **AI Summarization logic:**
   - Get document content
   - Extract plain text từ BlockNote JSON
   - Check minimum length (>100 chars)
   - Check cache (by content hash)
   - If cached → Return cached summary
   - If not cached:
     - Call Google Gemini API
     - Prompt: "Tóm tắt nội dung sau thành các điểm chính"
     - Get response
     - Cache result với content hash
7. Hệ thống nhận summary từ API
8. Hiển thị summary trong modal/sidebar:
   - Bullet points
   - Key takeaways
   - Main topics
9. User có thể:
   - Copy summary
   - Insert vào document
   - Regenerate
10. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Summary đã được cache**
- Tại bước 6: Content hash match
- Return cached summary ngay lập tức
- Show "Cached" indicator
- No API call (save cost)

**A2: Copy summary**
- Tại bước 9: Click "Copy"
- Copy to clipboard
- Toast: "Summary copied!"

**A3: Insert into document**
- Tại bước 9: Click "Insert"
- Insert summary at cursor position
- As quote block hoặc heading
- Close modal

**A4: Regenerate summary**
- Tại bước 9: Click "Regenerate"
- Clear cache for this document
- Call API again
- Get fresh summary
- Update cache

**A5: Different summary styles**
- Tại bước 6: User chọn style
- Options:
  - Bullet points (default)
  - Paragraph
  - Key points only
  - Detailed summary
- Adjust prompt accordingly

**A6: Translate summary**
- Tại bước 9: Click "Translate"
- Choose language
- Call Gemini with translation prompt
- Show translated summary

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Content too short**
- Tại bước 6: Content < 100 characters
- Show error: "Content too short to summarize"
- Suggest: "Add more content first"
- Don't call API

**E2: API error**
- Tại bước 6: Gemini API failed
- Show error: "Failed to generate summary"
- Retry button
- Log error

**E3: API key missing**
- Tại bước 6: GEMINI_API_KEY not set
- Show error: "AI feature not configured"
- Contact admin message

**E4: Rate limit exceeded**
- Tại bước 6: Too many requests
- Show error: "Too many requests. Try again later"
- Show countdown timer
- Use cached summaries

**E5: Network error**
- Tại bước 6: Connection lost
- Show error: "Network error"
- Retry button
- Check cached version

---

## 3. Biểu đồ hoạt động

```
┌─────────┐          ┌──────────┐          ┌────────┐          ┌─────────┐
│  User   │          │  System  │          │ Convex │          │ Gemini  │
└────┬────┘          └─────┬────┘          └───┬────┘          └────┬────┘
     │                     │                   │                     │
     │  1. Click           │                   │                     │
     │  "Summarize"        │                   │                     │
     ├────────────────────>│                   │                     │
     │                     │                   │                     │
     │  2. Show loading    │                   │                     │
     │<────────────────────┤                   │                     │
     │                     │                   │                     │
     │                     │  3. Summarize     │                     │
     │                     ├──────────────────>│                     │
     │                     │                   │                     │
     │                     │  4. Get content   │                     │
     │                     │                   │                     │
     │                     │  5. Check cache   │                     │
     │                     │                   │                     │
     │                     ▼                   │                     │
     │                ◇─────────◇              │                     │
     │               / Cached?   \             │                     │
     │              ◇─────────────◇            │                     │
     │              │             │            │                     │
     │            [Yes]         [No]           │                     │
     │              │             │            │                     │
     │              ▼             ▼            │                     │
     │         ┌─────────┐  ┌──────────────┐  │                     │
     │         │ Return  │  │ Call Gemini  │  │                     │
     │         │ cache   │  ├──────────────┤  │                     │
     │         └────┬────┘  │              │  │                     │
     │              │       │  6. API call ├─────────────────────────>│
     │              │       │              │  │                     │
     │              │       │  7. Response │<─────────────────────────┤
     │              │       │              │  │                     │
     │              │       │  8. Cache    │  │                     │
     │              │       │     result   │  │                     │
     │              │       └──────┬───────┘  │                     │
     │              │              │          │                     │
     │              └──────┬───────┘          │                     │
     │                     │                  │                     │
     │                     │  9. Return       │                     │
     │                     │<─────────────────┤                     │
     │                     │                  │                     │
     │  10. Show summary   │                  │                     │
     │<────────────────────┤                  │                     │
     │                     │                  │                     │
```

---

## 4. Database Schema

### 4.1 AI Summaries Table

```typescript
// convex/schema.ts
aiSummaries: defineTable({
  documentId: v.id("documents"),
  userId: v.string(),
  summary: v.string(),
  contentHash: v.string(),          // MD5 hash of content
  model: v.string(),                // "gemini-pro"
  tokensUsed: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_document", ["documentId"])
  .index("by_document_hash", ["documentId", "contentHash"])
  .index("by_user", ["userId"]),
```

---

## 5. API Endpoints

### 5.1 Summarize Mutation

```typescript
// convex/ai.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

export const summarizeDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get document
    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Extract plain text from BlockNote JSON
    const plainText = extractPlainText(document.content);

    if (plainText.length < 100) {
      throw new Error("Content too short to summarize (minimum 100 characters)");
    }

    // Generate content hash
    const contentHash = crypto
      .createHash("md5")
      .update(plainText)
      .digest("hex");

    // Check cache
    const cached = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document_hash", (q) =>
        q.eq("documentId", args.documentId).eq("contentHash", contentHash)
      )
      .first();

    if (cached) {
      return {
        summary: cached.summary,
        cached: true,
      };
    }

    // Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Hãy tóm tắt nội dung sau thành các điểm chính (bullet points). Chỉ trả về phần tóm tắt, không cần giải thích thêm:\n\n${plainText}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      // Cache result
      await ctx.db.insert("aiSummaries", {
        documentId: args.documentId,
        userId,
        summary,
        contentHash,
        model: "gemini-pro",
        tokensUsed: response.usageMetadata?.totalTokenCount,
        createdAt: Date.now(),
      });

      return {
        summary,
        cached: false,
      };
    } catch (error: any) {
      console.error("Gemini API error:", error);
      throw new Error(`AI summarization failed: ${error.message}`);
    }
  },
});

// Helper function to extract plain text
function extractPlainText(content?: string): string {
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

### 5.2 Clear Cache Mutation

```typescript
// convex/ai.ts
export const clearSummaryCache = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const summaries = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const summary of summaries) {
      await ctx.db.delete(summary._id);
    }

    return summaries.length;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
components/ai/
├── summarize-button.tsx            # Trigger button
├── summary-modal.tsx               # Summary display
└── summary-skeleton.tsx            # Loading state
```

### 6.2 Summarize Button

```typescript
// components/ai/summarize-button.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SummaryModal } from "./summary-modal";

interface SummarizeButtonProps {
  documentId: Id<"documents">;
}

export const SummarizeButton = ({ documentId }: SummarizeButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const summarize = useMutation(api.ai.summarizeDocument);

  const handleSummarize = async () => {
    setIsLoading(true);
    setIsOpen(true);

    try {
      const result = await summarize({ documentId });
      setSummary(result.summary);
      setIsCached(result.cached);
    } catch (error: any) {
      console.error("Summarize error:", error);
      
      if (error.message.includes("too short")) {
        toast.error("Content too short to summarize");
      } else if (error.message.includes("not configured")) {
        toast.error("AI feature not available");
      } else {
        toast.error("Failed to generate summary");
      }
      
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSummarize}
        variant="ghost"
        size="sm"
        disabled={isLoading}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {isLoading ? "Summarizing..." : "Summarize with AI"}
      </Button>

      <SummaryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        summary={summary}
        isCached={isCached}
        isLoading={isLoading}
        documentId={documentId}
      />
    </>
  );
};
```

### 6.3 Summary Modal

```typescript
// components/ai/summary-modal.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SummarySkeleton } from "./summary-skeleton";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  isCached: boolean;
  isLoading: boolean;
  documentId: Id<"documents">;
}

export const SummaryModal = ({
  isOpen,
  onClose,
  summary,
  isCached,
  isLoading,
  documentId,
}: SummaryModalProps) => {
  const clearCache = useMutation(api.ai.clearSummaryCache);
  const summarize = useMutation(api.ai.summarizeDocument);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Summary copied to clipboard!");
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);

    try {
      await clearCache({ documentId });
      const result = await summarize({ documentId });
      toast.success("Summary regenerated!");
    } catch (error) {
      toast.error("Failed to regenerate summary");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Summary
            {isCached && (
              <span className="text-xs text-muted-foreground font-normal">
                (Cached)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <SummarySkeleton />
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{summary}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={isLoading}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isLoading || isRegenerating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 7. Validation Rules

### 7.1 Content Validation

| Rule | Check | Error |
|------|-------|-------|
| Min length | >= 100 chars | "Content too short" |
| Valid JSON | Parse-able | "Invalid content" |
| Max length | <= 50,000 chars | "Content too long" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Content too short | "Content too short" | Show error |
| API key missing | "AI not configured" | Contact admin |
| API error | "Failed to generate" | Retry button |
| Rate limit | "Too many requests" | Show countdown |
| Network error | "Connection lost" | Retry |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC18-01 | Summarize document | Summary generated |
| TC18-02 | Use cached summary | Instant return |
| TC18-03 | Copy summary | Copied to clipboard |
| TC18-04 | Regenerate | New summary created |
| TC18-05 | Content too short | Error shown |
| TC18-06 | API error | Error handled |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify authentication
- ✅ Check document ownership
- ✅ Secure API key
- ✅ Rate limiting
- ✅ Content validation

---

## 12. Performance Optimization

- Cache summaries by content hash
- Limit API calls
- Debounce requests
- Show loading states

---

## 13. Related Use Cases

- [UC19 - Hỏi đáp AI](./UC19-ai-chat.md)
- [UC09 - Sửa nội dung](../02-documents/UC09-edit-content.md)

---

## 14. References

- [Google Gemini API](https://ai.google.dev/)
- [Gemini Node.js SDK](https://www.npmjs.com/package/@google/generative-ai)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 2-3 days

# 🔄 Alternative: Sử dụng Puter.js thay vì Google Gemini API

## Vấn đề hiện tại

- Model `gemini-pro` đã deprecated (404 error)
- Cần API key từ Google
- Có quota limits

## Giải pháp: Puter.js

Theo [Puter.js documentation](https://developer.puter.com/tutorials/free-gemini-api/), Puter.js cung cấp **free, unlimited access** đến Gemini API mà không cần API key.

### ⚠️ Lưu ý quan trọng

**Puter.js là client-side library**, không thể chạy trực tiếp trong Convex actions (server-side). Có 2 cách tiếp cận:

---

## Option 1: Sửa model name (Khuyến nghị - Đơn giản nhất)

Đã sửa code để dùng `gemini-1.5-flash` thay vì `gemini-pro`. Model này:
- ✅ Vẫn free
- ✅ Nhanh hơn
- ✅ Hỗ trợ tốt hơn
- ✅ Không cần thay đổi architecture

**Chỉ cần restart Convex dev server là xong!**

---

## Option 2: Hybrid Approach - Puter.js từ Client

Nếu muốn dùng Puter.js (không cần API key), cần refactor để gọi từ client:

### Architecture mới:

```
Client (Browser) → Puter.js → Gemini API
     ↓
  Save to Convex (mutation)
```

### Implementation:

#### 1. Update `components/ai/summary-modal.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Load Puter.js script
useEffect(() => {
  if (typeof window !== "undefined" && !window.puter) {
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    document.head.appendChild(script);
  }
}, []);

const handleSummarize = async () => {
  if (!window.puter) {
    toast.error("Puter.js chưa load xong");
    return;
  }

  setIsLoading(true);
  
  try {
    // Get document content (cần query từ Convex trước)
    const document = await getDocument(); // Your query here
    
    // Extract plain text
    const plainText = extractPlainText(document.content);
    
    // Call Puter.js (client-side)
    const response = await window.puter.ai.chat(
      `Hãy tóm tắt nội dung sau một cách ngắn gọn và súc tích (khoảng 3-5 câu):\n\n${plainText}\n\nTóm tắt:`,
      { model: "gemini-2.5-flash" }
    );
    
    // Save to Convex
    await cacheSummary({
      documentId,
      summary: response,
      model: "gemini-2.5-flash",
    });
    
    setSummary(response);
    toast.success("Đã tạo tóm tắt!");
  } catch (error) {
    toast.error("Không thể tạo tóm tắt");
  } finally {
    setIsLoading(false);
  }
};
```

#### 2. Update `components/ai/chat-interface.tsx`:

Tương tự, gọi Puter.js từ client thay vì Convex action.

### Pros & Cons:

**Pros:**
- ✅ Không cần API key
- ✅ Unlimited usage
- ✅ Free

**Cons:**
- ❌ Phải refactor nhiều code
- ❌ Logic chuyển từ server → client
- ❌ Phụ thuộc vào Puter.js service
- ❌ Security: API calls từ client (có thể bị abuse)
- ❌ Không thể cache tốt như server-side

---

## Option 3: Keep Google API + Update Model (Recommended)

**Đã implement:** Sửa `gemini-pro` → `gemini-1.5-flash`

### Available models:

- `gemini-1.5-flash` - Fast, free tier
- `gemini-1.5-pro` - Better quality, still free
- `gemini-2.0-flash` - Latest, may need paid tier

### Update code:

```typescript
// convex/ai.ts
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
```

**Đã sửa xong!** Chỉ cần restart Convex dev server.

---

## So sánh

| Feature | Google API (Current) | Puter.js |
|---------|---------------------|----------|
| API Key | ✅ Cần | ❌ Không cần |
| Quota | ⚠️ Có giới hạn | ✅ Unlimited |
| Server-side | ✅ Có thể | ❌ Chỉ client |
| Security | ✅ Tốt hơn | ⚠️ Client-side |
| Setup | ✅ Đơn giản | ⚠️ Phức tạp hơn |
| Reliability | ✅ Google | ⚠️ Phụ thuộc Puter |

---

## Khuyến nghị

**Dùng Option 3** (đã implement):
1. ✅ Đơn giản nhất
2. ✅ Không cần refactor
3. ✅ Model mới hơn, tốt hơn
4. ✅ Vẫn free với quota hợp lý
5. ✅ Security tốt hơn (server-side)

**Chỉ dùng Puter.js nếu:**
- Cần unlimited usage
- Không muốn dùng API key
- OK với việc refactor code

---

## Next Steps

1. ✅ **Đã sửa:** Model name từ `gemini-pro` → `gemini-1.5-flash`
2. **Restart:** `npx convex dev`
3. **Test:** Thử lại tính năng AI

Nếu vẫn lỗi, có thể cần:
- Update `@google/generative-ai` package
- Hoặc thử model khác: `gemini-1.5-pro`


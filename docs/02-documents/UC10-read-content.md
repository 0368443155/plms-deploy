# UC10 - Đọc nội dung trang

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC10 |
| **Tên** | Đọc nội dung trang (Read Document Content) |
| **Mô tả** | Người dùng xem nội dung document ở chế độ read-only, hỗ trợ cả public sharing và private viewing |
| **Actor** | - Người dùng đã đăng nhập (owner)<br>- Người dùng khác (nếu document public)<br>- Anonymous user (nếu document public) |
| **Precondition** | - Document tồn tại<br>- Document không bị archived<br>- User có quyền xem (owner hoặc document published) |
| **Postcondition** | - Content hiển thị đúng format<br>- Read-only mode active<br>- Public URL accessible (nếu published) |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow - Private View)

1. Người dùng (owner) click vào document trong sidebar
2. Hệ thống navigate đến `/documents/[documentId]`
3. Hệ thống gọi `getById` query với documentId
4. **Authorization check:**
   - Get current user identity
   - Check if user owns document
   - If yes → Allow access
5. Load document data từ Convex
6. Hiển thị document với:
   - Cover image (nếu có)
   - Icon (nếu có)
   - Title
   - Content (BlockNote read-only)
7. Editor mode = read-only (editable = false)
8. Hiển thị toolbar với edit button
9. User có thể:
   - Scroll để đọc
   - Click "Edit" để chuyển sang edit mode
   - Share document (nếu published)
10. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Public view (Published document)**
- Tại bước 3: User access public URL
- URL format: `/preview/[documentId]`
- Tại bước 4: Check if document.isPublished = true
- If yes → Allow access (no auth required)
- If no → Show "Document not found" (security)
- Hiển thị read-only view
- Hide edit button
- Show "Powered by Notion Clone" footer

**A2: Switch to edit mode**
- Tại bước 9: Owner click "Edit" button
- Check authentication
- Check ownership
- Switch editor to editable = true
- Show save indicator
- Enable toolbar actions

**A3: View nested documents**
- Tại bước 9: Click child document link
- Navigate to child document
- Repeat flow for child
- Breadcrumb navigation shown

**A4: Print view**
- Tại bước 9: Click "Print" or Ctrl+P
- Hide sidebar
- Hide toolbar
- Optimize for printing
- Show print dialog

**A5: Share public link**
- Tại bước 9: Click "Share"
- If not published → Show publish modal
- If published → Copy public URL
- Show toast "Link copied"

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Document not found**
- Tại bước 5: Document doesn't exist
- Show "Document not found" page
- Redirect to documents list
- Or show 404 page

**E2: Unauthorized access**
- Tại bước 4: User not owner and document not published
- Throw "Unauthorized" error
- Show "You don't have access" page
- Suggest sign in (if not authenticated)

**E3: Document archived**
- Tại bước 4: Document.isArchived = true
- Owner: Show archived document with restore option
- Others: Show "Document not found"

**E4: Loading error**
- Tại bước 5: Network error or DB error
- Show error message
- Retry button
- Fallback to cached version (if available)

**E5: Content parsing error**
- Tại bước 6: Invalid JSON content
- Show error: "Failed to load content"
- Fallback to plain text view
- Log error for debugging

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Click document      │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Navigate to page    │                       │
     │                         │                       │
     │                         │  3. Get document      │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  4. Check auth        │
     │                         │                       │
     │                         ▼                       │
     │                    ◇─────────◇                  │
     │                   / Published \                 │
     │                  /   or owner?  \               │
     │                 ◇───────────────◇               │
     │                 │               │               │
     │               [Yes]           [No]              │
     │                 │               │               │
     │                 ▼               ▼               │
     │         ┌──────────────┐  ┌──────────────┐     │
     │         │ Return doc   │  │ Throw error  │     │
     │         │<─────────────┤  │<─────────────┤     │
     │         │              │  │              │     │
     │  5. Show document       │  │ Show error   │     │
     │<────────────────────────┤  │<─────────────┤     │
     │                         │                       │
     │  6. Read-only view      │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  7. Scroll/Read         │                       │
     │                         │                       │
     
     
     [PUBLIC SHARING FLOW]
     
     │  1. Access public URL   │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  2. Get document      │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  3. Check published   │
     │                         │                       │
     │                         ▼                       │
     │                    ◇─────────◇                  │
     │                   / Published? \                │
     │                  ◇─────────────◇                │
     │                  │             │                │
     │                [Yes]         [No]               │
     │                  │             │                │
     │                  ▼             ▼                │
     │         ┌──────────────┐  ┌──────────────┐     │
     │         │ Show public  │  │ Show 404     │     │
     │         │ view         │  │              │     │
     │         │<─────────────┤  │<─────────────┤     │
     │         │              │                       │
     │  4. Read content        │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

---

## 4. Database Schema

### 4.1 Document Access Control

```typescript
// convex/schema.ts
documents: defineTable({
  title: v.string(),
  userId: v.string(),              // Owner
  isArchived: v.boolean(),
  parentDocument: v.optional(v.id("documents")),
  content: v.optional(v.string()),
  coverImage: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPublished: v.boolean(),        // Public access flag
})
```

### 4.2 Access Rules

| Condition | Can View | Mode |
|-----------|----------|------|
| Owner + Not archived | ✅ Yes | Edit or Read |
| Owner + Archived | ✅ Yes | Read (with restore) |
| Published + Not archived | ✅ Yes | Read-only |
| Published + Archived | ❌ No | - |
| Not owner + Not published | ❌ No | - |

---

## 5. API Endpoints

### 5.1 Get Document Query

```typescript
// convex/documents.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new Error("Not found");
    }

    // Public access: Anyone can see if published and not archived
    if (document.isPublished && !document.isArchived) {
      return document;
    }

    // Private access: Must be authenticated
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Owner access: Can see even if not published
    if (document.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return document;
  },
});
```

### 5.2 Get Public Document Query

```typescript
// convex/documents.ts
export const getPublicDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new Error("Not found");
    }

    // Only return if published and not archived
    if (!document.isPublished || document.isArchived) {
      throw new Error("Not found"); // Don't reveal existence
    }

    return document;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/(routes)/documents/[documentId]/
└── page.tsx                        # Private view

app/(public)/(routes)/preview/[documentId]/
└── page.tsx                        # Public view

components/
├── cover.tsx                       # Cover image
├── toolbar.tsx                     # Title toolbar
├── editor.tsx                      # Content editor (read-only)
└── publish-button.tsx              # Publish toggle
```

### 6.2 Private Document Page

```typescript
// app/(main)/(routes)/documents/[documentId]/page.tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Cover } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";

interface DocumentIdPageProps {
  params: {
    documentId: Id<"documents">;
  };
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );

  const document = useQuery(api.documents.getById, {
    documentId: params.documentId,
  });

  const update = useMutation(api.documents.update);

  const onChange = (content: string) => {
    update({
      id: params.documentId,
      content,
    });
  };

  if (document === undefined) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto mt-10">
          <div className="space-y-4 pl-8 pt-4">
            <Skeleton className="h-14 w-[50%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[40%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      </div>
    );
  }

  if (document === null) {
    return <div>Not found</div>;
  }

  return (
    <div className="pb-40">
      <Cover url={document.coverImage} />
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
        <Toolbar initialData={document} />
        <Editor
          onChange={onChange}
          initialContent={document.content}
          editable={true}  // Owner can edit
        />
      </div>
    </div>
  );
};

export default DocumentIdPage;
```

### 6.3 Public Preview Page

```typescript
// app/(public)/(routes)/preview/[documentId]/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Cover } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";

interface PreviewPageProps {
  params: {
    documentId: Id<"documents">;
  };
}

const PreviewPage = ({ params }: PreviewPageProps) => {
  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );

  const document = useQuery(api.documents.getPublicDocument, {
    documentId: params.documentId,
  });

  if (document === undefined) {
    return <div>Loading...</div>;
  }

  if (document === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Document not found</h2>
        <p className="text-muted-foreground">
          This document doesn't exist or is not published.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-40">
      <Cover url={document.coverImage} preview />
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
        <Toolbar initialData={document} preview />
        <Editor
          onChange={() => {}} // No-op for read-only
          initialContent={document.content}
          editable={false}  // Read-only for public
        />
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-0 w-full bg-background border-t p-4 text-center text-sm text-muted-foreground">
        Powered by Notion Clone
      </div>
    </div>
  );
};

export default PreviewPage;
```

### 6.4 Publish Button Component

```typescript
// components/publish-button.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Check, Copy, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PublishButtonProps {
  initialData: Doc<"documents">;
}

export const PublishButton = ({ initialData }: PublishButtonProps) => {
  const update = useMutation(api.documents.update);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const url = `${window.location.origin}/preview/${initialData._id}`;

  const onPublish = () => {
    setIsSubmitting(true);

    const promise = update({
      id: initialData._id,
      isPublished: true,
    }).finally(() => setIsSubmitting(false));

    toast.promise(promise, {
      loading: "Publishing...",
      success: "Note published!",
      error: "Failed to publish note.",
    });
  };

  const onUnpublish = () => {
    setIsSubmitting(true);

    const promise = update({
      id: initialData._id,
      isPublished: false,
    }).finally(() => setIsSubmitting(false));

    toast.promise(promise, {
      loading: "Unpublishing...",
      success: "Note unpublished!",
      error: "Failed to unpublish note.",
    });
  };

  const onCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          Publish
          {initialData.isPublished && (
            <Globe className="text-sky-500 w-4 h-4 ml-2" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" alignOffset={8} forceMount>
        {initialData.isPublished ? (
          <div className="space-y-4">
            <div className="flex items-center gap-x-2">
              <Globe className="text-sky-500 animate-pulse h-4 w-4" />
              <p className="text-xs font-medium text-sky-500">
                This note is live on web.
              </p>
            </div>
            <div className="flex items-center">
              <input
                className="flex-1 px-2 text-xs border rounded-l-md h-8 bg-muted truncate"
                value={url}
                disabled
              />
              <Button
                onClick={onCopy}
                disabled={copied}
                className="h-8 rounded-l-none"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={isSubmitting}
              onClick={onUnpublish}
            >
              Unpublish
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Globe className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium mb-2">Publish this note</p>
            <span className="text-xs text-muted-foreground mb-4">
              Share your work with others.
            </span>
            <Button
              disabled={isSubmitting}
              onClick={onPublish}
              className="w-full text-xs"
              size="sm"
            >
              Publish
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
```

---

## 7. Validation Rules

### 7.1 Access Control

| User Type | Document State | Can View | Mode |
|-----------|----------------|----------|------|
| Owner | Any | ✅ Yes | Edit/Read |
| Authenticated | Published | ✅ Yes | Read-only |
| Anonymous | Published | ✅ Yes | Read-only |
| Any | Archived | ❌ No (except owner) | - |
| Any | Not published + Not owner | ❌ No | - |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Not found | "Document not found" | Show 404 page |
| Unauthorized | "You don't have access" | Suggest sign in |
| Archived | "Document archived" | Show restore option (owner) |
| Loading error | "Failed to load" | Retry button |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC10-01 | Owner view private doc | Full access, can edit |
| TC10-02 | Owner view archived doc | Can view, can restore |
| TC10-03 | View published doc (auth) | Read-only access |
| TC10-04 | View published doc (anon) | Read-only access |
| TC10-05 | View unpublished doc (not owner) | Access denied |
| TC10-06 | Copy public link | Link copied, works |
| TC10-07 | Publish document | isPublished = true |
| TC10-08 | Unpublish document | isPublished = false |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Don't reveal unpublished documents
- ✅ Check authorization on every request
- ✅ Validate document ownership
- ✅ Prevent enumeration attacks
- ✅ Rate limiting on public endpoints

---

## 12. Performance Optimization

- Cache public documents (CDN)
- Optimize read queries
- Lazy load editor
- Prefetch related documents

---

## 13. Related Use Cases

- [UC08 - Cập nhật trang](./UC08-update-page.md)
- [UC09 - Sửa nội dung](./UC09-edit-content.md)
- [UC11 - Xóa trang](./UC11-delete-page.md)

---

## 14. References

- [Convex Queries](https://docs.convex.dev/database/reading-data)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [BlockNote Read-only](https://www.blocknotejs.org/docs/editor-basics/setup#editable)

---

**Last Updated:** 02/12/2025  
**Status:** ✅ Implemented and documented  
**Code Location:** `app/(main)/(routes)/documents/`, `app/(public)/(routes)/preview/`  
**Key Features:** Public sharing, Read-only mode, Access control, SEO optimization

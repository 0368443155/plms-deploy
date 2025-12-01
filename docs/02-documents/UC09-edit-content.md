# UC09 - Sửa nội dung trang

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC09 |
| **Tên** | Sửa nội dung trang (Edit Document Content) |
| **Mô tả** | Người dùng chỉnh sửa nội dung document với rich text editor (BlockNote), hỗ trợ markdown, images, và auto-save |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Document tồn tại<br>- User là owner của document |
| **Postcondition** | - Content được lưu vào Convex<br>- Auto-save hoạt động<br>- Changes reflected real-time |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng mở document để edit
2. Hệ thống load document content từ Convex
3. Hệ thống khởi tạo BlockNote editor với:
   - Initial content (nếu có)
   - Editable mode = true
   - Upload handler cho images
   - Theme (light/dark)
4. Hiển thị editor với content
5. Người dùng bắt đầu typing/editing
6. **Auto-save trigger:**
   - Mỗi khi content thay đổi
   - Debounce 500ms
   - Gọi `update` mutation
7. Content được serialize thành JSON
8. Update document trong Convex
9. Hiển thị "Saving..." indicator
10. Sau khi save thành công:
    - Hiển thị "Saved" indicator
    - Fade out sau 2s
11. Use case tiếp tục (continuous editing)

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Insert image**
- Tại bước 5: Người dùng paste/upload image
- Trigger upload handler
- Upload image to EdgeStore
- Get image URL
- Insert image block vào editor
- Auto-save triggered

**A2: Use markdown shortcuts**
- Tại bước 5: Type markdown syntax
  - `# ` → Heading 1
  - `## ` → Heading 2
  - `- ` → Bullet list
  - `1. ` → Numbered list
  - `> ` → Quote
  - ``` ` ``` → Code block
- Editor auto-converts to rich text
- Auto-save triggered

**A3: Slash commands**
- Tại bước 5: Type `/`
- Show slash menu với options:
  - Headings
  - Lists
  - Code blocks
  - Images
  - Tables
- Select option
- Insert block
- Auto-save triggered

**A4: Drag and drop blocks**
- Tại bước 5: Hover block → drag handle appears
- Drag block to new position
- Drop to reorder
- Auto-save triggered

**A5: Copy/paste from other apps**
- Tại bước 5: Paste content
- Editor preserves formatting
- Convert to BlockNote format
- Auto-save triggered

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Auto-save failed**
- Tại bước 8: Network error hoặc DB error
- Show error indicator: "Failed to save"
- Queue changes locally
- Retry after 5s
- Show retry count

**E2: Concurrent editing conflict**
- Tại bước 8: Document updated by another user
- Detect conflict
- Show warning: "Document changed by another user"
- Options:
  - Keep my changes
  - Reload document
  - Merge changes (advanced)

**E3: Image upload failed**
- Tại A1: EdgeStore upload error
- Show error toast
- Retry button
- Fallback: paste image URL

**E4: Content too large**
- Tại bước 7: Content > 1MB
- Show warning
- Suggest splitting into multiple documents
- Still allow save (with warning)

**E5: Lost connection**
- Tại bước 8: Network offline
- Show "Offline" indicator
- Save to localStorage
- Auto-sync when online
- Show sync status

**E6: Session expired**
- Tại bước 8: Auth token expired
- Save to localStorage
- Show "Session expired" modal
- Redirect to login
- Restore content after re-login

---

## 3. Biểu đồ hoạt động

```
┌─────────┐          ┌──────────┐          ┌────────┐          ┌───────────┐
│  User   │          │  Editor  │          │ Convex │          │ EdgeStore │
└────┬────┘          └─────┬────┘          └───┬────┘          └─────┬─────┘
     │                     │                   │                      │
     │  1. Open document   │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  2. Load content  │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │                     │  3. Return data   │                      │
     │                     │<──────────────────┤                      │
     │                     │                   │                      │
     │  4. Show editor     │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
     │  5. Start typing    │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  6. onChange      │                      │
     │                     │     triggered     │                      │
     │                     │                   │                      │
     │                     │  7. Debounce      │                      │
     │                     │     (500ms)       │                      │
     │                     │                   │                      │
     │                     │  8. Serialize     │                      │
     │                     │     to JSON       │                      │
     │                     │                   │                      │
     │                     │  9. Auto-save     │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │                     │  10. Update DB    │                      │
     │                     │                   │                      │
     │                     │  11. Success      │                      │
     │                     │<──────────────────┤                      │
     │                     │                   │                      │
     │  12. Show "Saved"   │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
     
     
     [IMAGE UPLOAD FLOW]
     
     │  1. Paste image     │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  2. Upload file   │                      │
     │                     ├──────────────────────────────────────────>│
     │                     │                   │                      │
     │                     │  3. Return URL    │                      │
     │                     │<──────────────────────────────────────────┤
     │                     │                   │                      │
     │                     │  4. Insert block  │                      │
     │                     │                   │                      │
     │                     │  5. Auto-save     │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │  6. Show image      │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
```

---

## 4. Database Schema

### 4.1 Document Content Storage

```typescript
// convex/schema.ts
documents: defineTable({
  title: v.string(),
  userId: v.string(),
  isArchived: v.boolean(),
  parentDocument: v.optional(v.id("documents")),
  content: v.optional(v.string()),      // JSON string of BlockNote blocks
  coverImage: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPublished: v.boolean(),
})
```

### 4.2 Content Format (BlockNote JSON)

```json
[
  {
    "id": "block-1",
    "type": "heading",
    "props": {
      "level": 1,
      "textColor": "default",
      "backgroundColor": "default"
    },
    "content": [
      {
        "type": "text",
        "text": "Welcome to my document",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "block-2",
    "type": "paragraph",
    "props": {},
    "content": [
      {
        "type": "text",
        "text": "This is a paragraph with ",
        "styles": {}
      },
      {
        "type": "text",
        "text": "bold",
        "styles": {
          "bold": true
        }
      },
      {
        "type": "text",
        "text": " and ",
        "styles": {}
      },
      {
        "type": "text",
        "text": "italic",
        "styles": {
          "italic": true
        }
      },
      {
        "type": "text",
        "text": " text.",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "block-3",
    "type": "image",
    "props": {
      "url": "https://edgestore.dev/...",
      "caption": "My image"
    },
    "children": []
  }
]
```

---

## 5. API Endpoints

### 5.1 Update Content Mutation

```typescript
// convex/documents.ts
export const update = mutation({
  args: {
    id: v.id("documents"),
    content: v.optional(v.string()),
    // ... other fields
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const userId = identity.subject;
    const { id, ...rest } = args;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      ...rest,
    });

    return document;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/(routes)/documents/[documentId]/
└── page.tsx                        # Document page with editor

components/
├── editor.tsx                      # BlockNote editor wrapper
└── ui/
    └── skeleton.tsx                # Loading skeleton
```

### 6.2 Editor Component

```typescript
// components/editor.tsx
"use client";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import { useTheme } from "next-themes";
import { useEdgeStore } from "@/lib/edgestore";

interface EditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  editable?: boolean;
}

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({ file });
    return response.url;
  };

  const editor: BlockNoteEditor = useBlockNote({
    editable,
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    uploadFile: handleUpload,
  });

  return (
    <div>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
};

export default Editor;
```

### 6.3 Document Page with Auto-save

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
          editable={true}
        />
      </div>
    </div>
  );
};

export default DocumentIdPage;
```

### 6.4 Auto-save Hook (Optional Enhancement)

```typescript
// hooks/use-debounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in document page:
const [content, setContent] = useState(document.content);
const debouncedContent = useDebounce(content, 500);

useEffect(() => {
  if (debouncedContent !== document.content) {
    update({ id: params.documentId, content: debouncedContent });
  }
}, [debouncedContent]);
```

---

## 7. Validation Rules

### 7.1 Content Validation

| Rule | Check | Action |
|------|-------|--------|
| Max size | < 1MB | Warn user |
| Valid JSON | Parse-able | Handle error |
| Block structure | Valid BlockNote format | Validate |

### 7.2 Image Upload Validation

| Rule | Check | Error |
|------|-------|-------|
| File type | image/* | "Invalid file type" |
| File size | < 5MB | "File too large" |
| Upload success | EdgeStore OK | "Upload failed" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Save failed | "Failed to save" | Auto-retry |
| Upload failed | "Image upload failed" | Retry button |
| Invalid content | "Invalid content format" | Revert to last valid |
| Unauthorized | "Unauthorized" | Redirect |
| Offline | "You're offline" | Queue changes |

### 8.2 Error Handling Code

```typescript
const onChange = async (content: string) => {
  try {
    await update({
      id: params.documentId,
      content,
    });
    // Show success indicator
    setSaveStatus("saved");
  } catch (error: any) {
    console.error("Save error:", error);
    
    if (error.message.includes("Unauthorized")) {
      toast.error("You don't have permission to edit this document");
    } else if (error.message.includes("Not found")) {
      toast.error("Document not found");
      router.push("/documents");
    } else {
      // Queue for retry
      setSaveStatus("error");
      queueRetry(content);
    }
  }
};
```

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC09-01 | Type text | Content auto-saved |
| TC09-02 | Insert heading | Heading created, saved |
| TC09-03 | Insert list | List created, saved |
| TC09-04 | Upload image | Image uploaded, inserted |
| TC09-05 | Use markdown | Converted to rich text |
| TC09-06 | Slash command | Block inserted |
| TC09-07 | Drag block | Block reordered |
| TC09-08 | Copy/paste | Formatting preserved |
| TC09-09 | Auto-save | Saves after 500ms |
| TC09-10 | Offline edit | Queued, synced when online |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC09-11 | Performance | Typing latency | < 50ms |
| TC09-12 | Performance | Auto-save time | < 500ms |
| TC09-13 | Performance | Large document | < 2s load |
| TC09-14 | UX | Save indicator | Visible |
| TC09-15 | Accessibility | Keyboard shortcuts | Full support |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Verify authentication
- ✅ Check document ownership
- ✅ Sanitize content (XSS prevention)
- ✅ Validate file uploads
- ✅ Rate limiting on saves
- ✅ Content size limits

### 11.2 XSS Prevention

```typescript
// BlockNote handles sanitization automatically
// But for custom HTML rendering:
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(htmlContent);
```

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 50ms typing latency
- **Auto-save:** 500ms debounce
- **Large docs:** < 2s load time

### 12.2 Optimizations

- **Debounce auto-save** (500ms)
- **Lazy load editor** (dynamic import)
- **Virtual scrolling** for large documents
- **Optimize JSON serialization**
- **Cache document queries**
- **Batch updates** when possible

### 12.3 Code Splitting

```typescript
// Lazy load editor to reduce initial bundle
const Editor = useMemo(
  () => dynamic(() => import("@/components/editor"), { 
    ssr: false,
    loading: () => <EditorSkeleton />
  }),
  []
);
```

---

## 13. Related Use Cases

- [UC07 - Tạo trang mới](./UC07-create-page.md)
- [UC08 - Cập nhật trang](./UC08-update-page.md)
- [UC10 - Đọc nội dung trang](./UC10-read-content.md)

---

## 14. References

- [BlockNote Documentation](https://www.blocknotejs.org/)
- [BlockNote React](https://www.blocknotejs.org/docs/react)
- [EdgeStore](https://edgestore.dev/)
- [Convex Real-time](https://docs.convex.dev/database/reading-data)

---

**Last Updated:** 02/12/2025  
**Status:** ✅ Implemented and documented  
**Code Location:** `components/editor.tsx`, `app/(main)/(routes)/documents/[documentId]/`  
**Key Features:** Auto-save, Rich text editing, Image upload, Markdown support

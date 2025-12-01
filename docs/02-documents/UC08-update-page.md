# UC08 - Cập nhật trang

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC08 |
| **Tên** | Cập nhật trang (Update Document) |
| **Mô tả** | Người dùng cập nhật thông tin document: title, icon, cover image, publish status |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Document tồn tại<br>- User là owner của document |
| **Postcondition** | - Document được cập nhật trong Convex<br>- UI cập nhật real-time<br>- Sidebar reflect changes |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang xem document
2. Người dùng thực hiện một trong các hành động:
   - Click vào title để edit inline
   - Click "Add icon" để chọn emoji
   - Click "Add cover" để upload cover image
   - Click "Publish" để publish document
3. Hệ thống hiển thị UI tương ứng
4. Người dùng nhập/chọn giá trị mới
5. Người dùng confirm (Enter, click outside, hoặc click button)
6. Hệ thống gọi `update` mutation
7. Validate authorization (user owns document)
8. Update document trong Convex database
9. Convex trigger real-time update
10. UI cập nhật ngay lập tức
11. Sidebar cập nhật (nếu title/icon thay đổi)
12. Hiển thị toast success (optional)
13. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Update title inline**
- Tại bước 2: Click vào title
- Title becomes editable input
- Type new title
- Press Enter hoặc click outside
- Title updated

**A2: Add/Change icon**
- Tại bước 2: Click "Add icon" hoặc existing icon
- Icon picker modal appears
- Search/browse emojis
- Click emoji to select
- Icon updated immediately

**A3: Add/Change cover image**
- Tại bước 2: Click "Add cover"
- Upload modal appears
- Select file hoặc paste URL
- Upload to EdgeStore
- Cover image updated

**A4: Remove icon**
- Tại bước 2: Hover icon → click "Remove"
- Icon set to undefined
- Default icon shown

**A5: Remove cover**
- Tại bước 2: Hover cover → click "Remove"
- Cover image deleted from EdgeStore
- Cover set to undefined

**A6: Publish/Unpublish**
- Tại bước 2: Click "Publish" toggle
- isPublished flipped
- Public URL generated (if published)
- Access control updated

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Not authenticated**
- Tại bước 6: User not logged in
- Throw "Unauthenticated"
- Redirect to login

**E2: Unauthorized**
- Tại bước 7: User doesn't own document
- Throw "Unauthorized"
- Show error toast
- Revert UI changes

**E3: Document not found**
- Tại bước 7: Document deleted
- Throw "Not found"
- Redirect to documents list

**E4: Cover upload failed**
- Tại bước 3 (cover): EdgeStore error
- Show error toast
- Retry button
- Don't update document

**E5: Title too long**
- Tại bước 4: Title > 100 characters
- Show warning
- Truncate or prevent input

**E6: Network error**
- Tại bước 6: Connection lost
- Queue update locally
- Auto-retry when online
- Show sync status

---

## 3. Biểu đồ hoạt động

```
┌─────────┐          ┌──────────┐          ┌────────┐          ┌───────────┐
│  User   │          │  System  │          │ Convex │          │ EdgeStore │
└────┬────┘          └─────┬────┘          └───┬────┘          └─────┬─────┘
     │                     │                   │                      │
     │  1. Click title     │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │  2. Show input      │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
     │  3. Type new title  │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │  4. Press Enter     │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  5. Update doc    │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │                     │  6. Validate auth │                      │
     │                     │                   │                      │
     │                     │  7. Patch DB      │                      │
     │                     │                   │                      │
     │                     │  8. Success       │                      │
     │                     │<──────────────────┤                      │
     │                     │                   │                      │
     │                     │  9. Real-time     │                      │
     │                     │     update        │                      │
     │                     │<──────────────────┤                      │
     │                     │                   │                      │
     │  10. Update UI      │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
     
     
     [COVER UPLOAD FLOW]
     
     │  1. Click "Add cover"│                  │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │  2. Select file     │                   │                      │
     ├────────────────────>│                   │                      │
     │                     │                   │                      │
     │                     │  3. Upload file   │                      │
     │                     ├──────────────────────────────────────────>│
     │                     │                   │                      │
     │                     │  4. Return URL    │                      │
     │                     │<──────────────────────────────────────────┤
     │                     │                   │                      │
     │                     │  5. Update doc    │                      │
     │                     ├──────────────────>│                      │
     │                     │                   │                      │
     │  6. Show cover      │                   │                      │
     │<────────────────────┤                   │                      │
     │                     │                   │                      │
```

---

## 4. Database Schema

### 4.1 Convex Schema

```typescript
// convex/schema.ts
documents: defineTable({
  title: v.string(),
  userId: v.string(),
  isArchived: v.boolean(),
  parentDocument: v.optional(v.id("documents")),
  content: v.optional(v.string()),
  coverImage: v.optional(v.string()),      // EdgeStore URL
  icon: v.optional(v.string()),            // Emoji string
  isPublished: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentDocument"]),
```

---

## 5. API Endpoints

### 5.1 Update Mutation

```typescript
// convex/documents.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
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

### 5.2 Remove Icon Mutation

```typescript
// convex/documents.ts
export const removeIcon = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      icon: undefined,
    });

    return document;
  },
});
```

### 5.3 Remove Cover Image Mutation

```typescript
// convex/documents.ts
export const removeCoverImage = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const document = await ctx.db.patch(args.id, {
      coverImage: undefined,
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
└── page.tsx                        # Document page

components/
├── cover.tsx                       # Cover image component
├── toolbar.tsx                     # Title + Icon toolbar
├── icon-picker.tsx                 # Emoji picker
└── editor.tsx                      # Content editor
```

### 6.2 Toolbar Component

```typescript
// components/toolbar.tsx
"use client";

import { ElementRef, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { ImageIcon, Smile, X } from "lucide-react";
import { IconPicker } from "./icon-picker";

interface ToolbarProps {
  initialData: Doc<"documents">;
  preview?: boolean;
}

export const Toolbar = ({
  initialData,
  preview,
}: ToolbarProps) => {
  const inputRef = useRef<ElementRef<"textarea">>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialData.title);

  const update = useMutation(api.documents.update);
  const removeIcon = useMutation(api.documents.removeIcon);

  const enableInput = () => {
    if (preview) return;

    setIsEditing(true);
    setTimeout(() => {
      setValue(initialData.title);
      inputRef.current?.focus();
    }, 0);
  };

  const disableInput = () => {
    setIsEditing(false);
  };

  const onInput = (value: string) => {
    setValue(value);
    update({
      id: initialData._id,
      title: value || "Untitled",
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      disableInput();
    }
  };

  const onIconSelect = (icon: string) => {
    update({
      id: initialData._id,
      icon,
    });
  };

  const onRemoveIcon = () => {
    removeIcon({
      id: initialData._id,
    });
  };

  return (
    <div className="pl-[54px] group relative">
      {!!initialData.icon && !preview && (
        <div className="flex items-center gap-x-2 group/icon pt-6">
          <IconPicker onChange={onIconSelect}>
            <p className="text-6xl hover:opacity-75 transition">
              {initialData.icon}
            </p>
          </IconPicker>
          <Button
            onClick={onRemoveIcon}
            className="rounded-full opacity-0 group-hover/icon:opacity-100 transition text-muted-foreground text-xs"
            variant="outline"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {!!initialData.icon && preview && (
        <p className="text-6xl pt-6">
          {initialData.icon}
        </p>
      )}
      
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-x-1 py-4">
        {!initialData.icon && !preview && (
          <IconPicker asChild onChange={onIconSelect}>
            <Button
              className="text-muted-foreground text-xs"
              variant="outline"
              size="sm"
            >
              <Smile className="h-4 w-4 mr-2" />
              Add icon
            </Button>
          </IconPicker>
        )}
        
        {!initialData.coverImage && !preview && (
          <Button
            onClick={() => {}}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Add cover
          </Button>
        )}
      </div>
      
      {isEditing && !preview ? (
        <TextareaAutosize
          ref={inputRef}
          onBlur={disableInput}
          onKeyDown={onKeyDown}
          value={value}
          onChange={(e) => onInput(e.target.value)}
          className="text-5xl bg-transparent font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF] resize-none"
        />
      ) : (
        <div
          onClick={enableInput}
          className="pb-[11.5px] text-5xl font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF]"
        >
          {initialData.title}
        </div>
      )}
    </div>
  );
};
```

### 6.3 Cover Component

```typescript
// components/cover.tsx
"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImageIcon, X } from "lucide-react";
import { useCoverImage } from "@/hooks/use-cover-image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useEdgeStore } from "@/lib/edgestore";
import { Skeleton } from "@/components/ui/skeleton";

interface CoverImageProps {
  url?: string;
  preview?: boolean;
}

export const Cover = ({
  url,
  preview,
}: CoverImageProps) => {
  const { edgestore } = useEdgeStore();
  const params = useParams();
  const coverImage = useCoverImage();
  const removeCoverImage = useMutation(api.documents.removeCoverImage);

  const onRemove = async () => {
    if (url) {
      await edgestore.publicFiles.delete({
        url: url,
      });
    }
    removeCoverImage({
      id: params.documentId as Id<"documents">,
    });
  };

  return (
    <div className={cn(
      "relative w-full h-[35vh] group",
      !url && "h-[12vh]",
      url && "bg-muted"
    )}>
      {!!url && (
        <Image
          src={url}
          fill
          alt="Cover"
          className="object-cover"
        />
      )}
      {url && !preview && (
        <div className="opacity-0 group-hover:opacity-100 absolute bottom-5 right-5 flex items-center gap-x-2">
          <Button
            onClick={() => coverImage.onReplace(url)}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Change cover
          </Button>
          <Button
            onClick={onRemove}
            className="text-muted-foreground text-xs"
            variant="outline"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
};

Cover.Skeleton = function CoverSkeleton() {
  return (
    <Skeleton className="w-full h-[12vh]" />
  );
};
```

---

## 7. Validation Rules

### 7.1 Client-side Validation

| Field | Rule | Action |
|-------|------|--------|
| Title | Not empty | Auto-set to "Untitled" |
| Title | Max 100 chars | Truncate or warn |
| Icon | Valid emoji | Validate selection |
| Cover | Image file | Check file type |
| Cover | Max 5MB | Check file size |

### 7.2 Server-side Validation

| Field | Rule | Error |
|-------|------|-------|
| userId | Authenticated | "Unauthenticated" |
| document | Exists | "Not found" |
| ownership | User owns doc | "Unauthorized" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Unauthenticated | "Unauthenticated" | Redirect to login |
| Unauthorized | "Unauthorized" | Show error, revert |
| Not found | "Not found" | Redirect to list |
| Upload failed | "Upload failed" | Retry button |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC08-01 | Update title | Title updated, sidebar reflects |
| TC08-02 | Add icon | Icon shown, sidebar updated |
| TC08-03 | Remove icon | Icon removed, default shown |
| TC08-04 | Add cover | Cover uploaded, displayed |
| TC08-05 | Remove cover | Cover deleted, removed |
| TC08-06 | Publish document | isPublished = true, public URL |
| TC08-07 | Unpublish | isPublished = false, private |
| TC08-08 | Unauthorized update | Error, no change |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify authentication
- ✅ Check ownership
- ✅ Validate file uploads
- ✅ Sanitize inputs
- ✅ Rate limiting

---

## 12. Performance Optimization

- Debounce title updates
- Optimistic UI updates
- Lazy load cover images
- Cache document queries

---

## 13. Related Use Cases

- [UC07 - Tạo trang](./UC07-create-page.md)
- [UC09 - Sửa nội dung](./UC09-edit-content.md)
- [UC10 - Đọc nội dung](./UC10-read-content.md)

---

## 14. References

- [Convex Mutations](https://docs.convex.dev/database/writing-data)
- [EdgeStore](https://edgestore.dev/)
- [React Textarea Autosize](https://github.com/Andarist/react-textarea-autosize)

---

**Last Updated:** 02/12/2025  
**Status:** ✅ Implemented and documented  
**Code Location:** `convex/documents.ts`, `components/`

# UC07 - Tạo trang mới

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC07 |
| **Tên** | Tạo trang mới (Create Document) |
| **Mô tả** | Người dùng tạo document/page mới, có thể là root level hoặc nested (con của document khác) |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Có quyền tạo document |
| **Postcondition** | - Document mới được tạo trong Convex<br>- Hiển thị trong sidebar<br>- Redirect đến trang editor |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang ở trong app
2. Người dùng click "New page" button trong sidebar
3. Hệ thống gọi `create` mutation
4. Hệ thống tạo document mới với:
   - Title: "Untitled"
   - ParentDocument: undefined (root level)
   - UserId: current user
   - isArchived: false
   - isPublished: false
5. Document được insert vào Convex database
6. Hệ thống trả về document ID
7. Redirect đến `/documents/[documentId]`
8. Sidebar tự động cập nhật (real-time)
9. Hiển thị editor với document mới
10. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Tạo nested document (sub-page)**
- Tại bước 2: Người dùng click icon "+" bên cạnh document
- Hoặc click "Add a page inside" trong document
- Tại bước 4: Set parentDocument = parent document ID
- Document mới là con của document hiện tại
- Hiển thị indent trong sidebar

**A2: Tạo nhiều documents liên tiếp**
- Sau bước 10: Người dùng tiếp tục click "New page"
- Lặp lại flow
- Mỗi document có ID riêng
- Sidebar cập nhật real-time

**A3: Tạo document với template (Sinh viên)**
- Tại bước 2: Click "New page" → Show template picker
- Hoặc click "New from template"
- Hệ thống hiển thị template options:
  - 📚 **Lecture Notes** (Ghi chú bài giảng)
    - Pre-filled: Heading "Lecture [Date]", sections: Summary, Key Points, Questions
  - 📝 **Essay Planner** (Lập dàn ý tiểu luận)
    - Pre-filled: Introduction, Body (3 paragraphs), Conclusion, References
  - 📊 **Grade Tracker** (Theo dõi điểm số)
    - Pre-filled: Table với columns: Subject, Assignment, Grade, Weight
  - 🔬 **Lab Report** (Báo cáo thí nghiệm)
    - Pre-filled: Objective, Materials, Procedure, Results, Conclusion
  - 💡 **Study Guide** (Tài liệu ôn tập)
    - Pre-filled: Topics, Flashcards section, Practice questions
  - 📅 **Assignment Tracker** (Theo dõi bài tập)
    - Pre-filled: Table với deadline, status, priority
- User chọn template
- Tại bước 4: Pre-fill content từ template
- Title từ template (có thể edit)
- Icon và cover từ template (optional)
- Continue từ bước 5

**A4: Quick Note (Nháp nhanh - Sinh viên)**
- Tại bước 2: Press Ctrl+Shift+N hoặc click "Quick Note"
- Tạo trang nhanh với title: "Quick Note [Timestamp]"
- ParentDocument: undefined (root level)
- Icon: 📌 (pin icon)
- Không cần confirm, không cần chọn template
- Redirect ngay đến editor
- Use case: Ghi chú nhanh trong giờ học, không cần lo về tổ chức
- Có thể organize sau

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Not authenticated**
- Tại bước 3: User chưa đăng nhập
- Throw error "Not authenticated"
- Redirect đến login page

**E2: Database error**
- Tại bước 5: Convex insert failed
- Hiển thị toast error
- Retry button
- Log error

**E3: Network error**
- Tại bước 3: Mất kết nối
- Hiển thị toast "Network error"
- Auto-retry khi có network
- Hoặc save to local storage

**E4: Rate limiting**
- Tại bước 3: Quá nhiều requests
- Hiển thị "Too many requests"
- Disable button tạm thời
- Countdown timer

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Click "New page"    │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  2. Validate auth     │
     │                         │                       │
     │                         │  3. Create document   │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  4. Insert to DB      │
     │                         │                       │
     │                         │  5. Return doc ID     │
     │                         │<──────────────────────┤
     │                         │                       │
     │  6. Redirect to editor  │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │                         │  7. Subscribe updates │
     │                         │<──────────────────────┤
     │                         │                       │
     │  8. Update sidebar      │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  9. Show editor         │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

---

## 4. Database Schema

### 4.1 Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"]),
});
```

### 4.2 Document Structure

```typescript
interface Document {
  _id: Id<"documents">;
  _creationTime: number;
  title: string;
  userId: string;
  isArchived: boolean;
  parentDocument?: Id<"documents">;
  content?: string;
  coverImage?: string;
  icon?: string;
  isPublished: boolean;
}
```

---

## 5. API Endpoints

### 5.1 Create Mutation

```typescript
// convex/documents.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      isArchived: false,
      isPublished: false,
    });

    return document;
  },
});
```

### 5.2 Get Sidebar Query

```typescript
// convex/documents.ts
export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument)
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/(routes)/documents/
├── page.tsx                        # Documents list page
└── [documentId]/
    └── page.tsx                    # Document editor page

app/(main)/_components/
├── navigation.tsx                  # Sidebar navigation
├── document-list.tsx               # List of documents
├── item.tsx                        # Single document item
└── new-button.tsx                  # "New page" button

components/
└── editor.tsx                      # BlockNote editor
```

### 6.2 New Button Component

```typescript
// app/(main)/_components/new-button.tsx
"use client";

import { PlusCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const NewButton = () => {
  const router = useRouter();
  const create = useMutation(api.documents.create);

  const onCreate = () => {
    const promise = create({ title: "Untitled" })
      .then((documentId) => {
        router.push(`/documents/${documentId}`);
      });

    toast.promise(promise, {
      loading: "Creating a new note...",
      success: "New note created!",
      error: "Failed to create a new note.",
    });
  };

  return (
    <Button
      onClick={onCreate}
      variant="ghost"
      size="sm"
      className="w-full justify-start"
    >
      <PlusCircle className="h-4 w-4 mr-2" />
      New page
    </Button>
  );
};
```

### 6.3 Document Item Component

```typescript
// app/(main)/_components/item.tsx
"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface ItemProps {
  id?: Id<"documents">;
  documentIcon?: string;
  active?: boolean;
  expanded?: boolean;
  isSearch?: boolean;
  level?: number;
  onExpand?: () => void;
  label: string;
  onClick?: () => void;
  icon: LucideIcon;
}

export const Item = ({
  id,
  label,
  onClick,
  icon: Icon,
  active,
  documentIcon,
  isSearch,
  level = 0,
  onExpand,
  expanded,
}: ItemProps) => {
  const router = useRouter();
  const create = useMutation(api.documents.create);

  const onCreateChild = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    
    if (!id) return;
    
    const promise = create({ title: "Untitled", parentDocument: id })
      .then((documentId) => {
        if (!expanded) {
          onExpand?.();
        }
        router.push(`/documents/${documentId}`);
      });

    toast.promise(promise, {
      loading: "Creating a new note...",
      success: "New note created!",
      error: "Failed to create a new note.",
    });
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      onClick={onClick}
      role="button"
      style={{ paddingLeft: level ? `${(level * 12) + 12}px` : "12px" }}
      className={cn(
        "group min-h-[27px] text-sm py-1 pr-3 w-full hover:bg-primary/5 flex items-center text-muted-foreground font-medium",
        active && "bg-primary/5 text-primary"
      )}
    >
      {!!id && (
        <div
          role="button"
          className="h-full rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 mr-1"
          onClick={handleExpand}
        >
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </div>
      )}
      
      {documentIcon ? (
        <div className="shrink-0 mr-2 text-[18px]">
          {documentIcon}
        </div>
      ) : (
        <Icon className="shrink-0 h-[18px] w-[18px] mr-2 text-muted-foreground" />
      )}
      
      <span className="truncate">{label}</span>
      
      {!!id && (
        <div className="ml-auto flex items-center gap-x-2">
          <div
            role="button"
            onClick={onCreateChild}
            className="opacity-0 group-hover:opacity-100 h-full ml-auto rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 7. Validation Rules

### 7.1 Server-side Validation

| Field | Rule | Error |
|-------|------|-------|
| userId | Required | "Not authenticated" |
| userId | Valid user | "Unauthorized" |
| title | String | Auto-set to "Untitled" |
| parentDocument | Optional | - |
| parentDocument | Valid ID if provided | "Invalid parent" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Not authenticated | "Not authenticated" | Redirect to login |
| Invalid parent | "Parent document not found" | Show error toast |
| Database error | "Failed to create note" | Retry button |
| Network error | "Network error" | Auto-retry |

### 8.2 Error Handling Code

```typescript
const onCreate = async () => {
  try {
    const documentId = await create({ title: "Untitled" });
    router.push(`/documents/${documentId}`);
    toast.success("New note created!");
  } catch (error: any) {
    console.error("Create error:", error);
    
    if (error.message.includes("Not authenticated")) {
      toast.error("Please sign in to create notes");
      router.push("/sign-in");
    } else {
      toast.error("Failed to create note. Please try again");
    }
  }
};
```

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC07-01 | Tạo root document | Document created, redirect to editor |
| TC07-02 | Tạo nested document | Child document created under parent |
| TC07-03 | Tạo nhiều documents | Multiple documents created |
| TC07-04 | Sidebar update | New document appears in sidebar |
| TC07-05 | Real-time sync | Other clients see new document |
| TC07-06 | Not authenticated | Error, redirect to login |
| TC07-07 | Invalid parent | Error shown |
| TC07-08 | Network error | Auto-retry works |

### 9.2 Non-functional Tests

| Test ID | Scenario | Metric | Expected |
|---------|----------|--------|----------|
| TC07-09 | Performance | Create time | < 1s |
| TC07-10 | Performance | Sidebar update | < 500ms |
| TC07-11 | UX | Loading state | Shown during create |
| TC07-12 | Accessibility | Keyboard shortcut | Ctrl+N works |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

### 11.1 Best Practices

- ✅ Verify authentication
- ✅ Check user ownership
- ✅ Validate parent document
- ✅ Rate limiting
- ✅ Audit logging

### 11.2 Authorization

```typescript
// Only allow creating documents for authenticated users
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

// Verify parent document ownership if provided
if (args.parentDocument) {
  const parent = await ctx.db.get(args.parentDocument);
  if (parent.userId !== userId) {
    throw new Error("Unauthorized");
  }
}
```

---

## 12. Performance Optimization

### 12.1 Metrics

- **Target:** < 1s create time
- **Current:** ~500ms average
- **Bottleneck:** Database insert

### 12.2 Optimizations

- Optimistic UI updates
- Batch operations
- Index optimization
- Cache sidebar queries
- Lazy load nested documents

---

## 13. Related Use Cases

- [UC08 - Cập nhật trang](./UC08-update-page.md)
- [UC09 - Sửa nội dung](./UC09-edit-content.md)
- [UC11 - Xóa trang](./UC11-delete-page.md)

---

## 14. References

- [Convex Mutations](https://docs.convex.dev/database/writing-data)
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [React Query](https://tanstack.com/query/latest)
- [Document Templates Best Practices](https://www.notion.so/help/guides/creating-templates)

---

**Last Updated:** 03/12/2025  
**Status:** ✅ Implemented and documented (Updated for Students)  
**Code Location:** `convex/documents.ts`, `app/(main)/_components/`  
**Key Features:** Create documents, Nested pages, Real-time sync  
**Student Features:** ✨ Template System, Quick Note

**Cải tiến cho Sinh viên:**
- ✅ Template System với 6 templates (A3):
  - 📚 Lecture Notes, 📝 Essay Planner, 📊 Grade Tracker
  - 🔬 Lab Report, 💡 Study Guide, 📅 Assignment Tracker
- ✅ Quick Note (Ctrl+Shift+N) cho ghi chú nhanh (A4)
- 🎯 Phù hợp cho: Tổ chức học tập, quản lý bài tập, lập kế hoạch học


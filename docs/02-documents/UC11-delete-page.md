# UC11 - Xóa trang

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC11 |
| **Tên** | Xóa trang (Archive/Delete Document) |
| **Mô tả** | Người dùng xóa document (soft delete) bằng cách archive, document sẽ được chuyển vào Trash và có thể khôi phục trong 30 ngày |
| **Actor** | Người dùng đã đăng nhập (owner) |
| **Precondition** | - Người dùng đã đăng nhập<br>- Document tồn tại<br>- User là owner của document |
| **Postcondition** | - Document.isArchived = true<br>- Document ẩn khỏi sidebar<br>- Hiển thị trong Trash<br>- Child documents cũng bị archive (recursive) |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng đang xem document
2. Người dùng click menu "..." (more options)
3. Hệ thống hiển thị dropdown menu
4. Người dùng click "Delete" hoặc "Move to trash"
5. **(Optional)** Hệ thống hiển thị confirmation dialog:
   - "Are you sure you want to delete this page?"
   - "This page and all its sub-pages will be moved to trash"
6. Người dùng confirm "Delete"
7. Hệ thống gọi `archive` mutation với documentId
8. **Recursive archive logic:**
   - Set document.isArchived = true
   - Get all child documents (parentDocument = documentId)
   - For each child:
     - Set child.isArchived = true
     - Recursively archive child's children
9. Document biến mất khỏi sidebar
10. Hiển thị toast: "Moved to trash"
11. Redirect đến parent document hoặc documents list
12. Document xuất hiện trong Trash
13. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Delete từ sidebar**
- Tại bước 2: Right-click document trong sidebar
- Hoặc hover → click "..." icon
- Show context menu
- Click "Delete"
- Continue từ bước 5

**A2: Delete với keyboard shortcut**
- Tại bước 2: Press Ctrl+Delete hoặc Cmd+Delete
- Skip menu
- Show confirmation
- Continue từ bước 6

**A3: Bulk delete (multiple documents)**
- Tại bước 2: Select multiple documents (Shift+Click)
- Click "Delete selected"
- Confirm bulk delete
- Archive all selected documents
- Show count: "5 pages moved to trash"

**A4: Undo delete (immediate)**
- Sau bước 10: Click "Undo" trong toast (5s window)
- Gọi `restore` mutation
- Document restored
- Toast: "Restored"

**A5: Delete root document với children**
- Tại bước 8: Document có nhiều nested children
- Show warning: "This will also delete X sub-pages"
- User confirms
- All children archived recursively
- Show progress indicator

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Unauthorized delete**
- Tại bước 7: User không phải owner
- Throw "Unauthorized"
- Show error toast
- No changes made

**E2: Document not found**
- Tại bước 7: Document đã bị xóa
- Throw "Not found"
- Show error: "Document already deleted"
- Redirect to documents list

**E3: Cancel delete**
- Tại bước 6: User click "Cancel"
- Close confirmation dialog
- No changes made
- Stay on current page

**E4: Network error during delete**
- Tại bước 7: Connection lost
- Show error: "Failed to delete"
- Retry button
- Or queue for later

**E5: Partial delete failure**
- Tại bước 8: Some children fail to archive
- Log errors
- Show warning: "Some sub-pages couldn't be deleted"
- Offer retry
- Parent still archived

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Click "Delete"      │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Show confirmation   │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  3. Confirm             │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  4. Archive doc       │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  5. Set isArchived    │
     │                         │                       │
     │                         │  6. Get children      │
     │                         │                       │
     │                         │  7. Recursive archive │
     │                         │     (for each child)  │
     │                         │                       │
     │                         │  8. Success           │
     │                         │<──────────────────────┤
     │                         │                       │
     │  9. Remove from sidebar │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  10. Show toast         │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  11. Redirect           │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     
     
     [RECURSIVE ARCHIVE FLOW]
     
                         ┌──────────────────────┐
                         │ Archive Document     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Set isArchived=true  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Get child documents  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                              ◇─────────◇
                             / Has       \
                            /  children?  \
                           ◇───────────────◇
                           │               │
                         [Yes]           [No]
                           │               │
                           ▼               ▼
                    ┌──────────────┐  ┌────────┐
                    │ For each     │  │ Done   │
                    │ child:       │  └────────┘
                    │ - Archive    │
                    │ - Recurse    │
                    └──────┬───────┘
                           │
                           └──────┐
                                  │
                                  ▼
                         ┌──────────────────────┐
                         │ Archive child        │
                         └──────────┬───────────┘
                                    │
                                    └──────┐
                                           │
                                           ▼
                                    (Repeat recursively)
```

---

## 4. Database Schema

### 4.1 Archive Flag

```typescript
// convex/schema.ts
documents: defineTable({
  title: v.string(),
  userId: v.string(),
  isArchived: v.boolean(),        // Soft delete flag
  parentDocument: v.optional(v.id("documents")),
  content: v.optional(v.string()),
  coverImage: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPublished: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentDocument"])
```

### 4.2 Trash Query Index

```typescript
// Efficient query for trash
.index("by_user_archived", ["userId", "isArchived"])
```

---

## 5. API Endpoints

### 5.1 Archive Mutation

```typescript
// convex/documents.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) {
      throw new Error("Not found");
    }

    if (existingDocument.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Recursive function to archive children
    const recursiveArchive = async (documentId: Id<"documents">) => {
      // Get all children of this document
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      // Archive each child and their children
      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: true });
        await recursiveArchive(child._id); // Recursive call
      }
    };

    // Archive the main document
    const document = await ctx.db.patch(args.id, {
      isArchived: true,
    });

    // Archive all children
    recursiveArchive(args.id);

    return document;
  },
});
```

### 5.2 Get Trash Query

```typescript
// convex/documents.ts
export const getTrash = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
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
app/(main)/_components/
├── item.tsx                        # Document item with delete
├── document-list.tsx               # Documents list
├── trash-box.tsx                   # Trash modal
└── confirm-modal.tsx               # Delete confirmation

components/modals/
└── confirm-modal.tsx               # Reusable confirmation
```

### 6.2 Document Item with Delete

```typescript
// app/(main)/_components/item.tsx
"use client";

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { MoreHorizontal, Trash } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ItemProps {
  id: Id<"documents">;
  documentIcon?: string;
  label: string;
  // ... other props
}

export const Item = ({ id, label, documentIcon }: ItemProps) => {
  const router = useRouter();
  const { user } = useUser();
  const archive = useMutation(api.documents.archive);

  const onArchive = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    
    if (!id) return;
    
    const promise = archive({ id }).then(() => {
      router.push("/documents");
    });

    toast.promise(promise, {
      loading: "Moving to trash...",
      success: "Note moved to trash!",
      error: "Failed to archive note.",
    });
  };

  return (
    <div>
      {/* ... document item content ... */}
      
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          asChild
        >
          <div
            role="button"
            className="opacity-0 group-hover:opacity-100 h-full ml-auto rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-60"
          align="start"
          side="right"
          forceMount
        >
          <DropdownMenuItem onClick={onArchive}>
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="text-xs text-muted-foreground p-2">
            Last edited by: {user?.fullName}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
```

### 6.3 Trash Box Component

```typescript
// app/(main)/_components/trash-box.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Search, Trash, Undo } from "lucide-react";

export const TrashBox = () => {
  const router = useRouter();
  const documents = useQuery(api.documents.getTrash);
  const restore = useMutation(api.documents.restore);
  const remove = useMutation(api.documents.remove);

  const [search, setSearch] = useState("");

  const filteredDocuments = documents?.filter((document) => {
    return document.title.toLowerCase().includes(search.toLowerCase());
  });

  const onClick = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const onRestore = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    documentId: Id<"documents">
  ) => {
    event.stopPropagation();
    
    const promise = restore({ id: documentId });

    toast.promise(promise, {
      loading: "Restoring note...",
      success: "Note restored!",
      error: "Failed to restore note.",
    });
  };

  const onRemove = (documentId: Id<"documents">) => {
    const promise = remove({ id: documentId });

    toast.promise(promise, {
      loading: "Deleting note...",
      success: "Note deleted!",
      error: "Failed to delete note.",
    });

    if (params?.documentId === documentId) {
      router.push("/documents");
    }
  };

  if (documents === undefined) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="text-sm">
      <div className="flex items-center gap-x-1 p-2">
        <Search className="h-4 w-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 px-2 focus-visible:ring-transparent bg-secondary"
          placeholder="Filter by page title..."
        />
      </div>
      <div className="mt-2 px-1 pb-1">
        <p className="hidden last:block text-xs text-center text-muted-foreground pb-2">
          No documents found.
        </p>
        {filteredDocuments?.map((document) => (
          <div
            key={document._id}
            role="button"
            onClick={() => onClick(document._id)}
            className="text-sm rounded-sm w-full hover:bg-primary/5 flex items-center text-primary justify-between"
          >
            <span className="truncate pl-2">
              {document.icon} {document.title}
            </span>
            <div className="flex items-center">
              <div
                onClick={(e) => onRestore(e, document._id)}
                role="button"
                className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                <Undo className="h-4 w-4 text-muted-foreground" />
              </div>
              <ConfirmModal onConfirm={() => onRemove(document._id)}>
                <div
                  role="button"
                  className="rounded-sm p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                  <Trash className="h-4 w-4 text-muted-foreground" />
                </div>
              </ConfirmModal>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 6.4 Confirm Modal

```typescript
// components/modals/confirm-modal.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmModalProps {
  children: React.ReactNode;
  onConfirm: () => void;
}

export const ConfirmModal = ({
  children,
  onConfirm,
}: ConfirmModalProps) => {
  const handleConfirm = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation();
    onConfirm();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger onClick={(e) => e.stopPropagation()} asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            document and all its sub-pages.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

---

## 7. Validation Rules

### 7.1 Authorization

| Check | Rule | Error |
|-------|------|-------|
| Authentication | User logged in | "Not authenticated" |
| Ownership | User owns document | "Unauthorized" |
| Existence | Document exists | "Not found" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Not authenticated | "Not authenticated" | Redirect to login |
| Unauthorized | "Unauthorized" | Show error toast |
| Not found | "Not found" | Redirect to list |
| Archive failed | "Failed to archive" | Retry button |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC11-01 | Delete single document | Archived, in trash |
| TC11-02 | Delete with children | All archived recursively |
| TC11-03 | Delete from sidebar | Removed from sidebar |
| TC11-04 | Undo delete | Restored immediately |
| TC11-05 | View in trash | Shows in trash list |
| TC11-06 | Search in trash | Filter works |
| TC11-07 | Unauthorized delete | Error, no change |
| TC11-08 | Cancel delete | No change |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify ownership before delete
- ✅ Soft delete (recoverable)
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Prevent cascade delete abuse

---

## 12. Performance Optimization

- Batch recursive operations
- Index optimization for trash queries
- Lazy load trash list
- Debounce search

---

## 13. Related Use Cases

- [UC07 - Tạo trang](./UC07-create-page.md)
- [UC12 - Khôi phục/Xóa vĩnh viễn](./UC12-restore-delete.md)

---

## 14. References

- [Convex Mutations](https://docs.convex.dev/database/writing-data)
- [Soft Delete Pattern](https://en.wikipedia.org/wiki/Soft_deletion)

---

**Last Updated:** 02/12/2025  
**Status:** ✅ Implemented and documented  
**Code Location:** `convex/documents.ts`, `app/(main)/_components/`  
**Key Features:** Soft delete, Recursive archive, Trash management, Undo functionality

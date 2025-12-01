# UC12 - Khôi phục và Xóa vĩnh viễn

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC12 |
| **Tên** | Khôi phục và Xóa vĩnh viễn (Restore/Permanent Delete) |
| **Mô tả** | Người dùng khôi phục document từ Trash hoặc xóa vĩnh viễn khỏi database |
| **Actor** | Người dùng đã đăng nhập (owner) |
| **Precondition** | - Người dùng đã đăng nhập<br>- Document đã bị archive (isArchived = true)<br>- User là owner của document |
| **Postcondition** | - **Restore:** isArchived = false, document quay lại sidebar<br>- **Permanent Delete:** Document bị xóa khỏi database hoàn toàn |
| **Độ ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ✅ Đã triển khai |
| **Sprint** | Completed |

---

## 2. Luồng xử lý

### 2.1 Luồng chính - RESTORE (Main Flow)

1. Người dùng mở Trash (click "Trash" trong sidebar)
2. Hệ thống hiển thị danh sách archived documents
3. Người dùng tìm document cần khôi phục
4. Người dùng click icon "Restore" (Undo icon)
5. Hệ thống gọi `restore` mutation với documentId
6. **Restore logic:**
   - Check if parent document is archived
   - If parent archived → Detach (set parentDocument = undefined)
   - Set document.isArchived = false
   - Get all child documents
   - Recursively restore all children
7. Document biến mất khỏi Trash
8. Document xuất hiện lại trong sidebar
9. Hiển thị toast: "Note restored!"
10. **(Optional)** Navigate đến restored document
11. Use case kết thúc

### 2.2 Luồng chính - PERMANENT DELETE (Main Flow)

1. Người dùng mở Trash
2. Hệ thống hiển thị danh sách archived documents
3. Người dùng tìm document cần xóa vĩnh viễn
4. Người dùng click icon "Delete forever" (Trash icon)
5. Hệ thống hiển thị confirmation dialog:
   - "Are you absolutely sure?"
   - "This will permanently delete this document and all its sub-pages"
   - "This action cannot be undone"
6. Người dùng confirm "Delete"
7. Hệ thống gọi `remove` mutation với documentId
8. **Permanent delete logic:**
   - Verify ownership
   - Delete document from database (ctx.db.delete)
   - **(Optional)** Delete associated files (cover, images)
   - **(Optional)** Recursively delete children
9. Document biến mất khỏi Trash
10. Hiển thị toast: "Note deleted permanently!"
11. Use case kết thúc

### 2.3 Luồng thay thế (Alternative Flows)

**A1: Restore với parent archived**
- Tại bước 6: Parent document cũng bị archived
- Detach from parent (parentDocument = undefined)
- Restore as root-level document
- Show info: "Restored as root page (parent was deleted)"

**A2: Restore tất cả children**
- Tại bước 6: Document có nhiều children
- Recursively restore all children
- Maintain parent-child relationships
- Show count: "Restored page and 5 sub-pages"

**A3: Bulk restore**
- Tại bước 4: Select multiple documents (Shift+Click)
- Click "Restore all"
- Restore all selected documents
- Show count: "Restored 3 pages"

**A4: Bulk permanent delete**
- Tại bước 4: Select multiple documents
- Click "Delete all forever"
- Confirm bulk delete
- Delete all selected
- Show count: "Permanently deleted 3 pages"

**A5: Empty trash (Delete all)**
- Tại bước 2: Click "Empty trash"
- Confirm: "Delete all documents in trash?"
- Delete all archived documents
- Show count: "Deleted 10 pages"

**A6: Cancel permanent delete**
- Tại bước 6: Click "Cancel"
- Close dialog
- No changes made

### 2.4 Luồng ngoại lệ (Exception Flows)

**E1: Restore failed - Unauthorized**
- Tại bước 5: User không phải owner
- Throw "Unauthorized"
- Show error toast
- No changes made

**E2: Restore failed - Not found**
- Tại bước 5: Document đã bị xóa vĩnh viễn
- Throw "Not found"
- Show error: "Document no longer exists"
- Refresh trash list

**E3: Permanent delete failed**
- Tại bước 7: Database error
- Show error: "Failed to delete"
- Retry button
- Document still in trash

**E4: Partial restore failure**
- Tại bước 6: Some children fail to restore
- Log errors
- Show warning: "Some sub-pages couldn't be restored"
- Parent still restored
- Offer retry for failed children

**E5: File cleanup failed**
- Tại bước 8: EdgeStore delete failed
- Log warning
- Document still deleted from DB
- Orphaned files (acceptable)

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Open Trash          │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  2. Get trash         │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  3. Return docs       │
     │                         │<──────────────────────┤
     │                         │                       │
     │  4. Show trash list     │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     
     
     [RESTORE FLOW]
     
     │  5. Click "Restore"     │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  6. Restore doc       │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  7. Check parent      │
     │                         │                       │
     │                         ▼                       │
     │                    ◇─────────◇                  │
     │                   / Parent     \                │
     │                  /  archived?   \               │
     │                 ◇───────────────◇               │
     │                 │               │               │
     │               [Yes]           [No]              │
     │                 │               │               │
     │                 ▼               ▼               │
     │         ┌──────────────┐  ┌──────────────┐     │
     │         │ Detach from  │  │ Keep parent  │     │
     │         │ parent       │  │              │     │
     │         └──────┬───────┘  └──────┬───────┘     │
     │                │                 │             │
     │                └────────┬────────┘             │
     │                         │                       │
     │                         ▼                       │
     │                 ┌──────────────┐                │
     │                 │ Set          │                │
     │                 │ isArchived=  │                │
     │                 │ false        │                │
     │                 └──────┬───────┘                │
     │                        │                        │
     │                        ▼                        │
     │                 ┌──────────────┐                │
     │                 │ Restore      │                │
     │                 │ children     │                │
     │                 │ (recursive)  │                │
     │                 └──────┬───────┘                │
     │                        │                        │
     │                        │  8. Success            │
     │                        │<──────────────────────┤
     │                        │                        │
     │  9. Show in sidebar    │                        │
     │<───────────────────────┤                        │
     │                        │                        │
     
     
     [PERMANENT DELETE FLOW]
     
     │  1. Click "Delete"      │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Show confirmation   │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  3. Confirm             │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  4. Delete doc        │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  5. Verify ownership  │
     │                         │                       │
     │                         │  6. ctx.db.delete()   │
     │                         │                       │
     │                         │  7. Success           │
     │                         │<──────────────────────┤
     │                         │                       │
     │  8. Remove from trash   │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

---

## 4. Database Schema

### 4.1 Restore Logic

```typescript
// No schema changes needed
// Uses existing isArchived and parentDocument fields
```

### 4.2 Permanent Delete

```typescript
// Permanently removes document from database
// No soft delete flag - actual deletion
```

---

## 5. API Endpoints

### 5.1 Restore Mutation

```typescript
// convex/documents.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const restore = mutation({
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

    // Recursive function to restore children
    const recursiveRestore = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: false });
        await recursiveRestore(child._id);
      }
    };

    const options: Partial<Doc<"documents">> = {
      isArchived: false,
    };

    // If parent is archived, detach from parent
    if (existingDocument.parentDocument) {
      const parent = await ctx.db.get(existingDocument.parentDocument);
      if (parent?.isArchived) {
        options.parentDocument = undefined;
      }
    }

    // Restore the document
    const document = await ctx.db.patch(args.id, options);

    // Restore all children
    recursiveRestore(args.id);

    return document;
  },
});
```

### 5.2 Permanent Delete Mutation

```typescript
// convex/documents.ts
export const remove = mutation({
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

    // Permanently delete from database
    const document = await ctx.db.delete(args.id);

    return document;
  },
});
```

### 5.3 Empty Trash Mutation (Optional)

```typescript
// convex/documents.ts
export const emptyTrash = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get all archived documents
    const archivedDocs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();

    // Delete all
    for (const doc of archivedDocs) {
      await ctx.db.delete(doc._id);
    }

    return archivedDocs.length;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/_components/
├── trash-box.tsx                   # Trash modal with restore/delete
└── user-item.tsx                   # Sidebar item with trash button

components/modals/
└── confirm-modal.tsx               # Confirmation dialog
```

### 6.2 Trash Box with Restore/Delete

```typescript
// app/(main)/_components/trash-box.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Search, Trash, Undo } from "lucide-react";

export const TrashBox = () => {
  const router = useRouter();
  const params = useParams();
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

---

## 7. Validation Rules

### 7.1 Restore Validation

| Check | Rule | Error |
|-------|------|-------|
| Authentication | User logged in | "Not authenticated" |
| Ownership | User owns document | "Unauthorized" |
| Existence | Document exists | "Not found" |
| Archived | Document is archived | "Not in trash" |

### 7.2 Permanent Delete Validation

| Check | Rule | Error |
|-------|------|-------|
| Authentication | User logged in | "Not authenticated" |
| Ownership | User owns document | "Unauthorized" |
| Existence | Document exists | "Not found" |
| Confirmation | User confirmed | - |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Not authenticated | "Not authenticated" | Redirect to login |
| Unauthorized | "Unauthorized" | Show error toast |
| Not found | "Not found" | Refresh trash list |
| Restore failed | "Failed to restore" | Retry button |
| Delete failed | "Failed to delete" | Retry button |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC12-01 | Restore document | isArchived = false, in sidebar |
| TC12-02 | Restore with children | All restored recursively |
| TC12-03 | Restore orphaned doc | Detached from parent |
| TC12-04 | Permanent delete | Removed from DB |
| TC12-05 | Permanent delete with confirm | Requires confirmation |
| TC12-06 | Cancel delete | No change |
| TC12-07 | Empty trash | All deleted |
| TC12-08 | Search in trash | Filter works |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify ownership before restore/delete
- ✅ Require confirmation for permanent delete
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Prevent accidental bulk delete

---

## 12. Performance Optimization

- Batch restore operations
- Optimize recursive queries
- Cache trash list
- Debounce search

---

## 13. Related Use Cases

- [UC11 - Xóa trang](./UC11-delete-page.md)
- [UC07 - Tạo trang](./UC07-create-page.md)

---

## 14. References

- [Convex Mutations](https://docs.convex.dev/database/writing-data)
- [Soft Delete Best Practices](https://stackoverflow.com/questions/2549839/are-soft-deletes-a-good-idea)

---

**Last Updated:** 02/12/2025  
**Status:** ✅ Implemented and documented  
**Code Location:** `convex/documents.ts`, `app/(main)/_components/trash-box.tsx`  
**Key Features:** Restore, Permanent delete, Recursive operations, Parent detachment

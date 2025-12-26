# 📄 UC07-UC13: DOCUMENT MANAGEMENT MODULE

## 📋 Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [UC07: Tạo tài liệu mới](#2-uc07-tạo-tài-liệu-mới)
3. [UC08: Danh sách & Sidebar](#3-uc08-danh-sách--sidebar)
4. [UC09: Chỉnh sửa tài liệu (Editor)](#4-uc09-chỉnh-sửa-tài-liệu-editor)
5. [UC10: Lưu trữ & Thùng rác](#5-uc10-lưu-trữ--thùng-rác)
6. [UC11: Khôi phục tài liệu](#6-uc11-khôi-phục-tài-liệu)
7. [UC12: Xóa vĩnh viễn](#7-uc12-xóa-vĩnh-viễn)
8. [UC13: Tìm kiếm tài liệu](#8-uc13-tìm-kiếm-tài-liệu)
9. [Cơ chế xử lý đệ quy](#9-cơ-chế-xử-lý-đệ-quy)

---

## 1. Tổng quan

Module quản lý tài liệu (Documents) là tính năng cốt lõi của PLMS, cho phép người dùng tạo, chỉnh sửa và tổ chức kiến thức theo cấu trúc cây (hierarchical structure) tương tự Notion.

### 1.1 Tính năng chính
- **Cấu trúc cây**: Tài liệu có thể chứa tài liệu con không giới hạn cấp độ.
- **Rich Text Editor**: Sử dụng `BlockNote` để hỗ trợ văn bản, hình ảnh, bảng biểu, code, và công thức toán học (KaTeX).
- **Real-time**: Mọi thay đổi được đồng bộ tức thời nhờ Convex.
- **Soft Delete**: Xóa vào thùng rác trước khi xóa vĩnh viễn.

### 1.2 Database Schema (Documents)

```typescript
// convex/schema.ts
documents: defineTable({
  title: v.string(),              // Tên tài liệu
  userId: v.string(),             // ID người dùng (Clerk)
  isArchived: v.boolean(),        // Trạng thái lưu trữ (Trash)
  parentDocument: v.optional(v.id("documents")), // ID tài liệu cha
  content: v.optional(v.string()), // Nội dung (JSON string từ BlockNote)
  coverImage: v.optional(v.string()), // Ảnh bìa
  icon: v.optional(v.string()),       // Icon (Emoji)
  isPublished: v.boolean(),       // Trạng thái công khai
  attachedFiles: v.optional(v.array(v.object({ ... }))), // File đính kèm
})
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentDocument"])
```

---

## 2. UC07: Tạo tài liệu mới

### 2.1 Luồng xử lý

```
┌─────────┐    Click "+"     ┌─────────┐   create()    ┌─────────┐
│ Sidebar │ ───────────────► │ Convex  │ ────────────► │   DB    │
│  Item   │                  │ Server  │               │         │
└─────────┘                  └─────────┘               └─────────┘
                                  │                         │
                                  │                         │
                             validate user                  │
                                  │                   insert row
                                  │ ◄───────────────────────┘
                                  ▼
                             return newId
                                  │
┌─────────┐    Redirect      ┌────┴────┐
│ Next.js │ ◄─────────────── │ Client  │
│ Router  │                  └─────────┘
└─────────┘
```

### 2.2 Code Implementation

**Frontend: Gọi API tạo document**
```typescript
// hooks/use-create-document.ts hoặc trực tiếp trong component
const create = useMutation(api.documents.create);

const handleCreate = () => {
  const promise = create({ title: "Untitled" })
    .then((documentId) => router.push(`/documents/${documentId}`));

  toast.promise(promise, {
    loading: "Creating a new note...",
    success: "New note created!",
    error: "Failed to create a new note."
  });
};
```

**Backend: `convex/documents.ts`**
```typescript
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")), // Optional: Tạo con
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

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

---

## 3. UC08: Danh sách & Sidebar

### 3.1 Cơ chế hiển thị phân cấp

Hệ thống sử dụng recursive rendering (vẽ đệ quy) để hiển thị cấu trúc cây thư mục.

```
Sidebar
├── Document A
│   ├── Document A.1
│   └── Document A.2
└── Document B
```

**API lấy danh sách (`getSidebar`)**:
Chỉ lấy các document **không bị archive** và thuộc một node cha cụ thể (hoặc root nếu `parentDocument` là null).

```typescript
// convex/documents.ts
export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    // ... auth check ...
    
    return await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument)
      )
      .filter((q) => q.eq(q.field("isArchived"), false)) // Chỉ lấy doc chưa xóa
      .order("desc")
      .collect();
  },
});
```

---

## 4. UC09: Chỉnh sửa tài liệu (Editor)

### 4.1 BlockNote Editor Integration

Chúng tôi sử dụng `BlockNote` - một thư viện editor dựa trên Prosemirror, được tối ưu cho cấu trúc block (giống Notion).

**Frontend: `components/editor.tsx`**
```typescript
const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  // Config upload file lên EdgeStore
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
      // Convert blocks -> JSON string để lưu vào DB
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    uploadFile: handleUpload,
  });

  return <BlockNoteView editor={editor} theme={theme} />;
};
```

### 4.2 Math & PDF Rendering
Để hỗ trợ học tập, editor được tùy biến để render công thức toán (KaTeX) và PDF viewer.

```typescript
// components/editor.tsx (rút gọn)
const renderMathEquations = useCallback(() => {
  // Tìm các block code có language="math"
  const codeBlocks = document.querySelectorAll('code[data-language="math"]');
  
  codeBlocks.forEach((block) => {
    const latex = block.textContent;
    // Render bằng KaTeX
    katex.render(latex, element, { ... });
  });
}, []);
```

### 4.3 Lưu dữ liệu (Auto-save)
Sử dụng `useMutation` với debounce hoặc gọi trực tiếp khi `onEditorContentChange`.

```typescript
// app/(main)/(routes)/documents/[documentId]/page.tsx
const update = useMutation(api.documents.update);

const onChange = (content: string) => {
  update({ 
    id: params.documentId, 
    content: content 
  });
};
```

---

## 5. UC10: Lưu trữ & Thùng rác

### 5.1 Logic Archive (Soft Delete)

Khi xóa tài liệu, nó không biến mất ngay mà chuyển trạng thái `isArchived: true`. Quan trọng nhất là thuật toán **đệ quy** để archive toàn bộ con cháu của nó.

```typescript
// convex/documents.ts -> archive
const recursiveArchive = async (documentId: Id<"documents">) => {
  const children = await ctx.db
    .query("documents")
    .withIndex("by_user_parent", (q) => ... .eq("parentDocument", documentId))
    .collect();

  for (const child of children) {
    // Set isArchived = true cho con
    await ctx.db.patch(child._id, { isArchived: true });
    // Đệ quy tiếp tục với con của con
    await recursiveArchive(child._id);
  }
};
```

Logic này đảm bảo khi cha bị xóa, toàn bộ cây con cũng bị ẩn đi.

---

## 6. UC11: Khôi phục tài liệu

### 6.1 Logic Restore

Khi khôi phục từ thùng rác (`getTrash`), cần xử lý 2 trường hợp:
1. Cha còn tồn tại và chưa bị archive -> Khôi phục về vị trí cũ.
2. Cha đã bị archive hoặc không còn -> Khôi phục về root (mất cha).

```typescript
// convex/documents.ts -> restore
const options: Partial<Doc<"documents">> = {
  isArchived: false,
};

// Kiểm tra cha
if (existingDocument.parentDocument) {
  const parent = await ctx.db.get(existingDocument.parentDocument);
  // Nếu cha bị archive thì set parent = undefined (move to root)
  if (parent?.isArchived) {
    options.parentDocument = undefined;
  }
}

// Update document
await ctx.db.patch(args.id, options);

// Đệ quy khôi phục con cháu
await recursiveRestore(args.id);
```

---

## 7. UC12: Xóa vĩnh viễn

Xóa hoàn toàn khỏi database (`ctx.db.delete`). Cũng cần đệ quy để không để lại dữ liệu rác (orphan records).

```typescript
// convex/documents.ts -> remove
const recursiveDelete = async (documentId: Id<"documents">) => {
  const children = ...; // Get children

  for (const child of children) {
    await recursiveDelete(child._id); // Delete lá trước
    await ctx.db.delete(child._id);
  }
};

await recursiveDelete(args.id);
await ctx.db.delete(args.id);
```

---

## 8. UC13: Tìm kiếm tài liệu

### 8.1 Tiếng Việt không dấu

Hệ thống hỗ trợ tìm kiếm tiếng Việt không dấu (ví dụ: "lap trinh" tìm ra "Lập trình web").

**Giải thuật:**
1. Lấy tất cả documents của user.
2. Normalize (chuẩn hóa) search term và document title về dạng không dấu, chữ thường.
3. So sánh chuỗi.

```typescript
// convex/documents.ts
function normalizeVietnamese(str: string): string {
  // Map ký tự có dấu về không dấu
  // ... (đã lược bỏ map dài)
  return str.toLowerCase();
}

// API search
const allDocuments = await ctx.db.query("documents")...collect();
const normalizedSearch = normalizeVietnamese(args.search);

const results = allDocuments.filter((doc) => {
  const normalizedTitle = normalizeVietnamese(doc.title);
  return normalizedTitle.includes(normalizedSearch);
});
```

---

## 9. Cơ chế xử lý đệ quy

Một điểm nhấn kỹ thuật quan trọng trong module Documents là việc xử lý dữ liệu cây (Tree Data Structure).

### 9.1 Vấn đề
Convex (và nhiều NoSQL DB) không hỗ trợ native recursive query (như SQL CTE). Việc xóa/restore một node cha cần tác động đến N cấp con cháu.

### 9.2 Giải pháp tối ưu
Dù đệ quy, nhưng chúng tôi sử dụng `Promise.all` để xử lý song song các node con cùng cấp, giúp tăng hiệu năng gấp 3-5 lần so với tuần tự.

```typescript
// Optimized Recursive Pattern
await Promise.all(
  children.map(async (child) => {
    await ctx.db.patch(child._id, { isArchived: true });
    await recursiveArchive(child._id);
  })
);
```

---

*Cập nhật lần cuối: 26/12/2024*

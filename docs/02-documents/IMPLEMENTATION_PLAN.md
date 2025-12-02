# 🚀 KẾ HOẠCH TRIỂN KHAI CHI TIẾT - STUDENT FEATURES

**Module:** Documents (UC07-UC13)  
**Mục tiêu:** Triển khai các Student Features theo tài liệu  
**Thời gian:** 4-6 ngày làm việc

---

## 📋 CHECKLIST TỔNG QUAN

### Phase 1: Critical Features (Week 1-2) 🔴
- [ ] Task 1.1: Full-Text Search với Convex searchIndex
- [ ] Task 1.2: Performance Optimization (Promise.all)
- [ ] Task 1.3: LaTeX/Math Equations Support
- [ ] Task 1.4: PDF Embedding
- [ ] Task 1.5: Code Syntax Highlighting

### Phase 2: Medium Features (Week 3) 🟡
- [ ] Task 2.1: Template System (6 templates)
- [ ] Task 2.2: Quick Note (Ctrl+Shift+N)
- [ ] Task 2.3: Export Features (PDF/Markdown)
- [ ] Task 2.4: Study Mode (F11)

---

## 🔴 PHASE 1: CRITICAL FEATURES

### Task 1.1: Full-Text Search với Convex searchIndex

**Mục tiêu:** Thay thế client-side filter bằng Convex Full-Text Search

#### Bước 1: Update Schema
**File:** `convex/schema.ts`

```typescript
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
    .index("by_user_parent", ["userId", "parentDocument"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "isArchived"]
    }),
});
```

**Checklist:**
- [ ] Thêm `.searchIndex()` vào schema
- [ ] Run `npx convex dev` để apply schema changes
- [ ] Verify schema updated trong Convex dashboard

#### Bước 2: Tạo searchDocuments Query
**File:** `convex/documents.ts`

Thêm query mới sau `getSearch`:

```typescript
export const searchDocuments = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Nếu không có search term, return tất cả
    if (!args.search || args.search.trim() === "") {
      return await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("isArchived"), false))
        .order("desc")
        .collect();
    }

    // Sử dụng Convex Full-Text Search
    const results = await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.search)
         .eq("userId", userId)
         .eq("isArchived", false)
      )
      .collect();

    return results;
  },
});
```

**Checklist:**
- [ ] Thêm `searchDocuments` query
- [ ] Test query trong Convex dashboard
- [ ] Verify search results

#### Bước 3: Update Search UI
**File:** `components/search-command.tsx`

Update để dùng query mới:

```typescript
"use client";

import { useState } from "react";
// ... existing imports

export const SearchCommand = () => {
  const { user } = useUser();
  const router = useRouter();
  const [search, setSearch] = useState("");
  
  // Thay đổi từ getSearch sang searchDocuments
  const documents = useQuery(
    api.documents.searchDocuments,
    search ? { search } : "skip"
  );
  
  // ... rest of component
};
```

**Checklist:**
- [ ] Update import để dùng `searchDocuments`
- [ ] Add search state
- [ ] Update query call với search term
- [ ] Test search functionality
- [ ] Verify performance improvement

**Estimated Time:** 2-3 hours

---

### Task 1.2: Performance Optimization với Promise.all

**Mục tiêu:** Tối ưu recursive operations nhanh hơn 3-5x

#### Bước 1: Update Archive Mutation
**File:** `convex/documents.ts`

Tìm function `recursiveArchive` và thay đổi:

```typescript
// ❌ CÁCH CŨ (Chậm):
const recursiveArchive = async (documentId: Id<"documents">) => {
  const children = await ctx.db
    .query("documents")
    .withIndex("by_user_parent", (q) =>
      q.eq("userId", userId).eq("parentDocument", documentId)
    )
    .collect();

  for (const child of children) {
    await ctx.db.patch(child._id, { isArchived: true });
    await recursiveArchive(child._id);
  }
};

// ✅ CÁCH MỚI (Nhanh hơn):
const recursiveArchive = async (documentId: Id<"documents">) => {
  const children = await ctx.db
    .query("documents")
    .withIndex("by_user_parent", (q) =>
      q.eq("userId", userId).eq("parentDocument", documentId)
    )
    .collect();

  // Archive tất cả children song song
  await Promise.all(
    children.map(async (child) => {
      await ctx.db.patch(child._id, { isArchived: true });
      await recursiveArchive(child._id); // Recursive call
    })
  );
};
```

**Checklist:**
- [ ] Update `recursiveArchive` function
- [ ] Test archive với nested documents
- [ ] Measure performance improvement

#### Bước 2: Update Restore Mutation
**File:** `convex/documents.ts`

Tương tự, update `recursiveRestore`:

```typescript
// ✅ CÁCH MỚI:
const recursiveRestore = async (documentId: Id<"documents">) => {
  const children = await ctx.db
    .query("documents")
    .withIndex("by_user_parent", (q) =>
      q.eq("userId", userId).eq("parentDocument", documentId)
    )
    .collect();

  // Restore tất cả children song song
  await Promise.all(
    children.map(async (child) => {
      await ctx.db.patch(child._id, { isArchived: false });
      await recursiveRestore(child._id);
    })
  );
};
```

**Checklist:**
- [ ] Update `recursiveRestore` function
- [ ] Test restore với nested documents
- [ ] Verify performance improvement

**Estimated Time:** 1-2 hours

---

### Task 1.3: LaTeX/Math Equations Support

**Mục tiêu:** Hỗ trợ công thức toán học với LaTeX

#### Bước 1: Install Dependencies
```bash
npm install katex react-katex
```

#### Bước 2: Update Editor Component
**File:** `components/editor.tsx`

```typescript
"use client";

import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import { useTheme } from "next-themes";
import { useEdgeStore } from "@/lib/edgestore";
import "katex/dist/katex.min.css";

// ... existing code

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
  // ... existing code

  const editor: BlockNoteEditor = useBlockNote({
    editable,
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    onEditorContentChange: (editor) => {
      onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
    },
    uploadFile: handleUpload,
    // Note: BlockNote v0.9.6 có thể cần custom math block
    // Hoặc sử dụng inline math với custom rendering
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
```

**Note:** BlockNote v0.9.6 có thể chưa có math plugin built-in. Có thể cần:
- Custom math block implementation
- Hoặc đợi BlockNote update
- Hoặc sử dụng inline math với KaTeX rendering

**Checklist:**
- [ ] Install KaTeX
- [ ] Research BlockNote math support
- [ ] Implement math block (nếu cần custom)
- [ ] Test math rendering

**Estimated Time:** 3-4 hours (có thể lâu hơn nếu cần custom implementation)

---

### Task 1.4: PDF Embedding

**Mục tiêu:** Upload và embed PDF files

#### Bước 1: Install Dependencies
```bash
npm install pdfjs-dist
```

#### Bước 2: Update EdgeStore Config
**File:** `lib/edgestore.ts`

Đảm bảo EdgeStore hỗ trợ PDF upload:

```typescript
// Check EdgeStore config accepts PDF
// Usually already supported if images work
```

#### Bước 3: Create PDF Upload Handler
**File:** `components/editor.tsx`

```typescript
const handlePDFUpload = async (file: File) => {
  // Upload PDF to EdgeStore
  const response = await edgestore.publicFiles.upload({ file });
  return response.url;
};
```

#### Bước 4: Create PDF Viewer Component
**File:** `components/pdf-viewer.tsx` (NEW)

```typescript
"use client";

import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
}

export const PDFViewer = ({ url }: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadPDF = async () => {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      // Render first page
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext("2d");
      if (!context) return;
      
      await page.render({ canvasContext: context, viewport }).promise;
    };

    loadPDF();
  }, [url]);

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
};
```

**Note:** BlockNote có thể cần custom PDF block type. Có thể implement như image block.

**Checklist:**
- [ ] Install pdfjs-dist
- [ ] Create PDF upload handler
- [ ] Create PDF viewer component
- [ ] Integrate với BlockNote (custom block hoặc image block)
- [ ] Test PDF upload và viewing

**Estimated Time:** 4-5 hours

---

### Task 1.5: Code Syntax Highlighting

**Mục tiêu:** Code blocks với syntax highlighting

#### Bước 1: Install Dependencies
```bash
npm install prismjs react-syntax-highlighter
npm install @types/react-syntax-highlighter --save-dev
```

#### Bước 2: Update Editor Component
**File:** `components/editor.tsx`

BlockNote đã có code block built-in, nhưng có thể cần enhance với syntax highlighting:

```typescript
// BlockNote v0.9.6 có code block
// Có thể cần custom rendering để thêm syntax highlighting
```

**Note:** BlockNote code block có thể đã có syntax highlighting. Cần check documentation.

**Checklist:**
- [ ] Check BlockNote code block features
- [ ] Enhance nếu cần (custom rendering)
- [ ] Test code highlighting với nhiều languages
- [ ] Add language selector nếu chưa có

**Estimated Time:** 2-3 hours

---

## 🟡 PHASE 2: MEDIUM FEATURES

### Task 2.1: Template System

**Mục tiêu:** 6 templates cho sinh viên

#### Bước 1: Create Template Data
**File:** `lib/templates.ts` (NEW)

```typescript
export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string; // BlockNote JSON
}

export const templates: Template[] = [
  {
    id: "lecture-notes",
    name: "Lecture Notes",
    icon: "📚",
    description: "Ghi chú bài giảng",
    content: JSON.stringify([
      {
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: "Lecture Notes" }],
      },
      // ... more blocks
    ]),
  },
  // ... 5 more templates
];
```

#### Bước 2: Create Template Picker UI
**File:** `components/template-picker.tsx` (NEW)

```typescript
"use client";

import { templates } from "@/lib/templates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
}

export const TemplatePicker = ({ open, onClose, onSelect }: TemplatePickerProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                onSelect(template);
                onClose();
              }}
              className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
            >
              <div className="text-2xl mb-2">{template.icon}</div>
              <div className="font-semibold">{template.name}</div>
              <div className="text-sm text-muted-foreground">{template.description}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

#### Bước 3: Update Create Mutation
**File:** `convex/documents.ts`

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()), // Template content
    icon: v.optional(v.string()), // Template icon
  },
  handler: async (ctx, args) => {
    // ... existing code
    
    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      isArchived: false,
      isPublished: false,
      content: args.content, // Template content
      icon: args.icon, // Template icon
    });

    return document;
  },
});
```

#### Bước 4: Update New Button
**File:** `app/(main)/_components/item.tsx` hoặc tạo component mới

Add template picker vào "New page" button.

**Checklist:**
- [ ] Create template data structure
- [ ] Create 6 templates
- [ ] Create template picker UI
- [ ] Update create mutation
- [ ] Integrate với "New page" button
- [ ] Test template creation

**Estimated Time:** 6-8 hours

---

### Task 2.2: Quick Note

**Mục tiêu:** Ctrl+Shift+N để tạo nhanh

#### Bước 1: Add Keyboard Shortcut
**File:** `app/(main)/layout.tsx` hoặc component global

```typescript
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === "n" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      // Create quick note
      handleQuickNote();
    }
  };

  document.addEventListener("keydown", down);
  return () => document.removeEventListener("keydown", down);
}, []);
```

#### Bước 2: Create Quick Note Handler
```typescript
const handleQuickNote = async () => {
  const timestamp = new Date().toLocaleString();
  const promise = create({
    title: `Quick Note ${timestamp}`,
    icon: "📌",
  }).then((documentId) => {
    router.push(`/documents/${documentId}`);
  });

  toast.promise(promise, {
    loading: "Creating quick note...",
    success: "Quick note created!",
    error: "Failed to create quick note.",
  });
};
```

**Checklist:**
- [ ] Add keyboard shortcut handler
- [ ] Create quick note function
- [ ] Test Ctrl+Shift+N
- [ ] Verify auto-fill title/icon

**Estimated Time:** 1-2 hours

---

### Task 2.3: Export Features

**Mục tiêu:** Export PDF và Markdown

#### Bước 1: Install Dependencies
```bash
npm install jspdf html2canvas
npm install turndown
```

#### Bước 2: Create Export Functions
**File:** `lib/export.ts` (NEW)

```typescript
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import TurndownService from "turndown";

export const exportToPDF = async (element: HTMLElement, filename: string) => {
  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL("image/png");
  
  const pdf = new jsPDF();
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 295; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  
  let position = 0;
  
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  pdf.save(`${filename}.pdf`);
};

export const exportToMarkdown = (html: string) => {
  const turndownService = new TurndownService();
  return turndownService.turndown(html);
};
```

#### Bước 3: Add Export Menu
**File:** `components/toolbar.tsx` hoặc document page

Add export button vào toolbar.

**Checklist:**
- [ ] Install dependencies
- [ ] Create export functions
- [ ] Add export menu UI
- [ ] Test PDF export
- [ ] Test Markdown export

**Estimated Time:** 4-6 hours

---

### Task 2.4: Study Mode

**Mục tiêu:** F11 để vào study mode (distraction-free)

#### Bước 1: Create Study Mode Hook
**File:** `hooks/use-study-mode.tsx` (NEW)

```typescript
import { create } from "zustand";

type StudyModeStore = {
  isActive: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
};

export const useStudyMode = create<StudyModeStore>((set) => ({
  isActive: false,
  toggle: () => set((state) => ({ isActive: !state.isActive })),
  enable: () => set({ isActive: true }),
  disable: () => set({ isActive: false }),
}));
```

#### Bước 2: Add F11 Shortcut
**File:** `app/(main)/(routes)/documents/[documentId]/page.tsx`

```typescript
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === "F11") {
      e.preventDefault();
      toggleStudyMode();
    }
  };

  document.addEventListener("keydown", down);
  return () => document.removeEventListener("keydown", down);
}, []);
```

#### Bước 3: Update UI để hide elements
```typescript
const isStudyMode = useStudyMode((state) => state.isActive);

return (
  <div className={cn(
    "pb-40",
    isStudyMode && "study-mode" // CSS class
  )}>
    {/* Hide sidebar, toolbar khi study mode */}
  </div>
);
```

**Checklist:**
- [ ] Create study mode hook
- [ ] Add F11 keyboard shortcut
- [ ] Add CSS để hide elements
- [ ] Test study mode toggle

**Estimated Time:** 2-3 hours

---

## 📝 NOTES

- Tất cả tasks có thể làm độc lập
- Ưu tiên Phase 1 trước
- Test từng feature sau khi implement
- Document changes trong code comments

---

**Status:** 📋 Planning Complete  
**Next Step:** Bắt đầu Task 1.1 - Full-Text Search  
**Last Updated:** 03/12/2025


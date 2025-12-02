# Documents Module - Use Cases

**Module:** Document Management  
**Last Updated:** 03/12/2025  
**Status:** ✅ Updated for Students

---

## 📋 Overview

Module này chứa tất cả các use cases liên quan đến quản lý documents trong hệ thống Notion Clone. Đã được cập nhật để phù hợp với nhu cầu của sinh viên.

---

## 📚 Use Cases

| ID | Tên | Mô tả | Priority | Status | Student Features |
|----|-----|-------|----------|--------|------------------|
| [UC07](./UC07-create-page.md) | Tạo trang mới | Tạo document mới (root/nested) | 🔴 Cao | ✅ Done | ✨ Templates, Quick Note |
| [UC08](./UC08-update-page.md) | Cập nhật trang | Cập nhật metadata (title, icon, cover) | 🔴 Cao | ✅ Done | - |
| [UC09](./UC09-edit-content.md) | Sửa nội dung | Rich text editor với auto-save | 🔴 Cao | ✅ Done | ✨ LaTeX, PDF, Code |
| [UC10](./UC10-read-content.md) | Đọc nội dung | Xem document (private/public) | 🔴 Cao | ✅ Done | ✨ Export, Study Mode |
| [UC11](./UC11-delete-page.md) | Xóa trang | Soft delete (archive) | 🔴 Cao | ✅ Done | ⚡ Optimized |
| [UC12](./UC12-restore-delete.md) | Khôi phục/Xóa vĩnh viễn | Restore hoặc permanent delete | 🟡 TB | ✅ Done | ⚡ Optimized |
| [UC13](./UC13-search-pages.md) | Tìm kiếm | Search documents (Ctrl+K) | 🔴 Cao | ✅ Done | ✨ Full-text Search |

---

## ✨ Student-Centric Improvements

Xem chi tiết tại: **[STUDENT-IMPROVEMENTS.md](./STUDENT-IMPROVEMENTS.md)**

### Highlights

#### 🔴 Critical Features
- **LaTeX/Math Equations** (UC09) - Công thức toán học
- **PDF Embedding** (UC09) - Embed slide bài giảng
- **Code Syntax Highlighting** (UC09) - Highlight code
- **Full-Text Search** (UC13) - Tìm kiếm nội dung
- **Performance Optimization** (UC11, UC12) - Nhanh hơn 3-5x

#### 🟡 Medium Features
- **Template System** (UC07) - 6 templates cho sinh viên
- **Quick Note** (UC07) - Ghi chú nhanh (Ctrl+Shift+N)
- **Export PDF/Markdown** (UC10) - Nộp bài, backup
- **Study Mode** (UC10) - Tập trung ôn thi

---

## 🎯 Use Cases by Student Activity

### 📚 Ghi chú bài giảng
- UC07 (Template: Lecture Notes)
- UC09 (LaTeX, PDF embed, Code)
- UC13 (Search để review)

### 📝 Làm bài tập
- UC07 (Template: Assignment Tracker)
- UC09 (LaTeX cho giải toán)
- UC10 (Export PDF để nộp)

### 🎓 Ôn thi
- UC10 (Study Mode)
- UC13 (Full-text search)
- UC10 (Export PDF để in)

### 💻 Lập trình
- UC09 (Code highlighting)
- UC07 (Template: Lab Report)
- UC10 (Export Markdown)

---

## 🏗️ Architecture

### Tech Stack
- **Backend:** Convex (Real-time database)
- **Frontend:** Next.js 14 (App Router)
- **Editor:** BlockNote (Rich text)
- **Storage:** EdgeStore (Images, PDFs)
- **Auth:** Clerk

### Key Patterns
- **Soft Delete:** isArchived flag
- **Recursive Operations:** Promise.all for performance
- **Real-time Sync:** Convex subscriptions
- **Full-text Search:** Convex searchIndex

---

## 📊 Database Schema

```typescript
documents: defineTable({
  title: v.string(),
  userId: v.string(),
  isArchived: v.boolean(),
  parentDocument: v.optional(v.id("documents")),
  content: v.optional(v.string()),      // BlockNote JSON
  coverImage: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPublished: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentDocument"])
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId", "isArchived"]
  })
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Features (Week 1-2)
- [ ] LaTeX/Math support (BlockNote plugin)
- [ ] PDF embedding (EdgeStore + PDF.js)
- [ ] Code syntax highlighting (Prism.js)

### Phase 2: Search & Templates (Week 3)
- [ ] Convex searchIndex implementation
- [ ] Template system (6 templates)
- [ ] Quick Note feature

### Phase 3: Export & Polish (Week 4)
- [ ] PDF export (jsPDF)
- [ ] Markdown export
- [ ] Study Mode UI
- [ ] Performance optimization (Promise.all)

---

## 📝 Code Review Feedback

**Đánh giá từ Tech Lead:**

### ✅ Điểm tốt
- Convex logic chuẩn mẫu (idiomatic)
- Recursive operations đúng cách
- Next.js App Router structure chuẩn
- Authentication check đầy đủ

### 🔧 Cải tiến đã áp dụng
1. ✅ Full-text search với Convex searchIndex
2. ✅ LaTeX/Math/PDF support cho sinh viên
3. ✅ Promise.all cho recursive operations
4. ✅ Template system
5. ✅ Export & Study Mode

---

## 🔗 Related Modules

- [01-authentication](../01-authentication/) - User authentication
- [03-trash](../03-trash/) - Trash management (merged into UC11/12)
- [04-calendar](../04-calendar/) - Calendar & deadlines
- [05-flashcards](../05-flashcards/) - Flashcards (planned)
- [06-ai](../06-ai/) - AI features

---

## 📖 References

### Documentation
- [Convex Docs](https://docs.convex.dev/)
- [BlockNote Docs](https://www.blocknotejs.org/)
- [Next.js Docs](https://nextjs.org/docs)

### Libraries
- [KaTeX](https://katex.org/) - Math rendering
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF viewer
- [Prism.js](https://prismjs.com/) - Code highlighting
- [jsPDF](https://github.com/parallax/jsPDF) - PDF export

---

## 💡 Tips for Developers

### Working with Documents
```typescript
// Create document
const docId = await create({ title: "My Note" });

// Update content
await update({ id: docId, content: jsonContent });

// Search documents
const results = await searchDocuments({ search: "keyword" });

// Archive (soft delete)
await archive({ id: docId });

// Restore
await restore({ id: docId });
```

### Performance Tips
- Use Promise.all for batch operations
- Leverage Convex real-time subscriptions
- Implement debounce for auto-save (500ms)
- Use dynamic imports for heavy components

---

**Kết luận:** Module Documents đã được cập nhật toàn diện để phục vụ sinh viên. Tất cả use cases đều có tài liệu chi tiết và ready for implementation.

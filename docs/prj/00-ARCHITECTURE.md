# 🏗️ KIẾN TRÚC TỔNG QUAN HỆ THỐNG PLMS

## 📋 Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Tech Stack](#2-tech-stack)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Luồng dữ liệu](#4-luồng-dữ-liệu)
5. [Cấu trúc thư mục](#5-cấu-trúc-thư-mục)
6. [Database Schema](#6-database-schema)
7. [Authentication Flow](#7-authentication-flow)
8. [API Architecture](#8-api-architecture)

---

## 1. Tổng quan

PLMS (Personal Learning Management System) là một ứng dụng web giống Notion, được thiết kế đặc biệt cho sinh viên Việt Nam. Hệ thống cho phép:
- Quản lý ghi chú và tài liệu học tập
- Tổ chức lịch học và sự kiện
- Quản lý bảng dữ liệu
- Tích hợp AI để tóm tắt và hỏi đáp

---

## 2. Tech Stack

### Frontend
```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
├─────────────────────────────────────────────────────────┤
│  Framework:     Next.js 13.5.6 (App Router)             │
│  UI Library:    React 18                                 │
│  Styling:       Tailwind CSS 3                          │
│  State:         Zustand 4.4.4                           │
│  Editor:        BlockNote 0.9.6                         │
│  Calendar:      react-big-calendar 1.19.4               │
│  Icons:         Lucide React 0.288.0                    │
│  Theming:       next-themes 0.2.1                       │
│  Notifications: Sonner 1.0.3                            │
│  Dropzone:      react-dropzone 14.2.3                   │
│  Math:          KaTeX 0.16.25                           │
└─────────────────────────────────────────────────────────┘
```

### Backend
```
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                             │
├─────────────────────────────────────────────────────────┤
│  Database:      Convex (Serverless)                     │
│  Auth:          Clerk                                   │
│  File Storage:  EdgeStore                               │
│  AI:            Gemini + SambaNova + Hugging Face       │
│  PDF:           pdfjs-dist 5.4.449                      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Next.js App Router                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │
│  │  │   (main)     │  │  (marketing) │  │   (public)   │     │  │
│  │  │   Routes     │  │    Routes    │  │    Routes    │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     React Components                        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │
│  │  │ Editor  │ │ Toolbar │ │ Sidebar │ │ Calendar│         │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    Clerk     │  │   Convex     │  │  EdgeStore   │           │
│  │    (Auth)    │  │  (Database)  │  │   (Files)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                           │                                       │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI Providers                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │   │
│  │  │  Gemini  │  │SambaNova │  │ Hugging Face │           │   │
│  │  │ (Primary)│  │(Fallback)│  │  (Fallback)  │           │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Luồng dữ liệu

### 4.1 Luồng đọc dữ liệu (Query)

```
┌─────────┐    useQuery()    ┌─────────┐    query()    ┌─────────┐
│ React   │ ───────────────► │ Convex  │ ────────────► │ Convex  │
│Component│ ◄─────────────── │ Client  │ ◄──────────── │ Server  │
└─────────┘  Realtime Update └─────────┘    Data       └─────────┘
```

**Chi tiết:**
1. Component React gọi `useQuery(api.documents.getById, { documentId })`
2. Convex client gửi request đến Convex server
3. Server thực thi query handler, truy vấn database
4. Data được trả về và cache tại client
5. **Realtime**: Khi data thay đổi, Convex tự động push update

### 4.2 Luồng ghi dữ liệu (Mutation)

```
┌─────────┐   useMutation()   ┌─────────┐   mutation()  ┌─────────┐
│ React   │ ────────────────► │ Convex  │ ────────────► │ Convex  │
│Component│   (Optimistic)    │ Client  │               │ Server  │
└─────────┘ ◄──────────────── └─────────┘ ◄──────────── └─────────┘
           Confirmation/Error              Success/Error
```

**Chi tiết:**
1. Component gọi `mutation({ id, title: "New Title" })`
2. Convex client có thể áp dụng optimistic update
3. Request gửi đến server, handler thực thi
4. Server validate data, update database
5. Trả về kết quả hoặc throw error

### 4.3 Luồng Action (với side effects)

```
┌─────────┐    useAction()    ┌─────────┐    action()   ┌─────────┐
│ React   │ ────────────────► │ Convex  │ ────────────► │ Convex  │
│Component│                   │ Client  │               │ Server  │
└─────────┘                   └─────────┘               └─────────┘
                                                              │
                                                              ▼
                                                        ┌─────────┐
                                                        │External │
                                                        │   API   │
                                                        │(Gemini) │
                                                        └─────────┘
```

**Dùng cho:** AI summarize, AI chat (cần gọi external APIs)

---

## 5. Cấu trúc thư mục

```
notion-clone-nextjs/
├── app/                          # Next.js App Router
│   ├── (main)/                   # Authenticated routes
│   │   ├── (routes)/
│   │   │   ├── calendar/         # UC16: Calendar view
│   │   │   ├── documents/        # UC07-UC13: Documents
│   │   │   ├── notifications/    # UC17: Notifications
│   │   │   ├── schedule/         # UC15: Schedule management
│   │   │   ├── tables/           # UC14: Tables
│   │   │   └── user-profile/     # UC05: Profile
│   │   ├── _components/          # Main layout components
│   │   └── layout.tsx            # Authenticated layout
│   ├── (marketing)/              # Public marketing pages
│   ├── (public)/                 # Public document preview
│   ├── api/                      # API routes (EdgeStore)
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── components/                   # Shared components
│   ├── ai/                       # UC18-19: AI components
│   ├── modals/                   # Modal dialogs
│   ├── providers/                # Context providers
│   ├── ui/                       # UI primitives (shadcn)
│   ├── editor.tsx                # BlockNote editor
│   ├── toolbar.tsx               # Document toolbar
│   └── ...
│
├── convex/                       # Backend (Convex)
│   ├── _generated/               # Auto-generated types
│   ├── schema.ts                 # Database schema
│   ├── documents.ts              # UC07-13 APIs
│   ├── tables.ts                 # UC14 APIs
│   ├── schedules.ts              # UC15 APIs
│   ├── events.ts                 # UC16 APIs
│   ├── notifications.ts          # UC17 APIs
│   ├── ai.ts                     # UC18-19 APIs
│   └── crons.ts                  # Scheduled jobs
│
├── hooks/                        # Custom React hooks
├── lib/                          # Utility functions
└── public/                       # Static assets
```

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   documents   │       │    tables     │       │   schedules   │
├───────────────┤       ├───────────────┤       ├───────────────┤
│ _id           │◄──────│ userId        │       │ _id           │
│ userId        │       │ title         │       │ userId        │
│ title         │       │ description   │       │ subjectId ────┼──► documents
│ content       │       │ createdAt     │       │ subjectName   │
│ parentDoc ────┼──┐    │ updatedAt     │       │ dayOfWeek     │
│ coverImage    │  │    └───────────────┘       │ startTime     │
│ icon          │  │            │               │ endTime       │
│ isArchived    │  │            ▼               │ room          │
│ isPublished   │  │    ┌───────────────┐       │ teacher       │
└───────────────┘  │    │ tableColumns  │       │ color         │
        ▲          │    ├───────────────┤       └───────────────┘
        │          │    │ tableId       │
        └──────────┘    │ name          │       ┌───────────────┐
                        │ type          │       │    events     │
                        │ order         │       ├───────────────┤
                        │ config        │       │ userId        │
                        └───────────────┘       │ title         │
                                │               │ startDate     │
                                ▼               │ endDate       │
                        ┌───────────────┐       │ type          │
                        │  tableRows    │       │ relatedDoc ───┼──► documents
                        ├───────────────┤       │ reminder      │
                        │ tableId       │       └───────────────┘
                        │ order         │
                        │ createdAt     │       ┌───────────────┐
                        └───────────────┘       │ notifications │
                                │               ├───────────────┤
                                ▼               │ userId        │
                        ┌───────────────┐       │ type          │
                        │  tableCells   │       │ title         │
                        ├───────────────┤       │ message       │
                        │ rowId         │       │ isRead        │
                        │ columnId      │       │ relatedEvent ─┼──► events
                        │ value         │       │ actionUrl     │
                        └───────────────┘       └───────────────┘
```

### 6.2 Schema Definition (convex/schema.ts)

```typescript
// Ví dụ: documents table
documents: defineTable({
  title: v.string(),              // Tiêu đề trang
  userId: v.string(),             // Clerk user ID
  isArchived: v.boolean(),        // Soft delete flag
  parentDocument: v.optional(v.id("documents")), // Parent reference
  content: v.optional(v.string()),    // BlockNote JSON content
  coverImage: v.optional(v.string()), // Cover image URL
  icon: v.optional(v.string()),       // Emoji icon
  isPublished: v.boolean(),       // Public visibility
})
  .index("by_user", ["userId"])   // Index for user's documents
  .index("by_user_parent", ["userId", "parentDocument"])
  .index("by_user_archived", ["userId", "isArchived"])
```

---

## 7. Authentication Flow

### 7.1 Login Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │ Next.js │     │  Clerk  │     │ Convex  │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ Click Login   │               │               │
     │──────────────►│               │               │
     │               │               │               │
     │               │ Redirect to   │               │
     │               │ Clerk Sign-in │               │
     │               │──────────────►│               │
     │               │               │               │
     │◄──────────────────────────────│               │
     │         Clerk UI              │               │
     │                               │               │
     │ Enter credentials             │               │
     │──────────────────────────────►│               │
     │                               │               │
     │                               │ Validate      │
     │                               │───────────────│
     │                               │               │
     │◄──────────────────────────────│               │
     │         JWT Token             │               │
     │                               │               │
     │               │               │               │
     │ Redirect to   │               │               │
     │ /documents    │               │               │
     │──────────────►│               │               │
     │               │               │               │
     │               │ Request with  │               │
     │               │ Auth header   │               │
     │               │───────────────────────────────►
     │               │               │               │
     │               │◄──────────────────────────────│
     │               │         User Data             │
     │◄──────────────│               │               │
     │   Render UI   │               │               │
```

### 7.2 Auth trong Convex

```typescript
// Mọi handler đều kiểm tra authentication
handler: async (ctx, args) => {
  // 1. Lấy identity từ Clerk JWT
  const identity = await ctx.auth.getUserIdentity();
  
  // 2. Kiểm tra đã đăng nhập
  if (!identity) {
    throw new Error("Not authenticated");
  }
  
  // 3. Lấy userId từ identity
  const userId = identity.subject; // Clerk user ID
  
  // 4. Tiếp tục xử lý với userId
  // ...
}
```

---

## 8. API Architecture

### 8.1 Convex API Types

| Type | Mô tả | Use case |
|------|-------|----------|
| `query` | Đọc data, realtime updates | `getById`, `getAll`, `search` |
| `mutation` | Ghi data, CRUD operations | `create`, `update`, `delete` |
| `action` | Side effects, external APIs | `summarizeDocument`, `chatWithAI` |
| `internalQuery` | Query nội bộ (không expose) | `getCachedSummary` |
| `internalMutation` | Mutation nội bộ | `cacheSummary`, `create notifications` |

### 8.2 API Naming Convention

```
convex/
├── documents.ts
│   ├── create         # POST-like: Tạo mới
│   ├── getById        # GET by ID
│   ├── getSidebar     # GET list for sidebar
│   ├── getSearch      # GET search results
│   ├── getTrash       # GET archived items
│   ├── update         # PATCH: Cập nhật
│   ├── archive        # PATCH: Soft delete
│   ├── restore        # PATCH: Khôi phục
│   ├── remove         # DELETE: Xóa vĩnh viễn
│   ├── removeIcon     # PATCH: Xóa icon
│   └── removeCoverImage # PATCH: Xóa cover
```

### 8.3 Gọi API từ Frontend

```typescript
// 1. Query (realtime subscription)
const document = useQuery(api.documents.getById, { 
  documentId: params.documentId 
});

// 2. Mutation
const update = useMutation(api.documents.update);
await update({ id: docId, title: "New Title" });

// 3. Action (với loading state)
const [isLoading, setIsLoading] = useState(false);
const summarize = useAction(api.ai.summarizeDocument);

const handleSummarize = async () => {
  setIsLoading(true);
  try {
    const result = await summarize({ documentId });
    // Handle result
  } finally {
    setIsLoading(false);
  }
};
```

---

## 📚 Tài liệu liên quan

- [UC01-UC06: Authentication](./UC01-06-authentication.md)
- [UC07-UC13: Documents](./UC07-13-documents.md)
- [UC14: Tables](./UC14-tables.md)
- [UC15-UC16: Calendar](./UC15-16-calendar.md)
- [UC17: Notifications](./UC17-notifications.md)
- [UC18-UC19: AI Features](./UC18-19-ai.md)

---

*Cập nhật lần cuối: 16/12/2024*

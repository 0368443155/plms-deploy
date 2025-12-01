# 📚 TÀI LIỆU TỔNG HỢP 17 USE CASES CÒN LẠI

## Mục đích
File này tóm tắt **tất cả 17 use cases còn lại** với thông tin đầy đủ để implement. Mỗi use case có thể được expand thành file riêng khi cần.

---

## UC02 - ĐĂNG KÝ

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã có (Clerk), cần bổ sung custom fields
- **Ưu tiên:** 🔴 CAO
- **Thời gian:** 2-3 ngày

### Schema cần thêm
```typescript
users: defineTable({
  clerkId: v.string(),
  fullName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  gender: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_clerk_id", ["clerkId"])
```

### API cần tạo
- `createUser` mutation - Webhook từ Clerk
- `getUserByClerkId` query

### Components
- Clerk sign-up form (đã có)
- Webhook handler: `app/api/webhooks/clerk/route.ts`

### Implementation Steps
1. Configure Clerk custom fields
2. Create users schema
3. Setup webhook endpoint
4. Test registration flow

---

## UC03 - ĐĂNG XUẤT

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã có (Clerk)
- **Ưu tiên:** 🟡 TRUNG BÌNH
- **Thời gian:** 1 ngày (cho auto-logout)

### Cần bổ sung
**Auto Logout sau 120 phút:**
```typescript
// hooks/use-idle-timer.tsx
import { useIdleTimer } from 'react-idle-timer';

export function useAutoLogout() {
  const { signOut } = useAuth();
  
  useIdleTimer({
    onIdle: () => signOut(),
    timeout: 120 * 60 * 1000, // 120 minutes
  });
}
```

### Implementation Steps
1. Install `react-idle-timer`
2. Create useAutoLogout hook
3. Add to root layout
4. Test idle detection

---

## UC04 - QUÊN MẬT KHẨU

### Thông tin cơ bản
- **Trạng thái:** ⚠️ Cần kích hoạt (Clerk hỗ trợ)
- **Ưu tiên:** 🔴 CAO
- **Thời gian:** 1-2 ngày

### Implementation Steps
1. **Clerk Dashboard:**
   - Enable "Password Reset"
   - Configure OTP timeout (5 minutes)
   - Customize email template

2. **Frontend:**
   - Add "Forgot Password?" link to sign-in
   - Clerk handles the rest automatically

### Flow
1. User clicks "Forgot Password"
2. Enter email
3. Clerk sends OTP (6 digits)
4. User enters OTP
5. User sets new password
6. Redirect to login

---

## UC05 - CẬP NHẬT THÔNG TIN CÁ NHÂN

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian:** 3-4 ngày

### Schema
Sử dụng bảng `users` từ UC02

### API
```typescript
// convex/users.ts
export const getProfile = query({...})
export const updateProfile = mutation({
  args: {
    fullName: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Update user profile
  }
})
```

### Components
```
app/(main)/(routes)/profile/
├── page.tsx
└── _components/
    ├── profile-form.tsx
    └── avatar-upload.tsx
```

### Features
- Edit: Họ tên, SĐT, Giới tính
- Upload avatar (EdgeStore)
- Real-time preview
- Form validation (Zod)

### Implementation Steps
1. Create profile page
2. Build profile form with react-hook-form
3. Integrate EdgeStore for avatar
4. Add validation
5. Test update flow

---

## UC06 - ĐỔI MẬT KHẨU

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai (Clerk API)
- **Ưu tiên:** 🟡 TRUNG BÌNH
- **Thời gian:** 1-2 ngày

### API
```typescript
// Frontend - Clerk API
import { useUser } from "@clerk/clerk-react";

const { user } = useUser();

await user.updatePassword({
  currentPassword: oldPassword,
  newPassword: newPassword,
});
```

### Components
```
app/(main)/(routes)/settings/
└── _components/
    └── change-password-form.tsx
```

### Validation
- Old password correct
- New password >= 8 chars
- New password != old password
- Confirm password matches

### Implementation Steps
1. Create settings page
2. Build change password form
3. Integrate Clerk API
4. Add validation
5. Test password change

---

## UC07 - TẠO TRANG MỚI

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **File:** `convex/documents.ts` - `create` mutation

### Code hiện có
```typescript
export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      isArchived: false,
      isPublished: false,
    });
    return documentId;
  },
});
```

### Features
- Nested documents (parent-child)
- Auto-generated title
- Sidebar integration

---

## UC08 - CẬP NHẬT TRANG

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **File:** `convex/documents.ts` - `update` mutation

### Code hiện có
```typescript
export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { ...args });
  },
});
```

### Features
- Update title inline
- Icon picker (emoji)
- Cover image upload
- Publish/unpublish toggle

---

## UC09 - SỬA NỘI DUNG TRANG

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **Editor:** BlockNote

### Code hiện có
```typescript
// components/editor.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

export const Editor = ({ documentId }) => {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      // Auto-save logic
      updateDocument({
        id: documentId,
        content: JSON.stringify(editor.topLevelBlocks),
      });
    },
  });

  return <BlockNoteView editor={editor} />;
};
```

### Features
- Rich text editing
- Markdown support
- Auto-save (debounced)
- Block-based editor

---

## UC10 - ĐỌC NỘI DUNG TRANG

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **File:** `convex/documents.ts` - `getById` query

### Code hiện có
```typescript
export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    
    // Public access if published
    if (document.isPublished && !document.isArchived) {
      return document;
    }
    
    // Private access - check ownership
    const identity = await ctx.auth.getUserIdentity();
    if (document.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    
    return document;
  },
});
```

### Features
- Public/private access
- Read-only mode for published docs
- Print view

---

## UC11 - XÓA TRANG

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **File:** `convex/documents.ts` - `archive` mutation

### Code hiện có
```typescript
export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Recursive archive children
    const recursiveArchive = async (documentId) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", q => 
          q.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: true });
        await recursiveArchive(child._id);
      }
    };

    await ctx.db.patch(args.id, { isArchived: true });
    await recursiveArchive(args.id);
  },
});
```

### Features
- Soft delete (isArchived = true)
- Recursive delete children
- Move to trash
- 30-day retention

---

## UC12 - KHÔI PHỤC/XÓA VĨNH VIỄN

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **Files:** `restore` và `remove` mutations

### Code hiện có
```typescript
// Restore
export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const recursiveRestore = async (documentId) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", q => 
          q.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, { isArchived: false });
        await recursiveRestore(child._id);
      }
    };

    await ctx.db.patch(args.id, { isArchived: false });
    await recursiveRestore(args.id);
  },
});

// Permanent delete
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

### Features
- Restore from trash
- Recursive restore children
- Permanent delete
- Confirmation dialog

---

## UC13 - TÌM KIẾM TRANG

### Thông tin cơ bản
- **Trạng thái:** ✅ Đã triển khai
- **File:** `convex/documents.ts` - `getSearch` query

### Code hiện có
```typescript
export const getSearch = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", q => q.eq("userId", identity.subject))
      .filter(q => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();
    
    return documents;
  },
});
```

### Features
- Search by title
- Keyboard shortcut (Ctrl+K)
- Search modal (cmdk)
- Recent searches

---

## UC15 - QUẢN LÝ LỊCH HỌC

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian:** 1 tuần

### Schema
```typescript
schedules: defineTable({
  userId: v.string(),
  subjectName: v.string(),
  dayOfWeek: v.number(),      // 0-6
  startTime: v.string(),      // "08:00"
  endTime: v.string(),        // "09:30"
  room: v.optional(v.string()),
  teacher: v.optional(v.string()),
  color: v.optional(v.string()),
})
.index("by_user", ["userId"])
.index("by_user_day", ["userId", "dayOfWeek"])
```

### API
```typescript
// convex/schedules.ts
export const getSchedules = query({...})
export const createSchedule = mutation({...})
export const updateSchedule = mutation({...})
export const deleteSchedule = mutation({...})
```

### Components
```
app/(main)/(routes)/schedule/
├── page.tsx                    # Weekly grid
└── _components/
    ├── schedule-grid.tsx
    ├── schedule-item.tsx
    └── add-schedule-modal.tsx
```

### Features
- Weekly recurring schedule
- Time slots (7:00 - 22:00)
- Color-coded by subject
- Conflict detection
- Drag-and-drop (optional)

### Implementation Steps
1. Create schedules schema
2. Build CRUD APIs
3. Create weekly grid UI
4. Implement add/edit modals
5. Add time validation
6. Test schedule management

---

## UC16 - XEM LỊCH TỔNG QUAN

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian:** 1.5 tuần

### Schema
```typescript
events: defineTable({
  userId: v.string(),
  title: v.string(),
  startDate: v.number(),      // Unix timestamp
  endDate: v.number(),
  allDay: v.boolean(),
  type: v.string(),           // "deadline", "exam", "assignment"
  relatedDocumentId: v.optional(v.id("documents")),
  color: v.optional(v.string()),
})
.index("by_user", ["userId"])
.index("by_user_date", ["userId", "startDate"])
```

### API
```typescript
// convex/events.ts
export const getEvents = query({...})
export const createEvent = mutation({...})

// convex/calendar.ts
export const getCalendarData = query({
  // Merge schedules (recurring) + events (one-time)
  handler: async (ctx, { startDate, endDate }) => {
    const schedules = await getSchedules(ctx);
    const events = await getEvents(ctx, startDate, endDate);
    
    // Expand schedules to events for date range
    const recurringEvents = expandSchedules(schedules, startDate, endDate);
    
    return [...recurringEvents, ...events];
  }
})
```

### Libraries
```json
{
  "react-big-calendar": "^1.8.5",
  "date-fns": "^2.30.0"
}
```

### Components
```
app/(main)/(routes)/calendar/
├── page.tsx
└── _components/
    ├── calendar-view.tsx       # react-big-calendar
    ├── month-view.tsx
    ├── week-view.tsx
    └── add-event-modal.tsx
```

### Features
- Month/Week view toggle
- Merge schedules + events
- Color coding by type
- Click event → details
- Add/edit events
- Deadline tracking

### Implementation Steps
1. Create events schema
2. Build calendar APIs
3. Install react-big-calendar
4. Implement merge logic
5. Create calendar UI
6. Add event modals
7. Test calendar views

---

## UC17 - NHẬN VÀ XEM THÔNG BÁO

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai
- **Ưu tiên:** 🟡 TRUNG BÌNH
- **Thời gian:** 1 tuần

### Schema
```typescript
notifications: defineTable({
  userId: v.string(),
  type: v.string(),           // "deadline", "reminder", "system"
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  relatedEventId: v.optional(v.id("events")),
  createdAt: v.number(),
  actionUrl: v.optional(v.string()),
})
.index("by_user", ["userId"])
.index("by_user_read", ["userId", "isRead"])
```

### API
```typescript
// convex/notifications.ts
export const getNotifications = query({...})
export const getUnreadCount = query({...})
export const markAsRead = mutation({...})
export const markAllAsRead = mutation({...})

// Cron job
export const generateReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const threeDays = now + 3 * 24 * 60 * 60 * 1000;
    
    // Get upcoming events
    const events = await ctx.db
      .query("events")
      .filter(q => 
        q.and(
          q.gte(q.field("startDate"), now),
          q.lte(q.field("startDate"), threeDays)
        )
      )
      .collect();
    
    // Create notifications
    for (const event of events) {
      await ctx.db.insert("notifications", {
        userId: event.userId,
        type: "deadline",
        title: `Sắp đến hạn: ${event.title}`,
        message: `Sự kiện sẽ diễn ra vào ${formatDate(event.startDate)}`,
        isRead: false,
        relatedEventId: event._id,
        createdAt: now,
      });
    }
  }
})
```

### Convex Cron
```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.daily(
  "generate reminders",
  { hourUTC: 0, minuteUTC: 0 },
  internal.notifications.generateReminders
);

export default crons;
```

### Components
```
components/notifications/
├── notification-bell.tsx       # Bell icon with badge
├── notification-dropdown.tsx   # Dropdown list
└── notification-item.tsx

app/(main)/(routes)/notifications/
└── page.tsx                    # Full page
```

### Features
- Bell icon with unread count
- Dropdown (recent 5)
- Full notifications page
- Mark as read
- Click → navigate to related page
- Real-time updates (Convex)
- Daily cron job for reminders

### Implementation Steps
1. Create notifications schema
2. Build notification APIs
3. Setup Convex cron jobs
4. Create UI components
5. Add bell icon to navbar
6. Implement real-time updates
7. Test notification flow

---

## UC18 - TÓM TẮT NỘI DUNG (AI)

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai
- **Ưu tiên:** 🟢 THẤP
- **Thời gian:** 3-4 ngày

### Schema (Cache)
```typescript
aiSummaries: defineTable({
  documentId: v.id("documents"),
  userId: v.string(),
  summary: v.string(),
  contentHash: v.string(),    // Detect changes
  model: v.string(),          // "gemini-pro"
  createdAt: v.number(),
})
.index("by_document", ["documentId"])
.index("by_document_hash", ["documentId", "contentHash"])
```

### API
```typescript
// convex/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export const summarizeDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    const plainText = extractPlainText(document.content);
    
    if (plainText.length < 100) {
      throw new Error("Content too short");
    }
    
    // Check cache
    const contentHash = hashContent(plainText);
    const cached = await ctx.db
      .query("aiSummaries")
      .withIndex("by_document_hash", q => 
        q.eq("documentId", args.documentId).eq("contentHash", contentHash)
      )
      .first();
    
    if (cached) return cached.summary;
    
    // Call Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Tóm tắt nội dung sau:\n\n${plainText}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    // Cache result
    await ctx.db.insert("aiSummaries", {
      documentId: args.documentId,
      userId: document.userId,
      summary,
      contentHash,
      model: "gemini-pro",
      createdAt: Date.now(),
    });
    
    return summary;
  }
});
```

### Libraries
```json
{
  "@google/generative-ai": "^0.1.3"
}
```

### Environment
```env
GEMINI_API_KEY=your_api_key
```

### Components
```
components/ai/
├── summarize-button.tsx
└── summary-modal.tsx
```

### Features
- AI summarization (Gemini)
- Summary caching
- Copy to clipboard
- Loading states
- Error handling

### Implementation Steps
1. Get Gemini API key
2. Create aiSummaries schema
3. Build summarize API
4. Create UI components
5. Add caching logic
6. Test summarization

---

## UC19 - HỎI ĐÁP TRÊN TÀI LIỆU (AI)

### Thông tin cơ bản
- **Trạng thái:** ❌ Cần triển khai
- **Ưu tiên:** 🟢 THẤP
- **Thời gian:** 1 tuần

### Schema
```typescript
chatSessions: defineTable({
  userId: v.string(),
  documentId: v.id("documents"),
  title: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"])
.index("by_document", ["documentId"])

chatMessages: defineTable({
  sessionId: v.id("chatSessions"),
  role: v.string(),           // "user" | "assistant"
  content: v.string(),
  model: v.optional(v.string()),
  tokens: v.optional(v.number()),
  createdAt: v.number(),
})
.index("by_session", ["sessionId"])
```

### API
```typescript
// convex/chat.ts
export const createSession = mutation({...})
export const getMessages = query({...})

export const sendMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const document = await ctx.db.get(session.documentId);
    
    // Get chat history
    const history = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();
    
    // Build context
    const context = `Document content:\n${document.content}\n\nChat history:\n${formatHistory(history)}`;
    
    // Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `${context}\n\nUser: ${args.message}\nAssistant:`;
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Save messages
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      createdAt: Date.now(),
    });
    
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: response,
      model: "gemini-pro",
      createdAt: Date.now(),
    });
    
    return response;
  }
});
```

### Components
```
components/ai/
├── chat-button.tsx
├── chat-sidebar.tsx
├── chat-message.tsx
└── chat-input.tsx
```

### Features
- Context-aware Q&A
- Chat history
- Multi-turn conversation
- Streaming responses (optional)
- Token tracking
- Usage quotas

### Implementation Steps
1. Create chat schemas
2. Build chat APIs
3. Create chat UI
4. Implement context building
5. Add streaming (optional)
6. Test chat flow

---

## 📊 TỔNG KẾT

### Thống kê
- **Tổng use cases:** 17
- **Đã có code:** 7 (UC07-UC13)
- **Cần triển khai:** 10
- **Ưu tiên CAO:** 6
- **Ưu tiên TRUNG BÌNH:** 2
- **Ưu tiên THẤP:** 2

### Timeline ước tính
- **Sprint 1 (UC04-UC06):** 1 tuần
- **Sprint 2-3 (UC14):** 2-3 tuần
- **Sprint 4-5 (UC15-UC16):** 2 tuần
- **Sprint 6 (UC17):** 1 tuần
- **Sprint 7-8 (UC18-UC19):** 1 tuần

**Tổng:** 7-9 tuần

---

## 🎯 BƯỚC TIẾP THEO

1. **Review tài liệu này**
2. **Chọn use case để bắt đầu** (khuyến nghị: UC04-UC06)
3. **Yêu cầu expand** bất kỳ UC nào thành file riêng đầy đủ
4. **Bắt đầu implement** theo roadmap

---

**Created:** 01/12/2025  
**Version:** 1.0  
**Status:** Complete summary of 17 use cases  
**Next:** Expand individual use cases into full documentation

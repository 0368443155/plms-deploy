# 📚 OUTLINE CHI TIẾT 15 USE CASES CÒN LẠI

## Mục đích
File này chứa outline chi tiết cho 15 use cases còn lại. Mỗi use case có thể được expand thành file đầy đủ 14 sections khi cần.

---

## ✅ ĐÃ TẠO ĐẦY ĐỦ (4/19)

1. **UC01** - Đăng nhập ✅ `01-authentication/UC01-login.md`
2. **UC02** - Đăng ký ✅ `01-authentication/UC02-register.md`
3. **UC03** - Đăng xuất ✅ `01-authentication/UC03-logout.md`
4. **UC04** - Quên mật khẩu ✅ `01-authentication/UC04-forgot-password.md`
14. **UC14** - Quản lý bảng ✅ `03-tables/UC14-manage-tables.md`

---

## 📝 CẦN TẠO (15/19)

### BATCH 1: Authentication (2 files)

#### UC05 - Cập nhật thông tin cá nhân

**Schema:**
```typescript
users: defineTable({
  clerkId, fullName, email, phone, gender, avatarUrl,
  createdAt, updatedAt
})
```

**API:**
- `getProfile` query
- `updateProfile` mutation  
- `uploadAvatar` mutation (EdgeStore)

**Components:**
```
app/(main)/(routes)/profile/
├── page.tsx
└── _components/
    ├── profile-form.tsx
    └── avatar-upload.tsx
```

**Key Features:**
- Edit: Họ tên, SĐT, Giới tính
- Avatar upload (EdgeStore, max 5MB)
- Real-time preview
- Form validation (react-hook-form + Zod)
- Sync with Clerk

**Implementation:**
1. Create profile page
2. Build form with validation
3. Integrate EdgeStore
4. Add avatar cropper (optional)
5. Test update flow

---

#### UC06 - Đổi mật khẩu

**API:** Clerk `user.updatePassword()`

**Components:**
```
app/(main)/(routes)/settings/
└── _components/
    └── change-password-form.tsx
```

**Validation:**
- Old password correct
- New password >= 8 chars
- New != old password
- Confirm matches

**Key Features:**
- Password strength meter
- Show/hide password toggle
- Force re-login after change
- Email notification

---

### BATCH 2: Documents (7 files)

#### UC07 - Tạo trang mới

**Status:** ✅ Đã có code

**API:** `create` mutation in `convex/documents.ts`

**Features:**
- Nested documents (parent-child)
- Auto-generated title
- Sidebar integration
- Real-time sync

**Cần document:**
- Luồng xử lý chi tiết
- Test cases
- Error handling
- Performance optimization

---

#### UC08 - Cập nhật trang

**Status:** ✅ Đã có code

**API:** `update` mutation

**Features:**
- Update title inline
- Icon picker (emoji)
- Cover image upload
- Publish/unpublish toggle

**Cần document:**
- UI/UX flows
- Validation rules
- Test scenarios

---

#### UC09 - Sửa nội dung trang

**Status:** ✅ Đã có code

**Editor:** BlockNote

**Features:**
- Rich text editing
- Markdown support
- Auto-save (debounced)
- Block-based editor
- Slash commands

**Cần document:**
- Editor configuration
- Custom blocks
- Keyboard shortcuts
- Performance tips

---

#### UC10 - Đọc nội dung trang

**Status:** ✅ Đã có code

**API:** `getById` query

**Features:**
- Public/private access
- Read-only mode
- Print view
- Share link

**Cần document:**
- Access control logic
- SEO optimization
- Performance caching

---

#### UC11 - Xóa trang

**Status:** ✅ Đã có code

**API:** `archive` mutation

**Features:**
- Soft delete (isArchived)
- Recursive delete children
- Move to trash
- 30-day retention
- Undo option

**Cần document:**
- Trash management
- Bulk operations
- Recovery procedures

---

#### UC12 - Khôi phục/Xóa vĩnh viễn

**Status:** ✅ Đã có code

**API:** `restore`, `remove` mutations

**Features:**
- Restore from trash
- Recursive restore
- Permanent delete
- Confirmation dialog
- Bulk operations

**Cần document:**
- Data retention policy
- Compliance considerations
- Audit logging

---

#### UC13 - Tìm kiếm trang

**Status:** ✅ Đã có code

**API:** `getSearch` query

**Features:**
- Search by title
- Keyboard shortcut (Ctrl+K)
- Search modal (cmdk)
- Recent searches
- Fuzzy matching

**Cần document:**
- Search algorithm
- Performance optimization
- Advanced filters

---

### BATCH 3: Calendar (2 files)

#### UC15 - Quản lý lịch học

**Schema:**
```typescript
schedules: defineTable({
  userId, subjectName, dayOfWeek, startTime, endTime,
  room, teacher, color
})
```

**API:**
- `getSchedules` query
- `createSchedule` mutation
- `updateSchedule` mutation
- `deleteSchedule` mutation

**Components:**
```
app/(main)/(routes)/schedule/
├── page.tsx
└── _components/
    ├── schedule-grid.tsx
    ├── schedule-item.tsx
    └── add-schedule-modal.tsx
```

**Features:**
- Weekly recurring schedule
- Time slots (7:00-22:00)
- Color-coded by subject
- Conflict detection
- Drag-and-drop (optional)

**Implementation:**
1. Create schema
2. Build CRUD APIs
3. Create weekly grid UI
4. Add/edit modals
5. Time validation
6. Test conflicts

---

#### UC16 - Xem lịch tổng quan

**Schema:**
```typescript
events: defineTable({
  userId, title, startDate, endDate, allDay,
  type, relatedDocumentId, color
})
```

**Libraries:**
- `react-big-calendar`
- `date-fns`

**API:**
- `getEvents` query
- `createEvent` mutation
- `getCalendarData` query (merge schedules + events)

**Components:**
```
app/(main)/(routes)/calendar/
├── page.tsx
└── _components/
    ├── calendar-view.tsx
    ├── month-view.tsx
    ├── week-view.tsx
    └── add-event-modal.tsx
```

**Features:**
- Month/Week view toggle
- Merge schedules + events
- Color coding by type
- Click event → details
- Deadline tracking
- Export to Google Calendar (future)

**Merge Logic:**
```typescript
function getCalendarData(userId, startDate, endDate) {
  // 1. Get recurring schedules
  const schedules = getSchedules(userId);
  
  // 2. Expand to events for date range
  const recurringEvents = expandSchedules(schedules, startDate, endDate);
  
  // 3. Get one-time events
  const events = getEvents(userId, startDate, endDate);
  
  // 4. Merge and return
  return [...recurringEvents, ...events];
}
```

---

### BATCH 4: Notifications (1 file)

#### UC17 - Nhận và xem thông báo

**Schema:**
```typescript
notifications: defineTable({
  userId, type, title, message, isRead,
  relatedEventId, createdAt, actionUrl
})
```

**Convex Cron:**
```typescript
// convex/crons.ts
crons.daily(
  "generate reminders",
  { hourUTC: 0, minuteUTC: 0 },
  internal.notifications.generateReminders
);
```

**API:**
- `getNotifications` query
- `getUnreadCount` query
- `markAsRead` mutation
- `markAllAsRead` mutation
- `generateReminders` internalMutation (cron)

**Components:**
```
components/notifications/
├── notification-bell.tsx
├── notification-dropdown.tsx
└── notification-item.tsx

app/(main)/(routes)/notifications/
└── page.tsx
```

**Features:**
- Bell icon with unread badge
- Dropdown (recent 5)
- Full notifications page
- Mark as read
- Click → navigate
- Real-time updates
- Daily cron for reminders

**Cron Logic:**
```typescript
export const generateReminders = internalMutation(async (ctx) => {
  const now = Date.now();
  const threeDays = now + 3 * 24 * 60 * 60 * 1000;
  
  // Get upcoming events
  const events = await ctx.db
    .query("events")
    .filter(q => q.and(
      q.gte(q.field("startDate"), now),
      q.lte(q.field("startDate"), threeDays)
    ))
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
});
```

---

### BATCH 5: AI Features (2 files)

#### UC18 - Tóm tắt nội dung (AI)

**Schema:**
```typescript
aiSummaries: defineTable({
  documentId, userId, summary, contentHash,
  model, createdAt
})
```

**Libraries:**
- `@google/generative-ai`

**Environment:**
```env
GEMINI_API_KEY=your_key
```

**API:**
```typescript
export const summarizeDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    const plainText = extractPlainText(document.content);
    
    // Check cache
    const contentHash = hashContent(plainText);
    const cached = await getCachedSummary(documentId, contentHash);
    if (cached) return cached.summary;
    
    // Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Tóm tắt nội dung:\n\n${plainText}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    // Cache result
    await ctx.db.insert("aiSummaries", {
      documentId, userId: document.userId, summary,
      contentHash, model: "gemini-pro", createdAt: Date.now()
    });
    
    return summary;
  }
});
```

**Components:**
```
components/ai/
├── summarize-button.tsx
└── summary-modal.tsx
```

**Features:**
- AI summarization (Gemini)
- Summary caching
- Copy to clipboard
- Loading states
- Error handling
- Token usage tracking

---

#### UC19 - Hỏi đáp trên tài liệu (AI)

**Schema:**
```typescript
chatSessions: defineTable({
  userId, documentId, title, createdAt, updatedAt
})

chatMessages: defineTable({
  sessionId, role, content, model, tokens, createdAt
})
```

**API:**
```typescript
export const sendMessage = mutation({
  args: { sessionId: v.id("chatSessions"), message: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const document = await ctx.db.get(session.documentId);
    
    // Get chat history
    const history = await getMessages(args.sessionId);
    
    // Build context
    const context = `Document:\n${document.content}\n\nHistory:\n${formatHistory(history)}`;
    
    // Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `${context}\n\nUser: ${args.message}\nAssistant:`;
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Save messages
    await saveUserMessage(args.sessionId, args.message);
    await saveAssistantMessage(args.sessionId, response);
    
    return response;
  }
});
```

**Components:**
```
components/ai/
├── chat-button.tsx
├── chat-sidebar.tsx
├── chat-message.tsx
└── chat-input.tsx
```

**Features:**
- Context-aware Q&A
- Chat history
- Multi-turn conversation
- Streaming responses (optional)
- Token tracking
- Usage quotas
- Export chat

---

## 📊 TỔNG KẾT

### Files cần tạo

| Batch | Use Cases | Files | Priority |
|-------|-----------|-------|----------|
| 1 | UC05-UC06 | 2 | 🔴 Cao |
| 2 | UC07-UC13 | 7 | 🟡 Trung bình (đã có code) |
| 3 | UC15-UC16 | 2 | 🔴 Cao |
| 4 | UC17 | 1 | 🟡 Trung bình |
| 5 | UC18-UC19 | 2 | 🟢 Thấp |
| **TỔNG** | **15 UC** | **14 files** | - |

### Timeline ước tính

- **UC05-UC06:** 6 phút
- **UC07-UC13:** 20 phút
- **UC15-UC16:** 6 phút
- **UC17:** 3 phút
- **UC18-UC19:** 6 phút

**Tổng:** ~40 phút

---

## 🎯 CÁCH SỬ DỤNG

### Option 1: Sử dụng outline này
- Đủ thông tin để implement
- Tham khảo nhanh
- Copy code examples

### Option 2: Yêu cầu expand
Ví dụ:
```
"Expand UC05 thành file đầy đủ"
"Tạo tài liệu chi tiết cho UC15-UC16"
"Generate full docs for UC07-UC13"
```

Tôi sẽ tạo file đầy đủ 14 sections như UC01-UC04.

### Option 3: Bắt đầu implement
- Follow roadmap
- Sử dụng code từ outline
- Tham khảo UC01-UC04 làm mẫu

---

## 📝 TEMPLATE 14 SECTIONS

Mỗi file đầy đủ bao gồm:

1. Thông tin cơ bản
2. Luồng xử lý
3. Biểu đồ hoạt động
4. Database Schema
5. API Endpoints
6. UI Components
7. Validation Rules
8. Error Handling
9. Test Cases
10. Code Examples
11. Security
12. Performance
13. Related Use Cases
14. References

---

**Created:** 02/12/2025  
**Status:** Outline complete for 15 use cases  
**Next:** Expand any UC to full documentation on request

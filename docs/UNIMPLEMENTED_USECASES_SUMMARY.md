# 📚 TÓM TẮT TÀI LIỆU USE CASES CHƯA TRIỂN KHAI

**Ngày tạo:** 08/12/2025  
**Trạng thái:** 6/6 use cases đã có tài liệu chi tiết

---

## ✅ ĐÃ TẠO TÀI LIỆU (6/6)

### 📊 UC14 - QUẢN LÝ BẢNG
- **File:** `docs/03-tables/UC14-manage-tables.md`
- **Trạng thái:** ✅ Hoàn thành
- **Thời gian ước tính:** 1.5 tuần
- **Highlights:**
  - Schema: `tables` table với dynamic columns và rows
  - CRUD APIs: create, read, update, delete tables/rows/cells
  - UI: Editable table grid với inline editing
  - Features: Import/Export CSV, column types (text, number, date, select, checkbox)
  - Integration: Embed trong documents

### 📅 UC15 - QUẢN LÝ LỊCH HỌC
- **File:** `docs/04-calendar/UC15-manage-schedule.md`
- **Trạng thái:** ✅ Hoàn thành
- **Thời gian ước tính:** 1 tuần
- **Highlights:**
  - Schema: `schedules` table với recurring weekly events
  - Conflict detection: Prevent overlapping schedules
  - UI: Weekly grid view (7:00-22:00)
  - Features: Color-coded subjects, teacher/room info
  - Validation: Time format, day of week, conflict check

### 📅 UC16 - XEM LỊCH TỔNG QUAN
- **File:** `docs/04-calendar/UC16-view-calendar.md`
- **Trạng thái:** ✅ Hoàn thành
- **Thời gian ước tính:** 1.5 tuần
- **Highlights:**
  - Schema: `events` table với one-time events
  - Merge logic: Expand schedules to events for date range
  - UI: react-big-calendar với Month/Week view
  - Features: Event types (deadline, exam, assignment, meeting)
  - Integration: Link events to documents/tables

### 🔔 UC17 - NHẬN VÀ XEM THÔNG BÁO
- **File:** `docs/05-notifications/UC17-notifications.md`
- **Trạng thái:** ✅ Hoàn thành
- **Thời gian ước tính:** 1 tuần
- **Highlights:**
  - Schema: `notifications` table
  - Convex cron jobs: Daily reminders (00:00 UTC)
  - UI: Bell icon + dropdown + full page
  - Types: deadline, reminder, system, achievement
  - Real-time updates via Convex subscriptions
  - Auto-cleanup: Delete old read notifications after 30 days

### 🤖 UC18 - TÓM TẮT NỘI DUNG (AI)
- **File:** `docs/06-ai/UC18-ai-summary.md`
- **Trạng thái:** ✅ Hoàn thành
- **Thời gian ước tính:** 3-4 ngày
- **Highlights:**
  - Schema: `aiSummaries` table (cache by content hash)
  - Integration: Google Gemini API (gemini-pro model)
  - UI: Summarize button + modal với copy/regenerate
  - Features: Content hashing, aggressive caching (70%+ hit rate)
  - Cost optimization: ~$3.75/month for 100 users
  - Validation: Min 100 chars content

### 🤖 UC19 - HỎI ĐÁP AI
- **File:** `docs/06-ai/UC19-ai-chat.md`
- **Trạng thái:** ✅ Hoàn thành
- **Thời gian ước tính:** 1 tuần
- **Highlights:**
  - Schema: `aiChats` table (conversation history)
  - Integration: Google Gemini API với chat mode
  - UI: Chat interface với suggested questions
  - Features: Context-aware, conversation history, real-time streaming
  - Cost optimization: ~$7.50/month for 100 users
  - History limit: Max 10 messages in context

---

## 📋 DEPENDENCIES MATRIX

| Use Case | Depends On | Blocks |
|----------|------------|--------|
| UC14 - Tables | UC07-UC13 (Documents) | - |
| UC15 - Schedules | UC01-UC06 (Auth) | UC16, UC17 |
| UC16 - Calendar | UC15 (Schedules) | UC17 |
| UC17 - Notifications | UC16 (Events) | - |
| UC18 - AI Summary | UC07-UC13 (Documents) | - |
| UC19 - AI Chat | UC07-UC13 (Documents) | - |

---

## 🗂️ SCHEMA SUMMARY

### Đã thiết kế (4 tables):

```typescript
// convex/schema.ts
export default defineSchema({
  // ✅ Existing
  documents: defineTable({...}),
  
  // ✅ UC14
  tables: defineTable({
    documentId: v.id("documents"),
    userId: v.string(),
    name: v.string(),
    columns: v.array(v.object({...})),
    rows: v.array(v.object({...})),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  
  // ✅ UC15
  schedules: defineTable({
    userId: v.string(),
    subjectName: v.string(),
    teacher: v.optional(v.string()),
    room: v.optional(v.string()),
    dayOfWeek: v.number(), // 0-6
    startTime: v.string(), // "HH:mm"
    endTime: v.string(),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  
  // ✅ UC16
  events: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(),
    allDay: v.boolean(),
    type: v.string(), // "deadline" | "exam" | "assignment" | "meeting" | "custom"
    relatedDocumentId: v.optional(v.id("documents")),
    relatedTableId: v.optional(v.id("tables")),
    color: v.optional(v.string()),
    reminder: v.optional(v.number()),
    location: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
});
```

### Cần thiết kế (3 tables):

- ✅ **UC17:** `notifications` table - **Đã thiết kế**
- ✅ **UC18:** `aiSummaries` table - **Đã thiết kế**
- ✅ **UC19:** `aiChats` table - **Đã thiết kế**

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Core Features (4 tuần)
1. **Week 1-2:** UC14 - Quản lý bảng
   - Schema + APIs
   - UI components
   - CSV import/export
   
2. **Week 2-3:** UC15 - Quản lý lịch học
   - Schema + APIs
   - Weekly grid UI
   - Conflict detection
   
3. **Week 3-4:** UC16 - Xem lịch tổng quan
   - Schema + APIs
   - react-big-calendar integration
   - Merge schedules + events

### Phase 2: Enhancements (2 tuần)
4. **Week 5-6:** UC17 - Thông báo
   - Schema + APIs
   - Convex cron jobs
   - Bell icon + notifications page

### Phase 3: AI Features (2 tuần)
5. **Week 7:** UC18 - Tóm tắt AI
   - Gemini API integration
   - Caching logic
   - Summarize button

6. **Week 8:** UC19 - Hỏi đáp AI
   - Chat interface
   - Context management
   - Streaming responses

**Total:** ~8 tuần (2 tháng)

---

## 🔧 TECH STACK ADDITIONS

### Cần cài đặt:

```json
{
  "dependencies": {
    // UC14 - Tables
    "@tanstack/react-table": "^8.10.0",
    "papaparse": "^5.4.1", // CSV parsing
    
    // UC16 - Calendar
    "react-big-calendar": "^1.8.5",
    "date-fns": "^2.30.0",
    
    // UC18, UC19 - AI
    "@google/generative-ai": "^0.1.3"
  }
}
```

### Environment Variables:

```env
# UC18, UC19 - AI Features
GEMINI_API_KEY=your_api_key_here
```

---

## ✅ CHECKLIST TRIỂN KHAI

### Cho mỗi use case:

- [ ] Đọc tài liệu chi tiết
- [ ] Tạo schema trong `convex/schema.ts`
- [ ] Tạo API file (e.g., `convex/tables.ts`)
- [ ] Implement CRUD mutations/queries
- [ ] Tạo UI components
- [ ] Integrate với existing pages
- [ ] Test functionality
- [ ] Update documentation với code thực tế

---

## 📊 METRICS

### Documentation Coverage:
- **Hoàn thành:** 6/6 (100%) ✅
- **Chi tiết:** 6/6 (100%) ✅
- **Cần bổ sung:** 0/6 (0%)

### Implementation Status:
- **Hoàn thành:** 0/6 (0%)
- **Đang làm:** 0/6 (0%)
- **Chưa bắt đầu:** 6/6 (100%)

---

## 🚨 IMPORTANT NOTES

### Tương thích với codebase hiện tại:

1. ✅ **Không ảnh hưởng đến Documents system**
   - Tất cả tables mới đều độc lập
   - Chỉ có optional links qua `relatedDocumentId`

2. ✅ **Sử dụng cùng Auth system**
   - Tất cả đều dùng `userId` từ Clerk
   - Consistent authorization checks

3. ✅ **Follow existing patterns**
   - Mutation/Query structure giống `documents.ts`
   - Error handling giống existing code
   - UI components follow Shadcn/ui patterns

4. ✅ **Performance optimized**
   - Indexes on userId, documentId
   - Use withIndex for filtering
   - Promise.all for concurrent operations

---

## 📚 NEXT STEPS

1. **Đọc tài liệu chi tiết:**
   - `docs/03-tables/UC14-manage-tables.md`
   - `docs/04-calendar/UC15-manage-schedule.md`
   - `docs/04-calendar/UC16-view-calendar.md`

2. **Bắt đầu implementation:**
   - Chọn use case ưu tiên (recommend: UC14 hoặc UC15)
   - Follow checklist triển khai
   - Test thoroughly

3. **Tạo tài liệu chi tiết cho UC17-UC19:**
   - Sử dụng template từ UC14-UC16
   - Đảm bảo consistency

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Mục đích:** Tổng hợp tài liệu use cases chưa triển khai

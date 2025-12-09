# 📋 REVIEW & IMPLEMENTATION GUIDE

**Ngày:** 10/12/2025  
**Mục đích:** Review và điều chỉnh tài liệu use cases dựa trên codebase hiện tại

---

## ✅ PHÂN TÍCH CODEBASE HIỆN TẠI

### 1. **Schema Status**

✅ **Đã có `schema_new.ts` với đầy đủ 21 tables**
- ✅ documents (existing - đang dùng)
- ✅ users, loginLogs, passwordResetTokens
- ✅ tables, tableColumns, tableRows, tableCells (UC14)
- ✅ schedules (UC15)
- ✅ events (UC16)
- ✅ notifications (UC17)
- ✅ aiSummaries (UC18)
- ✅ chatSessions, chatMessages (UC19)
- ✅ userActivity, aiUsage (Analytics)
- ✅ systemSettings, featureFlags (System)

⚠️ **Cần migrate:** `schema.ts` → `schema_new.ts`

### 2. **Dependencies Status**

✅ **Đã có:**
- convex: ^1.29.3
- @blocknote/core, @blocknote/react
- @clerk/clerk-react
- lucide-react
- sonner (toast)
- zustand (state management)

❌ **Cần cài thêm:**
```json
{
  "@tanstack/react-table": "^8.10.0",    // UC14 - Tables
  "papaparse": "^5.4.1",                  // UC14 - CSV
  "@types/papaparse": "^5.3.7",          // UC14 - CSV types
  "react-big-calendar": "^1.8.5",         // UC16 - Calendar
  "date-fns": "^2.30.0",                  // UC15, UC16, UC17
  "@google/generative-ai": "^0.1.3"       // UC18, UC19 - AI
}
```

### 3. **Environment Variables**

❌ **Cần thêm vào `.env.local`:**
```env
# AI Features (UC18, UC19)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🔧 ĐIỀU CHỈNH TÀI LIỆU

### UC14 - Quản lý bảng

#### ❌ **Vấn đề trong tài liệu:**
Tài liệu hiện tại dùng schema đơn giản (1 table với nested data):
```typescript
tables: defineTable({
  documentId: v.id("documents"),
  columns: v.array(v.object({...})),  // ❌ Nested
  rows: v.array(v.object({...})),     // ❌ Nested
})
```

#### ✅ **Schema thực tế (schema_new.ts):**
Dùng normalized schema (4 tables):
```typescript
tables: defineTable({...})
tableColumns: defineTable({...})
tableRows: defineTable({...})
tableCells: defineTable({...})
```

#### 🔄 **Cần điều chỉnh:**
1. **APIs:** Thay đổi CRUD operations để work với 4 tables
2. **UI:** Update components để query từ multiple tables
3. **Performance:** Tối ưu với joins và indexes

---

### UC15 - Quản lý lịch học

#### ✅ **Schema khớp với tài liệu:**
```typescript
schedules: defineTable({
  userId: v.string(),
  subjectName: v.string(),
  dayOfWeek: v.number(),
  startTime: v.string(),
  endTime: v.string(),
  // ... other fields
})
```

#### ⚠️ **Lưu ý:**
- Schema_new có thêm `subjectId: v.optional(v.id("documents"))` để link với documents
- Cần update tài liệu để mention field này

---

### UC16 - Xem lịch tổng quan

#### ✅ **Schema khớp với tài liệu:**
```typescript
events: defineTable({
  userId: v.string(),
  title: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  type: v.string(),
  // ... other fields
})
```

#### ✅ **Không cần điều chỉnh**

---

### UC17 - Thông báo

#### ✅ **Schema khớp với tài liệu:**
```typescript
notifications: defineTable({
  userId: v.string(),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  // ... other fields
})
```

#### ⚠️ **Lưu ý:**
- Schema_new không có `expiresAt` field
- Cần thêm hoặc remove từ tài liệu

---

### UC18 - Tóm tắt AI

#### ✅ **Schema khớp với tài liệu:**
```typescript
aiSummaries: defineTable({
  documentId: v.id("documents"),
  userId: v.string(),
  summary: v.string(),
  contentHash: v.string(),
  model: v.string(),
  createdAt: v.number(),
})
```

#### ⚠️ **Lưu ý:**
- Tài liệu có `tokenCount` field nhưng schema_new không có
- Có thể thêm hoặc remove từ tài liệu

---

### UC19 - Hỏi đáp AI

#### ❌ **Vấn đề trong tài liệu:**
Tài liệu dùng schema đơn giản:
```typescript
aiChats: defineTable({
  documentId: v.id("documents"),
  conversationId: v.string(),
  role: v.string(),
  content: v.string(),
  // ...
})
```

#### ✅ **Schema thực tế (schema_new.ts):**
Dùng normalized schema (2 tables):
```typescript
chatSessions: defineTable({
  userId: v.string(),
  documentId: v.id("documents"),
  title: v.optional(v.string()),
  // ...
})

chatMessages: defineTable({
  sessionId: v.id("chatSessions"),
  role: v.string(),
  content: v.string(),
  // ...
})
```

#### 🔄 **Cần điều chỉnh:**
1. **APIs:** Update để work với 2 tables (sessions + messages)
2. **UI:** Update components để query sessions trước, rồi messages
3. **Conversation management:** Dùng sessionId thay vì conversationId

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 0: Setup (1 ngày)

- [ ] **Install dependencies**
  ```bash
  npm install @tanstack/react-table papaparse @types/papaparse react-big-calendar date-fns @google/generative-ai
  ```

- [ ] **Migrate schema**
  ```bash
  # Backup current schema
  cp convex/schema.ts convex/schema_backup.ts
  
  # Replace with new schema
  cp convex/schema_new.ts convex/schema.ts
  
  # Deploy
  npx convex dev
  ```

- [ ] **Setup environment variables**
  ```env
  # Add to .env.local
  GEMINI_API_KEY=your_key_here
  ```

- [ ] **Test migration**
  - Verify existing documents still work
  - Check Convex dashboard for new tables

---

### Phase 1: UC14 - Quản lý bảng (1.5 tuần)

#### Week 1: Backend

- [ ] **Create `convex/tables.ts`**
  - [ ] `createTable` mutation
  - [ ] `addColumn` mutation
  - [ ] `addRow` mutation
  - [ ] `updateCell` mutation
  - [ ] `deleteRow` mutation
  - [ ] `deleteColumn` mutation
  - [ ] `deleteTable` mutation
  - [ ] `getTableById` query
  - [ ] `getTablesByUser` query

- [ ] **Test APIs in Convex dashboard**

#### Week 2: Frontend

- [ ] **Create components**
  - [ ] `components/table/table-view.tsx`
  - [ ] `components/table/table-header.tsx`
  - [ ] `components/table/table-row.tsx`
  - [ ] `components/table/table-cell.tsx`
  - [ ] `components/table/add-column-button.tsx`
  - [ ] `components/table/add-row-button.tsx`

- [ ] **Create page**
  - [ ] `app/(main)/(routes)/tables/page.tsx`
  - [ ] `app/(main)/(routes)/tables/[tableId]/page.tsx`

- [ ] **CSV Import/Export**
  - [ ] Import CSV functionality
  - [ ] Export CSV functionality

- [ ] **Test thoroughly**

---

### Phase 2: UC15 - Quản lý lịch học (1 tuần)

#### Days 1-3: Backend

- [ ] **Create `convex/schedules.ts`**
  - [ ] `createSchedule` mutation (with conflict detection)
  - [ ] `updateSchedule` mutation
  - [ ] `deleteSchedule` mutation
  - [ ] `getSchedules` query
  - [ ] `getSchedulesByDay` query

- [ ] **Test conflict detection**

#### Days 4-7: Frontend

- [ ] **Create components**
  - [ ] `app/(main)/(routes)/schedule/page.tsx`
  - [ ] `app/(main)/(routes)/schedule/_components/schedule-grid.tsx`
  - [ ] `app/(main)/(routes)/schedule/_components/schedule-item.tsx`
  - [ ] `app/(main)/(routes)/schedule/_components/add-schedule-modal.tsx`

- [ ] **Test weekly grid**
- [ ] **Test conflict detection UI**

---

### Phase 3: UC16 - Xem lịch tổng quan (1.5 tuần)

#### Week 1: Backend

- [ ] **Create `convex/events.ts`**
  - [ ] `createEvent` mutation
  - [ ] `updateEvent` mutation
  - [ ] `deleteEvent` mutation
  - [ ] `getEventsByDateRange` query

- [ ] **Create `convex/calendar.ts`**
  - [ ] `getCalendarData` query (merge schedules + events)
  - [ ] Helper: `expandSchedulesToEvents`

#### Week 2: Frontend

- [ ] **Install react-big-calendar**
  ```bash
  npm install react-big-calendar date-fns
  ```

- [ ] **Create components**
  - [ ] `app/(main)/(routes)/calendar/page.tsx`
  - [ ] `app/(main)/(routes)/calendar/_components/calendar-view.tsx`
  - [ ] `app/(main)/(routes)/calendar/_components/event-modal.tsx`

- [ ] **Test Month/Week views**
- [ ] **Test event creation**

---

### Phase 4: UC17 - Thông báo (1 tuần)

#### Days 1-3: Backend

- [ ] **Create `convex/notifications.ts`**
  - [ ] `getNotifications` query
  - [ ] `getUnreadCount` query
  - [ ] `markAsRead` mutation
  - [ ] `markAllAsRead` mutation
  - [ ] `createNotification` internalMutation
  - [ ] `generateReminders` internalMutation
  - [ ] `cleanupOldNotifications` internalMutation

- [ ] **Create `convex/crons.ts`**
  - [ ] Daily cron job (00:00 UTC)
  - [ ] Weekly cleanup cron job

#### Days 4-7: Frontend

- [ ] **Create components**
  - [ ] `components/notifications/notification-bell.tsx`
  - [ ] `components/notifications/notification-dropdown.tsx`
  - [ ] `components/notifications/notification-item.tsx`
  - [ ] `app/(main)/(routes)/notifications/page.tsx`

- [ ] **Integrate bell icon into navigation**
- [ ] **Test real-time updates**
- [ ] **Test cron jobs**

---

### Phase 5: UC18 - Tóm tắt AI (3-4 ngày)

#### Days 1-2: Backend

- [ ] **Get Gemini API key**
  - Visit: https://makersuite.google.com/app/apikey
  - Add to `.env.local`

- [ ] **Create `convex/ai.ts`**
  - [ ] `summarizeDocument` action
  - [ ] `getCachedSummary` internalQuery
  - [ ] `cacheSummary` internalMutation
  - [ ] Helper: `extractPlainText`
  - [ ] Helper: `hashContent`

- [ ] **Test API calls**

#### Days 3-4: Frontend

- [ ] **Create components**
  - [ ] `components/ai/summarize-button.tsx`
  - [ ] `components/ai/summary-modal.tsx`
  - [ ] `components/ai/summary-skeleton.tsx`

- [ ] **Integrate into document page**
- [ ] **Test caching**
- [ ] **Test regenerate**

---

### Phase 6: UC19 - Hỏi đáp AI (1 tuần)

#### Days 1-3: Backend

- [ ] **Update `convex/ai.ts`**
  - [ ] `chatWithAI` action
  - [ ] `getChatHistory` internalQuery
  - [ ] `saveChatMessage` internalMutation
  - [ ] `getConversations` query
  - [ ] `deleteConversation` mutation

- [ ] **Test conversation flow**

#### Days 4-7: Frontend

- [ ] **Create components**
  - [ ] `components/ai/chat-button.tsx`
  - [ ] `components/ai/chat-interface.tsx`
  - [ ] `components/ai/chat-message.tsx`
  - [ ] `components/ai/chat-input.tsx`
  - [ ] `components/ai/suggested-questions.tsx`

- [ ] **Integrate into document page**
- [ ] **Test conversation history**
- [ ] **Test context awareness**

---

## ⚠️ CRITICAL ISSUES TO FIX

### 1. **UC14 - Tables Schema Mismatch**

**Tài liệu hiện tại:**
```typescript
tables: defineTable({
  columns: v.array(v.object({...})),  // ❌ Wrong
  rows: v.array(v.object({...})),     // ❌ Wrong
})
```

**Cần sửa thành:**
```typescript
// 4 separate tables
tables: defineTable({...})
tableColumns: defineTable({...})
tableRows: defineTable({...})
tableCells: defineTable({...})
```

**Impact:** HIGH - Cần rewrite toàn bộ APIs và UI components

---

### 2. **UC19 - Chat Schema Mismatch**

**Tài liệu hiện tại:**
```typescript
aiChats: defineTable({
  conversationId: v.string(),  // ❌ Wrong
  // ...
})
```

**Cần sửa thành:**
```typescript
// 2 separate tables
chatSessions: defineTable({...})
chatMessages: defineTable({...})
```

**Impact:** MEDIUM - Cần update APIs và conversation management

---

### 3. **Missing Fields**

**UC15 - schedules:**
- Tài liệu thiếu: `subjectId: v.optional(v.id("documents"))`
- **Action:** Thêm vào tài liệu

**UC17 - notifications:**
- Tài liệu có `expiresAt` nhưng schema không có
- **Action:** Remove từ tài liệu hoặc thêm vào schema

**UC18 - aiSummaries:**
- Tài liệu có `tokenCount` nhưng schema không có
- **Action:** Remove từ tài liệu hoặc thêm vào schema

---

## 📊 ESTIMATED TIMELINE

| Phase | Use Case | Duration | Status |
|-------|----------|----------|--------|
| 0 | Setup | 1 ngày | ⏳ Pending |
| 1 | UC14 - Tables | 1.5 tuần | ⏳ Pending |
| 2 | UC15 - Schedules | 1 tuần | ⏳ Pending |
| 3 | UC16 - Calendar | 1.5 tuần | ⏳ Pending |
| 4 | UC17 - Notifications | 1 tuần | ⏳ Pending |
| 5 | UC18 - AI Summary | 3-4 ngày | ⏳ Pending |
| 6 | UC19 - AI Chat | 1 tuần | ⏳ Pending |
| **Total** | | **~8 tuần** | |

---

## 🚀 RECOMMENDED APPROACH

### Option 1: Sequential (Safer)
1. Setup → UC14 → UC15 → UC16 → UC17 → UC18 → UC19
2. **Pros:** Stable, easy to debug
3. **Cons:** Slower

### Option 2: Parallel (Faster)
1. Setup
2. Parallel: (UC14 + UC15), (UC16 + UC17), (UC18 + UC19)
3. **Pros:** Faster completion
4. **Cons:** More complex, harder to debug

### Option 3: Priority-based (Recommended)
1. Setup
2. **High Priority:** UC15 (Schedules) → UC16 (Calendar)
3. **Medium Priority:** UC17 (Notifications)
4. **Low Priority:** UC14 (Tables) → UC18 (AI Summary) → UC19 (AI Chat)
5. **Pros:** Deliver value early, flexible
6. **Cons:** May need to revisit dependencies

---

## 📝 NEXT STEPS

1. **Review this document** và quyết định approach
2. **Fix schema mismatches** trong tài liệu UC14 và UC19
3. **Install dependencies**
4. **Migrate schema** từ schema.ts → schema_new.ts
5. **Start implementation** theo checklist

---

**Tạo bởi:** AI Assistant  
**Ngày:** 10/12/2025  
**Status:** Ready for review

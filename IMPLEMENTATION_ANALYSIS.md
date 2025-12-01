# PHÂN TÍCH VÀ ĐÁNH GIÁ TRIỂN KHAI HỆ THỐNG NOTION CLONE

## Ngày tạo: 01/12/2025
## Phiên bản: 1.0

---

## MỤC LỤC

1. [Tổng quan hệ thống hiện tại](#1-tổng-quan-hệ-thống-hiện-tại)
2. [Phân tích từng Use Case](#2-phân-tích-từng-use-case)
3. [Đánh giá công nghệ hiện tại](#3-đánh-giá-công-nghệ-hiện-tại)
4. [Kế hoạch triển khai](#4-kế-hoạch-triển-khai)
5. [Kiến trúc hệ thống đề xuất](#5-kiến-trúc-hệ-thống-đề-xuất)
6. [Roadmap phát triển](#6-roadmap-phát-triển)

---

## 1. TỔNG QUAN HỆ THỐNG HIỆN TẠI

### 1.1. Công nghệ Stack
- **Frontend**: Next.js 13.5.6, React 18, TypeScript
- **Styling**: TailwindCSS, Radix UI
- **Backend/Database**: Convex (Real-time database)
- **Authentication**: Clerk Auth
- **File Storage**: Edge Store
- **State Management**: Zustand
- **Rich Text Editor**: BlockNote

### 1.2. Cấu trúc thư mục
```
notion-clone-nextjs/
├── app/
│   ├── (main)/           # Main application routes
│   ├── (marketing)/      # Marketing/landing pages
│   ├── (public)/         # Public routes
│   └── api/              # API routes
├── components/           # Reusable components
├── convex/              # Convex backend (schema, queries, mutations)
├── hooks/               # Custom React hooks
└── lib/                 # Utility functions
```

### 1.3. Database Schema hiện tại (Convex)
```typescript
documents: {
  title: string,
  userId: string,
  isArchived: boolean,
  parentDocument?: id,
  content?: string,
  coverImage?: string,
  icon?: string,
  isPublished: boolean
}
```

### 1.4. Chức năng đã triển khai
✅ **Đã có:**
- UC01: Đăng nhập (qua Clerk Auth)
- UC02: Đăng ký (qua Clerk Auth)
- UC03: Đăng xuất (qua Clerk Auth)
- UC07: Tạo trang mới (documents)
- UC08: Cập nhật trang (title, icon, cover)
- UC09: Sửa nội dung trang (BlockNote editor)
- UC10: Đọc nội dung trang
- UC11: Xóa trang (archive)
- UC12: Khôi phục/Xóa vĩnh viễn (restore/remove)
- UC13: Tìm kiếm trang (search command)

❌ **Chưa có:**
- UC04: Quên mật khẩu
- UC05: Cập nhật thông tin cá nhân
- UC06: Đổi mật khẩu
- UC14: Quản lý các bảng dữ liệu
- UC15: Quản lý lịch học
- UC16: Xem lịch tổng quan
- UC17: Nhận và xem thông báo
- UC18: Tóm tắt nội dung trang (AI)
- UC19: Hỏi đáp trên tài liệu (AI)

---

## 2. PHÂN TÍCH TỪNG USE CASE

### UC01: ĐĂNG NHẬP ✅ (Đã triển khai)

**Trạng thái:** Hoàn thành qua Clerk Auth

**Đánh giá:**
- ✅ Clerk cung cấp đầy đủ chức năng đăng nhập
- ✅ Hỗ trợ OAuth (Google, GitHub, etc.)
- ✅ Session management tự động
- ✅ Bảo mật cao

**Cần bổ sung:**
- ⚠️ Thêm rate limiting cho đăng nhập (5 lần thất bại = khóa 30 phút)
- ⚠️ Logging chi tiết cho audit trail

**File liên quan:**
- `app/(marketing)/page.tsx` - Landing page với nút đăng nhập
- `app/layout.tsx` - ClerkProvider wrapper

---

### UC02: ĐĂNG KÝ ✅ (Đã triển khai)

**Trạng thái:** Hoàn thành qua Clerk Auth

**Đánh giá:**
- ✅ Form đăng ký đầy đủ
- ✅ Validation email, password
- ✅ Email verification tự động

**Cần bổ sung:**
- ⚠️ Thêm trường: Họ tên, Số điện thoại, Giới tính
- ⚠️ Custom validation rules theo yêu cầu
- ⚠️ Tạo user profile trong database sau khi đăng ký

**Hành động:**
1. Cấu hình Clerk Dashboard để thêm custom fields
2. Tạo bảng `users` trong Convex schema
3. Webhook để sync Clerk user → Convex database

---

### UC03: ĐĂNG XUẤT ✅ (Đã triển khai)

**Trạng thái:** Hoàn thành qua Clerk Auth

**Đánh giá:**
- ✅ Clerk tự động xóa session/cookie
- ✅ Redirect về trang đăng nhập

**Cần bổ sung:**
- ⚠️ Auto logout sau 120 phút không hoạt động
- ⚠️ Logging thời gian đăng xuất

**Hành động:**
1. Implement idle timeout với `useIdleTimer` hook
2. Thêm activity logging

---

### UC04: QUÊN MẬT KHẨU ❌ (Chưa triển khai)

**Trạng thái:** Clerk hỗ trợ sẵn, cần kích hoạt

**Đánh giá:**
- Clerk có built-in password reset flow
- Gửi email với magic link hoặc OTP

**Hành động:**
1. Kích hoạt "Forgot Password" trong Clerk Dashboard
2. Customize email template
3. Cấu hình OTP timeout (5 phút)
4. Cấu hình reset link timeout (15 phút)

**File cần tạo/sửa:**
- Clerk Dashboard configuration
- Custom email templates (optional)

**Mức độ ưu tiên:** 🔴 CAO (Security critical)

---

### UC05: CẬP NHẬT THÔNG TIN CÁ NHÂN ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai hoàn toàn

**Schema cần thêm:**
```typescript
users: defineTable({
  clerkId: v.string(),        // Link to Clerk user
  fullName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  gender: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_clerk_id", ["clerkId"])
```

**API cần tạo (Convex):**
```typescript
// convex/users.ts
export const getProfile = query(...)
export const updateProfile = mutation(...)
export const uploadAvatar = mutation(...)
```

**Components cần tạo:**
```
app/(main)/(routes)/profile/
  ├── page.tsx              # Profile page
  └── _components/
      ├── profile-form.tsx  # Edit form
      └── avatar-upload.tsx # Avatar upload
```

**Validation:**
- Họ tên: không được trống
- Avatar: JPG/PNG, max 5MB
- Phone: regex validation (optional)

**Hành động:**
1. Tạo schema `users` trong Convex
2. Tạo Clerk webhook để sync user data
3. Tạo profile page với form
4. Integrate EdgeStore cho avatar upload
5. Implement validation

**Mức độ ưu tiên:** 🟡 TRUNG BÌNH

---

### UC06: ĐỔI MẬT KHẨU ❌ (Chưa triển khai)

**Trạng thái:** Clerk hỗ trợ sẵn

**Đánh giá:**
- Clerk có API để đổi password
- Cần verify mật khẩu cũ

**Components cần tạo:**
```
app/(main)/(routes)/settings/
  └── _components/
      └── change-password-form.tsx
```

**Flow:**
1. User nhập: mật khẩu cũ, mật khẩu mới, xác nhận
2. Gọi Clerk API: `user.updatePassword()`
3. Validate:
   - Mật khẩu cũ đúng
   - Mật khẩu mới >= 8 ký tự
   - Mật khẩu mới khác mật khẩu cũ
   - Xác nhận khớp

**Hành động:**
1. Tạo change password form
2. Integrate Clerk password update API
3. Add validation logic
4. Show success/error toast

**Mức độ ưu tiên:** 🟡 TRUNG BÌNH

---

### UC07-13: QUẢN LÝ TRANG ✅ (Đã triển khai phần lớn)

**Đánh giá tổng quan:**
- ✅ UC07: Tạo trang - Hoàn chỉnh
- ✅ UC08: Cập nhật trang - Hoàn chỉnh (title, icon, cover)
- ✅ UC09: Sửa nội dung - Hoàn chỉnh (BlockNote editor)
- ✅ UC10: Đọc nội dung - Hoàn chỉnh
- ✅ UC11: Xóa trang - Hoàn chỉnh (soft delete)
- ✅ UC12: Khôi phục/Xóa vĩnh viễn - Hoàn chỉnh
- ✅ UC13: Tìm kiếm - Hoàn chỉnh

**Cần cải thiện:**
- ⚠️ Thêm auto-save cho editor (hiện tại manual save)
- ⚠️ Version history (track changes)
- ⚠️ Collaborative editing (real-time)

**Hành động (Optional enhancements):**
1. Implement debounced auto-save
2. Add version history table
3. Use Convex real-time subscriptions for collaboration

---

### UC14: QUẢN LÝ CÁC BẢNG DỮ LIỆU ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai hoàn toàn - Tính năng phức tạp

**Mô tả:**
- Cho phép tạo bảng tùy chỉnh (như Excel)
- Hỗ trợ import từ Excel/CSV
- Lưu trữ cấu trúc động (meta-data driven)

**Schema đề xuất:**
```typescript
// Bảng chính
tables: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"])

// Cột của bảng
tableColumns: defineTable({
  tableId: v.id("tables"),
  name: v.string(),
  type: v.string(),        // text, number, date, select, etc.
  order: v.number(),
  config: v.optional(v.string()), // JSON config for column
})
.index("by_table", ["tableId"])

// Hàng của bảng
tableRows: defineTable({
  tableId: v.id("tables"),
  order: v.number(),
  createdAt: v.number(),
})
.index("by_table", ["tableId"])

// Ô dữ liệu
tableCells: defineTable({
  rowId: v.id("tableRows"),
  columnId: v.id("tableColumns"),
  value: v.string(),       // Store as JSON string
})
.index("by_row", ["rowId"])
.index("by_column", ["columnId"])
```

**Components cần tạo:**
```
app/(main)/(routes)/tables/
  ├── page.tsx                    # List all tables
  ├── [tableId]/
  │   └── page.tsx                # View/edit table
  └── _components/
      ├── table-list.tsx
      ├── table-grid.tsx          # Excel-like grid
      ├── create-table-modal.tsx
      ├── import-excel-modal.tsx
      └── table-cell.tsx
```

**API cần tạo:**
```typescript
// convex/tables.ts
export const createTable = mutation(...)
export const getTables = query(...)
export const getTableById = query(...)
export const updateTable = mutation(...)
export const deleteTable = mutation(...)

export const createColumn = mutation(...)
export const updateColumn = mutation(...)
export const deleteColumn = mutation(...)

export const createRow = mutation(...)
export const updateCell = mutation(...)
export const deleteRow = mutation(...)

export const importFromExcel = mutation(...) // Parse Excel file
```

**Libraries cần thêm:**
```json
{
  "xlsx": "^0.18.5",              // Excel parsing
  "react-data-grid": "^7.0.0",    // Excel-like grid component
  "papaparse": "^5.4.1"           // CSV parsing
}
```

**Flow tạo bảng thủ công:**
1. User click "Tạo bảng mới"
2. Nhập tên bảng
3. Thêm cột (tên, kiểu dữ liệu)
4. Thêm hàng và nhập dữ liệu
5. Lưu vào database

**Flow import Excel:**
1. User upload file .xlsx/.csv
2. Backend parse file (server-side)
3. Đọc header row → tạo columns
4. Đọc data rows → tạo rows và cells
5. Hiển thị preview
6. User confirm → lưu vào database

**Challenges:**
- ⚠️ Performance với bảng lớn (1000+ rows)
- ⚠️ Excel parsing phức tạp
- ⚠️ UI/UX cho grid editing

**Hành động:**
1. Design database schema
2. Implement basic table CRUD
3. Build Excel-like grid UI
4. Implement Excel/CSV import
5. Add pagination/virtualization cho performance
6. Testing với large datasets

**Mức độ ưu tiên:** 🔴 CAO (Core feature)
**Thời gian ước tính:** 2-3 tuần

---

### UC15: QUẢN LÝ LỊCH HỌC ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai hoàn toàn

**Mô tả:**
- Quản lý thời khóa biểu cố định hàng tuần
- Hiển thị trực quan trên lưới

**Schema đề xuất:**
```typescript
schedules: defineTable({
  userId: v.string(),
  subjectId: v.optional(v.id("documents")), // Link to subject document
  subjectName: v.string(),
  dayOfWeek: v.number(),      // 0-6 (Sunday-Saturday) or 1-7 (Monday-Sunday)
  startTime: v.string(),      // "08:00"
  endTime: v.string(),        // "09:30"
  room: v.optional(v.string()),
  teacher: v.optional(v.string()),
  notes: v.optional(v.string()),
  color: v.optional(v.string()), // For visual distinction
})
.index("by_user", ["userId"])
.index("by_user_day", ["userId", "dayOfWeek"])
```

**Components cần tạo:**
```
app/(main)/(routes)/schedule/
  ├── page.tsx                      # Weekly schedule view
  └── _components/
      ├── schedule-grid.tsx         # Weekly grid
      ├── schedule-item.tsx         # Single schedule block
      ├── add-schedule-modal.tsx
      └── edit-schedule-modal.tsx
```

**API cần tạo:**
```typescript
// convex/schedules.ts
export const getSchedules = query(...)        // Get all for user
export const getSchedulesByDay = query(...)   // Get by day
export const createSchedule = mutation(...)
export const updateSchedule = mutation(...)
export const deleteSchedule = mutation(...)
```

**UI Design:**
- Grid layout: Columns = Days (Mon-Sun), Rows = Time slots
- Color-coded by subject
- Click to view details
- Drag-and-drop to reschedule (advanced)

**Validation:**
- Giờ bắt đầu < Giờ kết thúc
- Không overlap cùng thời gian
- Môn học/Tên bắt buộc

**Hành động:**
1. Create schema
2. Build CRUD APIs
3. Create weekly grid component
4. Implement add/edit modals
5. Add time conflict validation
6. Styling and UX polish

**Mức độ ưu tiên:** 🔴 CAO
**Thời gian ước tính:** 1 tuần

---

### UC16: XEM LỊCH TỔNG QUAN ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai hoàn toàn

**Mô tả:**
- Hiển thị cả lịch học cố định + sự kiện
- View theo tháng/tuần
- Click vào event để xem chi tiết

**Schema bổ sung:**
```typescript
events: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  startDate: v.number(),      // Unix timestamp
  endDate: v.number(),
  allDay: v.boolean(),
  type: v.string(),           // "deadline", "exam", "assignment", "custom"
  relatedDocumentId: v.optional(v.id("documents")),
  color: v.optional(v.string()),
  reminder: v.optional(v.number()), // Minutes before event
})
.index("by_user", ["userId"])
.index("by_user_date", ["userId", "startDate"])
```

**Components cần tạo:**
```
app/(main)/(routes)/calendar/
  ├── page.tsx                    # Calendar view
  └── _components/
      ├── calendar-view.tsx       # Main calendar
      ├── month-view.tsx
      ├── week-view.tsx
      ├── event-item.tsx
      ├── add-event-modal.tsx
      └── event-details-modal.tsx
```

**Libraries cần thêm:**
```json
{
  "react-big-calendar": "^1.8.5",  // Calendar component
  "date-fns": "^2.30.0"            // Date utilities
}
```

**API cần tạo:**
```typescript
// convex/events.ts
export const getEvents = query(...)           // Get events in date range
export const createEvent = mutation(...)
export const updateEvent = mutation(...)
export const deleteEvent = mutation(...)

// convex/calendar.ts
export const getCalendarData = query(...)     // Merge schedules + events
```

**Logic gộp dữ liệu:**
```typescript
// Pseudo-code
function getCalendarData(userId, startDate, endDate) {
  // 1. Get recurring schedules
  const schedules = getSchedules(userId)
  
  // 2. Convert schedules to events for date range
  const recurringEvents = expandSchedulesToEvents(schedules, startDate, endDate)
  
  // 3. Get one-time events
  const events = getEvents(userId, startDate, endDate)
  
  // 4. Merge and return
  return [...recurringEvents, ...events]
}
```

**Features:**
- Switch between Month/Week view
- Color-code: Lịch học (blue), Deadline (red), Exam (orange), etc.
- Click event → Show details modal
- Add new event from calendar
- Drag-and-drop to reschedule (advanced)

**Hành động:**
1. Create events schema
2. Build calendar APIs
3. Integrate react-big-calendar
4. Implement merge logic (schedules + events)
5. Create add/edit event modals
6. Add filtering and search
7. Implement reminders (optional)

**Mức độ ưu tiên:** 🔴 CAO
**Thời gian ước tính:** 1.5 tuần

---

### UC17: NHẬN VÀ XEM THÔNG BÁO ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai hoàn toàn

**Mô tả:**
- Hệ thống tự động tạo thông báo
- Nhắc nhở deadline/sự kiện sắp tới
- Đánh dấu đã đọc/chưa đọc

**Schema đề xuất:**
```typescript
notifications: defineTable({
  userId: v.string(),
  type: v.string(),           // "deadline", "reminder", "system"
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  relatedEventId: v.optional(v.id("events")),
  relatedDocumentId: v.optional(v.id("documents")),
  createdAt: v.number(),
  actionUrl: v.optional(v.string()), // Link to related page
})
.index("by_user", ["userId"])
.index("by_user_read", ["userId", "isRead"])
```

**Components cần tạo:**
```
components/
  └── notifications/
      ├── notification-bell.tsx     # Bell icon with badge
      ├── notification-dropdown.tsx # Dropdown list
      └── notification-item.tsx     # Single notification

app/(main)/(routes)/notifications/
  └── page.tsx                      # Full notifications page
```

**API cần tạo:**
```typescript
// convex/notifications.ts
export const getNotifications = query(...)
export const getUnreadCount = query(...)
export const markAsRead = mutation(...)
export const markAllAsRead = mutation(...)
export const deleteNotification = mutation(...)

// Background job
export const createDeadlineReminders = mutation(...) // Cron job
```

**Notification Generation Logic:**
```typescript
// Convex cron job (runs daily)
export const generateReminders = internalMutation(async (ctx) => {
  const now = Date.now()
  const tomorrow = now + 24 * 60 * 60 * 1000
  const threeDays = now + 3 * 24 * 60 * 60 * 1000
  
  // Get all events happening in next 1-3 days
  const upcomingEvents = await ctx.db
    .query("events")
    .filter(q => 
      q.and(
        q.gte(q.field("startDate"), now),
        q.lte(q.field("startDate"), threeDays)
      )
    )
    .collect()
  
  // Create notifications
  for (const event of upcomingEvents) {
    const existingNotif = await checkIfNotificationExists(event._id)
    if (!existingNotif) {
      await ctx.db.insert("notifications", {
        userId: event.userId,
        type: "deadline",
        title: `Sắp đến hạn: ${event.title}`,
        message: `Sự kiện "${event.title}" sẽ diễn ra vào ${formatDate(event.startDate)}`,
        isRead: false,
        relatedEventId: event._id,
        createdAt: now,
        actionUrl: `/calendar?event=${event._id}`
      })
    }
  }
})
```

**Convex Cron Setup:**
```typescript
// convex/crons.ts
import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.daily(
  "generate daily reminders",
  { hourUTC: 0, minuteUTC: 0 }, // Run at midnight UTC
  internal.notifications.generateReminders
)

export default crons
```

**UI Features:**
- Bell icon in navbar with unread count badge
- Dropdown shows recent 5 notifications
- "View all" link to full page
- Click notification → Navigate to related page
- Mark as read on click
- "Mark all as read" button

**Hành động:**
1. Create notifications schema
2. Build notification APIs
3. Create notification UI components
4. Implement bell icon with badge
5. Set up Convex cron jobs
6. Implement reminder generation logic
7. Add real-time updates (Convex subscriptions)

**Mức độ ưu tiên:** 🟡 TRUNG BÌNH
**Thời gian ước tính:** 1 tuần

---

### UC18: TÓM TẮT NỘI DUNG TRANG (AI) ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai - Tính năng nâng cao

**Mô tả:**
- Sử dụng AI (Google Gemini) để tóm tắt nội dung
- Hiển thị trong modal
- Không thay đổi nội dung gốc

**API Integration:**
```typescript
// convex/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai"

export const summarizeDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")
    
    const document = await ctx.db.get(args.documentId)
    if (!document) throw new Error("Not found")
    if (document.userId !== identity.subject) throw new Error("Unauthorized")
    
    // Extract plain text from content
    const plainText = extractPlainText(document.content)
    
    if (plainText.length < 100) {
      throw new Error("Content too short to summarize")
    }
    
    // Call Gemini API (server-side only)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    
    const prompt = `Hãy tóm tắt nội dung học tập sau đây thành các ý chính, ngắn gọn và dễ hiểu:\n\n${plainText}`
    
    const result = await model.generateContent(prompt)
    const summary = result.response.text()
    
    return summary
  }
})
```

**Environment Variables cần thêm:**
```env
GEMINI_API_KEY=your_gemini_api_key
```

**Components cần tạo:**
```
components/
  └── ai/
      ├── summarize-button.tsx      # Button to trigger
      └── summary-modal.tsx          # Display summary
```

**UI Flow:**
1. User clicks "Tóm tắt" button
2. Show loading state
3. Call API
4. Display summary in modal
5. Handle errors (too short, API error)

**Libraries cần thêm:**
```json
{
  "@google/generative-ai": "^0.1.3"
}
```

**Error Handling:**
- Content too short (< 100 words)
- API rate limit exceeded
- API error
- Network error

**Hành động:**
1. Get Gemini API key
2. Add environment variable
3. Install @google/generative-ai
4. Create summarize API
5. Build UI components
6. Add loading states
7. Implement error handling
8. Add usage analytics (optional)

**Mức độ ưu tiên:** 🟢 THẤP (Nice to have)
**Thời gian ước tính:** 3-4 ngày

---

### UC19: HỎI ĐÁP TRÊN TÀI LIỆU (AI) ❌ (Chưa triển khai)

**Trạng thái:** Cần triển khai - Tính năng nâng cao phức tạp

**Mô tả:**
- Chat interface với AI
- AI chỉ trả lời dựa trên nội dung document
- Lưu lịch sử hội thoại

**Schema bổ sung:**
```typescript
chatSessions: defineTable({
  userId: v.string(),
  documentId: v.id("documents"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user_document", ["userId", "documentId"])

chatMessages: defineTable({
  sessionId: v.id("chatSessions"),
  role: v.string(),         // "user" | "assistant"
  content: v.string(),
  createdAt: v.number(),
})
.index("by_session", ["sessionId"])
```

**API cần tạo:**
```typescript
// convex/chat.ts
export const createSession = mutation(...)
export const getSession = query(...)
export const getMessages = query(...)

export const sendMessage = mutation({
  args: { 
    sessionId: v.id("chatSessions"),
    message: v.string() 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")
    
    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error("Session not found")
    
    const document = await ctx.db.get(session.documentId)
    if (!document) throw new Error("Document not found")
    if (document.userId !== identity.subject) throw new Error("Unauthorized")
    
    // Save user message
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      createdAt: Date.now()
    })
    
    // Get chat history
    const history = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect()
    
    // Extract document content
    const documentContent = extractPlainText(document.content)
    
    // Build prompt with context
    const prompt = buildContextualPrompt(documentContent, history, args.message)
    
    // Call Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    
    const result = await model.generateContent(prompt)
    const aiResponse = result.response.text()
    
    // Save AI response
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: aiResponse,
      createdAt: Date.now()
    })
    
    return aiResponse
  }
})

function buildContextualPrompt(
  documentContent: string,
  history: Message[],
  currentQuestion: string
): string {
  return `
Bạn là trợ lý học tập thông minh. Nhiệm vụ của bạn là trả lời câu hỏi của học sinh DỰA TUYỆT ĐỐI VÀO nội dung tài liệu được cung cấp dưới đây.

QUY TẮC QUAN TRỌNG:
1. CHỈ sử dụng thông tin từ [NỘI DUNG TÀI LIỆU] để trả lời
2. KHÔNG sử dụng kiến thức chung hoặc thông tin bên ngoài
3. Nếu câu trả lời KHÔNG có trong tài liệu, hãy trả lời: "Tôi không tìm thấy thông tin này trong tài liệu."
4. Trả lời ngắn gọn, rõ ràng, dễ hiểu
5. Trích dẫn phần liên quan trong tài liệu nếu có thể

[NỘI DUNG TÀI LIỆU]:
${documentContent}

[LỊCH SỬ HỘI THOẠI]:
${history.map(m => `${m.role === 'user' ? 'Học sinh' : 'Trợ lý'}: ${m.content}`).join('\n')}

[CÂU HỎI HIỆN TẠI]:
${currentQuestion}

Hãy trả lời câu hỏi dựa trên nội dung tài liệu:
`
}
```

**Components cần tạo:**
```
components/
  └── ai/
      ├── chat-button.tsx           # Button to open chat
      ├── chat-sidebar.tsx          # Chat interface
      ├── chat-message.tsx          # Single message
      └── chat-input.tsx            # Input box
```

**UI Design:**
- Sidebar/Modal with chat interface
- Message bubbles (user vs AI)
- Typing indicator
- Auto-scroll to bottom
- Clear chat button
- Close button

**Features:**
- Context-aware responses
- Chat history persistence
- Streaming responses (advanced)
- Copy response button
- Regenerate response

**Challenges:**
- ⚠️ Token limits (Gemini has max input tokens)
- ⚠️ Cost management (API calls)
- ⚠️ Response quality depends on prompt engineering
- ⚠️ Handling long documents (need chunking)

**Hành động:**
1. Create chat schema
2. Build chat APIs with Gemini integration
3. Implement prompt engineering
4. Create chat UI components
5. Add streaming (optional)
6. Implement token management
7. Add usage limits/quotas
8. Testing with various documents

**Mức độ ưu tiên:** 🟢 THẤP (Nice to have)
**Thời gian ước tính:** 1-2 tuần

---

## 3. ĐÁNH GIÁ CÔNG NGHỆ HIỆN TẠI

### 3.1. Điểm mạnh ✅

**Convex:**
- ✅ Real-time database tuyệt vời
- ✅ Type-safe với TypeScript
- ✅ Serverless, auto-scaling
- ✅ Built-in authentication integration
- ✅ Cron jobs support
- ✅ File storage capabilities

**Clerk Auth:**
- ✅ Đầy đủ tính năng authentication
- ✅ UI components đẹp, customizable
- ✅ OAuth providers
- ✅ Webhooks cho user sync
- ✅ Session management tốt

**Next.js 13:**
- ✅ App Router mới
- ✅ Server Components
- ✅ Optimized performance
- ✅ SEO friendly

**BlockNote Editor:**
- ✅ Rich text editing mạnh mẽ
- ✅ Notion-like blocks
- ✅ Extensible

### 3.2. Hạn chế ⚠️

**Convex:**
- ⚠️ Vendor lock-in
- ⚠️ Pricing có thể cao khi scale
- ⚠️ Limited complex queries (so với SQL)
- ⚠️ No built-in full-text search (cần integrate Algolia/etc)

**Clerk:**
- ⚠️ Pricing tăng theo MAU (Monthly Active Users)
- ⚠️ Một số customization bị giới hạn ở free tier

**BlockNote:**
- ⚠️ Còn mới, documentation chưa đầy đủ
- ⚠️ Một số features còn thiếu

### 3.3. Đề xuất bổ sung

**Libraries cần thêm:**
```json
{
  // For UC14: Tables
  "xlsx": "^0.18.5",
  "react-data-grid": "^7.0.0",
  "papaparse": "^5.4.1",
  
  // For UC15-16: Calendar
  "react-big-calendar": "^1.8.5",
  "date-fns": "^2.30.0",
  
  // For UC18-19: AI
  "@google/generative-ai": "^0.1.3",
  
  // Utilities
  "react-hook-form": "^7.48.0",  // Better form handling
  "zod": "^3.22.4",              // Already have, use more
  "react-hot-toast": "^2.4.1",   // Better than sonner (optional)
  "use-debounce": "^10.0.0",     // For auto-save
  "react-idle-timer": "^5.7.2"   // For auto-logout
}
```

---

## 4. KẾ HOẠCH TRIỂN KHAI

### Phase 1: Core User Management (1 tuần)
**Priority: 🔴 CAO**

**Tasks:**
1. ✅ UC04: Kích hoạt Forgot Password (Clerk config) - 1 ngày
2. ✅ UC05: Cập nhật thông tin cá nhân - 2 ngày
   - Create users schema
   - Build profile page
   - Avatar upload
3. ✅ UC06: Đổi mật khẩu - 1 ngày
4. ✅ Enhancements cho UC01-03:
   - Rate limiting
   - Auto-logout
   - Activity logging

**Deliverables:**
- Users table in Convex
- Profile management page
- Change password page
- Enhanced security features

---

### Phase 2: Advanced Content Management (2-3 tuần)
**Priority: 🔴 CAO**

**Tasks:**
1. ✅ UC14: Quản lý bảng dữ liệu - 2-3 tuần
   - Design schema (tables, columns, rows, cells)
   - Build CRUD APIs
   - Create Excel-like grid UI
   - Implement Excel/CSV import
   - Testing

**Deliverables:**
- Tables feature fully functional
- Import from Excel/CSV
- Grid editing interface

---

### Phase 3: Calendar & Scheduling (2 tuần)
**Priority: 🔴 CAO**

**Tasks:**
1. ✅ UC15: Quản lý lịch học - 1 tuần
   - Create schedules schema
   - Build schedule CRUD
   - Weekly grid UI
   - Time conflict validation
   
2. ✅ UC16: Xem lịch tổng quan - 1 tuần
   - Create events schema
   - Integrate react-big-calendar
   - Merge schedules + events
   - Month/Week views
   - Add/Edit events

**Deliverables:**
- Schedule management
- Unified calendar view
- Event management

---

### Phase 4: Notifications System (1 tuần)
**Priority: 🟡 TRUNG BÌNH**

**Tasks:**
1. ✅ UC17: Nhận và xem thông báo - 1 tuần
   - Create notifications schema
   - Build notification APIs
   - Notification UI (bell icon, dropdown)
   - Set up Convex cron jobs
   - Reminder generation logic

**Deliverables:**
- Notification system
- Automated reminders
- Real-time updates

---

### Phase 5: AI Features (2-3 tuần)
**Priority: 🟢 THẤP (Nice to have)**

**Tasks:**
1. ✅ UC18: Tóm tắt nội dung - 3-4 ngày
   - Gemini API integration
   - Summarize API
   - UI components
   
2. ✅ UC19: Hỏi đáp trên tài liệu - 1-2 tuần
   - Chat schema
   - Chat APIs with context
   - Chat UI
   - Prompt engineering
   - Testing

**Deliverables:**
- AI summarization
- AI Q&A chat
- Context-aware responses

---

### Phase 6: Polish & Optimization (1 tuần)
**Priority: 🟡 TRUNG BÌNH**

**Tasks:**
1. ✅ Performance optimization
   - Database query optimization
   - Component lazy loading
   - Image optimization
   
2. ✅ UX improvements
   - Loading states
   - Error handling
   - Responsive design
   - Accessibility
   
3. ✅ Testing
   - Unit tests
   - Integration tests
   - E2E tests (Playwright)
   
4. ✅ Documentation
   - User guide
   - Developer documentation
   - API documentation

**Deliverables:**
- Optimized performance
- Better UX
- Test coverage
- Complete documentation

---

## 5. KIẾN TRÚC HỆ THỐNG ĐỀ XUẤT

### 5.1. Database Schema (Convex)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ===== EXISTING =====
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
    .index("by_user_parent", ["userId", "parentDocument"]),

  // ===== NEW TABLES =====
  
  // UC05: User profiles
  users: defineTable({
    clerkId: v.string(),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"]),

  // UC14: Custom tables
  tables: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  tableColumns: defineTable({
    tableId: v.id("tables"),
    name: v.string(),
    type: v.string(),
    order: v.number(),
    config: v.optional(v.string()),
  })
    .index("by_table", ["tableId"]),

  tableRows: defineTable({
    tableId: v.id("tables"),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_table", ["tableId"]),

  tableCells: defineTable({
    rowId: v.id("tableRows"),
    columnId: v.id("tableColumns"),
    value: v.string(),
  })
    .index("by_row", ["rowId"])
    .index("by_column", ["columnId"]),

  // UC15: Schedules
  schedules: defineTable({
    userId: v.string(),
    subjectId: v.optional(v.id("documents")),
    subjectName: v.string(),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "dayOfWeek"]),

  // UC16: Events
  events: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    allDay: v.boolean(),
    type: v.string(),
    relatedDocumentId: v.optional(v.id("documents")),
    color: v.optional(v.string()),
    reminder: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "startDate"]),

  // UC17: Notifications
  notifications: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedEventId: v.optional(v.id("events")),
    relatedDocumentId: v.optional(v.id("documents")),
    createdAt: v.number(),
    actionUrl: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),

  // UC19: Chat sessions
  chatSessions: defineTable({
    userId: v.string(),
    documentId: v.id("documents"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_document", ["userId", "documentId"]),

  chatMessages: defineTable({
    sessionId: v.id("chatSessions"),
    role: v.string(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"]),
});
```

### 5.2. Folder Structure đề xuất

```
notion-clone-nextjs/
├── app/
│   ├── (main)/
│   │   ├── (routes)/
│   │   │   ├── documents/
│   │   │   │   └── [documentId]/
│   │   │   │       └── page.tsx
│   │   │   ├── profile/                    # NEW: UC05
│   │   │   │   ├── page.tsx
│   │   │   │   └── _components/
│   │   │   │       ├── profile-form.tsx
│   │   │   │       └── avatar-upload.tsx
│   │   │   ├── settings/                   # NEW: UC06
│   │   │   │   ├── page.tsx
│   │   │   │   └── _components/
│   │   │   │       └── change-password-form.tsx
│   │   │   ├── tables/                     # NEW: UC14
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [tableId]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── _components/
│   │   │   │       ├── table-list.tsx
│   │   │   │       ├── table-grid.tsx
│   │   │   │       ├── create-table-modal.tsx
│   │   │   │       └── import-excel-modal.tsx
│   │   │   ├── schedule/                   # NEW: UC15
│   │   │   │   ├── page.tsx
│   │   │   │   └── _components/
│   │   │   │       ├── schedule-grid.tsx
│   │   │   │       ├── schedule-item.tsx
│   │   │   │       └── add-schedule-modal.tsx
│   │   │   ├── calendar/                   # NEW: UC16
│   │   │   │   ├── page.tsx
│   │   │   │   └── _components/
│   │   │   │       ├── calendar-view.tsx
│   │   │   │       ├── month-view.tsx
│   │   │   │       ├── week-view.tsx
│   │   │   │       └── add-event-modal.tsx
│   │   │   └── notifications/              # NEW: UC17
│   │   │       └── page.tsx
│   │   └── _components/
│   │       ├── navigation.tsx
│   │       └── navbar.tsx
│   ├── (marketing)/
│   └── (public)/
├── components/
│   ├── ui/                                  # Shadcn components
│   ├── modals/
│   ├── notifications/                       # NEW: UC17
│   │   ├── notification-bell.tsx
│   │   ├── notification-dropdown.tsx
│   │   └── notification-item.tsx
│   └── ai/                                  # NEW: UC18-19
│       ├── summarize-button.tsx
│       ├── summary-modal.tsx
│       ├── chat-button.tsx
│       ├── chat-sidebar.tsx
│       ├── chat-message.tsx
│       └── chat-input.tsx
├── convex/
│   ├── schema.ts                            # UPDATED
│   ├── documents.ts                         # EXISTING
│   ├── users.ts                             # NEW: UC05
│   ├── tables.ts                            # NEW: UC14
│   ├── schedules.ts                         # NEW: UC15
│   ├── events.ts                            # NEW: UC16
│   ├── calendar.ts                          # NEW: UC16 (merge logic)
│   ├── notifications.ts                     # NEW: UC17
│   ├── ai.ts                                # NEW: UC18-19
│   ├── chat.ts                              # NEW: UC19
│   └── crons.ts                             # NEW: Cron jobs
├── hooks/
│   ├── use-idle-timer.tsx                   # NEW: Auto-logout
│   └── use-debounce.tsx                     # NEW: Auto-save
└── lib/
    ├── utils.ts
    └── validations.ts                       # NEW: Zod schemas
```

### 5.3. API Endpoints (Convex)

**Users (UC05-06):**
- `users.getProfile` - Get user profile
- `users.updateProfile` - Update profile
- `users.uploadAvatar` - Upload avatar

**Tables (UC14):**
- `tables.create` - Create table
- `tables.getAll` - Get all tables
- `tables.getById` - Get table by ID
- `tables.update` - Update table
- `tables.delete` - Delete table
- `tables.importExcel` - Import from Excel
- `tableColumns.create/update/delete`
- `tableRows.create/update/delete`
- `tableCells.update`

**Schedules (UC15):**
- `schedules.getAll` - Get all schedules
- `schedules.getByDay` - Get by day
- `schedules.create` - Create schedule
- `schedules.update` - Update schedule
- `schedules.delete` - Delete schedule

**Events (UC16):**
- `events.getAll` - Get events in range
- `events.create` - Create event
- `events.update` - Update event
- `events.delete` - Delete event

**Calendar (UC16):**
- `calendar.getData` - Get merged calendar data

**Notifications (UC17):**
- `notifications.getAll` - Get all notifications
- `notifications.getUnreadCount` - Get unread count
- `notifications.markAsRead` - Mark as read
- `notifications.markAllAsRead` - Mark all as read
- `notifications.delete` - Delete notification

**AI (UC18-19):**
- `ai.summarize` - Summarize document
- `chat.createSession` - Create chat session
- `chat.getMessages` - Get chat messages
- `chat.sendMessage` - Send message and get AI response

---

## 6. ROADMAP PHÁT TRIỂN

### Sprint 1 (Tuần 1): User Management
- [ ] Setup users schema
- [ ] Clerk webhook integration
- [ ] Profile page
- [ ] Change password
- [ ] Forgot password config

### Sprint 2-3 (Tuần 2-3): Tables Feature
- [ ] Tables schema design
- [ ] CRUD APIs
- [ ] Grid UI component
- [ ] Excel import
- [ ] Testing

### Sprint 4-5 (Tuần 4-5): Calendar System
- [ ] Schedules schema & APIs
- [ ] Schedule UI
- [ ] Events schema & APIs
- [ ] Calendar integration
- [ ] Merge logic

### Sprint 6 (Tuần 6): Notifications
- [ ] Notifications schema
- [ ] Notification APIs
- [ ] UI components
- [ ] Cron jobs setup
- [ ] Real-time updates

### Sprint 7-8 (Tuần 7-8): AI Features
- [ ] Gemini API setup
- [ ] Summarization
- [ ] Chat system
- [ ] Prompt engineering
- [ ] Testing

### Sprint 9 (Tuần 9): Polish & Launch
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation
- [ ] Deployment
- [ ] User testing

---

## 7. TESTING STRATEGY

### 7.1. Unit Tests
- Test individual Convex functions
- Test utility functions
- Test validation schemas

### 7.2. Integration Tests
- Test API flows
- Test authentication flows
- Test data mutations

### 7.3. E2E Tests (Playwright)
- Test critical user journeys
- Test all use cases
- Test cross-browser compatibility

### 7.4. Performance Tests
- Load testing
- Database query performance
- API response times

---

## 8. DEPLOYMENT CHECKLIST

### Pre-deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations complete
- [ ] API keys secured
- [ ] Error tracking setup (Sentry)
- [ ] Analytics setup (optional)

### Deployment
- [ ] Deploy to Vercel
- [ ] Configure custom domain
- [ ] Setup SSL
- [ ] Configure Convex production
- [ ] Configure Clerk production

### Post-deployment
- [ ] Smoke tests
- [ ] Monitor errors
- [ ] Monitor performance
- [ ] User feedback collection

---

## 9. SECURITY CONSIDERATIONS

### Authentication
- ✅ Clerk handles auth securely
- ⚠️ Add rate limiting
- ⚠️ Add session timeout
- ⚠️ Add activity logging

### Data Protection
- ✅ User data isolation (userId checks)
- ✅ HTTPS only
- ⚠️ Input validation on all mutations
- ⚠️ XSS protection
- ⚠️ CSRF protection

### API Security
- ⚠️ API key rotation
- ⚠️ Rate limiting for AI APIs
- ⚠️ Usage quotas
- ⚠️ Error message sanitization

---

## 10. PERFORMANCE OPTIMIZATION

### Frontend
- Code splitting
- Lazy loading components
- Image optimization
- Debounced inputs
- Virtualized lists (for large tables)

### Backend
- Database indexing (already good with Convex)
- Query optimization
- Caching strategies
- Pagination

### AI Features
- Response streaming
- Token management
- Caching common queries
- Rate limiting

---

## 11. MONITORING & ANALYTICS

### Error Tracking
- Sentry integration
- Error logging
- User feedback

### Performance Monitoring
- Vercel Analytics
- Core Web Vitals
- API response times

### Usage Analytics
- User activity tracking
- Feature usage
- AI usage metrics
- Conversion funnels

---

## 12. DOCUMENTATION REQUIREMENTS

### User Documentation
- Getting started guide
- Feature tutorials
- FAQ
- Video tutorials (optional)

### Developer Documentation
- Setup guide
- Architecture overview
- API documentation
- Contributing guide

### API Documentation
- Convex functions reference
- Schema documentation
- Examples

---

## 13. COST ESTIMATION

### Monthly Costs (Estimated)

**Convex:**
- Free tier: Up to 1M function calls/month
- Paid: ~$25-100/month depending on usage

**Clerk:**
- Free tier: Up to 10,000 MAU
- Paid: $25/month + $0.02/MAU

**Edge Store:**
- Free tier: 5GB storage
- Paid: ~$10-50/month

**Gemini API:**
- Free tier: 60 requests/minute
- Paid: ~$0.001-0.01 per request

**Vercel:**
- Free tier: Hobby projects
- Paid: $20/month for Pro

**Total estimated:** $0-200/month depending on scale

---

## 14. RISKS & MITIGATION

### Technical Risks
1. **Convex vendor lock-in**
   - Mitigation: Abstract database layer
   - Keep business logic separate

2. **AI API costs**
   - Mitigation: Implement usage quotas
   - Cache common responses
   - Rate limiting

3. **Performance with large datasets**
   - Mitigation: Pagination
   - Virtualization
   - Lazy loading

### Business Risks
1. **User adoption**
   - Mitigation: User testing
   - Feedback loops
   - Iterative improvements

2. **Scalability**
   - Mitigation: Monitor usage
   - Plan for scaling
   - Load testing

---

## 15. SUCCESS METRICS

### User Engagement
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration
- Feature adoption rates

### Performance
- Page load time < 3s
- API response time < 2s
- Error rate < 1%
- Uptime > 99.9%

### Business
- User retention rate
- Feature usage
- User satisfaction (NPS)

---

## KẾT LUẬN

Hệ thống Notion Clone hiện tại đã có nền tảng vững chắc với 10/19 use cases đã được triển khai. Các use cases còn lại cần được phát triển theo roadmap đề xuất, ưu tiên các tính năng core trước (User Management, Tables, Calendar) rồi mới đến các tính năng nâng cao (AI).

Với kiến trúc hiện tại (Next.js + Convex + Clerk), việc mở rộng thêm các tính năng mới là hoàn toàn khả thi. Tuy nhiên cần chú ý đến:
- Performance optimization cho các tính năng phức tạp (Tables, Calendar)
- Cost management cho AI features
- Security best practices
- User experience

Thời gian ước tính hoàn thành toàn bộ: **8-9 tuần** (2-2.5 tháng)

---

**Người thực hiện:** AI Assistant
**Ngày:** 01/12/2025
**Phiên bản:** 1.0

# 📅 UC15-UC16: SCHEDULE & CALENDAR MODULE

## 📋 Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [UC15: Thời khóa biểu (Weekly Schedule)](#2-uc15-thời-khóa-biểu-weekly-schedule)
3. [UC16: Lịch sự kiện (Events & Calendar)](#3-uc16-lịch-sự-kiện-events--calendar)
4. [So sánh Schedule vs Events](#4-so-sánh-schedule-vs-events)
5. [Cơ chế phát hiện trùng lịch](#5-cơ-chế-phát-hiện-trùng-lịch)

---

## 1. Tổng quan

Hệ thống quản lý thời gian của PLMS chia làm 2 phần riêng biệt nhưng bổ trợ cho nhau:
- **Schedule (UC15)**: Quản lý lịch học lặp lại hàng tuần (Thời khóa biểu).
- **Events (UC16)**: Quản lý các sự kiện đơn lẻ, deadline, thi cử (Lịch).

Cả hai đều được hiển thị thống nhất trên giao diện Calendar.

---

## 2. UC15: Thời khóa biểu (Weekly Schedule)

### 2.1 Database Schema

Lưu trữ các lớp học lặp lại theo thứ trong tuần.

```typescript
// convex/schema.ts
schedules: defineTable({
  userId: v.string(),
  subjectName: v.string(),        // Tên môn học
  dayOfWeek: v.number(),          // 0 (CN) - 6 (Thứ 7)
  startTime: v.string(),          // "HH:mm" (ví dụ: "07:00")
  endTime: v.string(),            // "HH:mm"
  room: v.optional(v.string()),   // Phòng học
  teacher: v.optional(v.string()),// Giảng viên
  color: v.optional(v.string()),  // Màu hiển thị
  // ...
}).index("by_user_day", ["userId", "dayOfWeek"]),
```

### 2.2 Validate & Logic

**Format thời gian:**
Chỉ chấp nhận chuỗi "HH:mm".

```typescript
function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}
```

**Thêm lịch mới (`create` mutation):**
1. Validate format giờ.
2. Kiểm tra xung đột (Conflict logic).
3. Insert vào DB.

---

## 3. UC16: Lịch sự kiện (Events & Calendar)

### 3.1 Database Schema

Lưu trữ sự kiện tại một thời điểm cụ thể (Timestamp-based).

```typescript
// convex/schema.ts
events: defineTable({
  userId: v.string(),
  title: v.string(),
  startDate: v.number(), // Unix timestamp (ms)
  endDate: v.number(),   // Unix timestamp (ms)
  allDay: v.boolean(),   // Sự kiện cả ngày
  type: v.string(),      // "deadline", "exam", "meeting"...
  reminder: v.optional(v.number()), // Phút trước khi nhắc
  // ...
}).index("by_user", ["userId"]),
```

### 3.2 Event Types & Colors

Hệ thống tự động gán màu theo loại sự kiện nếu người dùng không chọn:

| Type | Color | Code |
|------|-------|------|
| Deadline | Đỏ | `#EF4444` |
| Exam (Thi) | Vàng cam | `#F59E0B` |
| Assignment | Xanh dương | `#3B82F6` |
| Meeting | Xanh lá | `#10B981` |
| Custom | Tím | `#8B5CF6` |

---

## 4. So sánh Schedule vs Events

| Đặc điểm | Schedule (TKB) | Events (Sự kiện) |
|----------|----------------|------------------|
| **Bản chất** | Lặp lại hàng tuần | Xảy ra một lần |
| **Lưu trữ** | `dayOfWeek` (0-6) <br> `startTime` ("HH:mm") | `startDate` (Timestamp) <br> `endDate` (Timestamp) |
| **Use Case** | Lịch học chính khóa | Deadline, thi, hẹn gặp |
| **Conflict Check** | Có (bắt buộc) | Không (cho phép trùng) |
| **Hiển thị** | Tab "Schedule" & Calendar View | Calendar View |

### 4.1 Tích hợp trên Frontend (React-Big-Calendar)

Để hiển thị chung trên Calendar, chúng tôi thực hiện **Data Transformation**:

1. Fetch `schedules` và `events`.
2. Map `events` -> `CalendarEvent` object.
3. Map `schedules` -> Lặp lại `CalendarEvent` cho các ngày trong view hiện tại.

```typescript
// Frontend logic (pseudocode)
const eventsList = events.map(e => ({
  title: e.title,
  start: new Date(e.startDate),
  end: new Date(e.endDate),
  resource: e, // Original data
}));

// Generate recurring schedule events
const scheduleEvents = generateWeeklyEvents(schedules, currentViewDate);

return <BigCalendar events={[...eventsList, ...scheduleEvents]} ... />;
```

---

## 5. Cơ chế phát hiện trùng lịch

Đây là logic quan trọng nhất trong module Schedule để ngăn chặn đăng ký trùng lịch học.

### 5.1 Thuật toán Overlap

```typescript
// convex/schedules.ts

function timeRangesOverlap(start1, end1, start2, end2): boolean {
  // Trùng khi:
  // (Start1 < End2) AND (End1 > Start2)
  return start1 < end2 && end1 > start2;
}
```
*Lưu ý: Cho phép trùng biên (ví dụ: Ca 1 kết thúc 09:00, Ca 2 bắt đầu 09:00 -> Check OK).*

### 5.2 Quy trình kiểm tra (Mutation)

1. Query lấy tất cả lịch trong cùng `dayOfWeek` của user.
2. Duyệt từng lịch và gọi hàm `timeRangesOverlap`.
3. Nếu trùng -> Trả về lỗi chi tiết kèm tên môn học bị trùng.

```typescript
if (conflictResult.hasConflict) {
  const conflicting = conflictResult.conflictingSchedule;
  throw new Error(
    `Không thể thêm lịch. Bạn đã có lịch "${conflicting.subjectName}" ` + 
    `trong khung giờ ${conflicting.startTime}-${conflicting.endTime} ...`
  );
}
```

---

*Cập nhật lần cuối: 26/12/2024*

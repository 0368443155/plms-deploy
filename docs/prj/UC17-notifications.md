# 🔔 UC17: MODULE NOTIFICATIONS

## 📋 Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Cơ chế Cron Job (Scheduled Tasks)](#2-cơ-chế-cron-job-scheduled-tasks)
3. [UC17.1: Nhắc nhở sự kiện (Event Reminders)](#3-uc171-nhắc-nhở-sự-kiện-event-reminders)
4. [UC17.2: Nhắc nhở lịch học (Schedule Reminders)](#4-uc172-nhắc-nhở-lịch-học-schedule-reminders)
5. [Cơ chế đánh dấu đã đọc (Mark as Read)](#5-cơ-chế-đánh-dấu-đã-đọc-mark-as-read)

---

## 1. Tổng quan

Hệ thống thông báo của PLMS hoạt động hoàn toàn tự động phía server (backend) thông qua cơ chế **Convex Cron Jobs**. Hệ thống định kỳ kiểm tra các sự kiện sắp tới và gửi thông báo cho người dùng.

### 1.1 Database Schema

```typescript
// convex/schema.ts
notifications: defineTable({
  userId: v.string(),
  type: v.string(),   // "reminder", "deadline", "system"
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  priority: v.string(), // "high", "medium", "low"
  relatedEventId: v.optional(v.id("events")),
  relatedScheduleId: v.optional(v.id("schedules")),
  // ...
}).index("by_user_created", ["userId"]),
```

---

## 2. Cơ chế Cron Job (Scheduled Tasks)

Chúng tôi thiết lập một Cron Job chạy định kỳ **mỗi 15 phút** để quét các sự kiện.

```typescript
// convex/crons.ts (cấu hình logic)
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "generate-reminders", // Tên job
  { minutes: 15 },      // Chạy mỗi 15 phút
  internal.notifications.generateReminders // Hàm thực thi
);

export default crons;
```

---

## 3. UC17.1: Nhắc nhở sự kiện (Event Reminders)

Hệ thống hỗ trợ 2 loại nhắc nhở cho sự kiện (deadline, thi, họp...):
1. **Default**: Nhắc lúc 20:00 tối hôm trước.
2. **Custom**: Nhắc trước X phút (ví dụ: 15 phút trước giờ thi).

### 3.1 Logic xử lý (`generateReminders`)

```typescript
// convex/notifications.ts

// 1. Lấy tất cả sự kiện trong 30 ngày tới
const upcomingEvents = await ctx.db.query("events")...collect();

for (const event of upcomingEvents) {
  // Tính thời gian kích hoạt (triggerTime)
  let triggerTime = 0;
  
  if (event.reminderType === "custom") {
    triggerTime = event.startDate - (event.reminder * 60 * 1000);
  } else if (event.reminderType === "default") {
    // 20:00 ngày hôm trước
    triggerTime = getPreviousDay20h(event.startDate);
  }

  // Nếu đã qua giờ kích hoạt VÀ chưa thông báo -> Tạo noti
  if (now >= triggerTime && !hasNotified(event._id)) {
    await ctx.db.insert("notifications", {
      userId: event.userId,
      type: "reminder",
      title: `Nhắc nhở: ${event.title}`,
      message: `Sự kiện sẽ diễn ra vào ${formatDate(event.startDate)}`,
      // ...
    });
  }
}
```

---

## 4. UC17.2: Nhắc nhở lịch học (Schedule Reminders)

Theo yêu cầu nghiệp vụ: **"Nhắc lịch học vào 8h tối ngày hôm trước"**.

### 4.1 Logic Time-Check

Cron job chạy 15 phút/lần, nên ta cần kiểm tra giờ hiện tại có phải là khung giờ tối hay không.

```typescript
const now = new Date();
// Chỉ chạy logic nhắc lịch học nếu giờ >= 20 và < 21
// (để tránh spam nhiều lần trong đêm, kết hợp check trùng lặp)
if (now.getHours() >= 20) {
  
  const tomorrow = getTomorrowDate();
  const dayOfWeek = tomorrow.getDay(); // 0-6

  // Lấy tất cả lịch học của ngày mai
  const schedules = await ctx.db
    .query("schedules")
    .withIndex("by_day", q => q.eq("dayOfWeek", dayOfWeek))
    .collect();

  for (const classSession of schedules) {
    // Deduplicate: Kiểm tra xem hôm nay đã nhắc lịch này chưa
    if (!alreadyRemindedToday(classSession._id)) {
      await ctx.db.insert("notifications", {
        userId: classSession.userId,
        title: "Lịch học ngày mai",
        message: `Môn ${classSession.subjectName} lúc ${classSession.startTime}`,
        type: "reminder",
        priority: "medium"
      });
    }
  }
}
```

---

## 5. Cơ chế đánh dấu đã đọc (Mark as Read)

Để đảm bảo UX tốt, khi người dùng mở bảng thông báo, hoặc click vào "Đánh dấu tất cả là đã đọc", hệ thống sẽ cập nhật trạng thái.

**API: `markAllAsRead`**
```typescript
export const markAllAsRead = mutation({
  handler: async (ctx) => {
    // 1. Lấy tất cả noti chưa đọc của user
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", q => q.eq("userId", sub).eq("isRead", false))
      .collect();

    // 2. Update song song (Promise.all) để tối ưu tốc độ
    await Promise.all(
      unread.map(n => ctx.db.patch(n._id, { isRead: true }))
    );
  }
});
```

Hệ thống cũng có job dọn dẹp (`cleanupOldNotifications`) để xóa thông báo cũ > 30 ngày, giữ database gọn nhẹ.

---
*Cập nhật lần cuối: 26/12/2024*

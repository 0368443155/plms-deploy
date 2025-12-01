# UC15 - Quản lý lịch học

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC15 |
| **Tên** | Quản lý lịch học (Manage Schedule) |
| **Mô tả** | Người dùng tạo và quản lý lịch học theo tuần với các môn học, thời gian, phòng học và giảng viên |
| **Actor** | Người dùng đã đăng nhập (sinh viên) |
| **Precondition** | - Người dùng đã đăng nhập<br>- Có quyền tạo schedule |
| **Postcondition** | - Schedule được lưu vào Convex<br>- Hiển thị trong weekly grid<br>- Tự động lặp lại hàng tuần |
| **Độ ưu tiên** | 🔴 Cao (Key feature for students) |
| **Trạng thái** | ❌ Cần triển khai |
| **Sprint** | Sprint 4-5 (Week 5-6) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng navigate đến `/schedule`
2. Hệ thống hiển thị weekly schedule grid:
   - 7 cột (Thứ 2 - Chủ nhật)
   - Time slots từ 7:00 - 22:00 (30 phút/slot)
   - Empty grid nếu chưa có schedule
3. Người dùng click "Add schedule" hoặc click vào time slot
4. Hệ thống hiển thị "Add Schedule" modal với form:
   - Tên môn học (required)
   - Thứ trong tuần (dropdown)
   - Thời gian bắt đầu (time picker)
   - Thời gian kết thúc (time picker)
   - Phòng học (optional)
   - Giảng viên (optional)
   - Màu sắc (color picker)
5. Người dùng điền thông tin và click "Save"
6. Hệ thống validate:
   - Thời gian hợp lệ (start < end)
   - Không conflict với schedule khác
   - Tên môn học không rỗng
7. Gọi `createSchedule` mutation
8. Schedule được insert vào Convex
9. Modal đóng
10. Schedule hiển thị trong grid với màu đã chọn
11. Toast: "Schedule added successfully!"
12. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Edit schedule**
- Tại bước 3: Click vào schedule đã tồn tại
- Show "Edit Schedule" modal
- Pre-fill với data hiện tại
- User chỉnh sửa
- Click "Save"
- Gọi `updateSchedule` mutation
- Grid cập nhật

**A2: Delete schedule**
- Tại bước 3: Click vào schedule
- Click "Delete" button trong modal
- Show confirmation: "Delete this schedule?"
- User confirms
- Gọi `deleteSchedule` mutation
- Schedule biến mất khỏi grid

**A3: Duplicate schedule**
- Tại bước 3: Click "Duplicate"
- Pre-fill form với data từ schedule gốc
- User chỉnh sửa (thường là thay đổi thứ/giờ)
- Save as new schedule

**A4: Drag to resize**
- Tại bước 3: Hover schedule → drag bottom edge
- Resize để thay đổi thời gian kết thúc
- Release mouse
- Auto-save với thời gian mới

**A5: Color-code by subject**
- Tại bước 4: Chọn màu từ palette
- Hoặc auto-assign màu theo môn học
- Dễ phân biệt các môn

**A6: Import from file**
- Tại bước 3: Click "Import"
- Upload CSV/Excel file
- Parse và validate
- Bulk create schedules

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: Time conflict**
- Tại bước 6: Schedule mới overlap với schedule cũ
- Show error: "Time conflict with [Subject Name]"
- Highlight conflicting schedule
- User phải chỉnh sửa thời gian

**E2: Invalid time range**
- Tại bước 6: Start time >= End time
- Show error: "End time must be after start time"
- Prevent save

**E3: Missing required fields**
- Tại bước 6: Tên môn học trống
- Show error: "Subject name is required"
- Highlight field

**E4: Time outside range**
- Tại bước 6: Time < 7:00 hoặc > 22:00
- Show warning: "Schedule outside normal hours"
- Allow save (flexible)

**E5: Network error**
- Tại bước 7: Connection lost
- Show error: "Failed to save schedule"
- Retry button
- Or save to localStorage

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Go to /schedule     │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  2. Get schedules     │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  3. Return data       │
     │                         │<──────────────────────┤
     │                         │                       │
     │  4. Show weekly grid    │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  5. Click "Add"         │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  6. Show modal          │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  7. Fill form           │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  8. Click "Save"        │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  9. Validate          │
     │                         │                       │
     │                         ▼                       │
     │                    ◇─────────◇                  │
     │                   / Valid?    \                 │
     │                  ◇─────────────◇                │
     │                  │             │                │
     │                [Yes]         [No]               │
     │                  │             │                │
     │                  ▼             ▼                │
     │         ┌──────────────┐  ┌──────────────┐     │
     │         │ Create       │  │ Show error   │     │
     │         │ schedule     │  │              │     │
     │         ├──────────────┤  └──────────────┘     │
     │         │              │                       │
     │         │  10. Insert  │                       │
     │         ├──────────────────────────────────────>│
     │         │              │                       │
     │         │  11. Success │                       │
     │         │<──────────────────────────────────────┤
     │         │              │                       │
     │  12. Update grid        │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  13. Show toast         │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

---

## 4. Database Schema

### 4.1 Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  schedules: defineTable({
    userId: v.string(),
    subjectName: v.string(),
    dayOfWeek: v.number(),          // 1-7 (Monday-Sunday)
    startTime: v.string(),          // "08:00"
    endTime: v.string(),            // "10:00"
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    color: v.string(),              // Hex color "#3b82f6"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "dayOfWeek"])
    .index("by_day_time", ["dayOfWeek", "startTime"]),
});
```

### 4.2 Schedule Data Structure

```typescript
interface Schedule {
  _id: Id<"schedules">;
  _creationTime: number;
  userId: string;
  subjectName: string;
  dayOfWeek: number;      // 1 = Monday, 7 = Sunday
  startTime: string;      // "08:00"
  endTime: string;        // "10:00"
  room?: string;          // "A101"
  teacher?: string;       // "Dr. Smith"
  color: string;          // "#3b82f6"
  createdAt: number;
  updatedAt: number;
}
```

---

## 5. API Endpoints

### 5.1 Convex Queries

```typescript
// convex/schedules.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getSchedules = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return schedules;
  },
});

export const getSchedulesByDay = query({
  args: { dayOfWeek: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    return schedules;
  },
});
```

### 5.2 Convex Mutations

```typescript
// convex/schedules.ts
export const createSchedule = mutation({
  args: {
    subjectName: v.string(),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate time range
    if (args.startTime >= args.endTime) {
      throw new Error("End time must be after start time");
    }

    // Check for conflicts
    const existingSchedules = await ctx.db
      .query("schedules")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    for (const schedule of existingSchedules) {
      // Check if times overlap
      if (
        (args.startTime >= schedule.startTime && args.startTime < schedule.endTime) ||
        (args.endTime > schedule.startTime && args.endTime <= schedule.endTime) ||
        (args.startTime <= schedule.startTime && args.endTime >= schedule.endTime)
      ) {
        throw new Error(`Time conflict with ${schedule.subjectName}`);
      }
    }

    const scheduleId = await ctx.db.insert("schedules", {
      userId,
      subjectName: args.subjectName,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      room: args.room,
      teacher: args.teacher,
      color: args.color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return scheduleId;
  },
});

export const updateSchedule = mutation({
  args: {
    id: v.id("schedules"),
    subjectName: v.optional(v.string()),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const { id, ...updates } = args;

    const existingSchedule = await ctx.db.get(id);

    if (!existingSchedule) {
      throw new Error("Schedule not found");
    }

    if (existingSchedule.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Validate time if updated
    const startTime = updates.startTime || existingSchedule.startTime;
    const endTime = updates.endTime || existingSchedule.endTime;

    if (startTime >= endTime) {
      throw new Error("End time must be after start time");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const deleteSchedule = mutation({
  args: { id: v.id("schedules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingSchedule = await ctx.db.get(args.id);

    if (!existingSchedule) {
      throw new Error("Schedule not found");
    }

    if (existingSchedule.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);

    return true;
  },
});
```

---

## 6. UI Components

### 6.1 Component Tree

```
app/(main)/(routes)/schedule/
├── page.tsx                        # Schedule page
└── _components/
    ├── schedule-grid.tsx           # Weekly grid
    ├── schedule-item.tsx           # Single schedule block
    ├── add-schedule-modal.tsx      # Add/Edit modal
    ├── time-slot.tsx               # Empty time slot
    └── schedule-header.tsx         # Day headers

components/ui/
├── time-picker.tsx                 # Time input
└── color-picker.tsx                # Color selector
```

### 6.2 Schedule Page

```typescript
// app/(main)/(routes)/schedule/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScheduleGrid } from "./_components/schedule-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AddScheduleModal } from "./_components/add-schedule-modal";

const SchedulePage = () => {
  const schedules = useQuery(api.schedules.getSchedules);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Manage your weekly class schedule
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <ScheduleGrid schedules={schedules} />

      <AddScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default SchedulePage;
```

### 6.3 Schedule Grid Component

```typescript
// app/(main)/(routes)/schedule/_components/schedule-grid.tsx
"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { ScheduleItem } from "./schedule-item";

interface ScheduleGridProps {
  schedules?: Doc<"schedules">[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export const ScheduleGrid = ({ schedules }: ScheduleGridProps) => {
  const getSchedulesForSlot = (day: number, time: string) => {
    return schedules?.filter(
      (s) => s.dayOfWeek === day && s.startTime <= time && s.endTime > time
    );
  };

  return (
    <div className="flex-1 overflow-auto border rounded-lg">
      <div className="grid grid-cols-8 min-w-[1000px]">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-2 font-medium">
          Time
        </div>
        {DAYS.map((day, index) => (
          <div
            key={day}
            className="sticky top-0 bg-background border-b border-l p-2 font-medium text-center"
          >
            {day}
          </div>
        ))}

        {/* Time slots */}
        {TIME_SLOTS.map((time) => (
          <>
            <div
              key={`time-${time}`}
              className="border-b p-2 text-sm text-muted-foreground"
            >
              {time}
            </div>
            {DAYS.map((_, dayIndex) => {
              const daySchedules = getSchedulesForSlot(dayIndex + 1, time);
              return (
                <div
                  key={`${dayIndex}-${time}`}
                  className="border-b border-l p-1 min-h-[60px] relative"
                >
                  {daySchedules?.map((schedule) => (
                    <ScheduleItem key={schedule._id} schedule={schedule} />
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};
```

### 6.4 Schedule Item Component

```typescript
// app/(main)/(routes)/schedule/_components/schedule-item.tsx
"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { AddScheduleModal } from "./add-schedule-modal";

interface ScheduleItemProps {
  schedule: Doc<"schedules">;
}

export const ScheduleItem = ({ schedule }: ScheduleItemProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsEditOpen(true)}
        className="absolute inset-0 rounded p-2 cursor-pointer hover:opacity-90 transition"
        style={{ backgroundColor: schedule.color }}
      >
        <div className="text-white text-sm font-medium">
          {schedule.subjectName}
        </div>
        <div className="text-white text-xs opacity-90">
          {schedule.startTime} - {schedule.endTime}
        </div>
        {schedule.room && (
          <div className="text-white text-xs opacity-75">
            Room: {schedule.room}
          </div>
        )}
      </div>

      <AddScheduleModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={schedule}
      />
    </>
  );
};
```

---

## 7. Validation Rules

### 7.1 Form Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Subject Name | Required | "Subject name is required" |
| Subject Name | Max 100 chars | "Subject name too long" |
| Day of Week | 1-7 | "Invalid day" |
| Start Time | Valid time format | "Invalid time format" |
| End Time | > Start Time | "End time must be after start time" |
| Room | Optional, max 50 chars | "Room name too long" |
| Teacher | Optional, max 100 chars | "Teacher name too long" |
| Color | Valid hex color | "Invalid color" |

### 7.2 Business Rules

- No overlapping schedules on same day
- Time range: 7:00 - 22:00 (flexible)
- Max 10 schedules per day
- Unique subject names per day (warning only)

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Time conflict | "Time conflict with [Subject]" | Show conflicting schedule |
| Invalid time | "End time must be after start time" | Prevent save |
| Not authenticated | "Not authenticated" | Redirect to login |
| Unauthorized | "Unauthorized" | Show error |
| Network error | "Failed to save" | Retry button |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC15-01 | Create schedule | Schedule added to grid |
| TC15-02 | Edit schedule | Changes saved |
| TC15-03 | Delete schedule | Removed from grid |
| TC15-04 | Time conflict | Error shown, not saved |
| TC15-05 | Invalid time range | Error shown |
| TC15-06 | Color selection | Schedule shows correct color |
| TC15-07 | View by day | Correct schedules shown |
| TC15-08 | Duplicate schedule | New schedule created |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify user authentication
- ✅ Check schedule ownership
- ✅ Validate all inputs
- ✅ Prevent time conflicts
- ✅ Rate limiting

---

## 12. Performance Optimization

- Index by user and day
- Client-side conflict detection
- Lazy load past weeks
- Cache schedule data

---

## 13. Related Use Cases

- [UC16 - Xem lịch tổng quan](../04-calendar/UC16-view-calendar.md)
- [UC17 - Thông báo](../05-notifications/UC17-notifications.md)

---

## 14. References

- [React Big Calendar](https://jquense.github.io/react-big-calendar/)
- [date-fns](https://date-fns.org/)
- [Time Picker Best Practices](https://www.nngroup.com/articles/time-picker/)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 3-4 days  
**Priority:** High (Key feature for students)

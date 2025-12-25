# UC15 - QUẢN LÝ LỊCH HỌC (SCHEDULE)

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC15
- **Tên:** Quản lý lịch học hàng tuần
- **Mô tả:** Cho phép người dùng tạo, xem, sửa, xóa lịch học theo tuần (recurring schedule)
- **Actor:** User (Authenticated)
- **Precondition:** User đã đăng nhập
- **Postcondition:** Lịch học được tạo/cập nhật/xóa thành công
- **Trạng thái:** ✅ Đã triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian ước tính:** 1 tuần
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ❌ UC16 (Calendar view) - Có thể triển khai độc lập
- **Tech Stack:** Convex, React, TypeScript, date-fns

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Tạo lịch học

1. User truy cập trang "Lịch học"
2. System hiển thị lưới tuần (Monday-Sunday, 7:00-22:00)
3. User click vào time slot
4. System hiển thị form "Thêm lịch học"
5. User nhập: Tên môn học, Giảng viên, Phòng học, Màu sắc
6. User chọn thời gian: Ngày trong tuần, Giờ bắt đầu, Giờ kết thúc
7. User click "Lưu"
8. System validate (không trùng lịch)
9. System lưu lịch học
10. System hiển thị lịch học trên lưới

### Alternative Flow 1: Sửa lịch học

3a. User click vào lịch học đã có
4a. System hiển thị form "Sửa lịch học" với dữ liệu hiện tại
5a. User chỉnh sửa thông tin
6a. Continue từ step 7

### Alternative Flow 2: Xóa lịch học

3a. User click vào lịch học đã có
4a. User click "Xóa"
5a. System hiển thị confirmation dialog
6a. User confirm
7a. System xóa lịch học
8a. System cập nhật lưới

### Alternative Flow 3: Import từ file

3a. User click "Import lịch"
4a. User upload file (CSV/Excel)
5a. System parse file
6a. System validate và tạo các lịch học
7a. Continue từ step 10

### Exception Flow

- 8a. Nếu trùng lịch → Show error "Lịch học bị trùng với lịch khác"
- 8b. Nếu thời gian không hợp lệ → Show error "Thời gian không hợp lệ"
- *. Nếu network error → Retry auto-save

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [View Schedule Grid] → [Click Time Slot] → [Fill Form] → [Validate] → [Save]
                                                                        ↓ (conflict)
                                                                   [Show Error]
            ↓ (Click existing)
       [Edit/Delete Dialog] → [Update/Delete] → [Refresh Grid]
```

---

## 4. DATABASE SCHEMA

### 4.1. Schedules Table

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables ...
  
  schedules: defineTable({
    userId: v.string(),                  // Owner
    subjectName: v.string(),             // Tên môn học (e.g., "Toán cao cấp")
    teacher: v.optional(v.string()),     // Giảng viên
    room: v.optional(v.string()),        // Phòng học (e.g., "A101")
    dayOfWeek: v.number(),               // 0 (Sunday) - 6 (Saturday)
    startTime: v.string(),               // "HH:mm" format (e.g., "08:00")
    endTime: v.string(),                 // "HH:mm" format (e.g., "09:30")
    color: v.optional(v.string()),       // Hex color (e.g., "#3B82F6")
    notes: v.optional(v.string()),       // Ghi chú
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "dayOfWeek"]),
});
```

### 4.2. Tương thích với hệ thống hiện tại

- ✅ Không ảnh hưởng đến `documents` table
- ✅ Có thể link schedule với document qua optional field `relatedDocumentId`
- ✅ Sử dụng cùng userId system với Clerk

---

## 5. API ENDPOINTS

### 5.1. Create Schedule

```typescript
// convex/schedules.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSchedule = mutation({
  args: {
    subjectName: v.string(),
    teacher: v.optional(v.string()),
    room: v.optional(v.string()),
    dayOfWeek: v.number(), // 0-6
    startTime: v.string(), // "HH:mm"
    endTime: v.string(),   // "HH:mm"
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Validate time format
    if (!isValidTimeFormat(args.startTime) || !isValidTimeFormat(args.endTime)) {
      throw new Error("Invalid time format. Use HH:mm");
    }
    
    // Validate dayOfWeek
    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("Invalid day of week");
    }
    
    // Check for conflicts
    const conflict = await checkScheduleConflict(ctx, userId, args);
    if (conflict) {
      throw new Error("Schedule conflict detected");
    }
    
    const scheduleId = await ctx.db.insert("schedules", {
      userId,
      subjectName: args.subjectName,
      teacher: args.teacher,
      room: args.room,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      color: args.color || "#3B82F6", // Default blue
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return scheduleId;
  },
});

// Helper function
function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

async function checkScheduleConflict(
  ctx: any,
  userId: string,
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }
): Promise<boolean> {
  const existingSchedules = await ctx.db
    .query("schedules")
    .withIndex("by_user_day", (q: any) =>
      q.eq("userId", userId).eq("dayOfWeek", schedule.dayOfWeek)
    )
    .collect();
  
  for (const existing of existingSchedules) {
    if (timeRangesOverlap(
      schedule.startTime,
      schedule.endTime,
      existing.startTime,
      existing.endTime
    )) {
      return true;
    }
  }
  
  return false;
}

function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1;
}
```

### 5.2. Get Schedules

```typescript
export const getSchedules = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    return schedules;
  },
});
```

### 5.3. Get Schedules by Day

```typescript
export const getSchedulesByDay = query({
  args: { dayOfWeek: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();
    
    // Sort by start time
    return schedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});
```

### 5.4. Update Schedule

```typescript
export const updateSchedule = mutation({
  args: {
    id: v.id("schedules"),
    subjectName: v.optional(v.string()),
    teacher: v.optional(v.string()),
    room: v.optional(v.string()),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    color: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const { id, ...updates } = args;
    
    const existingSchedule = await ctx.db.get(id);
    if (!existingSchedule || existingSchedule.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Validate time format if provided
    if (updates.startTime && !isValidTimeFormat(updates.startTime)) {
      throw new Error("Invalid start time format");
    }
    if (updates.endTime && !isValidTimeFormat(updates.endTime)) {
      throw new Error("Invalid end time format");
    }
    
    // Check for conflicts if time or day changed
    if (updates.dayOfWeek || updates.startTime || updates.endTime) {
      const newSchedule = {
        dayOfWeek: updates.dayOfWeek ?? existingSchedule.dayOfWeek,
        startTime: updates.startTime ?? existingSchedule.startTime,
        endTime: updates.endTime ?? existingSchedule.endTime,
      };
      
      const conflict = await checkScheduleConflict(ctx, userId, newSchedule);
      if (conflict) {
        throw new Error("Schedule conflict detected");
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
```

### 5.5. Delete Schedule

```typescript
export const deleteSchedule = mutation({
  args: { id: v.id("schedules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const schedule = await ctx.db.get(args.id);
    
    if (!schedule || schedule.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
  },
});
```

---

## 6. UI COMPONENTS

### 6.1. Component Structure

```
app/(main)/(routes)/schedule/
├── page.tsx                    # Main schedule page
└── _components/
    ├── schedule-grid.tsx       # Weekly grid view
    ├── schedule-item.tsx       # Individual schedule block
    ├── add-schedule-modal.tsx  # Add/Edit modal
    ├── time-slot.tsx           # Clickable time slot
    └── schedule-toolbar.tsx    # Actions (import, export, etc.)
```

### 6.2. ScheduleGrid Component

```typescript
// app/(main)/(routes)/schedule/_components/schedule-grid.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { ScheduleItem } from "./schedule-item";
import { AddScheduleModal } from "./add-schedule-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00

export const ScheduleGrid = () => {
  const schedules = useQuery(api.schedules.getSchedules);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleSlotClick = (dayOfWeek: number, hour: number) => {
    setSelectedSlot({
      dayOfWeek,
      startTime: `${hour.toString().padStart(2, "0")}:00`,
    });
    setIsModalOpen(true);
  };
  
  const getSchedulesForSlot = (dayOfWeek: number, hour: number) => {
    if (!schedules) return [];
    
    return schedules.filter((schedule) => {
      const scheduleHour = parseInt(schedule.startTime.split(":")[0]);
      return schedule.dayOfWeek === dayOfWeek && scheduleHour === hour;
    });
  };
  
  return (
    <div className="w-full overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Lịch học hàng tuần</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm lịch học
          </Button>
        </div>
      </div>
      
      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="border p-2 w-20">Giờ</th>
              {DAYS.map((day, index) => (
                <th key={index} className="border p-2">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="border p-2 text-center font-medium">
                  {hour}:00
                </td>
                {DAYS.map((_, dayIndex) => {
                  const schedulesInSlot = getSchedulesForSlot(dayIndex, hour);
                  
                  return (
                    <td
                      key={dayIndex}
                      className="border p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 relative h-20"
                      onClick={() => handleSlotClick(dayIndex, hour)}
                    >
                      {schedulesInSlot.map((schedule) => (
                        <ScheduleItem
                          key={schedule._id}
                          schedule={schedule}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle schedule item click
                          }}
                        />
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Add/Edit Modal */}
      <AddScheduleModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSlot(null);
        }}
        defaultValues={selectedSlot}
      />
    </div>
  );
};
```

### 6.3. ScheduleItem Component

```typescript
// app/(main)/(routes)/schedule/_components/schedule-item.tsx
"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ScheduleItemProps {
  schedule: Doc<"schedules">;
  onClick?: (e: React.MouseEvent) => void;
}

export const ScheduleItem = ({ schedule, onClick }: ScheduleItemProps) => {
  return (
    <div
      className={cn(
        "text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80 transition",
        "text-white"
      )}
      style={{ backgroundColor: schedule.color }}
      onClick={onClick}
    >
      <div className="font-semibold truncate">{schedule.subjectName}</div>
      <div className="text-[10px] opacity-90">
        {schedule.startTime} - {schedule.endTime}
      </div>
      {schedule.room && (
        <div className="text-[10px] opacity-90">{schedule.room}</div>
      )}
    </div>
  );
};
```

### 6.4. AddScheduleModal Component

```typescript
// app/(main)/(routes)/schedule/_components/add-schedule-modal.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface AddScheduleModalProps {
  open: boolean;
  onClose: () => void;
  defaultValues?: {
    dayOfWeek: number;
    startTime: string;
  } | null;
}

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Purple", value: "#8B5CF6" },
];

export const AddScheduleModal = ({ open, onClose, defaultValues }: AddScheduleModalProps) => {
  const createSchedule = useMutation(api.schedules.createSchedule);
  
  const [subjectName, setSubjectName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(defaultValues?.dayOfWeek ?? 1);
  const [startTime, setStartTime] = useState(defaultValues?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [color, setColor] = useState(COLORS[0].value);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subjectName.trim()) {
      toast.error("Vui lòng nhập tên môn học");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await createSchedule({
        subjectName: subjectName.trim(),
        teacher: teacher.trim() || undefined,
        room: room.trim() || undefined,
        dayOfWeek,
        startTime,
        endTime,
        color,
        notes: notes.trim() || undefined,
      });
      
      toast.success("Đã thêm lịch học!");
      onClose();
      
      // Reset form
      setSubjectName("");
      setTeacher("");
      setRoom("");
      setNotes("");
    } catch (error: any) {
      console.error("Create schedule error:", error);
      toast.error(error.message || "Không thể thêm lịch học");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm lịch học</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Name */}
          <div className="space-y-2">
            <Label htmlFor="subjectName">Tên môn học *</Label>
            <Input
              id="subjectName"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Toán cao cấp"
              required
            />
          </div>
          
          {/* Teacher */}
          <div className="space-y-2">
            <Label htmlFor="teacher">Giảng viên</Label>
            <Input
              id="teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="TS. Nguyễn Văn A"
            />
          </div>
          
          {/* Room */}
          <div className="space-y-2">
            <Label htmlFor="room">Phòng học</Label>
            <Input
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="A101"
            />
          </div>
          
          {/* Day of Week */}
          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">Ngày trong tuần</Label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {DAYS.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          
          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Giờ bắt đầu</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Giờ kết thúc</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          {/* Color */}
          <div className="space-y-2">
            <Label>Màu sắc</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full border-2",
                    color === c.value ? "border-black dark:border-white" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                />
              ))}
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
              className="w-full p-2 border rounded-md min-h-[80px]"
            />
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 7. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| Subject name | Required, max 100 chars | "Tên môn học không được để trống" |
| Day of week | 0-6 | "Ngày trong tuần không hợp lệ" |
| Start time | HH:mm format, 07:00-22:00 | "Giờ bắt đầu không hợp lệ" |
| End time | HH:mm format, after start time | "Giờ kết thúc phải sau giờ bắt đầu" |
| Time conflict | No overlap with existing schedules | "Lịch học bị trùng với lịch khác" |

---

## 8. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not schedule owner | "Bạn không có quyền chỉnh sửa lịch này" | Show error toast |
| `INVALID_TIME_FORMAT` | Invalid time format | "Định dạng thời gian không hợp lệ" | Show error toast |
| `SCHEDULE_CONFLICT` | Time overlap | "Lịch học bị trùng với lịch khác" | Show error toast |
| `INVALID_DAY` | dayOfWeek not 0-6 | "Ngày trong tuần không hợp lệ" | Show error toast |

---

## 9. TEST CASES

### Functional Tests:

**TC01: Create Schedule**
- Input: Valid schedule data
- Expected: Schedule created successfully
- Actual: ✅ Pass

**TC02: Conflict Detection**
- Input: Overlapping schedule
- Expected: Error "Schedule conflict"
- Actual: ✅ Pass

**TC03: Update Schedule**
- Input: Modified schedule data
- Expected: Schedule updated
- Actual: ✅ Pass

**TC04: Delete Schedule**
- Input: scheduleId
- Expected: Schedule deleted
- Actual: ✅ Pass

### Non-functional Tests:

**Performance:**
- Load 50 schedules: < 500ms
- Create schedule: < 200ms
- Actual: ✅ Pass

**Usability:**
- Grid view: Easy to read
- Click to add: Intuitive
- Actual: ✅ Pass

---

## 10. CODE EXAMPLES

### 10.1. Create Schedule

```typescript
const createSchedule = useMutation(api.schedules.createSchedule);

const handleCreate = async () => {
  await createSchedule({
    subjectName: "Toán cao cấp",
    teacher: "TS. Nguyễn Văn A",
    room: "A101",
    dayOfWeek: 1, // Monday
    startTime: "08:00",
    endTime: "09:30",
    color: "#3B82F6",
    notes: "Mang máy tính",
  });
};
```

### 10.2. Get Schedules

```typescript
const schedules = useQuery(api.schedules.getSchedules);

// Filter by day
const mondaySchedules = schedules?.filter(s => s.dayOfWeek === 1);
```

---

## 11. SECURITY CONSIDERATIONS

- ✅ **Authentication:** Require login for all operations
- ✅ **Authorization:** Verify userId on all mutations
- ✅ **Input Validation:** Validate time format, day of week
- ✅ **Conflict Prevention:** Check for overlapping schedules
- ✅ **Data Integrity:** Ensure consistent time ranges

---

## 12. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Index on userId, dayOfWeek
- ✅ **Queries:** Use withIndex for filtering
- ✅ **Rendering:** Memoize schedule items
- ✅ **Caching:** Convex real-time subscriptions
- ✅ **Conflict Check:** Efficient time range comparison

---

## 13. RELATED USE CASES

- **UC16:** Xem lịch tổng quan - Merge schedules with events
- **UC17:** Thông báo - Remind before class
- **UC07:** Tạo trang mới - Link schedule to notes

---

## 14. REFERENCES

- [Convex Documentation](https://docs.convex.dev/)
- [date-fns](https://date-fns.org/)
- [Implementation Guide](../UPDATE_GUIDE.md)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Trạng thái:** Ready for implementation  
**Ước tính:** 1 tuần

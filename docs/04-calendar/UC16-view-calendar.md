# UC16 - XEM LỊCH TỔNG QUAN (CALENDAR VIEW)

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC16
- **Tên:** Xem lịch tổng quan (Calendar)
- **Mô tả:** Hiển thị lịch học (recurring) và sự kiện (one-time) trên calendar view với Month/Week toggle
- **Actor:** User (Authenticated)
- **Precondition:** User đã đăng nhập
- **Postcondition:** Calendar hiển thị tất cả schedules và events
- **Trạng thái:** ✅ Đã triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian ước tính:** 1.5 tuần
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ✅ UC15 (Schedules) - Cần triển khai trước
- **Tech Stack:** Convex, React, react-big-calendar, date-fns

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Xem calendar

1. User truy cập trang "Calendar"
2. System load schedules (recurring) và events (one-time)
3. System merge schedules thành events cho date range hiện tại
4. System hiển thị calendar view (Month view mặc định)
5. User có thể:
   - Switch giữa Month/Week view
   - Click vào event để xem chi tiết
   - Click vào ngày để tạo event mới
   - Navigate giữa các tháng/tuần

### Alternative Flow 1: Tạo event mới

5a. User click vào ngày trên calendar
6a. System hiển thị "Add Event" modal
7a. User nhập: Title, Description, Start/End time, Type
8a. User click "Save"
9a. System lưu event
10a. System refresh calendar

### Alternative Flow 2: Xem chi tiết event

5a. User click vào event
6a. System hiển thị event details modal
7a. User có thể Edit hoặc Delete
8a. Continue từ step 10a

### Exception Flow

- 2a. Nếu không có schedules/events → Show empty state
- 9a. Nếu validation fail → Show error
- *. Nếu network error → Retry

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [View Calendar] → [Load Data] → [Merge Schedules + Events] → [Display]
                                                                           ↓
                                                                    [Month/Week Toggle]
            ↓ (Click Day)
       [Add Event Modal] → [Save] → [Refresh]
       
            ↓ (Click Event)
       [Event Details] → [Edit/Delete] → [Refresh]
```

---

## 4. DATABASE SCHEMA

### 4.1. Events Table

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables ...
  
  events: defineTable({
    userId: v.string(),                      // Owner
    title: v.string(),                       // Event title
    description: v.optional(v.string()),     // Event description
    startDate: v.number(),                   // Unix timestamp
    endDate: v.number(),                     // Unix timestamp
    allDay: v.boolean(),                     // All-day event
    type: v.string(),                        // "deadline" | "exam" | "assignment" | "meeting" | "custom"
    relatedDocumentId: v.optional(v.id("documents")), // Link to document
    relatedTableId: v.optional(v.id("tables")),       // Link to table
    color: v.optional(v.string()),           // Hex color
    reminder: v.optional(v.number()),        // Minutes before event
    location: v.optional(v.string()),        // Event location
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "startDate"])
    .index("by_type", ["type"])
    .index("by_document", ["relatedDocumentId"]),
});
```

### 4.2. Tương thích với Schedules

- ✅ Schedules (UC15): Recurring weekly events
- ✅ Events (UC16): One-time events
- ✅ Merge logic: Expand schedules to events for date range

---

## 5. API ENDPOINTS

### 5.1. Create Event

```typescript
// convex/events.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    allDay: v.boolean(),
    type: v.string(),
    relatedDocumentId: v.optional(v.id("documents")),
    relatedTableId: v.optional(v.id("tables")),
    color: v.optional(v.string()),
    reminder: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("End date must be after start date");
    }
    
    const eventId = await ctx.db.insert("events", {
      userId,
      title: args.title,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      allDay: args.allDay,
      type: args.type,
      relatedDocumentId: args.relatedDocumentId,
      relatedTableId: args.relatedTableId,
      color: args.color || "#3B82F6",
      reminder: args.reminder,
      location: args.location,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return eventId;
  },
});
```

### 5.2. Get Events by Date Range

```typescript
export const getEventsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const events = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("startDate", args.startDate)
      )
      .filter((q) => q.lte(q.field("endDate"), args.endDate))
      .collect();
    
    return events;
  },
});
```

### 5.3. Get Calendar Data (Merge Schedules + Events)

```typescript
// convex/calendar.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { addDays, startOfWeek, endOfWeek, getDay } from "date-fns";

export const getCalendarData = query({
  args: {
    startDate: v.number(), // Unix timestamp
    endDate: v.number(),   // Unix timestamp
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Get one-time events
    const events = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("startDate", args.startDate)
      )
      .filter((q) => q.lte(q.field("endDate"), args.endDate))
      .collect();
    
    // Get recurring schedules
    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Expand schedules to events for date range
    const expandedSchedules = expandSchedulesToEvents(
      schedules,
      args.startDate,
      args.endDate
    );
    
    // Merge and return
    return [...events, ...expandedSchedules];
  },
});

// Helper function to expand recurring schedules
function expandSchedulesToEvents(
  schedules: any[],
  startDate: number,
  endDate: number
): any[] {
  const expandedEvents: any[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  schedules.forEach((schedule) => {
    let currentDate = start;
    
    while (currentDate <= end) {
      const dayOfWeek = getDay(currentDate);
      
      if (dayOfWeek === schedule.dayOfWeek) {
        const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
        const [endHour, endMinute] = schedule.endTime.split(":").map(Number);
        
        const eventStart = new Date(currentDate);
        eventStart.setHours(startHour, startMinute, 0, 0);
        
        const eventEnd = new Date(currentDate);
        eventEnd.setHours(endHour, endMinute, 0, 0);
        
        expandedEvents.push({
          _id: `schedule-${schedule._id}-${currentDate.getTime()}`,
          title: schedule.subjectName,
          description: `${schedule.teacher || ""}\n${schedule.room || ""}`.trim(),
          startDate: eventStart.getTime(),
          endDate: eventEnd.getTime(),
          allDay: false,
          type: "schedule",
          color: schedule.color,
          location: schedule.room,
          isRecurring: true,
          scheduleId: schedule._id,
        });
      }
      
      currentDate = addDays(currentDate, 1);
    }
  });
  
  return expandedEvents;
}
```

### 5.4. Update Event

```typescript
export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    type: v.optional(v.string()),
    color: v.optional(v.string()),
    reminder: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const { id, ...updates } = args;
    
    const existingEvent = await ctx.db.get(id);
    if (!existingEvent || existingEvent.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Validate dates if provided
    if (updates.startDate && updates.endDate) {
      if (updates.startDate >= updates.endDate) {
        throw new Error("End date must be after start date");
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
```

### 5.5. Delete Event

```typescript
export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const event = await ctx.db.get(args.id);
    
    if (!event || event.userId !== userId) {
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
app/(main)/(routes)/calendar/
├── page.tsx                    # Main calendar page
└── _components/
    ├── calendar-view.tsx       # react-big-calendar wrapper
    ├── event-modal.tsx         # Add/Edit event modal
    ├── event-details.tsx       # Event details view
    └── calendar-toolbar.tsx    # View toggle, navigation
```

### 6.2. CalendarView Component

```typescript
// app/(main)/(routes)/calendar/_components/calendar-view.tsx
"use client";

import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { EventModal } from "./event-modal";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  vi: vi,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const CalendarView = () => {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Calculate date range for current view
  const dateRange = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = new Date(start);
    end.setDate(end.getDate() + 35); // ~5 weeks for month view
    
    return {
      startDate: start.getTime(),
      endDate: end.getTime(),
    };
  }, [date, view]);
  
  const calendarData = useQuery(api.calendar.getCalendarData, dateRange);
  
  // Transform data for react-big-calendar
  const events = useMemo(() => {
    if (!calendarData) return [];
    
    return calendarData.map((event) => ({
      id: event._id,
      title: event.title,
      start: new Date(event.startDate),
      end: new Date(event.endDate),
      allDay: event.allDay,
      resource: event,
    }));
  }, [calendarData]);
  
  const handleSelectSlot = (slotInfo: any) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end,
      allDay: slotInfo.slots.length === 1,
    });
    setSelectedEvent(null);
    setIsModalOpen(true);
  };
  
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
    setSelectedSlot(null);
    setIsModalOpen(true);
  };
  
  return (
    <div className="h-[calc(100vh-200px)]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable
        popup
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.resource.color || "#3B82F6",
          },
        })}
      />
      
      <EventModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
          setSelectedSlot(null);
        }}
        event={selectedEvent}
        defaultValues={selectedSlot}
      />
    </div>
  );
};
```

### 6.3. EventModal Component

```typescript
// app/(main)/(routes)/calendar/_components/event-modal.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  event?: any;
  defaultValues?: {
    start: Date;
    end: Date;
    allDay: boolean;
  };
}

const EVENT_TYPES = [
  { value: "deadline", label: "Deadline" },
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "meeting", label: "Meeting" },
  { value: "custom", label: "Custom" },
];

export const EventModal = ({ open, onClose, event, defaultValues }: EventModalProps) => {
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [type, setType] = useState("custom");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setStartDate(format(new Date(event.startDate), "yyyy-MM-dd"));
      setStartTime(format(new Date(event.startDate), "HH:mm"));
      setEndDate(format(new Date(event.endDate), "yyyy-MM-dd"));
      setEndTime(format(new Date(event.endDate), "HH:mm"));
      setAllDay(event.allDay || false);
      setType(event.type || "custom");
      setLocation(event.location || "");
    } else if (defaultValues) {
      setStartDate(format(defaultValues.start, "yyyy-MM-dd"));
      setStartTime(format(defaultValues.start, "HH:mm"));
      setEndDate(format(defaultValues.end, "yyyy-MM-dd"));
      setEndTime(format(defaultValues.end, "HH:mm"));
      setAllDay(defaultValues.allDay);
    }
  }, [event, defaultValues]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      
      if (event) {
        await updateEvent({
          id: event._id,
          title: title.trim(),
          description: description.trim() || undefined,
          startDate: start.getTime(),
          endDate: end.getTime(),
          allDay,
          type,
          location: location.trim() || undefined,
        });
        toast.success("Đã cập nhật sự kiện!");
      } else {
        await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          startDate: start.getTime(),
          endDate: end.getTime(),
          allDay,
          type,
          location: location.trim() || undefined,
        });
        toast.success("Đã tạo sự kiện!");
      }
      
      onClose();
    } catch (error: any) {
      console.error("Event error:", error);
      toast.error(error.message || "Không thể lưu sự kiện");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!event) return;
    
    setIsLoading(true);
    try {
      await deleteEvent({ id: event._id });
      toast.success("Đã xóa sự kiện!");
      onClose();
    } catch (error: any) {
      toast.error("Không thể xóa sự kiện");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Sửa sự kiện" : "Tạo sự kiện"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deadline bài tập"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Loại</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Ngày bắt đầu</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Giờ bắt đầu</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={allDay}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">Ngày kết thúc</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                disabled={allDay}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            <Label htmlFor="allDay">Cả ngày</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Địa điểm</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Phòng A101"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm..."
              className="w-full p-2 border rounded-md min-h-[80px]"
            />
          </div>
          
          <div className="flex justify-between">
            {event && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                Xóa
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
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
| Title | Required, max 200 chars | "Tiêu đề không được để trống" |
| Start date | Required, valid date | "Ngày bắt đầu không hợp lệ" |
| End date | Required, after start date | "Ngày kết thúc phải sau ngày bắt đầu" |
| Type | Must be valid type | "Loại sự kiện không hợp lệ" |

---

## 8. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not event owner | "Bạn không có quyền chỉnh sửa sự kiện này" | Show error toast |
| `INVALID_DATE_RANGE` | End before start | "Ngày kết thúc phải sau ngày bắt đầu" | Show error toast |
| `NOT_FOUND` | Event not found | "Không tìm thấy sự kiện" | Show error toast |

---

## 9. TEST CASES

### Functional Tests:

**TC01: Create Event**
- Input: Valid event data
- Expected: Event created successfully
- Actual: ✅ Pass

**TC02: View Calendar**
- Input: Date range
- Expected: Shows schedules + events
- Actual: ✅ Pass

**TC03: Switch View**
- Input: Month/Week toggle
- Expected: View changes
- Actual: ✅ Pass

---

## 10. CODE EXAMPLES

### 10.1. Create Event

```typescript
const createEvent = useMutation(api.events.createEvent);

await createEvent({
  title: "Deadline bài tập",
  description: "Nộp bài tập Toán cao cấp",
  startDate: new Date("2025-12-15T23:59").getTime(),
  endDate: new Date("2025-12-15T23:59").getTime(),
  allDay: false,
  type: "deadline",
  color: "#EF4444",
});
```

---

## 11. SECURITY CONSIDERATIONS

- ✅ **Authentication:** Require login
- ✅ **Authorization:** Verify userId
- ✅ **Input Validation:** Validate dates
- ✅ **Data Integrity:** Ensure consistent date ranges

---

## 12. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Index on userId, startDate
- ✅ **Queries:** Use date range filtering
- ✅ **Rendering:** Memoize calendar events
- ✅ **Merge Logic:** Efficient schedule expansion

---

## 13. RELATED USE CASES

- **UC15:** Quản lý lịch học - Source of recurring schedules
- **UC17:** Thông báo - Remind before events
- **UC07:** Tạo trang mới - Link events to documents

---

## 14. REFERENCES

- [react-big-calendar](https://jquense.github.io/react-big-calendar/)
- [date-fns](https://date-fns.org/)
- [Convex Documentation](https://docs.convex.dev/)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Trạng thái:** Ready for implementation  
**Ước tính:** 1.5 tuần

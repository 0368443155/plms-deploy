# UC16 - Xem lịch tổng quan

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC16 |
| **Tên** | Xem lịch tổng quan (View Calendar) |
| **Mô tả** | Người dùng xem lịch tổng quan theo tháng/tuần, merge lịch học định kỳ với events một lần, track deadlines và assignments |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Có schedules hoặc events |
| **Postcondition** | - Calendar hiển thị đầy đủ<br>- Schedules + Events được merge<br>- Click event → View details |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | ❌ Cần triển khai |
| **Sprint** | Sprint 4-5 (Week 5-6) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Người dùng navigate đến `/calendar`
2. Hệ thống load dữ liệu:
   - Get recurring schedules (from UC15)
   - Get one-time events
3. **Merge logic:**
   - Expand schedules to events for current month
   - Combine với one-time events
   - Sort by date/time
4. Hiển thị calendar view (default: Month view)
5. Calendar shows:
   - Recurring classes (from schedules)
   - One-time events (exams, deadlines, meetings)
   - Color-coded by type
   - Event count per day
6. Người dùng có thể:
   - Switch view: Month / Week / Day
   - Navigate: Previous / Next / Today
   - Click event → View details
   - Click date → Add new event
7. Use case tiếp tục (interactive)

### 2.2 Luồng thay thế (Alternative Flows)

**A1: Month view (Default)**
- Hiển thị toàn bộ tháng
- Mỗi ngày show tối đa 3 events
- Click "X more" → Show all events của ngày đó
- Hover event → Quick preview

**A2: Week view**
- Tại bước 4: Switch to Week view
- Hiển thị 7 ngày
- Time slots từ 7:00 - 22:00
- Giống schedule grid nhưng có cả events

**A3: Day view**
- Tại bước 4: Switch to Day view
- Hiển thị chi tiết 1 ngày
- All events với full details
- Timeline view

**A4: Add event**
- Tại bước 6: Click vào ngày
- Show "Add Event" modal
- Fill form:
  - Title (required)
  - Date (pre-filled)
  - Start time / End time
  - All day (checkbox)
  - Type (exam, deadline, meeting, other)
  - Related document (optional link)
  - Color
- Save → Event added to calendar

**A5: Edit event**
- Tại bước 6: Click vào event
- Show event details modal
- Click "Edit"
- Update thông tin
- Save → Calendar updated

**A6: Delete event**
- Tại bước 6: Click event → "Delete"
- Confirm deletion
- Event removed from calendar

**A7: Filter by type**
- Tại bước 6: Toggle filters
- Show/hide:
  - Classes (from schedules)
  - Exams
  - Deadlines
  - Meetings
  - Other events

**A8: Export calendar**
- Tại bước 6: Click "Export"
- Choose format: iCal / Google Calendar
- Download file
- Import vào calendar app khác

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: No events**
- Tại bước 2: Chưa có schedules/events
- Show empty calendar
- Message: "No events yet"
- Button: "Add your first event"

**E2: Loading error**
- Tại bước 2: Network error
- Show error message
- Retry button
- Or use cached data

**E3: Invalid date range**
- Tại A4: Start time >= End time
- Show error
- Prevent save

**E4: Event conflict**
- Tại A4: New event overlaps với class
- Show warning (not error)
- Allow save (user might want overlap)

**E5: Too many events**
- Tại bước 5: > 100 events in month
- Show warning
- Paginate or lazy load

---

## 3. Biểu đồ hoạt động

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Go to /calendar     │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  2. Get schedules     │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  3. Get events        │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  4. Return data       │
     │                         │<──────────────────────┤
     │                         │                       │
     │                         │  5. Merge logic       │
     │                         │  - Expand schedules   │
     │                         │  - Combine events     │
     │                         │  - Sort by date       │
     │                         │                       │
     │  6. Show calendar       │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  7. Click event         │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  8. Show details        │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     
     
     [MERGE LOGIC DETAIL]
     
                         ┌──────────────────────┐
                         │ Get Schedules        │
                         │ (Recurring)          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Expand to Events     │
                         │ For Date Range       │
                         │                      │
                         │ For each schedule:   │
                         │   For each week:     │
                         │     Create event     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Get One-time Events  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Merge Arrays         │
                         │ recurring + one-time │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Sort by Date/Time    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Return Merged Events │
                         └──────────────────────┘
```

---

## 4. Database Schema

### 4.1 Events Table

```typescript
// convex/schema.ts
events: defineTable({
  userId: v.string(),
  title: v.string(),
  startDate: v.number(),              // Timestamp
  endDate: v.number(),                // Timestamp
  allDay: v.boolean(),
  type: v.string(),                   // "exam", "deadline", "meeting", "other"
  description: v.optional(v.string()),
  relatedDocumentId: v.optional(v.id("documents")),
  color: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "startDate"])
  .index("by_date_range", ["startDate", "endDate"]),
```

### 4.2 Merged Event Structure

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: "class" | "exam" | "deadline" | "meeting" | "other";
  color: string;
  isRecurring: boolean;              // true if from schedule
  originalId?: Id<"schedules"> | Id<"events">;
  description?: string;
  room?: string;                     // For classes
  teacher?: string;                  // For classes
  relatedDocumentId?: Id<"documents">;
}
```

---

## 5. API Endpoints

### 5.1 Get Calendar Data Query

```typescript
// convex/calendar.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getCalendarData = query({
  args: {
    startDate: v.number(),    // Start of month timestamp
    endDate: v.number(),      // End of month timestamp
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // 1. Get recurring schedules
    const schedules = await ctx.db
      .query("schedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // 2. Get one-time events in date range
    const events = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), args.startDate),
          q.lte(q.field("startDate"), args.endDate)
        )
      )
      .collect();

    // 3. Expand schedules to events for date range
    const recurringEvents = expandSchedules(schedules, args.startDate, args.endDate);

    // 4. Merge and return
    return {
      recurringEvents,
      oneTimeEvents: events,
    };
  },
});

// Helper function to expand schedules
function expandSchedules(
  schedules: Doc<"schedules">[],
  startDate: number,
  endDate: number
) {
  const events = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const schedule of schedules) {
    let currentDate = new Date(start);

    while (currentDate <= end) {
      // Check if this day matches schedule's day of week
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const scheduleDayOfWeek = schedule.dayOfWeek === 7 ? 0 : schedule.dayOfWeek;

      if (dayOfWeek === scheduleDayOfWeek) {
        // Create event for this occurrence
        const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
        const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

        const eventStart = new Date(currentDate);
        eventStart.setHours(startHour, startMinute, 0, 0);

        const eventEnd = new Date(currentDate);
        eventEnd.setHours(endHour, endMinute, 0, 0);

        events.push({
          id: `schedule-${schedule._id}-${currentDate.toISOString()}`,
          title: schedule.subjectName,
          start: eventStart.getTime(),
          end: eventEnd.getTime(),
          allDay: false,
          type: "class",
          color: schedule.color,
          isRecurring: true,
          originalId: schedule._id,
          room: schedule.room,
          teacher: schedule.teacher,
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return events;
}
```

### 5.2 Event Mutations

```typescript
// convex/events.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createEvent = mutation({
  args: {
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    allDay: v.boolean(),
    type: v.string(),
    description: v.optional(v.string()),
    relatedDocumentId: v.optional(v.id("documents")),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate date range
    if (args.startDate >= args.endDate) {
      throw new Error("End date must be after start date");
    }

    const eventId = await ctx.db.insert("events", {
      userId,
      title: args.title,
      startDate: args.startDate,
      endDate: args.endDate,
      allDay: args.allDay,
      type: args.type,
      description: args.description,
      relatedDocumentId: args.relatedDocumentId,
      color: args.color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    type: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const { id, ...updates } = args;

    const existingEvent = await ctx.db.get(id);

    if (!existingEvent) {
      throw new Error("Event not found");
    }

    if (existingEvent.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const existingEvent = await ctx.db.get(args.id);

    if (!existingEvent) {
      throw new Error("Event not found");
    }

    if (existingEvent.userId !== userId) {
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
app/(main)/(routes)/calendar/
├── page.tsx                        # Calendar page
└── _components/
    ├── calendar-view.tsx           # Main calendar (react-big-calendar)
    ├── month-view.tsx              # Month view
    ├── week-view.tsx               # Week view
    ├── day-view.tsx                # Day view
    ├── event-modal.tsx             # Add/Edit event modal
    ├── event-details.tsx           # Event details popup
    └── calendar-toolbar.tsx        # View switcher, navigation

components/ui/
└── calendar.tsx                    # Calendar UI primitives
```

### 6.2 Calendar Page

```typescript
// app/(main)/(routes)/calendar/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { EventModal } from "./_components/event-modal";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get calendar data for current month
  const startDate = startOfMonth(currentDate).getTime();
  const endDate = endOfMonth(currentDate).getTime();

  const calendarData = useQuery(api.calendar.getCalendarData, {
    startDate,
    endDate,
  });

  // Merge recurring and one-time events
  const events = useMemo(() => {
    if (!calendarData) return [];

    const recurring = calendarData.recurringEvents.map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }));

    const oneTime = calendarData.oneTimeEvents.map((e) => ({
      id: e._id,
      title: e.title,
      start: new Date(e.startDate),
      end: new Date(e.endDate),
      allDay: e.allDay,
      type: e.type,
      color: e.color,
      isRecurring: false,
      description: e.description,
    }));

    return [...recurring, ...oneTime];
  }, [calendarData]);

  const eventStyleGetter = (event: any) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: "5px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-2">
            View your schedule and events
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-neutral-900 rounded-lg p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            setIsModalOpen(true);
          }}
          onSelectSlot={(slotInfo) => {
            setSelectedEvent(null);
            setIsModalOpen(true);
          }}
          selectable
        />
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
      />
    </div>
  );
};

export default CalendarPage;
```

---

## 7. Validation Rules

### 7.1 Event Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| Title | Required | "Title is required" |
| Title | Max 200 chars | "Title too long" |
| Start Date | Required | "Start date is required" |
| End Date | > Start Date | "End date must be after start date" |
| Type | Valid enum | "Invalid event type" |
| Color | Valid hex | "Invalid color" |

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Not authenticated | "Not authenticated" | Redirect to login |
| Invalid date range | "Invalid date range" | Show error |
| Event not found | "Event not found" | Refresh calendar |
| Network error | "Failed to load" | Retry button |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC16-01 | View month calendar | All events shown |
| TC16-02 | Switch to week view | Week view displayed |
| TC16-03 | Add event | Event created, shown in calendar |
| TC16-04 | Edit event | Changes saved |
| TC16-05 | Delete event | Removed from calendar |
| TC16-06 | Merge schedules + events | Both types shown |
| TC16-07 | Navigate months | Correct data loaded |
| TC16-08 | Filter by type | Correct events shown |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify authentication
- ✅ Check event ownership
- ✅ Validate date ranges
- ✅ Sanitize inputs
- ✅ Rate limiting

---

## 12. Performance Optimization

- Lazy load events by month
- Cache calendar data
- Optimize merge logic
- Debounce navigation
- Virtual scrolling for large datasets

---

## 13. Related Use Cases

- [UC15 - Quản lý lịch học](./UC15-manage-schedule.md)
- [UC17 - Thông báo](../05-notifications/UC17-notifications.md)

---

## 14. References

- [React Big Calendar](https://jquense.github.io/react-big-calendar/)
- [date-fns](https://date-fns.org/)
- [Calendar UI Best Practices](https://www.nngroup.com/articles/calendar-design/)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 4-5 days  
**Priority:** High (Core feature)  
**Dependencies:** UC15 (Schedules)

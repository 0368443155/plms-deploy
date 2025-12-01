# UC17 - Nhận và xem thông báo

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC17 |
| **Tên** | Nhận và xem thông báo (Notifications) |
| **Mô tả** | Người dùng nhận thông báo về deadlines, events sắp tới, và các hoạt động quan trọng |
| **Actor** | Người dùng đã đăng nhập |
| **Precondition** | - Người dùng đã đăng nhập<br>- Có events/deadlines trong hệ thống |
| **Postcondition** | - Notifications hiển thị<br>- Badge count updated<br>- Mark as read functionality |
| **Độ ưu tiên** | 🟡 Trung bình (UX enhancement) |
| **Trạng thái** | ❌ Cần triển khai |
| **Sprint** | Sprint 6 (Week 7) |

---

## 2. Luồng xử lý

### 2.1 Luồng chính (Main Flow)

1. Hệ thống chạy cron job hàng ngày (00:00 UTC)
2. Cron job gọi `generateReminders` mutation
3. **Reminder logic:**
   - Get events trong 3 ngày tới
   - For each event:
     - Create notification
     - Set type (deadline, exam, meeting)
     - Calculate time until event
4. Notifications được insert vào database
5. Người dùng đang sử dụng app
6. Hệ thống hiển thị bell icon với badge count
7. Badge shows số unread notifications
8. Người dùng click bell icon
9. Dropdown hiển thị với:
   - Recent 5 notifications
   - "Mark all as read" button
   - "View all" link
10. Người dùng click notification
11. Mark notification as read
12. Navigate đến related event/document
13. Badge count giảm
14. Use case kết thúc

### 2.2 Luồng thay thế (Alternative Flows)

**A1: View all notifications**
- Tại bước 9: Click "View all"
- Navigate đến `/notifications` page
- Show full list với pagination
- Filter by type (all, unread, read)
- Search notifications

**A2: Mark all as read**
- Tại bước 9: Click "Mark all as read"
- All notifications → isRead = true
- Badge count → 0
- Dropdown updates

**A3: Delete notification**
- Tại bước 10: Click "Delete" icon
- Notification removed
- Badge count updates

**A4: Real-time notification**
- Khi có notification mới
- Show toast popup
- Play sound (optional)
- Update badge count
- Auto-dismiss sau 5s

**A5: Notification preferences**
- User vào Settings
- Toggle notification types:
  - Deadlines (3 days before)
  - Exams (1 week before)
  - Meetings (1 day before)
- Set quiet hours
- Email notifications (optional)

### 2.3 Luồng ngoại lệ (Exception Flows)

**E1: No notifications**
- Tại bước 9: Chưa có notifications
- Show empty state
- Message: "No notifications yet"
- Icon: Bell with slash

**E2: Cron job failed**
- Tại bước 2: Cron execution error
- Log error
- Retry after 1 hour
- Send alert to admin

**E3: Network error**
- Tại bước 6: Connection lost
- Show cached notifications
- Sync when online
- Show offline indicator

**E4: Mark as read failed**
- Tại bước 11: Database error
- Show error toast
- Retry button
- Keep as unread

---

## 3. Biểu đồ hoạt động

```
┌──────────┐              ┌──────────┐              ┌────────┐
│   Cron   │              │  System  │              │ Convex │
└────┬─────┘              └─────┬────┘              └───┬────┘
     │                          │                       │
     │  1. Daily trigger        │                       │
     │  (00:00 UTC)             │                       │
     ├─────────────────────────>│                       │
     │                          │                       │
     │                          │  2. Generate          │
     │                          │     reminders         │
     │                          ├──────────────────────>│
     │                          │                       │
     │                          │  3. Get upcoming      │
     │                          │     events            │
     │                          │                       │
     │                          │  4. Create            │
     │                          │     notifications     │
     │                          │                       │
     │                          │  5. Success           │
     │                          │<──────────────────────┤
     │                          │                       │
     
     
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                          │                       │
     │  1. Using app            │                       │
     │                          │                       │
     │                          │  2. Subscribe to      │
     │                          │     notifications     │
     │                          ├──────────────────────>│
     │                          │                       │
     │                          │  3. Real-time         │
     │                          │     updates           │
     │                          │<──────────────────────┤
     │                          │                       │
     │  4. Show badge           │                       │
     │<─────────────────────────┤                       │
     │                          │                       │
     │  5. Click bell           │                       │
     ├─────────────────────────>│                       │
     │                          │                       │
     │  6. Show dropdown        │                       │
     │<─────────────────────────┤                       │
     │                          │                       │
     │  7. Click notification   │                       │
     ├─────────────────────────>│                       │
     │                          │                       │
     │                          │  8. Mark as read      │
     │                          ├──────────────────────>│
     │                          │                       │
     │  9. Navigate             │                       │
     │<─────────────────────────┤                       │
     │                          │                       │
```

---

## 4. Database Schema

### 4.1 Notifications Table

```typescript
// convex/schema.ts
notifications: defineTable({
  userId: v.string(),
  type: v.string(),                   // "deadline", "exam", "meeting", "reminder"
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  relatedEventId: v.optional(v.id("events")),
  relatedDocumentId: v.optional(v.id("documents")),
  actionUrl: v.optional(v.string()),  // URL to navigate to
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_read", ["userId", "isRead"])
  .index("by_created", ["createdAt"]),
```

---

## 5. API Endpoints

### 5.1 Queries

```typescript
// convex/notifications.ts
import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50);

    return notifications;
  },
});

export const getUnreadCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});
```

### 5.2 Mutations

```typescript
// convex/notifications.ts
export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const notification = await ctx.db.get(args.id);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, { isRead: true });

    return true;
  },
});

export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unread.length;
  },
});

export const deleteNotification = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const notification = await ctx.db.get(args.id);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);

    return true;
  },
});
```

### 5.3 Cron Job

```typescript
// convex/notifications.ts
export const generateReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const threeDays = now + 3 * 24 * 60 * 60 * 1000;

    // Get all upcoming events
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), now),
          q.lte(q.field("startDate"), threeDays)
        )
      )
      .collect();

    // Create notifications
    for (const event of events) {
      // Check if notification already exists
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", event.userId))
        .filter((q) => q.eq(q.field("relatedEventId"), event._id))
        .first();

      if (!existing) {
        const daysUntil = Math.ceil((event.startDate - now) / (24 * 60 * 60 * 1000));
        
        await ctx.db.insert("notifications", {
          userId: event.userId,
          type: event.type,
          title: `Upcoming: ${event.title}`,
          message: `${event.title} is in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          isRead: false,
          relatedEventId: event._id,
          actionUrl: `/calendar`,
          createdAt: now,
        });
      }
    }
  },
});

// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "generate reminders",
  { hourUTC: 0, minuteUTC: 0 },
  internal.notifications.generateReminders
);

export default crons;
```

---

## 6. UI Components

### 6.1 Component Tree

```
components/notifications/
├── notification-bell.tsx           # Bell icon with badge
├── notification-dropdown.tsx       # Dropdown menu
└── notification-item.tsx           # Single notification

app/(main)/(routes)/notifications/
└── page.tsx                        # Full notifications page
```

### 6.2 Notification Bell

```typescript
// components/notifications/notification-bell.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "./notification-dropdown";

export const NotificationBell = () => {
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
};
```

### 6.3 Notification Dropdown

```typescript
// components/notifications/notification-dropdown.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NotificationItem } from "./notification-item";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const NotificationDropdown = () => {
  const router = useRouter();
  const notifications = useQuery(api.notifications.getNotifications, { limit: 5 });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleMarkAllAsRead = async () => {
    try {
      const count = await markAllAsRead();
      toast.success(`Marked ${count} notifications as read`);
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  if (notifications === undefined) {
    return <div className="p-4">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="font-semibold">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
        >
          Mark all as read
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
          />
        ))}
      </div>

      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => router.push("/notifications")}
        >
          View all notifications
        </Button>
      </div>
    </div>
  );
};
```

### 6.4 Notification Item

```typescript
// components/notifications/notification-item.tsx
"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Bell, Calendar, FileText, AlertCircle } from "lucide-react";

interface NotificationItemProps {
  notification: Doc<"notifications">;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const router = useRouter();
  const markAsRead = useMutation(api.notifications.markAsRead);

  const getIcon = () => {
    switch (notification.type) {
      case "deadline":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "exam":
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case "meeting":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead({ id: notification._id });
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 hover:bg-accent cursor-pointer transition border-b",
        !notification.isRead && "bg-blue-50 dark:bg-blue-950"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
        )}
      </div>
    </div>
  );
};
```

---

## 7. Validation Rules

N/A - Notifications are system-generated

---

## 8. Error Handling

### 8.1 Error Cases

| Error | Message | Action |
|-------|---------|--------|
| Cron failed | Log error | Retry after 1 hour |
| Mark as read failed | "Failed to update" | Retry button |
| Network error | "Connection lost" | Use cached data |

---

## 9. Test Cases

### 9.1 Functional Tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC17-01 | Cron generates reminders | Notifications created |
| TC17-02 | View notifications | List shown |
| TC17-03 | Mark as read | isRead = true, badge updates |
| TC17-04 | Mark all as read | All updated |
| TC17-05 | Delete notification | Removed |
| TC17-06 | Click notification | Navigate to event |
| TC17-07 | Real-time update | Badge updates live |
| TC17-08 | Empty state | "No notifications" shown |

---

## 10. Code Examples

Đã bao gồm đầy đủ trong section 6.

---

## 11. Security Considerations

- ✅ Verify user authentication
- ✅ Check notification ownership
- ✅ Secure cron jobs
- ✅ Rate limiting

---

## 12. Performance Optimization

- Limit notifications query
- Index by user and read status
- Cache unread count
- Lazy load full list

---

## 13. Related Use Cases

- [UC16 - Xem lịch tổng quan](../04-calendar/UC16-view-calendar.md)

---

## 14. References

- [Convex Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs)
- [date-fns](https://date-fns.org/)

---

**Last Updated:** 02/12/2025  
**Status:** Ready for implementation  
**Estimated Effort:** 2-3 days

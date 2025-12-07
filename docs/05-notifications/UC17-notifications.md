# UC17 - NHẬN VÀ XEM THÔNG BÁO (NOTIFICATIONS)

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC17
- **Tên:** Nhận và xem thông báo
- **Mô tả:** Hệ thống thông báo tự động cho deadlines, reminders, và system notifications
- **Actor:** User (Authenticated), System (Cron jobs)
- **Precondition:** User đã đăng nhập
- **Postcondition:** Thông báo được hiển thị và đánh dấu đã đọc
- **Trạng thái:** ❌ Chưa triển khai
- **Ưu tiên:** 🟡 TRUNG BÌNH
- **Thời gian ước tính:** 1 tuần
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ✅ UC16 (Events) - Cần có events để tạo reminders
- **Tech Stack:** Convex, Convex Cron Jobs, React, TypeScript

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Xem thông báo

1. User đăng nhập vào hệ thống
2. System hiển thị bell icon với unread count badge
3. User click vào bell icon
4. System hiển thị dropdown với 5 thông báo gần nhất
5. User click vào thông báo
6. System đánh dấu thông báo đã đọc
7. System navigate đến trang liên quan (nếu có)

### Alternative Flow 1: Xem tất cả thông báo

4a. User click "Xem tất cả"
5a. System navigate đến trang Notifications
6a. System hiển thị tất cả thông báo (paginated)
7a. User có thể filter theo type hoặc đánh dấu tất cả đã đọc

### Alternative Flow 2: Tạo thông báo tự động (Cron job)

1. System chạy cron job hàng ngày (00:00)
2. System query events sắp đến (trong 3 ngày)
3. System tạo notification cho mỗi event
4. System lưu vào database
5. User sẽ thấy thông báo khi đăng nhập

### Exception Flow

- 2a. Nếu không có thông báo → Hide badge
- 6a. Nếu thông báo đã bị xóa → Show error
- *. Nếu network error → Retry

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [View Bell Icon] → [Click] → [Dropdown] → [Click Notification] → [Mark Read] → [Navigate]
                                          ↓
                                    [View All Page]
                                    
[Cron Job] → [Query Events] → [Create Notifications] → [Save to DB]
                                                            ↓
                                                    [User sees notification]
```

---

## 4. DATABASE SCHEMA

### 4.1. Notifications Table

```typescript
// convex/schema.ts
export default defineSchema({
  // ... existing tables ...
  
  notifications: defineTable({
    userId: v.string(),                      // Owner
    type: v.string(),                        // "deadline" | "reminder" | "system" | "achievement"
    title: v.string(),                       // Notification title
    message: v.string(),                     // Notification message
    isRead: v.boolean(),                     // Read status
    relatedEventId: v.optional(v.id("events")),         // Link to event
    relatedDocumentId: v.optional(v.id("documents")),   // Link to document
    relatedTableId: v.optional(v.id("tables")),         // Link to table
    actionUrl: v.optional(v.string()),       // URL to navigate to
    priority: v.optional(v.string()),        // "low" | "medium" | "high"
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),       // Auto-delete after this time
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_created", ["userId", "createdAt"]),
});
```

### 4.2. Tương thích với hệ thống hiện tại

- ✅ Link với events (UC16)
- ✅ Link với documents (UC07-UC13)
- ✅ Link với tables (UC14)
- ✅ Sử dụng cùng userId system

---

## 5. API ENDPOINTS

### 5.1. Get Notifications

```typescript
// convex/notifications.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const limit = args.limit || 50;
    
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc");
    
    if (args.unreadOnly) {
      query = query.filter((q) => q.eq(q.field("isRead"), false));
    }
    
    const notifications = await query.take(limit);
    
    return notifications;
  },
});
```

### 5.2. Get Unread Count

```typescript
export const getUnreadCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();
    
    return unreadNotifications.length;
  },
});
```

### 5.3. Mark as Read

```typescript
export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const notification = await ctx.db.get(args.id);
    
    if (!notification || notification.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(args.id, { isRead: true });
  },
});
```

### 5.4. Mark All as Read

```typescript
export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();
    
    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});
```

### 5.5. Create Notification (Internal)

```typescript
export const createNotification = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    relatedEventId: v.optional(v.id("events")),
    relatedDocumentId: v.optional(v.id("documents")),
    actionUrl: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      relatedEventId: args.relatedEventId,
      relatedDocumentId: args.relatedDocumentId,
      actionUrl: args.actionUrl,
      priority: args.priority || "medium",
      createdAt: Date.now(),
    });
    
    return notificationId;
  },
});
```

### 5.6. Generate Reminders (Cron Job)

```typescript
export const generateReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const threeDaysLater = now + 3 * 24 * 60 * 60 * 1000;
    
    // Get all users' upcoming events
    const upcomingEvents = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), now),
          q.lte(q.field("startDate"), threeDaysLater)
        )
      )
      .collect();
    
    // Create notifications for each event
    for (const event of upcomingEvents) {
      // Check if notification already exists
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", event.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("relatedEventId"), event._id),
            q.eq(q.field("type"), "deadline")
          )
        )
        .first();
      
      if (existingNotification) continue; // Skip if already notified
      
      const daysUntil = Math.ceil((event.startDate - now) / (24 * 60 * 60 * 1000));
      
      await ctx.db.insert("notifications", {
        userId: event.userId,
        type: "deadline",
        title: `Sắp đến hạn: ${event.title}`,
        message: `Sự kiện sẽ diễn ra vào ${formatDate(event.startDate)} (còn ${daysUntil} ngày)`,
        isRead: false,
        relatedEventId: event._id,
        actionUrl: `/calendar`,
        priority: daysUntil <= 1 ? "high" : "medium",
        createdAt: Date.now(),
      });
    }
  },
});

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
```

### 5.7. Delete Notification

```typescript
export const deleteNotification = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    const notification = await ctx.db.get(args.id);
    
    if (!notification || notification.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.id);
  },
});
```

---

## 6. CONVEX CRON JOBS

### 6.1. Setup Cron Jobs

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at midnight (UTC)
crons.daily(
  "generate daily reminders",
  { hourUTC: 0, minuteUTC: 0 },
  internal.notifications.generateReminders
);

// Cleanup old notifications (run weekly)
crons.weekly(
  "cleanup old notifications",
  { hourUTC: 2, minuteUTC: 0, dayOfWeek: "monday" },
  internal.notifications.cleanupOldNotifications
);

export default crons;
```

### 6.2. Cleanup Old Notifications

```typescript
// convex/notifications.ts
export const cleanupOldNotifications = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    // Delete read notifications older than 30 days
    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("isRead"), true),
          q.lt(q.field("createdAt"), thirtyDaysAgo)
        )
      )
      .collect();
    
    await Promise.all(
      oldNotifications.map((notification) =>
        ctx.db.delete(notification._id)
      )
    );
    
    console.log(`Cleaned up ${oldNotifications.length} old notifications`);
  },
});
```

---

## 7. UI COMPONENTS

### 7.1. Component Structure

```
components/notifications/
├── notification-bell.tsx       # Bell icon with badge
├── notification-dropdown.tsx   # Dropdown list
└── notification-item.tsx       # Individual notification

app/(main)/(routes)/notifications/
├── page.tsx                    # Full notifications page
└── _components/
    ├── notification-list.tsx
    └── notification-filters.tsx
```

### 7.2. NotificationBell Component

```typescript
// components/notifications/notification-bell.tsx
"use client";

import { Bell } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "./notification-dropdown";
import { cn } from "@/lib/utils";

export const NotificationBell = () => {
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
};
```

### 7.3. NotificationDropdown Component

```typescript
// components/notifications/notification-dropdown.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NotificationItem } from "./notification-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const NotificationDropdown = () => {
  const notifications = useQuery(api.notifications.getNotifications, {
    limit: 5,
  });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch (error) {
      toast.error("Không thể đánh dấu đã đọc");
    }
  };
  
  if (!notifications) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    );
  }
  
  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Không có thông báo mới
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold">Thông báo</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
          className="h-8"
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          Đánh dấu đã đọc
        </Button>
      </div>
      
      <Separator />
      
      {/* Notifications */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
          />
        ))}
      </div>
      
      <Separator />
      
      {/* Footer */}
      <div className="p-2">
        <Link href="/notifications">
          <Button variant="ghost" className="w-full">
            Xem tất cả
          </Button>
        </Link>
      </div>
    </div>
  );
};
```

### 7.4. NotificationItem Component

```typescript
// components/notifications/notification-item.tsx
"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Bell, AlertCircle, CheckCircle, Info } from "lucide-react";

interface NotificationItemProps {
  notification: Doc<"notifications">;
}

const ICON_MAP = {
  deadline: AlertCircle,
  reminder: Bell,
  system: Info,
  achievement: CheckCircle,
};

const COLOR_MAP = {
  deadline: "text-red-500",
  reminder: "text-blue-500",
  system: "text-gray-500",
  achievement: "text-green-500",
};

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const router = useRouter();
  const markAsRead = useMutation(api.notifications.markAsRead);
  
  const Icon = ICON_MAP[notification.type as keyof typeof ICON_MAP] || Bell;
  const iconColor = COLOR_MAP[notification.type as keyof typeof COLOR_MAP] || "text-gray-500";
  
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
      className={cn(
        "p-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition",
        !notification.isRead && "bg-blue-50 dark:bg-blue-950"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5", iconColor)} />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-xs text-muted-foreground">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: vi,
            })}
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

### 7.5. Integration với Navigation

```typescript
// app/(main)/_components/navigation.tsx
import { NotificationBell } from "@/components/notifications/notification-bell";

export const Navigation = () => {
  return (
    <div className="flex items-center gap-2">
      {/* Existing navigation items */}
      <NotificationBell />
      <UserItem />
    </div>
  );
};
```

### 7.6. Full Notifications Page

```typescript
// app/(main)/(routes)/notifications/page.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const NotificationsPage = () => {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const notifications = useQuery(api.notifications.getNotifications, {
    unreadOnly: filter === "unread",
  });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch (error) {
      toast.error("Không thể đánh dấu đã đọc");
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Thông báo</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Đánh dấu đã đọc
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tất cả
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Chưa đọc
          </Button>
        </div>
      </div>
      
      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {!notifications ? (
          <div className="p-8 text-center text-muted-foreground">
            Đang tải...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === "unread"
                ? "Không có thông báo chưa đọc"
                : "Không có thông báo"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
```

---

## 8. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| Title | Required, max 200 chars | "Tiêu đề không được để trống" |
| Message | Required, max 500 chars | "Nội dung không được để trống" |
| Type | Must be valid type | "Loại thông báo không hợp lệ" |
| Priority | Must be low/medium/high | "Mức độ ưu tiên không hợp lệ" |

---

## 9. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not notification owner | "Bạn không có quyền truy cập thông báo này" | Show error toast |
| `NOT_FOUND` | Notification not found | "Không tìm thấy thông báo" | Show error toast |
| `NETWORK_ERROR` | Network failure | "Lỗi kết nối" | Auto-retry |

---

## 10. TEST CASES

### Functional Tests:

**TC01: View Notifications**
- Input: User logged in
- Expected: Bell icon shows unread count
- Actual: ⏳ Pending

**TC02: Mark as Read**
- Input: Click notification
- Expected: Notification marked as read
- Actual: ⏳ Pending

**TC03: Cron Job**
- Input: Daily cron runs
- Expected: Reminders created for upcoming events
- Actual: ⏳ Pending

---

## 11. CODE EXAMPLES

### 11.1. Create Notification Manually

```typescript
const createNotification = useMutation(api.notifications.createNotification);

await createNotification({
  userId: user.id,
  type: "system",
  title: "Chào mừng!",
  message: "Chào mừng bạn đến với PLMS",
  priority: "low",
});
```

### 11.2. Get Unread Notifications

```typescript
const unreadNotifications = useQuery(
  api.notifications.getNotifications,
  { unreadOnly: true }
);
```

---

## 12. SECURITY CONSIDERATIONS

- ✅ **Authentication:** Require login
- ✅ **Authorization:** Verify userId on all operations
- ✅ **Data Privacy:** Users only see their own notifications
- ✅ **XSS Protection:** Sanitize notification content
- ✅ **Rate Limiting:** Prevent notification spam

---

## 13. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Index on userId, isRead, createdAt
- ✅ **Queries:** Use withIndex for filtering
- ✅ **Cron Jobs:** Run during off-peak hours
- ✅ **Cleanup:** Auto-delete old read notifications
- ✅ **Real-time:** Convex subscriptions for instant updates

---

## 14. RELATED USE CASES

- **UC16:** Xem lịch tổng quan - Source of event reminders
- **UC07:** Tạo trang mới - Can trigger notifications
- **UC14:** Quản lý bảng - Can trigger notifications

---

## 15. REFERENCES

- [Convex Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs)
- [Convex Documentation](https://docs.convex.dev/)
- [date-fns](https://date-fns.org/)

---

**Tạo bởi:** AI Assistant  
**Ngày:** 08/12/2025  
**Trạng thái:** Ready for implementation  
**Ước tính:** 1 tuần

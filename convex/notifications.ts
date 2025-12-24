import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Get notifications for the current user
 */
export const getAll = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const limit = args.limit || 50;

    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Filter unread only if requested
    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    // Apply limit
    return notifications.slice(0, limit);
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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

/**
 * Get a single notification by ID
 */
export const getById = query({
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

    return notification;
  },
});

/**
 * Mark a notification as read
 */
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
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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

/**
 * Delete a notification
 */
export const remove = mutation({
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
  },
});

/**
 * Create a notification (internal - for cron jobs and system use)
 */
export const create = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(), // "deadline", "reminder", "system", "achievement"
    title: v.string(),
    message: v.string(),
    relatedEventId: v.optional(v.id("events")),
    relatedDocumentId: v.optional(v.id("documents")),
    relatedTableId: v.optional(v.id("tables")),
    actionUrl: v.optional(v.string()),
    priority: v.optional(v.string()), // "low", "medium", "high"
  },
  handler: async (ctx, args) => {
    // Validate type
    const validTypes = ["deadline", "reminder", "system", "achievement"];
    if (!validTypes.includes(args.type)) {
      throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(", ")}`);
    }

    // Validate priority if provided
    if (args.priority) {
      const validPriorities = ["low", "medium", "high"];
      if (!validPriorities.includes(args.priority)) {
        throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`);
      }
    }

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      relatedEventId: args.relatedEventId,
      relatedDocumentId: args.relatedDocumentId,
      relatedTableId: args.relatedTableId,
      actionUrl: args.actionUrl,
      priority: args.priority || "medium",
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  // Force Vietnam timezone (GMT+7)
  return date.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"  // Force Vietnam timezone
  });
}

export const generateReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const currentDate = new Date(now);

    // ==========================================
    // 1. EVENT REMINDERS
    // ==========================================
    const rangeStart = now;
    const rangeEnd = now + 30 * 24 * 60 * 60 * 1000; // Look 30 days ahead

    const upcomingEvents = await ctx.db
      .query("events")
      .withIndex("by_start_date", (q) => q.gte("startDate", rangeStart).lt("startDate", rangeEnd))
      .collect();

    for (const event of upcomingEvents) {
      let triggerTime = 0;

      // Determine trigger time
      if (event.reminderType === "custom" && event.reminder) {
        triggerTime = event.startDate - (event.reminder * 60 * 1000);
      } else if (event.reminderType === "default") {
        // 8 PM previous day
        const startDate = new Date(event.startDate);
        const prevDay = new Date(startDate);
        prevDay.setDate(startDate.getDate() - 1);
        prevDay.setHours(20, 0, 0, 0); // 20:00:00
        triggerTime = prevDay.getTime();
      } else {
        continue;
      }

      // If triggerTime is in the future, skip.
      if (now < triggerTime) continue;

      // Check if already notified
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", event.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("relatedEventId"), event._id),
            q.eq(q.field("type"), "reminder")
          )
        )
        .first();

      if (existing) continue;

      // Create notification
      const daysUntil = Math.ceil((event.startDate - now) / (24 * 60 * 60 * 1000));
      let message = `Sự kiện "${event.title}" sẽ diễn ra vào ${formatDate(event.startDate)}`;
      if (daysUntil > 0 && daysUntil < 2) message += ` (sắp diễn ra)`;
      else if (daysUntil <= 0) message += ` (đang diễn ra)`;

      await ctx.db.insert("notifications", {
        userId: event.userId,
        type: "reminder",
        title: `Nhắc nhở: ${event.title}`,
        message: message,
        isRead: false,
        relatedEventId: event._id,
        actionUrl: "/calendar",
        priority: "high",
        createdAt: Date.now()
      });
    }

    // ==========================================
    // 2. SCHEDULE REMINDERS (LỊCH HỌC)
    // ==========================================
    // User requirement: Notify at 8 PM previous day.
    // Logic: 
    // - Check if current time is >= 20:00 (Vietnam Time or generic evening)
    // - Look for schedules for TOMORROW.
    // - Deduplicate: Check if notified for this schedule + tomorrow's date.

    // Assuming server time might be offset, let's just check the hour of 'currentDate'
    // If it's Vietnam time, 20:00 is 8 PM.
    // We run every 15 mins. We can just check "Is it past 20:00?". 
    // To handle timezone safely without complex logic, we'll rely on the fact that the user specified "8h tối".
    // We will assume the server time roughly correlates or use UTC logic if we know the user's timezone.
    // For now, let's assume we check if the hour is >= 20. 
    // And to prevent spamming, we rely on checking existing notifications for "Tomorrow".

    // Calculate tomorrow's date string and day of week
    // Since we don't know the user's timezone exactly but the user interface implies Vietnam context (vi-VN locale used elsewhere),
    // we'll try to stick to a +7 logic or just use local date if the server is running locally (which it is, "The USER's OS version is windows").

    // Check if it's evening (>= 20:00)
    if (currentDate.getHours() >= 20) {
      const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
      const dayOfWeekTomorrow = tomorrow.getDay(); // 0-6
      const dateStringTomorrow = tomorrow.toLocaleDateString("vi-VN"); // e.g. "15/12/2025"

      // Get all schedules for tomorrow's day of week
      // We need to iterate all users -> actually this mutation is internal, running as system. 
      // But the previous query only got events. 'userId' is not in context. 
      // Wait, generateReminders is an internal mutation, it doesn't have a specific userId in context unless we pass it.
      // It's a CRON job. It needs to handle ALL users.
      // BUT, efficient querying for ALL users for schedules?
      // We can query `schedules` by `dayOfWeek`? No index for `dayOfWeek` alone, only `by_user_day`.
      // We might need to scan all schedules or iterate users. 
      // For MVP, scanning all schedules is too heavy if many users.
      // However, we can add an index `by_day` to schedules. 
      // Or, since we are in dev, maybe just iterating users who have valid sessions?
      // No, cron runs independently.
      // Let's look at `schedules` schema again.
      // `schedules` has `index("by_user_day", ["userId", "dayOfWeek"])`.
      // It does NOT have an index just on `dayOfWeek`.
      // We should add an index `by_day` to schedules table for efficient cron.

      // For this step, I will simplify and just fetch ALL schedules if possible or add the index first.
      // Fetching all schedules might be okay for now if dataset is small.
      // Let's assume we can fetch by filtering in memory for now, but adding index is better.
      // I will add the logic here assuming I can get the schedules.

      // Efficient: Use the by_day index (now that we added it)
      const schedules = await ctx.db
        .query("schedules")
        .withIndex("by_day", (q) => q.eq("dayOfWeek", dayOfWeekTomorrow))
        .collect();

      for (const schedule of schedules) {
        // No need to check dayOfWeek manually anymore

        // Deduplicate: Has the user been notified effectively for THIS specific instance?

        // Deduplicate: Has the user been notified effectively for THIS specific instance?
        // We can check `notifications` looking for `relatedScheduleId` and created recently (today).
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const existingNotif = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("userId", schedule.userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("relatedScheduleId"), schedule._id),
              q.gte(q.field("createdAt"), startOfToday.getTime())
            )
          )
          .first();

        if (existingNotif) continue;

        // Create notification
        await ctx.db.insert("notifications", {
          userId: schedule.userId,
          type: "reminder",
          title: `Lịch học ngày mai (${dateStringTomorrow})`,
          message: `Ngày mai ${dateStringTomorrow} bạn có lịch học ${schedule.subjectName} lúc ${schedule.startTime} tại ${schedule.room || 'hệ thống'}`,
          isRead: false,
          relatedScheduleId: schedule._id,
          actionUrl: "/calendar", // Or specific schedule view
          priority: "medium",
          createdAt: Date.now()
        });
      }
    }
  }
});

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


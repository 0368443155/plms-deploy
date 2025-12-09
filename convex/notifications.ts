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


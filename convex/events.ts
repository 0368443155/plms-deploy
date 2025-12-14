import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new event
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(), // Unix timestamp
    allDay: v.boolean(),
    type: v.string(), // "deadline", "exam", "assignment", "meeting", "custom"
    relatedDocumentId: v.optional(v.id("documents")),
    relatedTableId: v.optional(v.id("tables")),
    color: v.optional(v.string()),
    reminder: v.optional(v.number()), // Minutes before event to remind
    reminderType: v.optional(v.string()), // "none", "default", "custom"
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("Start date must be before end date");
    }

    // Validate type
    const validTypes = ["deadline", "exam", "assignment", "meeting", "custom"];
    if (!validTypes.includes(args.type)) {
      throw new Error(`Invalid event type. Must be one of: ${validTypes.join(", ")}`);
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
      color: args.color || getDefaultColorForType(args.type),
      reminder: args.reminder,
      reminderType: args.reminderType || "none",
      location: args.location,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * Get all events for the current user
 */
export const getAll = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sort by start date
    return events.sort((a, b) => a.startDate - b.startDate);
  },
});

/**
 * Get events in a date range
 */
export const getByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    if (args.startDate >= args.endDate) {
      throw new Error("Start date must be before end date");
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter events that overlap with the date range
    const filteredEvents = events.filter((event) => {
      return event.startDate < args.endDate && event.endDate > args.startDate;
    });

    // Sort by start date
    return filteredEvents.sort((a, b) => a.startDate - b.startDate);
  },
});

/**
 * Get events by type
 */
export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const events = await ctx.db
      .query("events")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();

    // Filter by user and sort by start date
    return events
      .filter((event) => event.userId === userId)
      .sort((a, b) => a.startDate - b.startDate);
  },
});

/**
 * Get a single event by ID
 */
export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const event = await ctx.db.get(args.id);

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return event;
  },
});

/**
 * Update an event
 */
export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    type: v.optional(v.string()),
    relatedDocumentId: v.optional(v.id("documents")),
    relatedTableId: v.optional(v.id("tables")),
    color: v.optional(v.string()),
    reminder: v.optional(v.number()),
    reminderType: v.optional(v.string()),
    location: v.optional(v.string()),
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

    // Validate dates if provided
    const startDate = updates.startDate ?? existingEvent.startDate;
    const endDate = updates.endDate ?? existingEvent.endDate;

    if (startDate >= endDate) {
      throw new Error("Start date must be before end date");
    }

    // Validate type if provided
    if (updates.type) {
      const validTypes = ["deadline", "exam", "assignment", "meeting", "custom"];
      if (!validTypes.includes(updates.type)) {
        throw new Error(`Invalid event type. Must be one of: ${validTypes.join(", ")}`);
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete an event
 */
export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const event = await ctx.db.get(args.id);

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Helper function to get default color for event type
 */
function getDefaultColorForType(type: string): string {
  const colorMap: Record<string, string> = {
    deadline: "#EF4444", // Red
    exam: "#F59E0B", // Amber
    assignment: "#3B82F6", // Blue
    meeting: "#10B981", // Green
    custom: "#8B5CF6", // Purple
  };

  return colorMap[type] || "#6B7280"; // Default gray
}


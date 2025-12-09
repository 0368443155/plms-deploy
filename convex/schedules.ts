import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to validate time format (HH:mm)
function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

// Helper function to check if two time ranges overlap
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1;
}

// Helper function to check for schedule conflicts
async function checkScheduleConflict(
  ctx: any,
  userId: string,
  scheduleId: Id<"schedules"> | null,
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
    // Skip the current schedule if updating
    if (scheduleId && existing._id === scheduleId) {
      continue;
    }

    if (
      timeRangesOverlap(
        schedule.startTime,
        schedule.endTime,
        existing.startTime,
        existing.endTime
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Create a new schedule
 */
export const create = mutation({
  args: {
    subjectId: v.optional(v.id("documents")),
    subjectName: v.string(),
    dayOfWeek: v.number(), // 0-6 (Sunday-Saturday)
    startTime: v.string(), // "HH:mm" format
    endTime: v.string(), // "HH:mm" format
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    notes: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Validate time format
    if (!isValidTimeFormat(args.startTime) || !isValidTimeFormat(args.endTime)) {
      throw new Error("Invalid time format. Use HH:mm");
    }

    // Validate dayOfWeek
    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("Invalid day of week. Must be 0-6");
    }

    // Validate startTime < endTime
    if (args.startTime >= args.endTime) {
      throw new Error("Start time must be before end time");
    }

    // Check for conflicts
    const conflict = await checkScheduleConflict(
      ctx,
      userId,
      null,
      {
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
      }
    );

    if (conflict) {
      throw new Error("Schedule conflict detected. Another schedule overlaps with this time slot");
    }

    const scheduleId = await ctx.db.insert("schedules", {
      userId,
      subjectId: args.subjectId,
      subjectName: args.subjectName,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      room: args.room,
      teacher: args.teacher,
      notes: args.notes,
      color: args.color || "#3B82F6", // Default blue
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return scheduleId;
  },
});

/**
 * Get all schedules for the current user
 */
export const getAll = query({
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

    // Sort by dayOfWeek, then by startTime
    return schedules.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

/**
 * Get schedules for a specific day
 */
export const getByDay = query({
  args: { dayOfWeek: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new Error("Invalid day of week. Must be 0-6");
    }

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

/**
 * Get a single schedule by ID
 */
export const getById = query({
  args: { id: v.id("schedules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const schedule = await ctx.db.get(args.id);

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    if (schedule.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return schedule;
  },
});

/**
 * Update a schedule
 */
export const update = mutation({
  args: {
    id: v.id("schedules"),
    subjectId: v.optional(v.id("documents")),
    subjectName: v.optional(v.string()),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    room: v.optional(v.string()),
    teacher: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    // Validate time format if provided
    if (updates.startTime && !isValidTimeFormat(updates.startTime)) {
      throw new Error("Invalid start time format. Use HH:mm");
    }
    if (updates.endTime && !isValidTimeFormat(updates.endTime)) {
      throw new Error("Invalid end time format. Use HH:mm");
    }

    // Validate dayOfWeek if provided
    if (updates.dayOfWeek !== undefined && (updates.dayOfWeek < 0 || updates.dayOfWeek > 6)) {
      throw new Error("Invalid day of week. Must be 0-6");
    }

    // Check for conflicts if time or day changed
    if (updates.dayOfWeek !== undefined || updates.startTime || updates.endTime) {
      const newSchedule = {
        dayOfWeek: updates.dayOfWeek ?? existingSchedule.dayOfWeek,
        startTime: updates.startTime ?? existingSchedule.startTime,
        endTime: updates.endTime ?? existingSchedule.endTime,
      };

      // Validate startTime < endTime
      if (newSchedule.startTime >= newSchedule.endTime) {
        throw new Error("Start time must be before end time");
      }

      const conflict = await checkScheduleConflict(
        ctx,
        userId,
        id,
        newSchedule
      );

      if (conflict) {
        throw new Error("Schedule conflict detected. Another schedule overlaps with this time slot");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a schedule
 */
export const remove = mutation({
  args: { id: v.id("schedules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const schedule = await ctx.db.get(args.id);

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    if (schedule.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});


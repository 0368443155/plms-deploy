import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get calendar data (merge schedules + events) for a date range
 */
export const getCalendarData = query({
  args: {
    startDate: v.number(), // Unix timestamp
    endDate: v.number(), // Unix timestamp
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get one-time events in date range
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const filteredEvents = events.filter((event) => {
      return event.startDate < args.endDate && event.endDate > args.startDate;
    });

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
    return [...filteredEvents, ...expandedSchedules];
  },
});

/**
 * Helper function to expand recurring schedules to events
 */
function expandSchedulesToEvents(
  schedules: any[],
  startDate: number,
  endDate: number
): any[] {
  const expandedEvents: any[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  schedules.forEach((schedule) => {
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Check if this day matches the schedule's dayOfWeek
      if (dayOfWeek === schedule.dayOfWeek) {
        const [startHour, startMinute] = schedule.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

        const eventStart = new Date(currentDate);
        eventStart.setHours(startHour, startMinute, 0, 0);

        const eventEnd = new Date(currentDate);
        eventEnd.setHours(endHour, endMinute, 0, 0);

        // Only add if within date range
        if (eventStart.getTime() >= startDate && eventEnd.getTime() <= endDate) {
          expandedEvents.push({
            _id: `schedule-${schedule._id}-${currentDate.getTime()}`,
            title: schedule.subjectName,
            description: [schedule.teacher, schedule.room, schedule.notes]
              .filter(Boolean)
              .join(" • "),
            startDate: eventStart.getTime(),
            endDate: eventEnd.getTime(),
            allDay: false,
            type: "schedule",
            color: schedule.color || "#3B82F6",
            location: schedule.room,
            isRecurring: true,
            scheduleId: schedule._id,
            userId: schedule.userId,
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return expandedEvents;
}


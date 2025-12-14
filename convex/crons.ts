import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 15 minutes to check for reminders
crons.interval(
    "generate reminders",
    { minutes: 15 },
    internal.notifications.generateReminders
);

// Cleanup old notifications (weekly)
crons.weekly(
    "cleanup old notifications",
    { hourUTC: 0, minuteUTC: 0, dayOfWeek: "monday" },
    internal.notifications.cleanupOldNotifications
);

export default crons;

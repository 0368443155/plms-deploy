"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ScheduleItemProps {
  schedule: Doc<"schedules">;
  onClick?: (e: React.MouseEvent) => void;
}

export const ScheduleItem = ({ schedule, onClick }: ScheduleItemProps) => {
  // Calculate duration in minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const durationMinutes = endMinutes - startMinutes;

  // Determine if this is a short event (45 minutes or less)
  const isShortEvent = durationMinutes <= 45;

  // Create tooltip text
  const tooltipText = `${schedule.subjectName}\n${schedule.startTime} - ${schedule.endTime}${schedule.room ? `\n📍 ${schedule.room}` : ''}${schedule.teacher ? `\n👤 ${schedule.teacher}` : ''}`;

  return (
    <div
      className={cn(
        "text-xs p-2 rounded cursor-pointer hover:opacity-90 transition-all",
        "text-white shadow-sm border border-white/20",
        "overflow-hidden flex flex-col",
        isShortEvent ? "justify-center" : "h-full"
      )}
      style={{
        backgroundColor: schedule.color || "#3B82F6",
        minHeight: "60px", // Minimum height to show at least 3 lines
      }}
      onClick={onClick}
      title={tooltipText}
    >
      {isShortEvent ? (
        // Compact layout for short events
        <>
          <div
            className="font-semibold leading-tight"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "11px",
            }}
          >
            {schedule.subjectName}
          </div>
          <div className="text-[9px] opacity-90 leading-tight mt-0.5">
            {schedule.startTime} - {schedule.endTime}
          </div>
          {(schedule.room || schedule.teacher) && (
            <div
              className="text-[9px] opacity-90 leading-tight mt-0.5"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {schedule.room && `📍 ${schedule.room}`}
              {schedule.room && schedule.teacher && " • "}
              {schedule.teacher && `👤 ${schedule.teacher}`}
            </div>
          )}
        </>
      ) : (
        // Normal layout for longer events
        <>
          <div
            className="font-semibold mb-1"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {schedule.subjectName}
          </div>
          <div className="text-[10px] opacity-90 mb-1">
            {schedule.startTime} - {schedule.endTime}
          </div>
          {schedule.room && (
            <div
              className="text-[10px] opacity-90"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              📍 {schedule.room}
            </div>
          )}
          {schedule.teacher && (
            <div
              className="text-[10px] opacity-90"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              👤 {schedule.teacher}
            </div>
          )}
        </>
      )}
    </div>
  );
};

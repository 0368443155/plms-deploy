"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ScheduleItemProps {
  schedule: Doc<"schedules">;
  onClick?: (e: React.MouseEvent) => void;
}

export const ScheduleItem = ({ schedule, onClick }: ScheduleItemProps) => {
  // Create tooltip text
  const tooltipText = `${schedule.subjectName}\n${schedule.startTime} - ${schedule.endTime}${schedule.room ? `\n📍 ${schedule.room}` : ''}${schedule.teacher ? `\n👤 ${schedule.teacher}` : ''}`;

  return (
    <div
      className={cn(
        "text-xs p-2 rounded cursor-pointer hover:opacity-90 transition-all h-full",
        "text-white shadow-sm border border-white/20",
        "overflow-hidden" // Force overflow hidden
      )}
      style={{
        backgroundColor: schedule.color || "#3B82F6",
      }}
      onClick={onClick}
      title={tooltipText}
    >
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
    </div>
  );
};

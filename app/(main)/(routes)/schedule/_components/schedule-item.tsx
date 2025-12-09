"use client";

import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ScheduleItemProps {
  schedule: Doc<"schedules">;
  onClick?: (e: React.MouseEvent) => void;
}

export const ScheduleItem = ({ schedule, onClick }: ScheduleItemProps) => {
  const startHour = parseInt(schedule.startTime.split(":")[0]);
  const startMinute = parseInt(schedule.startTime.split(":")[1]);
  const endHour = parseInt(schedule.endTime.split(":")[0]);
  const endMinute = parseInt(schedule.endTime.split(":")[1]);

  const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  const height = Math.max(40, (duration / 60) * 80); // 80px per hour

  return (
    <div
      className={cn(
        "text-xs p-2 rounded mb-1 cursor-pointer hover:opacity-90 transition-all",
        "text-white shadow-sm border border-white/20"
      )}
      style={{
        backgroundColor: schedule.color || "#3B82F6",
        minHeight: `${height}px`,
      }}
      onClick={onClick}
    >
      <div className="font-semibold truncate mb-1">{schedule.subjectName}</div>
      <div className="text-[10px] opacity-90 mb-1">
        {schedule.startTime} - {schedule.endTime}
      </div>
      {schedule.room && (
        <div className="text-[10px] opacity-90">📍 {schedule.room}</div>
      )}
      {schedule.teacher && (
        <div className="text-[10px] opacity-90">👤 {schedule.teacher}</div>
      )}
    </div>
  );
};


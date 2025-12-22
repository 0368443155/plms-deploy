"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { ScheduleItem } from "./schedule-item";
import { AddScheduleModal } from "./add-schedule-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Doc, Id } from "@/convex/_generated/dataModel";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAYS_FULL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00
const HOUR_HEIGHT = 80; // Height of each hour slot in pixels

export const ScheduleGrid = () => {
  const schedules = useQuery(api.schedules.getAll);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Id<"schedules"> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSlotClick = (dayOfWeek: number, hour: number) => {
    setSelectedSlot({
      dayOfWeek,
      startTime: `${hour.toString().padStart(2, "0")}:00`,
    });
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleScheduleClick = (scheduleId: Id<"schedules">, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSchedule(scheduleId);
    setSelectedSlot(null);
    setIsModalOpen(true);
  };

  // Convert time string (HH:MM) to minutes from start of day
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Calculate position and height for a schedule
  const getSchedulePosition = (schedule: Doc<"schedules">) => {
    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);
    const duration = endMinutes - startMinutes;

    // Calculate offset from 7:00 (start of grid)
    const offsetFromStart = startMinutes - (7 * 60); // 7:00 = 420 minutes

    // Calculate position and height
    const top = (offsetFromStart / 60) * HOUR_HEIGHT; // pixels from top
    const height = (duration / 60) * HOUR_HEIGHT; // height in pixels

    return { top, height };
  };

  // Get schedules for a specific day
  const getSchedulesForDay = (dayOfWeek: number): Doc<"schedules">[] => {
    if (!schedules) return [];
    return schedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
    setEditingSchedule(null);
  };

  if (schedules === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lịch học hàng tuần</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý thời khóa biểu của bạn
          </p>
        </div>
        <Button onClick={() => {
          setSelectedSlot(null);
          setEditingSchedule(null);
          setIsModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm lịch học
        </Button>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex bg-muted/50 border-b">
              <div className="w-20 border-r p-3 text-center font-semibold flex-shrink-0">
                Giờ
              </div>
              {DAYS.map((day, index) => (
                <div key={index} className="flex-1 border-r last:border-r-0 p-3 text-center font-semibold min-w-[120px]">
                  <div>{day}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {DAYS_FULL[index]}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="flex">
              {/* Time Column */}
              <div className="w-20 border-r flex-shrink-0">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b p-2 text-center font-medium bg-background"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {DAYS.map((_, dayIndex) => (
                <div key={dayIndex} className="flex-1 border-r last:border-r-0 relative min-w-[120px]">
                  {/* Hour slots (for clicking) */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      onClick={() => handleSlotClick(dayIndex, hour)}
                    />
                  ))}

                  {/* Schedules (absolute positioned) */}
                  {getSchedulesForDay(dayIndex).map((schedule) => {
                    const { top, height } = getSchedulePosition(schedule);
                    return (
                      <div
                        key={schedule._id}
                        className="absolute left-1 right-1"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: 10,
                        }}
                      >
                        <ScheduleItem
                          schedule={schedule}
                          onClick={(e) => handleScheduleClick(schedule._id, e)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddScheduleModal
        open={isModalOpen}
        onClose={handleCloseModal}
        defaultValues={selectedSlot}
        editingScheduleId={editingSchedule}
      />
    </div>
  );
};

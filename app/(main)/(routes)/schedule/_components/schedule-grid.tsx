"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { ScheduleItem } from "./schedule-item";
import { AddScheduleModal } from "./add-schedule-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useNavbarActions } from "@/hooks/use-navbar-actions";
import "./schedule-grid.css";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAYS_FULL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const HOUR_HEIGHT = 80; // Height of each hour slot in pixels

export const ScheduleGrid = () => {
  const schedules = useQuery(api.schedules.getAll);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    startTime: string;
  } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Id<"schedules"> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setNavbarContent, clearNavbarContent } = useNavbarActions();

  // Set navbar content
  useEffect(() => {
    setNavbarContent(
      "Lịch học hàng tuần",
      "Quản lý thời khóa biểu của bạn",
      <Button onClick={() => {
        setSelectedSlot(null);
        setEditingSchedule(null);
        setIsModalOpen(true);
      }}>
        <Plus className="h-4 w-4 mr-2" />
        Thêm lịch học
      </Button>
    );

    return () => {
      clearNavbarContent();
    };
  }, [setNavbarContent, clearNavbarContent]);

  // Calculate dynamic hour range based on schedules
  const getHourRange = () => {
    if (!schedules || schedules.length === 0) {
      return {
        startHour: DEFAULT_START_HOUR,
        endHour: DEFAULT_END_HOUR,
      };
    }

    let minHour = DEFAULT_START_HOUR;
    let maxHour = DEFAULT_END_HOUR;

    schedules.forEach((schedule) => {
      const startHour = parseInt(schedule.startTime.split(":")[0]);
      const endHour = parseInt(schedule.endTime.split(":")[0]);
      const endMinute = parseInt(schedule.endTime.split(":")[1]);

      minHour = Math.min(minHour, startHour);
      // If there are minutes, we need to include the next hour
      maxHour = Math.max(maxHour, endMinute > 0 ? endHour + 1 : endHour);
    });

    // Add some padding
    minHour = Math.max(0, minHour - 1); // Don't go below 0
    maxHour = Math.min(23, maxHour + 1); // Don't go above 23

    return { startHour: minHour, endHour: maxHour };
  };

  const { startHour, endHour } = getHourRange();
  const HOURS = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);


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

    // Calculate offset from grid start (dynamic based on actual schedules)
    const offsetFromStart = startMinutes - (startHour * 60);

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
      {/* Removed toolbar - now in navbar */}

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex bg-muted/50 border-b sticky top-0 z-20">
              <div className="w-20 border-r p-3 text-center font-semibold flex-shrink-0 bg-muted/50">
                Giờ
              </div>
              {DAYS.map((day, index) => (
                <div key={index} className="flex-1 border-r last:border-r-0 p-3 text-center font-semibold min-w-[120px] bg-muted/50">
                  <div>{day}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {DAYS_FULL[index]}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Body - Scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
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

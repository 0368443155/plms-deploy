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

  const getSchedulesForSlot = (dayOfWeek: number, hour: number): Doc<"schedules">[] => {
    if (!schedules) return [];

    return schedules.filter((schedule) => {
      const scheduleStartHour = parseInt(schedule.startTime.split(":")[0]);
      const scheduleEndHour = parseInt(schedule.endTime.split(":")[0]);
      return (
        schedule.dayOfWeek === dayOfWeek &&
        scheduleStartHour <= hour &&
        hour < scheduleEndHour
      );
    });
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
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-3 w-20 text-center font-semibold sticky left-0 bg-muted/50 z-10">
                  Giờ
                </th>
                {DAYS.map((day, index) => (
                  <th key={index} className="border p-3 text-center font-semibold min-w-[120px]">
                    <div>{day}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {DAYS_FULL[index]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="hover:bg-muted/30 transition-colors">
                  <td className="border p-2 text-center font-medium sticky left-0 bg-background z-10">
                    {hour}:00
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const schedulesInSlot = getSchedulesForSlot(dayIndex, hour);

                    return (
                      <td
                        key={dayIndex}
                        className="border p-1 cursor-pointer hover:bg-muted/50 relative min-h-[80px] align-top"
                        onClick={() => handleSlotClick(dayIndex, hour)}
                      >
                        {schedulesInSlot.map((schedule) => (
                          <ScheduleItem
                            key={schedule._id}
                            schedule={schedule}
                            onClick={(e) => handleScheduleClick(schedule._id, e)}
                          />
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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


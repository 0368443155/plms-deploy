"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  event?: any; // Event data if editing
  defaultValues?: {
    start: Date;
    end: Date;
    allDay?: boolean;
  } | null;
}

const EVENT_TYPES = [
  { value: "deadline", label: "Deadline", color: "#EF4444" },
  { value: "exam", label: "Thi", color: "#F59E0B" },
  { value: "assignment", label: "Bài tập", color: "#3B82F6" },
  { value: "meeting", label: "Cuộc họp", color: "#10B981" },
  { value: "custom", label: "Tùy chỉnh", color: "#8B5CF6" },
];

export const EventModal = ({
  open,
  onClose,
  event,
  defaultValues,
}: EventModalProps) => {
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const deleteEvent = useMutation(api.events.remove);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [type, setType] = useState("custom");
  const [location, setLocation] = useState("");
  const [reminderType, setReminderType] = useState("none"); // "none" | "default" | "custom"
  const [reminderValue, setReminderValue] = useState(30);
  const [reminderUnit, setReminderUnit] = useState("minutes"); // "minutes" | "hours" | "days"
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form
  useEffect(() => {
    if (event) {
      // Editing existing event
      setTitle(event.title || "");
      setDescription(event.description || "");
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);

      // Use local date formatting to avoid timezone issues
      // Format: YYYY-MM-DD for date input
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formatLocalTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      setStartDate(formatLocalDate(start));
      setStartTime(formatLocalTime(start));
      setEndDate(formatLocalDate(end));
      setEndTime(formatLocalTime(end));
      setAllDay(event.allDay || false);
      setType(event.type || "custom");
      setLocation(event.location || "");

      // Load reminder settings
      if (event.reminderType) {
        setReminderType(event.reminderType);
        if (event.reminderType === "custom" && event.reminder) {
          if (event.reminder % 1440 === 0) {
            setReminderValue(event.reminder / 1440);
            setReminderUnit("days");
          } else if (event.reminder % 60 === 0) {
            setReminderValue(event.reminder / 60);
            setReminderUnit("hours");
          } else {
            setReminderValue(event.reminder);
            setReminderUnit("minutes");
          }
        }
      } else {
        // Backward compatibility or default
        setReminderType("none");
      }
    } else if (defaultValues) {
      // Creating new event from calendar slot
      const start = defaultValues.start;
      const end = defaultValues.end;

      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formatLocalTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      setStartDate(formatLocalDate(start));
      setStartTime(formatLocalTime(start));
      setEndDate(formatLocalDate(end));
      setEndTime(formatLocalTime(end));
      setAllDay(defaultValues.allDay || false);
    } else {
      // New event (manual)
      const now = new Date();
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      setStartDate(formatLocalDate(now));
      setStartTime("09:00");
      setEndDate(formatLocalDate(now));
      setEndTime("10:00");
      setAllDay(false);
    }
  }, [event, defaultValues, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }

    const start = new Date(`${startDate}T${allDay ? "00:00" : startTime}`);
    const end = new Date(`${endDate}T${allDay ? "23:59" : endTime}`);

    // Calculate reminder in minutes if custom
    let reminderMinutes: number | undefined = undefined;
    if (reminderType === "custom") {
      if (reminderUnit === "days") reminderMinutes = reminderValue * 1440;
      else if (reminderUnit === "hours") reminderMinutes = reminderValue * 60;
      else reminderMinutes = reminderValue;
    }

    if (start >= end) {
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
      return;
    }

    try {
      if (event && !event.isRecurring) {
        // Update existing event (not recurring schedule)
        await updateEvent({
          id: event._id as Id<"events">,
          title,
          description: description || undefined,
          startDate: start.getTime(),
          endDate: end.getTime(),
          allDay,
          type,
          location: location || undefined,
          reminder: reminderMinutes,
          reminderType,
        });
        toast.success("Đã cập nhật sự kiện");
      } else {
        // Create new event
        await createEvent({
          title,
          description: description || undefined,
          startDate: start.getTime(),
          endDate: end.getTime(),
          allDay,
          type,
          location: location || undefined,
          color: EVENT_TYPES.find((t) => t.value === type)?.color,
          reminder: reminderMinutes,
          reminderType,
        });
        toast.success("Đã tạo sự kiện");
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async () => {
    if (!event || event.isRecurring) return; // Can't delete recurring schedules from here

    setIsDeleting(true);
    try {
      await deleteEvent({ id: event._id as Id<"events"> });
      toast.success("Đã xóa sự kiện");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedType = EVENT_TYPES.find((t) => t.value === type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? (event.isRecurring ? "Chi tiết lịch học" : "Sửa sự kiện") : "Thêm sự kiện mới"}
          </DialogTitle>
        </DialogHeader>

        {event?.isRecurring ? (
          <div className="space-y-4">
            <div>
              <Label>Tiêu đề</Label>
              <div className="mt-1 p-2 bg-muted rounded-md">{event.title}</div>
            </div>
            {event.description && (
              <div>
                <Label>Mô tả</Label>
                <div className="mt-1 p-2 bg-muted rounded-md">
                  {event.description}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Thời gian</Label>
                <div className="mt-1 p-2 bg-muted rounded-md">
                  {new Date(event.startDate).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(event.endDate).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {event.location && (
                <div>
                  <Label>Địa điểm</Label>
                  <div className="mt-1 p-2 bg-muted rounded-md">
                    {event.location}
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Đây là lịch học cố định. Để chỉnh sửa, vui lòng vào trang Lịch học.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Deadline bài tập"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Loại sự kiện</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="location">Địa điểm</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Phòng A101"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="allDay" className="cursor-pointer">
                Cả ngày
              </Label>
            </div>

            {/* Notification Logic */}
            <div className="space-y-2">
              <Label>Thông báo</Label>
              <div className="flex gap-2">
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="none">Không thông báo</option>
                  <option value="default">Mặc định hệ thống (20:00 hôm trước)</option>
                  <option value="custom">Tùy chỉnh...</option>
                </select>
              </div>

              {reminderType === "custom" && (
                <div className="flex gap-2 items-center mt-2">
                  <Input
                    type="number"
                    min="1"
                    value={reminderValue}
                    onChange={(e) => setReminderValue(parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <select
                    value={reminderUnit}
                    onChange={(e) => setReminderUnit(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="minutes">Phút</option>
                    <option value="hours">Giờ</option>
                    <option value="days">Ngày</option>
                  </select>
                  <span className="text-sm">trước khi bắt đầu</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              {!allDay && (
                <div>
                  <Label htmlFor="startTime">Giờ bắt đầu *</Label>
                  <div className="relative">
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      {(() => {
                        const [hours] = startTime.split(':').map(Number);
                        return hours >= 12 ? 'PM' : 'AM';
                      })()} 🕐
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="endDate">Ngày kết thúc *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              {!allDay && (
                <div>
                  <Label htmlFor="endTime">Giờ kết thúc *</Label>
                  <div className="relative">
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                      {(() => {
                        const [hours] = endTime.split(':').map(Number);
                        return hours >= 12 ? 'PM' : 'AM';
                      })()} 🕐
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <div>
                {event && !event.isRecurring && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Đang xóa..." : "Xóa"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Hủy
                </Button>
                <Button type="submit">
                  {event ? "Cập nhật" : "Thêm"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};


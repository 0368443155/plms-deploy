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
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface AddScheduleModalProps {
  open: boolean;
  onClose: () => void;
  defaultValues?: {
    dayOfWeek: number;
    startTime: string;
  } | null;
  editingScheduleId?: Id<"schedules"> | null;
}

const DAYS = [
  { value: 0, label: "Chủ nhật" },
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
];

const COLORS = [
  { name: "Xanh dương", value: "#3B82F6" },
  { name: "Xanh lá", value: "#10B981" },
  { name: "Đỏ", value: "#EF4444" },
  { name: "Vàng", value: "#F59E0B" },
  { name: "Tím", value: "#8B5CF6" },
  { name: "Hồng", value: "#EC4899" },
  { name: "Cam", value: "#F97316" },
  { name: "Xám", value: "#6B7280" },
];

export const AddScheduleModal = ({
  open,
  onClose,
  defaultValues,
  editingScheduleId,
}: AddScheduleModalProps) => {
  const createSchedule = useMutation(api.schedules.create);
  const updateSchedule = useMutation(api.schedules.update);
  const deleteSchedule = useMutation(api.schedules.remove);
  const schedule = useQuery(
    api.schedules.getById,
    editingScheduleId ? { id: editingScheduleId } : "skip"
  );

  const [subjectName, setSubjectName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(defaultValues?.dayOfWeek ?? 1);
  const [startTime, setStartTime] = useState(defaultValues?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [isDeleting, setIsDeleting] = useState(false);

  // Load schedule data when editing
  useEffect(() => {
    if (schedule) {
      setSubjectName(schedule.subjectName);
      setDayOfWeek(schedule.dayOfWeek);
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
      setRoom(schedule.room || "");
      setTeacher(schedule.teacher || "");
      setNotes(schedule.notes || "");
      setColor(schedule.color || "#3B82F6");
    } else if (!editingScheduleId) {
      // Reset form for new schedule
      setSubjectName("");
      setDayOfWeek(defaultValues?.dayOfWeek ?? 1);
      setStartTime(defaultValues?.startTime ?? "08:00");
      setEndTime("09:30");
      setRoom("");
      setTeacher("");
      setNotes("");
      setColor("#3B82F6");
    }
  }, [schedule, editingScheduleId, defaultValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectName.trim()) {
      toast.error("Vui lòng nhập tên môn học");
      return;
    }

    if (subjectName.length > 100) {
      toast.error("Tên môn học không được vượt quá 100 ký tự");
      return;
    }

    if (startTime >= endTime) {
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
      return;
    }

    try {
      if (editingScheduleId) {
        await updateSchedule({
          id: editingScheduleId,
          subjectName,
          dayOfWeek,
          startTime,
          endTime,
          room: room || undefined,
          teacher: teacher || undefined,
          notes: notes || undefined,
          color,
        });
        toast.success("Đã cập nhật lịch học");
      } else {
        await createSchedule({
          subjectName,
          dayOfWeek,
          startTime,
          endTime,
          room: room || undefined,
          teacher: teacher || undefined,
          notes: notes || undefined,
          color,
        });
        toast.success("Đã thêm lịch học");
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async () => {
    if (!editingScheduleId) return;

    setIsDeleting(true);
    try {
      await deleteSchedule({ id: editingScheduleId });
      toast.success("Đã xóa lịch học");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingScheduleId ? "Sửa lịch học" : "Thêm lịch học mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subjectName">Tên môn học *</Label>
            <Input
              id="subjectName"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Ví dụ: Toán cao cấp"
              maxLength={100}
              required
            />
            {subjectName.length > 80 && (
              <p className="text-xs text-muted-foreground mt-1">
                {subjectName.length}/100 ký tự
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dayOfWeek">Ngày trong tuần *</Label>
              <select
                id="dayOfWeek"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="color">Màu sắc</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`
                      w-8 h-8 rounded-full border-2 transition-all
                      ${color === c.value ? "border-foreground scale-110" : "border-transparent"}
                    `}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  })()}
                </span>
              </div>
            </div>

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
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="room">Phòng học</Label>
              <Input
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Ví dụ: A101"
              />
            </div>

            <div>
              <Label htmlFor="teacher">Giảng viên</Label>
              <Input
                id="teacher"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="Tên giảng viên"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
            />
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editingScheduleId && (
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
                {editingScheduleId ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


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
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";

interface CreateTableModalProps {
  open: boolean;
  onClose: () => void;
}

const COLUMN_TYPES = [
  { value: "text", label: "Văn bản" },
  { value: "number", label: "Số" },
  { value: "date", label: "Ngày tháng" },
  { value: "select", label: "Lựa chọn" },
  { value: "checkbox", label: "Checkbox" },
];

interface Column {
  name: string;
  type: string;
  config?: string;
}

export const CreateTableModal = ({
  open,
  onClose,
}: CreateTableModalProps) => {
  const createTable = useMutation(api.tables.create);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState<Column[]>([
    { name: "", type: "text" },
    { name: "", type: "text" },
  ]);

  const handleAddColumn = () => {
    setColumns([...columns, { name: "", type: "text" }]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (
    index: number,
    field: keyof Column,
    value: string
  ) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setColumns(newColumns);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên bảng");
      return;
    }

    if (columns.length === 0) {
      toast.error("Bảng phải có ít nhất một cột");
      return;
    }

    // Validate column names
    for (const column of columns) {
      if (!column.name.trim()) {
        toast.error("Tên cột không được để trống");
        return;
      }
    }

    try {
      const tableId = await createTable({
        title,
        description: description || undefined,
        columns: columns.map((col) => ({
          name: col.name,
          type: col.type,
          config: col.config || undefined,
        })),
      });

      toast.success("Đã tạo bảng thành công");
      onClose();
      router.push(`/tables/${tableId}`);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo bảng mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Tên bảng *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Điểm số học sinh"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về bảng..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cột *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm cột
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={column.name}
                    onChange={(e) =>
                      handleColumnChange(index, "name", e.target.value)
                    }
                    placeholder={`Cột ${index + 1}`}
                    className="flex-1"
                    required
                  />
                  <select
                    value={column.type}
                    onChange={(e) =>
                      handleColumnChange(index, "type", e.target.value)
                    }
                    className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {COLUMN_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {columns.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveColumn(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">Tạo bảng</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


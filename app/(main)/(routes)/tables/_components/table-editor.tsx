"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  MoreVertical,
  Download,
  Upload,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface TableEditorProps {
  tableId: Id<"tables">;
}

const COLUMN_TYPES = [
  { value: "text", label: "Văn bản" },
  { value: "number", label: "Số" },
  { value: "date", label: "Ngày tháng" },
  { value: "select", label: "Lựa chọn" },
  { value: "checkbox", label: "Checkbox" },
];

export const TableEditor = ({ tableId }: TableEditorProps) => {
  const tableData = useQuery(api.tables.getById, { tableId });
  const updateCell = useMutation(api.tables.updateCell);
  const addRow = useMutation(api.tables.addRow);
  const deleteRow = useMutation(api.tables.deleteRow);
  const addColumn = useMutation(api.tables.addColumn);
  const updateTable = useMutation(api.tables.update);
  const deleteTable = useMutation(api.tables.remove);
  const router = useRouter();

  const [editingCell, setEditingCell] = useState<{
    rowId: Id<"tableRows">;
    columnId: Id<"tableColumns">;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");

  // Debounced cell update
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{
    rowId: Id<"tableRows">;
    columnId: Id<"tableColumns">;
    value: string;
  } | null>(null);

  const debouncedUpdateCell = useCallback(
    (
      rowId: Id<"tableRows">,
      columnId: Id<"tableColumns">,
      value: string
    ) => {
      pendingUpdateRef.current = { rowId, columnId, value };
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(async () => {
        if (pendingUpdateRef.current) {
          try {
            await updateCell({
              rowId: pendingUpdateRef.current.rowId,
              columnId: pendingUpdateRef.current.columnId,
              value: pendingUpdateRef.current.value,
            });
          } catch (error: any) {
            toast.error(error.message || "Không thể cập nhật ô");
          }
          pendingUpdateRef.current = null;
        }
      }, 500);
    },
    [updateCell]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const handleCellClick = (
    rowId: Id<"tableRows">,
    columnId: Id<"tableColumns">,
    currentValue: string
  ) => {
    setEditingCell({ rowId, columnId });
    setEditingValue(currentValue || "");
  };

  const handleCellBlur = (
    rowId: Id<"tableRows">,
    columnId: Id<"tableColumns">,
    value: string
  ) => {
    debouncedUpdateCell(rowId, columnId, value);
    setEditingCell(null);
    setEditingValue("");
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowId: Id<"tableRows">,
    columnId: Id<"tableColumns">,
    value: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      debouncedUpdateCell(rowId, columnId, value);
      setEditingCell(null);
      setEditingValue("");
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditingValue("");
    }
  };

  const handleAddRow = async () => {
    try {
      await addRow({ tableId, cells: {} });
      toast.success("Đã thêm hàng mới");
    } catch (error: any) {
      toast.error(error.message || "Không thể thêm hàng");
    }
  };

  const handleDeleteRow = async (rowId: Id<"tableRows">) => {
    try {
      await deleteRow({ rowId });
      toast.success("Đã xóa hàng");
    } catch (error: any) {
      toast.error(error.message || "Không thể xóa hàng");
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error("Vui lòng nhập tên cột");
      return;
    }

    try {
      await addColumn({
        tableId,
        name: newColumnName,
        type: newColumnType,
      });
      toast.success("Đã thêm cột mới");
      setIsAddColumnModalOpen(false);
      setNewColumnName("");
      setNewColumnType("text");
    } catch (error: any) {
      toast.error(error.message || "Không thể thêm cột");
    }
  };

  const handleDeleteTable = async () => {
    if (!confirm("Bạn có chắc muốn xóa bảng này? Hành động này không thể hoàn tác.")) {
      return;
    }

    try {
      await deleteTable({ id: tableId });
      toast.success("Đã xóa bảng");
      router.push("/tables");
    } catch (error: any) {
      toast.error(error.message || "Không thể xóa bảng");
    }
  };

  if (!tableData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  const { table, columns, rows } = tableData;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{table.title}</h1>
          {table.description && (
            <p className="text-muted-foreground mt-1">{table.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRow}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm hàng
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddColumnModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm cột
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDeleteTable}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa bảng
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <table className="w-full border-collapse min-w-full">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column._id}
                  className="border p-3 text-left font-semibold"
                  style={{ minWidth: column.width || 150 }}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {COLUMN_TYPES.find((t) => t.value === column.type)?.label}
                    </span>
                  </div>
                </th>
              ))}
              <th className="border p-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border p-8 text-center text-muted-foreground"
                >
                  Chưa có dữ liệu. Click &quot;Thêm hàng&quot; để bắt đầu.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="hover:bg-muted/30">
                  {columns.map((column) => {
                    const cellValue = row.cells[column._id] || "";
                    const isEditing =
                      editingCell?.rowId === row._id &&
                      editingCell?.columnId === column._id;

                    return (
                      <td
                        key={column._id}
                        className="border p-2 cursor-pointer"
                        onClick={() =>
                          handleCellClick(row._id, column._id, cellValue)
                        }
                      >
                        {isEditing ? (
                          <Input
                            type={
                              column.type === "number"
                                ? "number"
                                : column.type === "date"
                                ? "date"
                                : "text"
                            }
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() =>
                              handleCellBlur(row._id, column._id, editingValue)
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(
                                e,
                                row._id,
                                column._id,
                                editingValue
                              )
                            }
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <div className="min-h-[32px] flex items-center">
                            {column.type === "checkbox" ? (
                              <input
                                type="checkbox"
                                checked={cellValue === "true"}
                                readOnly
                                className="cursor-pointer"
                              />
                            ) : (
                              <span className="text-sm">
                                {cellValue || (
                                  <span className="text-muted-foreground italic">
                                    Click để chỉnh sửa
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRow(row._id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Column Modal */}
      <Dialog
        open={isAddColumnModalOpen}
        onOpenChange={setIsAddColumnModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm cột mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="columnName">Tên cột *</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Ví dụ: Tên học sinh"
                required
              />
            </div>
            <div>
              <Label htmlFor="columnType">Loại cột *</Label>
              <select
                id="columnType"
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {COLUMN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddColumnModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleAddColumn}>Thêm cột</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


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
import { useNavbarActions } from "@/hooks/use-navbar-actions";

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
  const updateColumnConfig = useMutation(api.tables.updateColumnConfig);
  const router = useRouter();
  const { setNavbarContent, clearNavbarContent } = useNavbarActions();

  const [editingCell, setEditingCell] = useState<{
    rowId: Id<"tableRows">;
    columnId: Id<"tableColumns">;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [selectInputValue, setSelectInputValue] = useState(""); // Separate state for select input field


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

  // Set navbar content when table data loads
  useEffect(() => {
    if (tableData) {
      const { table } = tableData;
      setNavbarContent(
        table.title,
        table.description || undefined,
        <>
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
        </>
      );
    }

    return () => {
      clearNavbarContent();
    };
  }, [tableData, setNavbarContent, clearNavbarContent]);

  const handleCellClick = (
    rowId: Id<"tableRows">,
    columnId: Id<"tableColumns">,
    currentValue: string
  ) => {
    setEditingCell({ rowId, columnId });
    setEditingValue(currentValue || "");
    setSelectInputValue(""); // Reset select input value when clicking a new cell
  };

  const handleCellBlur = async (
    rowId: Id<"tableRows">,
    columnId: Id<"tableColumns">,
    value: string
  ) => {
    // Find the column to check its type
    const column = columns.find((col) => col._id === columnId);

    // If it's a select column and value is not empty and not in existing options, add it
    if (column?.type === "select" && value.trim()) {
      try {
        const existingOptions = column.config ? JSON.parse(column.config) : [];
        if (!existingOptions.includes(value.trim())) {
          const newOptions = [...existingOptions, value.trim()];
          await updateColumnConfig({
            columnId,
            config: JSON.stringify(newOptions),
          });
        }
      } catch (error) {
        console.error("Failed to update select options:", error);
      }
    }

    debouncedUpdateCell(rowId, columnId, value);
    setEditingCell(null);
    setEditingValue("");
    setSelectInputValue(""); // Reset select input value
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
      setSelectInputValue(""); // Reset select input value
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditingValue("");
      setSelectInputValue(""); // Reset select input value
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
      const config = newColumnType === "select" && selectOptions.length > 0
        ? JSON.stringify(selectOptions)
        : undefined;

      await addColumn({
        tableId,
        name: newColumnName,
        type: newColumnType,
        config,
      });
      toast.success("Đã thêm cột mới");
      setIsAddColumnModalOpen(false);
      setNewColumnName("");
      setNewColumnType("text");
      setSelectOptions([]);
      setNewOption("");
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
      {/* Table - Removed toolbar, now in navbar */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <table className="w-full border-collapse min-w-full" style={{ tableLayout: "fixed" }}>
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column._id}
                  className="border p-3 text-left font-semibold"
                  style={{ width: column.width || 200, minWidth: column.width || 200, maxWidth: column.width || 200 }}
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
                        className={`border cursor-pointer ${isEditing && column.type === "select"
                          ? "p-3" // More padding for select dropdown
                          : "p-2"
                          }`}
                        style={{
                          width: column.width || 200,
                          minWidth: column.width || 200,
                          maxWidth: column.width || 200,
                          overflow: "hidden",
                          wordWrap: "break-word",
                          wordBreak: "break-word",
                          whiteSpace: "normal"
                        }}
                        onClick={() =>
                          handleCellClick(row._id, column._id, cellValue)
                        }
                      >
                        {isEditing ? (
                          column.type === "checkbox" ? (
                            // Checkbox editing mode: show checkbox + text input
                            <div className="flex items-center gap-2 max-w-full" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={editingValue === "true" || editingValue.startsWith("true")}
                                onChange={(e) => {
                                  // Extract current label text
                                  const currentLabel = editingValue.includes("|")
                                    ? editingValue.substring(editingValue.indexOf("|") + 1)
                                    : "";
                                  const newValue = e.target.checked
                                    ? `true|${currentLabel}`
                                    : `false|${currentLabel}`;
                                  setEditingValue(newValue);
                                  debouncedUpdateCell(row._id, column._id, newValue);
                                }}
                                className="cursor-pointer h-4 w-4 flex-shrink-0"
                              />
                              <Input
                                type="text"
                                value={editingValue.startsWith("true") || editingValue.startsWith("false")
                                  ? editingValue.substring(editingValue.indexOf("|") + 1) || ""
                                  : editingValue}
                                onChange={(e) => {
                                  const checked = editingValue === "true" || editingValue.startsWith("true");
                                  const newValue = `${checked}|${e.target.value}`;
                                  setEditingValue(newValue);
                                }}
                                onBlur={() => {
                                  handleCellBlur(row._id, column._id, editingValue);
                                }}
                                onKeyDown={(e) =>
                                  handleCellKeyDown(
                                    e,
                                    row._id,
                                    column._id,
                                    editingValue
                                  )
                                }
                                placeholder="Nhập tên checkbox..."
                                className="h-8 flex-1 min-w-0"
                              />
                            </div>
                          ) : column.type === "select" ? (
                            // Select editing mode: show dropdown with options + input for new value
                            <div className="flex flex-col gap-2 w-full max-w-full" onClick={(e) => e.stopPropagation()}>
                              {/* Dropdown with existing options - auto-opens with size attribute */}
                              <select
                                value={editingValue}
                                size={Math.min(5, (() => {
                                  try {
                                    const options = column.config ? JSON.parse(column.config) : [];
                                    return Math.max(3, options.length + 1); // +1 for "-- Chọn --"
                                  } catch {
                                    return 3;
                                  }
                                })())}
                                onChange={(e) => {
                                  const selectedValue = e.target.value;
                                  if (selectedValue) {
                                    setEditingValue(selectedValue);
                                    setSelectInputValue(""); // Clear input when selecting from dropdown
                                    // Save immediately when selecting from dropdown
                                    debouncedUpdateCell(row._id, column._id, selectedValue);
                                    // Close the cell
                                    setTimeout(() => {
                                      setEditingCell(null);
                                      setEditingValue("");
                                    }, 100);
                                  }
                                }}
                                onClick={(e) => {
                                  // Prevent cell click handler from firing
                                  e.stopPropagation();
                                }}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-h-40 overflow-y-auto cursor-pointer"
                              >
                                <option value="">-- Chọn từ danh sách --</option>
                                {(() => {
                                  try {
                                    const options = column.config ? JSON.parse(column.config) : [];
                                    return options.map((opt: string, idx: number) => (
                                      <option key={idx} value={opt}>
                                        {opt}
                                      </option>
                                    ));
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </select>

                              {/* Divider */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-border"></div>
                                <span className="text-xs text-muted-foreground px-2">hoặc</span>
                                <div className="flex-1 h-px bg-border"></div>
                              </div>

                              {/* Input for new value */}
                              <Input
                                type="text"
                                placeholder="Nhập giá trị mới..."
                                value={selectInputValue}
                                autoFocus
                                onChange={(e) => {
                                  // Update selectInputValue to show what user is typing
                                  setSelectInputValue(e.target.value);
                                }}
                                onBlur={() => {
                                  // Only save if user actually typed something
                                  if (selectInputValue.trim()) {
                                    const newValue = selectInputValue.trim();
                                    setEditingValue(newValue);
                                    handleCellBlur(row._id, column._id, newValue);
                                  } else if (editingValue) {
                                    // If user didn't type but has dropdown selection
                                    handleCellBlur(row._id, column._id, editingValue);
                                  } else {
                                    // No input and no selection, just close
                                    setEditingCell(null);
                                    setEditingValue("");
                                  }
                                  setSelectInputValue(""); // Always reset input
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    // Save input value if typed, otherwise dropdown value
                                    const finalValue = selectInputValue.trim() || editingValue;
                                    if (finalValue) {
                                      setEditingValue(finalValue);
                                      debouncedUpdateCell(row._id, column._id, finalValue);

                                      // Add to options if new
                                      if (selectInputValue.trim()) {
                                        try {
                                          const existingOptions = column.config ? JSON.parse(column.config) : [];
                                          if (!existingOptions.includes(selectInputValue.trim())) {
                                            const newOptions = [...existingOptions, selectInputValue.trim()];
                                            updateColumnConfig({
                                              columnId: column._id,
                                              config: JSON.stringify(newOptions),
                                            });
                                          }
                                        } catch (error) {
                                          console.error("Failed to update select options:", error);
                                        }
                                      }
                                    }
                                    // Reset everything
                                    setEditingCell(null);
                                    setEditingValue("");
                                    setSelectInputValue("");
                                  } else if (e.key === "Escape") {
                                    setEditingCell(null);
                                    setEditingValue("");
                                    setSelectInputValue("");
                                  }
                                }}
                                className="h-9 w-full min-w-0"
                              />
                            </div>
                          ) : (
                            // Other column types: regular input
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
                              className="h-8 w-full min-w-0"
                            />
                          )
                        ) : (
                          <div className="min-h-[32px] flex items-start gap-2" style={{ wordWrap: "break-word", wordBreak: "break-word", overflowWrap: "break-word" }}>
                            {column.type === "checkbox" ? (
                              <>
                                <input
                                  type="checkbox"
                                  checked={cellValue === "true" || cellValue.startsWith("true")}
                                  readOnly
                                  className="cursor-pointer h-4 w-4"
                                />
                                <span className="text-sm break-words" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                                  {cellValue.includes("|")
                                    ? cellValue.substring(cellValue.indexOf("|") + 1)
                                    : cellValue === "true" || cellValue === "false"
                                      ? ""
                                      : cellValue}
                                </span>
                              </>
                            ) : column.type === "select" ? (
                              cellValue ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 break-words" style={{ wordBreak: "break-word", maxWidth: "100%" }}>
                                  {cellValue}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic text-sm">
                                  Click để chọn
                                </span>
                              )
                            ) : (
                              <span className="text-sm break-words" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
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
                onChange={(e) => {
                  setNewColumnType(e.target.value);
                  if (e.target.value !== "select") {
                    setSelectOptions([]);
                    setNewOption("");
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {COLUMN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Options Configuration */}
            {newColumnType === "select" && (
              <div className="space-y-2">
                <Label>Tùy chọn</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Nhập tùy chọn..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newOption.trim()) {
                        e.preventDefault();
                        if (!selectOptions.includes(newOption.trim())) {
                          setSelectOptions([...selectOptions, newOption.trim()]);
                          setNewOption("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newOption.trim() && !selectOptions.includes(newOption.trim())) {
                        setSelectOptions([...selectOptions, newOption.trim()]);
                        setNewOption("");
                      }
                    }}
                  >
                    Thêm
                  </Button>
                </div>
                {selectOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectOptions.map((option, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectOptions(selectOptions.filter((_, i) => i !== index));
                          }}
                          className="hover:text-blue-600 dark:hover:text-blue-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {selectOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Thêm ít nhất một tùy chọn cho cột lựa chọn
                  </p>
                )}
              </div>
            )}
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


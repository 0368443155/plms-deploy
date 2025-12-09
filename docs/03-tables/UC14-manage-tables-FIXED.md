# UC14 - QUẢN LÝ BẢNG (TABLES) - FIXED VERSION

## 1. THÔNG TIN CƠ BẢN

- **Mã UC:** UC14
- **Tên:** Quản lý bảng dữ liệu
- **Mô tả:** Cho phép người dùng tạo, xem, sửa, xóa bảng dữ liệu với rows và columns
- **Actor:** User (Authenticated)
- **Precondition:** User đã đăng nhập
- **Postcondition:** Bảng được tạo/cập nhật/xóa thành công
- **Trạng thái:** ❌ Chưa triển khai
- **Ưu tiên:** 🔴 CAO
- **Thời gian ước tính:** 1.5 tuần
- **Dependencies:** 
  - ✅ Authentication (UC01-UC06)
  - ✅ Documents system (UC07-UC13)
- **Tech Stack:** Convex, React, TypeScript, Tanstack Table
- **⚠️ IMPORTANT:** Sử dụng **normalized schema** (4 tables) thay vì nested arrays

---

## 2. LUỒNG XỬ LÝ

### Main Flow: Tạo bảng mới

1. User click "Tạo bảng"
2. System hiển thị table editor
3. User nhập tên bảng và định nghĩa columns
4. System tạo table + columns trong database
5. User thêm rows và nhập dữ liệu
6. System auto-save cell data
7. System hiển thị bảng với dữ liệu

### Alternative Flow 1: Import từ CSV

3a. User chọn "Import CSV"
3b. System parse CSV file
3c. System tạo table + columns + rows + cells từ CSV
3d. Continue từ step 7

### Exception Flow

- 4a. Nếu validation fail → Show error
- 6a. Nếu network error → Retry auto-save
- *. Nếu unauthorized → Redirect to login

---

## 3. BIỂU ĐỒ HOẠT ĐỘNG

```
[User] → [Create Table] → [Define Columns] → [Create in DB (4 tables)]
                                                      ↓
                                              [Add Rows] → [Fill Cells] → [Display]
```

---

## 4. DATABASE SCHEMA (NORMALIZED - 4 TABLES)

### ⚠️ IMPORTANT: Normalized Schema

Thay vì dùng 1 table với nested arrays, chúng ta dùng **4 separate tables** để tối ưu performance và scalability.

### 4.1. Tables (Metadata)

```typescript
// convex/schema.ts (from schema_new.ts)
tables: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]),
```

### 4.2. Table Columns

```typescript
tableColumns: defineTable({
  tableId: v.id("tables"),
  name: v.string(),
  type: v.string(),           // "text" | "number" | "date" | "select" | "checkbox"
  order: v.number(),          // Thứ tự hiển thị
  config: v.optional(v.string()), // JSON config (e.g., select options)
  width: v.optional(v.number()),  // Column width in pixels
})
  .index("by_table", ["tableId"])
  .index("by_table_order", ["tableId", "order"]),
```

### 4.3. Table Rows

```typescript
tableRows: defineTable({
  tableId: v.id("tables"),
  order: v.number(),
  createdAt: v.number(),
})
  .index("by_table", ["tableId"])
  .index("by_table_order", ["tableId", "order"]),
```

### 4.4. Table Cells

```typescript
tableCells: defineTable({
  rowId: v.id("tableRows"),
  columnId: v.id("tableColumns"),
  value: v.string(),          // Store as JSON string
})
  .index("by_row", ["rowId"])
  .index("by_column", ["columnId"])
  .index("by_row_column", ["rowId", "columnId"]),
```

### 4.5. Tại sao Normalized Schema?

✅ **Scalability:** Dễ dàng thêm/xóa columns/rows  
✅ **Performance:** Indexes hiệu quả hơn  
✅ **Flexibility:** Dễ dàng query specific cells  
✅ **Data integrity:** Foreign keys ensure consistency

---

## 5. API ENDPOINTS

### 5.1. Create Table

```typescript
// convex/tables.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTable = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    columns: v.array(v.object({
      name: v.string(),
      type: v.string(),
      config: v.optional(v.string()),
      width: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Step 1: Create table
    const tableId = await ctx.db.insert("tables", {
      userId,
      title: args.title,
      description: args.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Step 2: Create columns
    await Promise.all(
      args.columns.map((column, index) =>
        ctx.db.insert("tableColumns", {
          tableId,
          name: column.name,
          type: column.type,
          order: index,
          config: column.config,
          width: column.width,
        })
      )
    );
    
    return tableId;
  },
});
```

### 5.2. Get Table Data

```typescript
export const getTableData = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Get table
    const table = await ctx.db.get(args.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Get columns (sorted by order)
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    // Get rows (sorted by order)
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    // Get all cells for this table
    const cellsData = await Promise.all(
      rows.map((row) =>
        ctx.db
          .query("tableCells")
          .withIndex("by_row", (q) => q.eq("rowId", row._id))
          .collect()
      )
    );
    
    // Transform to UI-friendly format
    const rowsWithCells = rows.map((row, index) => ({
      _id: row._id,
      order: row.order,
      cells: cellsData[index].reduce((acc, cell) => {
        acc[cell.columnId] = cell.value;
        return acc;
      }, {} as Record<string, string>),
    }));
    
    return {
      table,
      columns,
      rows: rowsWithCells,
    };
  },
});
```

### 5.3. Add Row

```typescript
export const addRow = mutation({
  args: {
    tableId: v.id("tables"),
    cells: v.optional(v.record(v.string(), v.string())), // { columnId: value }
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify table ownership
    const table = await ctx.db.get(args.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Get current row count for order
    const existingRows = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    // Create row
    const rowId = await ctx.db.insert("tableRows", {
      tableId: args.tableId,
      order: existingRows.length,
      createdAt: Date.now(),
    });
    
    // Create cells if provided
    if (args.cells) {
      await Promise.all(
        Object.entries(args.cells).map(([columnId, value]) =>
          ctx.db.insert("tableCells", {
            rowId,
            columnId: columnId as Id<"tableColumns">,
            value,
          })
        )
      );
    }
    
    return rowId;
  },
});
```

### 5.4. Update Cell

```typescript
export const updateCell = mutation({
  args: {
    rowId: v.id("tableRows"),
    columnId: v.id("tableColumns"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify ownership through row -> table
    const row = await ctx.db.get(args.rowId);
    if (!row) throw new Error("Row not found");
    
    const table = await ctx.db.get(row.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Find existing cell
    const existingCell = await ctx.db
      .query("tableCells")
      .withIndex("by_row_column", (q) =>
        q.eq("rowId", args.rowId).eq("columnId", args.columnId)
      )
      .first();
    
    if (existingCell) {
      // Update existing cell
      await ctx.db.patch(existingCell._id, { value: args.value });
    } else {
      // Create new cell
      await ctx.db.insert("tableCells", {
        rowId: args.rowId,
        columnId: args.columnId,
        value: args.value,
      });
    }
  },
});
```

### 5.5. Delete Row

```typescript
export const deleteRow = mutation({
  args: { rowId: v.id("tableRows") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify ownership
    const row = await ctx.db.get(args.rowId);
    if (!row) throw new Error("Row not found");
    
    const table = await ctx.db.get(row.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Delete all cells in this row
    const cells = await ctx.db
      .query("tableCells")
      .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
      .collect();
    
    await Promise.all(cells.map((cell) => ctx.db.delete(cell._id)));
    
    // Delete row
    await ctx.db.delete(args.rowId);
  },
});
```

### 5.6. Add Column

```typescript
export const addColumn = mutation({
  args: {
    tableId: v.id("tables"),
    name: v.string(),
    type: v.string(),
    config: v.optional(v.string()),
    width: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    // Verify ownership
    const table = await ctx.db.get(args.tableId);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Get current column count for order
    const existingColumns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    // Create column
    const columnId = await ctx.db.insert("tableColumns", {
      tableId: args.tableId,
      name: args.name,
      type: args.type,
      order: existingColumns.length,
      config: args.config,
      width: args.width,
    });
    
    return columnId;
  },
});
```

### 5.7. Delete Table

```typescript
export const deleteTable = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userId = identity.subject;
    
    const table = await ctx.db.get(args.id);
    if (!table || table.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Delete all columns
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table", (q) => q.eq("tableId", args.id))
      .collect();
    await Promise.all(columns.map((col) => ctx.db.delete(col._id)));
    
    // Delete all rows and their cells
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (q) => q.eq("tableId", args.id))
      .collect();
    
    for (const row of rows) {
      const cells = await ctx.db
        .query("tableCells")
        .withIndex("by_row", (q) => q.eq("rowId", row._id))
        .collect();
      await Promise.all(cells.map((cell) => ctx.db.delete(cell._id)));
      await ctx.db.delete(row._id);
    }
    
    // Delete table
    await ctx.db.delete(args.id);
  },
});
```

---

## 6. UI COMPONENTS

### 6.1. TableView Component

```typescript
// components/table/table-view.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TableViewProps {
  tableId: Id<"tables">;
}

export const TableView = ({ tableId }: TableViewProps) => {
  const tableData = useQuery(api.tables.getTableData, { tableId });
  const updateCell = useMutation(api.tables.updateCell);
  const addRow = useMutation(api.tables.addRow);
  
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  
  if (!tableData) return <div>Loading...</div>;
  
  const { table, columns, rows } = tableData;
  
  const handleCellChange = async (
    rowId: Id<"tableRows">,
    columnId: Id<"tableColumns">,
    value: string
  ) => {
    await updateCell({ rowId, columnId, value });
    setEditingCell(null);
  };
  
  return (
    <div className="w-full overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{table.title}</h2>
        <Button onClick={() => addRow({ tableId, cells: {} })} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>
      
      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column._id}
                className="border p-2 bg-gray-100 dark:bg-gray-800"
                style={{ width: column.width }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              {columns.map((column) => (
                <td
                  key={column._id}
                  className="border p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setEditingCell({
                      rowId: row._id,
                      columnId: column._id,
                    })
                  }
                >
                  {editingCell?.rowId === row._id &&
                  editingCell?.columnId === column._id ? (
                    <input
                      type="text"
                      defaultValue={row.cells[column._id] || ""}
                      onBlur={(e) =>
                        handleCellChange(
                          row._id as Id<"tableRows">,
                          column._id as Id<"tableColumns">,
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCellChange(
                            row._id as Id<"tableRows">,
                            column._id as Id<"tableColumns">,
                            e.currentTarget.value
                          );
                        }
                      }}
                      autoFocus
                      className="w-full bg-transparent outline-none"
                    />
                  ) : (
                    <span>{row.cells[column._id] || ""}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 7. VALIDATION RULES

| Field | Rule | Error Message |
|-------|------|---------------|
| Table title | Required, max 100 chars | "Tên bảng không được để trống" |
| Column name | Required, max 50 chars | "Tên cột không được để trống" |
| Column type | Must be valid type | "Loại cột không hợp lệ" |
| Cell value (number) | Must be number | "Giá trị phải là số" |

---

## 8. ERROR HANDLING

| Error Code | Condition | Message | Action |
|------------|-----------|---------|--------|
| `NOT_AUTHENTICATED` | User not logged in | "Vui lòng đăng nhập" | Redirect to login |
| `UNAUTHORIZED` | Not table owner | "Bạn không có quyền chỉnh sửa bảng này" | Show error toast |
| `NOT_FOUND` | Table/Row/Column not found | "Không tìm thấy" | Show error toast |

---

## 9. TEST CASES

**TC01: Create Table with Normalized Schema**
- Input: title, columns array
- Expected: 1 table + N columns created
- Actual: ⏳ Pending

**TC02: Add Row**
- Input: tableId
- Expected: 1 row created
- Actual: ⏳ Pending

**TC03: Update Cell**
- Input: rowId, columnId, value
- Expected: Cell created/updated
- Actual: ⏳ Pending

---

## 10. CODE EXAMPLES

### 10.1. Create Table

```typescript
const createTable = useMutation(api.tables.createTable);

await createTable({
  title: "Student Grades",
  description: "Grade tracking",
  columns: [
    { name: "Student Name", type: "text" },
    { name: "Grade", type: "number" },
    { name: "Pass", type: "checkbox" },
  ],
});
```

### 10.2. Update Cell

```typescript
const updateCell = useMutation(api.tables.updateCell);

await updateCell({
  rowId: row._id,
  columnId: column._id,
  value: "New Value",
});
```

---

## 11. SECURITY CONSIDERATIONS

- ✅ **Authentication:** Require login
- ✅ **Authorization:** Verify userId on all operations
- ✅ **Input Validation:** Sanitize cell values
- ✅ **Data Integrity:** Foreign keys ensure consistency

---

## 12. PERFORMANCE OPTIMIZATION

- ✅ **Database:** Indexes on tableId, rowId, columnId
- ✅ **Queries:** Use withIndex for filtering
- ✅ **Updates:** Debounce cell updates (300ms)
- ✅ **Batch Operations:** Promise.all for concurrent ops

---

## 13. RELATED USE CASES

- **UC07:** Tạo trang mới
- **UC08:** Cập nhật trang
- **UC11:** Xóa trang - Cascade delete tables

---

## 14. REFERENCES

- [Convex Documentation](https://docs.convex.dev/)
- [Tanstack Table](https://tanstack.com/table/v8)
- [CRITICAL_FIXES.md](../CRITICAL_FIXES.md) - Chi tiết về normalized schema

---

**Tạo bởi:** AI Assistant  
**Ngày:** 10/12/2025  
**Trạng thái:** ✅ FIXED - Ready for implementation  
**Schema:** Normalized (4 tables)  
**Ước tính:** 1.5 tuần

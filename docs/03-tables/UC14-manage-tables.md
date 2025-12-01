# UC14 - Quản lý bảng dữ liệu

## 1. Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **ID** | UC14 |
| **Tên** | Quản lý bảng dữ liệu (Excel-like Tables) |
| **Mô tả** | Người dùng tạo và quản lý bảng dữ liệu với các cột động, hỗ trợ import/export Excel/CSV |
| **Actor** | Người dùng (User) |
| **Precondition** | - Người dùng đã đăng nhập<br>- Người dùng có quyền tạo tables |
| **Postcondition** | - Bảng được tạo/cập nhật<br>- Dữ liệu được lưu vào Convex<br>- UI cập nhật real-time |
| **Độ ưu tiên** | 🔴 Cao (Core feature) |
| **Trạng thái** | 🔄 Cần triển khai |
| **Sprint** | Sprint 2-3 (2-3 tuần) |
| **Complexity** | ⭐⭐⭐⭐⭐ (Rất phức tạp) |

---

## 2. Sub Use Cases

UC14 được chia thành 8 sub-features:

| ID | Tên | Mô tả | Priority |
|----|-----|-------|----------|
| UC14.1 | Tạo bảng mới | Tạo table với tên và mô tả | 🔴 Cao |
| UC14.2 | Thêm/xóa cột | Quản lý columns (add, delete, rename, reorder) | 🔴 Cao |
| UC14.3 | Thêm/xóa hàng | Quản lý rows (add, delete, reorder) | 🔴 Cao |
| UC14.4 | Chỉnh sửa cell | Edit cell data với validation theo column type | 🔴 Cao |
| UC14.5 | Import Excel/CSV | Import data từ file Excel hoặc CSV | 🟡 Trung bình |
| UC14.6 | Export Excel/CSV | Export table ra file Excel hoặc CSV | 🟡 Trung bình |
| UC14.7 | Filter & Sort | Lọc và sắp xếp dữ liệu | 🟢 Thấp |
| UC14.8 | Column Types | Hỗ trợ nhiều loại cột (text, number, date, select, checkbox) | 🔴 Cao |

---

## 3. Luồng xử lý chính

### 3.1 UC14.1 - Tạo bảng mới

**Main Flow:**
1. Người dùng click "New Table" button
2. Hệ thống hiển thị modal "Create Table"
3. Người dùng nhập tên bảng (required)
4. Người dùng nhập mô tả (optional)
5. Người dùng click "Create"
6. Hệ thống tạo table với 3 cột mặc định:
   - Column 1: "Name" (text)
   - Column 2: "Status" (select)
   - Column 3: "Date" (date)
7. Hệ thống tạo 1 hàng trống
8. Redirect sang table view
9. Use case kết thúc

**Exception Flow:**
- E1: Tên bảng trống → Hiển thị lỗi "Table name is required"
- E2: Tên bảng trùng → Hiển thị lỗi "Table name already exists"

### 3.2 UC14.4 - Chỉnh sửa cell

**Main Flow:**
1. Người dùng click vào cell
2. Hệ thống hiển thị editor tương ứng với column type
3. Người dùng nhập/chọn giá trị
4. Người dùng nhấn Enter hoặc click ra ngoài
5. Hệ thống validate giá trị
6. Hệ thống lưu vào database
7. UI cập nhật real-time
8. Use case kết thúc

**Column Type Editors:**
- **Text:** Input field
- **Number:** Number input với spinner
- **Date:** Date picker
- **Select:** Dropdown với options
- **Checkbox:** Checkbox toggle

### 3.3 UC14.5 - Import Excel/CSV

**Main Flow:**
1. Người dùng click "Import" button
2. Hệ thống hiển thị file upload modal
3. Người dùng chọn file (.xlsx, .csv)
4. Hệ thống parse file
5. Hệ thống hiển thị preview (first 10 rows)
6. Người dùng map columns (Excel → Table columns)
7. Người dùng click "Import"
8. Hệ thống validate data
9. Hệ thống insert rows vào database
10. UI cập nhật với data mới
11. Hiển thị toast "Imported X rows successfully"
12. Use case kết thúc

**Exception Flow:**
- E1: File quá lớn (>5MB) → "File too large. Max 5MB"
- E2: File format sai → "Invalid file format. Please upload .xlsx or .csv"
- E3: Data validation failed → "X rows failed validation. Please check your data"

---

## 4. Biểu đồ hoạt động (UC14.4 - Edit Cell)

```
┌─────────┐              ┌──────────┐              ┌────────┐
│  User   │              │  System  │              │ Convex │
└────┬────┘              └─────┬────┘              └───┬────┘
     │                         │                       │
     │  1. Click cell          │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  2. Show editor         │                       │
     │<────────────────────────┤                       │
     │                         │                       │
     │  3. Enter value         │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │  4. Press Enter         │                       │
     ├────────────────────────>│                       │
     │                         │                       │
     │                         │  5. Validate          │
     │                         ├──────────────────────>│
     │                         │                       │
     │                         │  6. Save to DB        │
     │                         │<──────────────────────┤
     │                         │                       │
     │  7. Update UI           │                       │
     │<────────────────────────┤                       │
     │                         │                       │
```

---

## 5. Database Schema

### 5.1 Convex Schema

```typescript
// convex/schema.ts

export default defineSchema({
  // ... existing tables ...
  
  /**
   * Tables - Bảng dữ liệu chính
   */
  tables: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  /**
   * Table Columns - Cột của bảng
   */
  tableColumns: defineTable({
    tableId: v.id("tables"),
    name: v.string(),
    type: v.string(),           // "text" | "number" | "date" | "select" | "checkbox"
    order: v.number(),          // Thứ tự hiển thị (0, 1, 2, ...)
    config: v.optional(v.string()), // JSON config (e.g., select options)
    width: v.optional(v.number()),  // Column width in pixels
  })
    .index("by_table", ["tableId"])
    .index("by_table_order", ["tableId", "order"]),

  /**
   * Table Rows - Hàng của bảng
   */
  tableRows: defineTable({
    tableId: v.id("tables"),
    order: v.number(),          // Thứ tự hiển thị
    createdAt: v.number(),
  })
    .index("by_table", ["tableId"])
    .index("by_table_order", ["tableId", "order"]),

  /**
   * Table Cells - Ô dữ liệu
   */
  tableCells: defineTable({
    rowId: v.id("tableRows"),
    columnId: v.id("tableColumns"),
    value: v.string(),          // Store as JSON string
  })
    .index("by_row", ["rowId"])
    .index("by_column", ["columnId"])
    .index("by_row_column", ["rowId", "columnId"]),
});
```

### 5.2 Column Type Config

```typescript
// Column type configurations
type ColumnConfig = {
  text: {};
  number: {
    min?: number;
    max?: number;
    decimals?: number;
  };
  date: {
    format?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  };
  select: {
    options: Array<{ value: string; label: string; color?: string }>;
    multiple?: boolean;
  };
  checkbox: {};
};
```

---

## 6. API Endpoints

### 6.1 Tables CRUD

```typescript
// convex/tables.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all tables for current user
 */
export const getTables = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return tables;
  },
});

/**
 * Get table by ID with columns and rows
 */
export const getTableById = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");
    if (table.userId !== identity.subject) throw new Error("Unauthorized");

    // Get columns
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Get rows
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table_order", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Get cells for all rows
    const cellsData = await Promise.all(
      rows.map(async (row) => {
        const cells = await ctx.db
          .query("tableCells")
          .withIndex("by_row", (q) => q.eq("rowId", row._id))
          .collect();
        return { rowId: row._id, cells };
      })
    );

    return {
      table,
      columns,
      rows,
      cells: cellsData,
    };
  },
});

/**
 * Create new table
 */
export const createTable = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    if (!args.title || args.title.trim() === "") {
      throw new Error("Table name is required");
    }

    const now = Date.now();

    // Create table
    const tableId = await ctx.db.insert("tables", {
      userId: identity.subject,
      title: args.title,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    // Create default columns
    const defaultColumns = [
      { name: "Name", type: "text", order: 0 },
      { name: "Status", type: "select", order: 1, config: JSON.stringify({
        options: [
          { value: "todo", label: "To Do", color: "#gray" },
          { value: "in_progress", label: "In Progress", color: "#blue" },
          { value: "done", label: "Done", color: "#green" },
        ]
      })},
      { name: "Date", type: "date", order: 2 },
    ];

    const columnIds = await Promise.all(
      defaultColumns.map((col) =>
        ctx.db.insert("tableColumns", {
          tableId,
          name: col.name,
          type: col.type,
          order: col.order,
          config: col.config,
        })
      )
    );

    // Create one empty row
    const rowId = await ctx.db.insert("tableRows", {
      tableId,
      order: 0,
      createdAt: now,
    });

    // Create empty cells
    await Promise.all(
      columnIds.map((columnId) =>
        ctx.db.insert("tableCells", {
          rowId,
          columnId,
          value: "",
        })
      )
    );

    return tableId;
  },
});

/**
 * Update cell value
 */
export const updateCell = mutation({
  args: {
    rowId: v.id("tableRows"),
    columnId: v.id("tableColumns"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check if cell exists
    const existingCell = await ctx.db
      .query("tableCells")
      .withIndex("by_row_column", (q) =>
        q.eq("rowId", args.rowId).eq("columnId", args.columnId)
      )
      .first();

    if (existingCell) {
      // Update existing cell
      await ctx.db.patch(existingCell._id, {
        value: args.value,
      });
    } else {
      // Create new cell
      await ctx.db.insert("tableCells", {
        rowId: args.rowId,
        columnId: args.columnId,
        value: args.value,
      });
    }

    return true;
  },
});

/**
 * Add new row
 */
export const addRow = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get max order
    const rows = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    const maxOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.order)) : -1;

    // Create new row
    const rowId = await ctx.db.insert("tableRows", {
      tableId: args.tableId,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    // Get columns
    const columns = await ctx.db
      .query("tableColumns")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    // Create empty cells
    await Promise.all(
      columns.map((col) =>
        ctx.db.insert("tableCells", {
          rowId,
          columnId: col._id,
          value: "",
        })
      )
    );

    return rowId;
  },
});

/**
 * Delete row
 */
export const deleteRow = mutation({
  args: { rowId: v.id("tableRows") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Delete all cells in this row
    const cells = await ctx.db
      .query("tableCells")
      .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
      .collect();

    await Promise.all(cells.map((cell) => ctx.db.delete(cell._id)));

    // Delete row
    await ctx.db.delete(args.rowId);

    return true;
  },
});
```

---

## 7. UI Components

### 7.1 Component Tree

```
app/(main)/(routes)/tables/
├── page.tsx                          # Tables list page
├── [tableId]/
│   └── page.tsx                      # Table view page
└── _components/
    ├── table-list.tsx                # List of tables
    ├── create-table-modal.tsx        # Create table modal
    ├── table-grid.tsx                # Main grid component
    ├── table-header.tsx              # Column headers
    ├── table-row.tsx                 # Row component
    ├── table-cell.tsx                # Cell component
    ├── cell-editors/
    │   ├── text-editor.tsx
    │   ├── number-editor.tsx
    │   ├── date-editor.tsx
    │   ├── select-editor.tsx
    │   └── checkbox-editor.tsx
    ├── import-excel-modal.tsx        # Import modal
    └── column-type-selector.tsx      # Column type dropdown
```

### 7.2 Key Component: TableGrid

```typescript
// app/(main)/(routes)/tables/_components/table-grid.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import DataGrid from "react-data-grid";
import "react-data-grid/lib/styles.css";

interface TableGridProps {
  tableId: Id<"tables">;
}

export const TableGrid = ({ tableId }: TableGridProps) => {
  const data = useQuery(api.tables.getTableById, { tableId });
  const updateCell = useMutation(api.tables.updateCell);

  if (!data) return <div>Loading...</div>;

  const { table, columns, rows, cells } = data;

  // Transform data for react-data-grid
  const gridColumns = columns.map((col) => ({
    key: col._id,
    name: col.name,
    editable: true,
    width: col.width || 150,
  }));

  const gridRows = rows.map((row) => {
    const rowCells = cells.find((c) => c.rowId === row._id)?.cells || [];
    const rowData: any = { id: row._id };
    
    rowCells.forEach((cell) => {
      rowData[cell.columnId] = cell.value;
    });
    
    return rowData;
  });

  const handleCellEdit = async (newRows: any[]) => {
    // Handle cell updates
    // ... implementation
  };

  return (
    <div className="h-full">
      <DataGrid
        columns={gridColumns}
        rows={gridRows}
        onRowsChange={handleCellEdit}
        className="rdg-light"
      />
    </div>
  );
};
```

---

## 8. Libraries Required

```bash
# Excel/CSV parsing
npm install xlsx papaparse

# Data grid
npm install react-data-grid

# Date picker
npm install react-datepicker

# Form handling
npm install react-hook-form zod
```

---

## 9. Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC14-01 | Tạo bảng mới | Bảng được tạo với 3 cột mặc định |
| TC14-02 | Thêm cột mới | Cột được thêm vào cuối |
| TC14-03 | Xóa cột | Cột và tất cả cells bị xóa |
| TC14-04 | Edit text cell | Giá trị được lưu |
| TC14-05 | Edit number cell | Chỉ chấp nhận số |
| TC14-06 | Edit date cell | Date picker hiển thị |
| TC14-07 | Import Excel | Data được import đúng |
| TC14-08 | Export Excel | File Excel được tạo |
| TC14-09 | 1000 rows | Performance OK |
| TC14-10 | Concurrent edit | Real-time sync |

---

## 10. Performance Considerations

### 10.1 Optimization Strategies

- **Pagination:** 100 rows per page
- **Virtualization:** Use react-window for large tables
- **Debounce:** Cell updates debounced 300ms
- **Batch updates:** Group multiple cell updates
- **Lazy loading:** Load cells on demand

### 10.2 Performance Targets

- **Initial load:** < 2s for 1000 rows
- **Cell edit:** < 100ms response time
- **Import:** < 5s for 1000 rows
- **Export:** < 3s for 1000 rows

---

## 11. Related Use Cases

- [UC07 - Tạo trang mới](../02-documents/UC07-create-page.md) - Similar creation flow
- [UC16 - Xem lịch tổng quan](../04-calendar/UC16-view-calendar.md) - Similar grid view

---

**Last Updated:** 01/12/2025  
**Status:** 🔄 Ready for implementation  
**Estimated Effort:** 2-3 weeks
